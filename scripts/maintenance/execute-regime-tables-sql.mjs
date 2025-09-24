#!/usr/bin/env node

/**
 * Script para executar SQL de criação das tabelas de regime urbanístico
 * Baseado no SUPABASE_CLI_GUIDE.md
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração do Supabase
const SUPABASE_URL = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function executeSQLCommands() {
  console.log('🚀 Executando SQL para criar tabelas de regime urbanístico...\n');

  try {
    // Como não podemos executar SQL diretamente via JavaScript,
    // vamos criar dados de teste primeiro para verificar se as tabelas existem
    
    // Verificar se a tabela regime_urbanistico existe
    const { data: regimeCheck, error: regimeError } = await supabase
      .from('regime_urbanistico')
      .select('id')
      .limit(1);

    if (regimeError && regimeError.message.includes('relation') && regimeError.message.includes('does not exist')) {
      console.log('❌ Tabela regime_urbanistico não existe.');
      console.log('\n📋 Por favor, execute o seguinte SQL no Dashboard do Supabase:');
      console.log('   https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/sql\n');
      
      // Mostrar o SQL
      const sqlContent = await fs.readFile(
        path.join(__dirname, '..', 'CREATE_REGIME_TABLES.sql'),
        'utf8'
      );
      
      console.log('```sql');
      console.log(sqlContent);
      console.log('```\n');
      
      return false;
    } else {
      console.log('✅ Tabela regime_urbanistico já existe!');
    }

    // Verificar se a tabela zots_bairros existe
    const { data: zotsCheck, error: zotsError } = await supabase
      .from('zots_bairros')
      .select('id')
      .limit(1);

    if (zotsError && zotsError.message.includes('relation') && zotsError.message.includes('does not exist')) {
      console.log('❌ Tabela zots_bairros não existe.');
      console.log('   Execute o SQL acima no Dashboard.');
      return false;
    } else {
      console.log('✅ Tabela zots_bairros já existe!');
    }

    console.log('\n🎉 Tabelas prontas para importação!');
    return true;

  } catch (error) {
    console.error('❌ Erro:', error.message);
    return false;
  }
}

async function importData() {
  console.log('\n🚀 Importando dados...\n');

  try {
    // Importar dados de regime urbanístico
    const regimeData = JSON.parse(
      await fs.readFile(
        path.join(__dirname, '..', 'processed-data', 'regime-urbanistico-processed.json'),
        'utf8'
      )
    );

    // Converter dados do formato sampleData
    const convertedRegimeData = [];
    if (regimeData.sampleData && regimeData.headers) {
      const headers = regimeData.headers;
      const headerIndexMap = {};
      headers.forEach((header, index) => {
        headerIndexMap[header] = index;
      });

      regimeData.sampleData.forEach(row => {
        convertedRegimeData.push({
          bairro: row[headerIndexMap['Bairro']] || '',
          zona: row[headerIndexMap['Zona']] || '',
          altura_max_m: parseFloat(row[headerIndexMap['Altura Máxima - Edificação Isolada']]) || null,
          ca_max: parseFloat(row[headerIndexMap['Coeficiente de Aproveitamento - Máximo']]) || null,
          to_base: parseFloat(row[headerIndexMap['Coeficiente de Aproveitamento - Básico']]) || null,
          taxa_permeabilidade: parseFloat(row[headerIndexMap['Taxa de Permeabilidade (acima de 1.500 m²)']]) || null,
          recuo_jardim_m: parseFloat(row[headerIndexMap['Recuo de Jardim']]) || null,
          metadata: {
            area_minima_lote: row[headerIndexMap['Área Mínima do Lote']],
            testada_minima: row[headerIndexMap['Testada Mínima do Lote']]
          }
        });
      });
    }

    console.log(`📊 Dados convertidos: ${convertedRegimeData.length} registros de regime urbanístico`);

    if (convertedRegimeData.length > 0) {
      // Limpar dados existentes
      console.log('🧹 Limpando dados existentes...');
      await supabase.from('regime_urbanistico').delete().gte('id', 0);

      // Importar em lotes
      const BATCH_SIZE = 50;
      let successCount = 0;

      for (let i = 0; i < convertedRegimeData.length; i += BATCH_SIZE) {
        const batch = convertedRegimeData.slice(i, i + BATCH_SIZE);
        console.log(`📦 Importando lote ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(convertedRegimeData.length/BATCH_SIZE)}...`);

        const { data, error } = await supabase
          .from('regime_urbanistico')
          .insert(batch)
          .select();

        if (error) {
          console.error(`❌ Erro: ${error.message}`);
        } else {
          successCount += data.length;
          console.log(`✅ ${data.length} registros importados`);
        }
      }

      console.log(`\n✅ Total importado: ${successCount} registros`);
    }

    // Importar ZOTs vs Bairros
    const zotsData = JSON.parse(
      await fs.readFile(
        path.join(__dirname, '..', 'processed-data', 'zots-bairros-processed.json'),
        'utf8'
      )
    );

    const convertedZotsData = [];
    if (zotsData.sampleData && zotsData.headers) {
      const headers = zotsData.headers;
      const headerIndexMap = {};
      headers.forEach((header, index) => {
        headerIndexMap[header] = index;
      });

      zotsData.sampleData.forEach(row => {
        convertedZotsData.push({
          bairro: row[headerIndexMap['Bairro']] || row[headerIndexMap['bairro']] || '',
          zona: row[headerIndexMap['Zona']] || row[headerIndexMap['zona']] || '',
          metadata: {
            total_zonas: row[headerIndexMap['Total de Zonas']] || row[headerIndexMap['total_zonas']],
            zona_especial: row[headerIndexMap['Zona Especial']] || row[headerIndexMap['zona_especial']]
          }
        });
      });
    }

    console.log(`\n📊 Dados de ZOTs: ${convertedZotsData.length} registros`);

    if (convertedZotsData.length > 0) {
      // Limpar e importar
      await supabase.from('zots_bairros').delete().gte('id', 0);

      const BATCH_SIZE = 50;
      let successCount = 0;

      for (let i = 0; i < convertedZotsData.length; i += BATCH_SIZE) {
        const batch = convertedZotsData.slice(i, i + BATCH_SIZE);
        
        const { data, error } = await supabase
          .from('zots_bairros')
          .insert(batch)
          .select();

        if (error) {
          console.error(`❌ Erro: ${error.message}`);
        } else {
          successCount += data.length;
        }
      }

      console.log(`✅ Total importado: ${successCount} registros`);
    }

    // Verificação final
    const { count: regimeCount } = await supabase
      .from('regime_urbanistico')
      .select('*', { count: 'exact', head: true });

    const { count: zotsCount } = await supabase
      .from('zots_bairros')
      .select('*', { count: 'exact', head: true });

    console.log('\n📊 RESUMO FINAL:');
    console.log(`✅ Regime Urbanístico: ${regimeCount || 0} registros (esperado: 387)`);
    console.log(`✅ ZOTs vs Bairros: ${zotsCount || 0} registros (esperado: 385)`);
    console.log(`📊 Total: ${(regimeCount || 0) + (zotsCount || 0)} registros`);

  } catch (error) {
    console.error('❌ Erro na importação:', error.message);
  }
}

// Executar
async function main() {
  const tablesExist = await executeSQLCommands();
  
  if (tablesExist) {
    await importData();
  } else {
    console.log('\n⚠️  Execute primeiro o SQL no Dashboard do Supabase.');
    console.log('   Depois rode este script novamente.');
  }
}

main().catch(console.error);