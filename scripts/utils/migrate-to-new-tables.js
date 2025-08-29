import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function migrateData() {
  console.log('🚀 Iniciando migração de dados para novas tabelas...\n');

  try {
    // 1. Verificar se as novas tabelas existem
    console.log('1️⃣ Verificando tabelas...');
    
    const { data: tableCheck, error: tableError } = await supabase
      .from('regime_urbanistico')
      .select('id')
      .limit(1);

    if (tableError) {
      console.error('❌ Tabela regime_urbanistico não existe!');
      console.log('Por favor, execute a migração SQL primeiro:');
      console.log('20250131_create_regime_tables.sql');
      return;
    }

    // 2. Buscar dados da estrutura antiga
    console.log('\n2️⃣ Buscando dados da estrutura antiga...');
    
    const { data: oldData, error: fetchError } = await supabase
      .from('document_rows')
      .select('row_data')
      .eq('dataset_id', '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk');

    if (fetchError) {
      console.error('❌ Erro ao buscar dados antigos:', fetchError);
      return;
    }

    console.log(`✅ Encontrados ${oldData?.length || 0} registros para migrar`);

    if (!oldData || oldData.length === 0) {
      console.log('⚠️ Nenhum dado encontrado para migrar');
      return;
    }

    // 3. Preparar dados para nova estrutura
    console.log('\n3️⃣ Convertendo dados para nova estrutura...');
    
    const newRecords = oldData.map(row => {
      const data = row.row_data;
      
      // Função helper para converter valores numéricos
      const toNumber = (val) => {
        if (!val) return null;
        const num = parseFloat(val.toString().replace(',', '.'));
        return isNaN(num) ? null : num;
      };

      // Função helper para converter booleanos
      const toBool = (val) => {
        if (!val) return null;
        return val.toString().toLowerCase() === 'sim' || 
               val.toString().toLowerCase() === 'true';
      };

      return {
        bairro: data['Bairro'] || null,
        zona: data['Zona'] || null,
        altura_max_m: toNumber(data['Altura Máxima - Edificação Isolada']),
        ca_max: toNumber(data['Coeficiente de Aproveitamento - Máximo']),
        ca_basico: toNumber(data['Coeficiente de Aproveitamento - Básico']),
        to_base: toNumber(data['Taxa de Ocupação Base']),
        to_max: toNumber(data['Taxa de Ocupação Máxima']),
        taxa_permeabilidade: toNumber(data['Taxa de Permeabilidade']),
        recuo_jardim_m: toNumber(data['Recuo de Jardim']),
        recuo_lateral_m: toNumber(data['Recuo Lateral']),
        recuo_fundos_m: toNumber(data['Recuo de Fundos']),
        area_total_ha: toNumber(data['Área Total (ha)']),
        populacao: toNumber(data['População']),
        densidade_hab_ha: toNumber(data['Densidade (hab/ha)']),
        domicilios: toNumber(data['Domicílios']),
        quarteirao_padrao_m: toNumber(data['Quarteirão Padrão']),
        divisao_lote: toBool(data['Divisão de Lote']),
        remembramento: toBool(data['Remembramento']),
        quota_ideal_m2: toNumber(data['Quota Ideal (m²)']),
        metadata: {
          original_data: data,
          migrated_at: new Date().toISOString()
        }
      };
    }).filter(record => record.bairro && record.zona); // Filtrar registros inválidos

    console.log(`✅ ${newRecords.length} registros prontos para inserir`);

    // 4. Limpar tabela existente (opcional)
    console.log('\n4️⃣ Limpando tabela existente...');
    
    const { error: deleteError } = await supabase
      .from('regime_urbanistico')
      .delete()
      .neq('id', 0); // Deleta todos os registros

    if (deleteError) {
      console.log('⚠️ Aviso ao limpar tabela:', deleteError.message);
    }

    // 5. Inserir dados na nova tabela
    console.log('\n5️⃣ Inserindo dados na nova tabela...');
    
    // Inserir em lotes de 100 para evitar timeout
    const batchSize = 100;
    let insertedCount = 0;

    for (let i = 0; i < newRecords.length; i += batchSize) {
      const batch = newRecords.slice(i, i + batchSize);
      
      const { error: insertError } = await supabase
        .from('regime_urbanistico')
        .insert(batch);

      if (insertError) {
        console.error(`❌ Erro ao inserir lote ${i/batchSize + 1}:`, insertError);
      } else {
        insertedCount += batch.length;
        console.log(`✅ Inseridos ${insertedCount}/${newRecords.length} registros`);
      }
    }

    // 6. Migrar dados de ZOTs para zots_bairros
    console.log('\n6️⃣ Migrando dados de ZOTs...');
    
    const { data: zotData, error: zotFetchError } = await supabase
      .from('document_rows')
      .select('row_data')
      .eq('dataset_id', '1FTENHpX4aLxmAoxvrEeGQn0fej-wxTMQRQs_XBjPQPY');

    if (!zotFetchError && zotData) {
      const zotRecords = zotData.map(row => {
        const data = row.row_data;
        return {
          bairro: data['Bairro'] || null,
          zona: data['Zona'] || null,
          caracteristicas: {
            total_zonas: data['Total_Zonas_no_Bairro'],
            tem_zona_especial: data['Tem_Zona_Especial']
          },
          metadata: {
            original_data: data,
            migrated_at: new Date().toISOString()
          }
        };
      }).filter(record => record.bairro && record.zona);

      if (zotRecords.length > 0) {
        const { error: zotInsertError } = await supabase
          .from('zots_bairros')
          .insert(zotRecords);

        if (zotInsertError) {
          console.error('❌ Erro ao inserir dados de ZOTs:', zotInsertError);
        } else {
          console.log(`✅ Inseridos ${zotRecords.length} registros de ZOTs`);
        }
      }
    }

    // 7. Verificar migração
    console.log('\n7️⃣ Verificando migração...');
    
    const { count: regimeCount } = await supabase
      .from('regime_urbanistico')
      .select('*', { count: 'exact', head: true });

    const { count: zotCount } = await supabase
      .from('zots_bairros')
      .select('*', { count: 'exact', head: true });

    console.log('\n✅ MIGRAÇÃO CONCLUÍDA!');
    console.log(`📊 Registros em regime_urbanistico: ${regimeCount}`);
    console.log(`📊 Registros em zots_bairros: ${zotCount}`);

    // 8. Testar queries
    console.log('\n8️⃣ Testando queries...');
    
    const { data: testData, error: testError } = await supabase
      .from('regime_urbanistico')
      .select('zona, altura_max_m, ca_max')
      .eq('zona', 'ZOT 8')
      .limit(1);

    if (testError) {
      console.error('❌ Erro no teste:', testError);
    } else if (testData && testData.length > 0) {
      console.log('✅ Query de teste funcionou!');
      console.log('Exemplo de resultado:', testData[0]);
    }

  } catch (error) {
    console.error('❌ Erro durante migração:', error);
  }
}

// Executar migração
migrateData();