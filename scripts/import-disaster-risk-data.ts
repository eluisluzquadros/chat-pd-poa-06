// Script para importar dados de risco de desastre do Excel para o Supabase
// Execute com: npx ts-node scripts/import-disaster-risk-data.ts

import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Carrega variáveis de ambiente
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface RiscoDesastreRow {
  bairro_nome: string;
  risco_inundacao?: boolean;
  risco_deslizamento?: boolean;
  risco_alagamento?: boolean;
  risco_vendaval?: boolean;
  risco_granizo?: boolean;
  nivel_risco_geral?: number;
  nivel_risco_inundacao?: number;
  nivel_risco_deslizamento?: number;
  areas_criticas?: string;
  observacoes?: string;
  ultima_ocorrencia?: string;
  frequencia_anual?: number;
}

async function importDisasterRiskData() {
  try {
    console.log('🚀 Iniciando importação de dados de risco de desastre...');
    
    // Caminho do arquivo Excel
    const filePath = path.join(__dirname, '../knowledgebase/PDPOA2025-Risco_Desastre_vs_Bairros.xlsx');
    
    // Lê o arquivo Excel
    console.log('📂 Lendo arquivo:', filePath);
    const workbook = XLSX.readFile(filePath);
    
    // Assume que os dados estão na primeira planilha
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Converte para JSON
    const rawData = XLSX.utils.sheet_to_json<any>(worksheet);
    console.log(`📊 ${rawData.length} linhas encontradas`);
    
    // Processa e normaliza os dados
    const processedData: RiscoDesastreRow[] = rawData.map((row: any) => {
      // Função auxiliar para converter valores booleanos
      const toBool = (val: any): boolean => {
        if (typeof val === 'boolean') return val;
        if (typeof val === 'string') {
          const lower = val.toLowerCase().trim();
          return lower === 'sim' || lower === 'yes' || lower === 'true' || lower === '1';
        }
        return !!val;
      };
      
      // Função auxiliar para converter números
      const toNumber = (val: any): number | undefined => {
        if (val === null || val === undefined || val === '') return undefined;
        const num = Number(val);
        return isNaN(num) ? undefined : num;
      };
      
      // Função auxiliar para converter datas
      const toDate = (val: any): string | undefined => {
        if (!val) return undefined;
        if (typeof val === 'string') return val;
        // Se for número do Excel, converte para data
        if (typeof val === 'number') {
          const date = XLSX.SSF.parse_date_code(val);
          return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
        }
        return undefined;
      };
      
      return {
        bairro_nome: row['Bairro'] || row['bairro_nome'] || row['Nome do Bairro'],
        risco_inundacao: toBool(row['Risco Inundação'] || row['risco_inundacao']),
        risco_deslizamento: toBool(row['Risco Deslizamento'] || row['risco_deslizamento']),
        risco_alagamento: toBool(row['Risco Alagamento'] || row['risco_alagamento']),
        risco_vendaval: toBool(row['Risco Vendaval'] || row['risco_vendaval']),
        risco_granizo: toBool(row['Risco Granizo'] || row['risco_granizo']),
        nivel_risco_geral: toNumber(row['Nível Risco Geral'] || row['nivel_risco_geral']),
        nivel_risco_inundacao: toNumber(row['Nível Risco Inundação'] || row['nivel_risco_inundacao']),
        nivel_risco_deslizamento: toNumber(row['Nível Risco Deslizamento'] || row['nivel_risco_deslizamento']),
        areas_criticas: row['Áreas Críticas'] || row['areas_criticas'] || '',
        observacoes: row['Observações'] || row['observacoes'] || '',
        ultima_ocorrencia: toDate(row['Última Ocorrência'] || row['ultima_ocorrencia']),
        frequencia_anual: toNumber(row['Frequência Anual'] || row['frequencia_anual'])
      };
    }).filter(row => row.bairro_nome); // Remove linhas sem nome de bairro
    
    console.log(`✅ ${processedData.length} registros processados`);
    
    // Limpa tabela existente (opcional - comente se quiser manter dados existentes)
    console.log('🗑️ Limpando dados existentes...');
    const { error: deleteError } = await supabase
      .from('bairros_risco_desastre')
      .delete()
      .neq('id', 0); // Deleta todos os registros
    
    if (deleteError) {
      console.error('❌ Erro ao limpar tabela:', deleteError);
      // Continua mesmo com erro
    }
    
    // Insere dados em lotes
    const batchSize = 50;
    let insertedCount = 0;
    
    for (let i = 0; i < processedData.length; i += batchSize) {
      const batch = processedData.slice(i, i + batchSize);
      
      console.log(`📤 Inserindo lote ${Math.floor(i / batchSize) + 1}/${Math.ceil(processedData.length / batchSize)}...`);
      
      const { data, error } = await supabase
        .from('bairros_risco_desastre')
        .insert(batch)
        .select();
      
      if (error) {
        console.error('❌ Erro ao inserir lote:', error);
        console.error('Dados do lote:', batch);
      } else {
        insertedCount += data?.length || 0;
        console.log(`✅ ${data?.length || 0} registros inseridos`);
      }
    }
    
    // Atualiza view materializada
    console.log('🔄 Atualizando view materializada...');
    const { error: refreshError } = await supabase.rpc('refresh_materialized_view', {
      view_name: 'mv_bairros_alto_risco'
    });
    
    if (refreshError) {
      console.log('⚠️ Aviso: Não foi possível atualizar view materializada:', refreshError.message);
      console.log('Execute manualmente: REFRESH MATERIALIZED VIEW mv_bairros_alto_risco;');
    }
    
    console.log(`\n✅ Importação concluída! ${insertedCount} registros inseridos.`);
    
    // Mostra estatísticas
    const { data: stats } = await supabase
      .from('bairros_risco_desastre')
      .select('nivel_risco_geral')
      .order('nivel_risco_geral', { ascending: false });
    
    if (stats) {
      const riskLevels = stats.reduce((acc: any, row: any) => {
        const level = row.nivel_risco_geral || 0;
        acc[level] = (acc[level] || 0) + 1;
        return acc;
      }, {});
      
      console.log('\n📊 Estatísticas de Risco:');
      Object.entries(riskLevels).sort().forEach(([level, count]) => {
        const levelName = 
          level === '5' ? 'Muito Alto' :
          level === '4' ? 'Alto' :
          level === '3' ? 'Médio' :
          level === '2' ? 'Baixo' :
          level === '1' ? 'Muito Baixo' : 'Sem classificação';
        console.log(`   Nível ${level} (${levelName}): ${count} bairros`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro durante importação:', error);
    process.exit(1);
  }
}

// Executa importação
importDisasterRiskData();