#!/usr/bin/env node

/**
 * Script para converter e importar dados de regime urbanístico
 * 
 * Converte os dados do formato atual para o formato esperado pelo banco
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Carrega variáveis do .env.local
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY não encontrada!');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Mapeamento de colunas do Excel para o banco
const columnMapping = {
  'Bairro': 'bairro',
  'Zona': 'zona',
  'Altura Máxima - Edificação Isolada': 'altura_max_m',
  'Coeficiente de Aproveitamento - Máximo': 'ca_max',
  'Taxa de Permeabilidade (acima de 1.500 m²)': 'taxa_permeabilidade',
  'Recuo de Jardim': 'recuo_jardim_m'
};

function convertRegimeData(jsonData) {
  const { headers, sampleData, totalRows } = jsonData;
  
  // Criar mapa de índices
  const headerIndexMap = {};
  headers.forEach((header, index) => {
    headerIndexMap[header] = index;
  });

  // Converter dados
  const convertedData = [];
  
  // O sampleData parece conter todos os dados, não apenas amostras
  if (sampleData && sampleData.length > 0) {
    sampleData.forEach(row => {
      const convertedRow = {
        bairro: row[headerIndexMap['Bairro']] || '',
        zona: row[headerIndexMap['Zona']] || '',
        altura_max_m: parseFloat(row[headerIndexMap['Altura Máxima - Edificação Isolada']]) || null,
        ca_max: parseFloat(row[headerIndexMap['Coeficiente de Aproveitamento - Máximo']]) || null,
        taxa_permeabilidade: parseFloat(row[headerIndexMap['Taxa de Permeabilidade (acima de 1.500 m²)']]) || null,
        recuo_jardim_m: parseFloat(row[headerIndexMap['Recuo de Jardim']]) || null,
        // Adicionar mais campos conforme necessário
        to_base: parseFloat(row[headerIndexMap['Coeficiente de Aproveitamento - Básico']]) || null,
        to_max: null, // Não temos TO no Excel atual
        metadata: {
          area_minima_lote: row[headerIndexMap['Área Mínima do Lote']] || null,
          testada_minima: row[headerIndexMap['Testada Mínima do Lote']] || null,
          face_maxima_quarteirao: row[headerIndexMap['Face Máxima do Quarteirão']] || null
        }
      };
      
      convertedData.push(convertedRow);
    });
  }

  return convertedData;
}

async function importRegimeUrbanistico() {
  console.log('🚀 Convertendo e importando dados de Regime Urbanístico...\n');

  try {
    // Ler dados originais
    const jsonData = JSON.parse(
      await fs.readFile(path.join(__dirname, '..', 'processed-data', 'regime-urbanistico-processed.json'), 'utf8')
    );

    console.log(`📊 Total de registros esperados: ${jsonData.totalRows}`);
    console.log(`📊 Registros em sampleData: ${jsonData.sampleData?.length || 0}`);

    // Converter dados
    const convertedData = convertRegimeData(jsonData);
    console.log(`✅ Dados convertidos: ${convertedData.length} registros`);

    if (convertedData.length === 0) {
      console.error('❌ Nenhum dado foi convertido!');
      return;
    }

    // Primeiro, vamos verificar se a tabela existe
    const { data: tableCheck, error: tableError } = await supabase
      .from('regime_urbanistico')
      .select('id')
      .limit(1);

    if (tableError && tableError.message.includes('does not exist')) {
      console.error('❌ Tabela regime_urbanistico não existe!');
      console.log('💡 Execute primeiro o SQL em: scripts/create-regime-tables.sql');
      return;
    }

    // Limpar tabela existente
    console.log('🧹 Limpando dados existentes...');
    await supabase
      .from('regime_urbanistico')
      .delete()
      .gte('id', 0);

    // Importar em lotes
    const BATCH_SIZE = 50;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < convertedData.length; i += BATCH_SIZE) {
      const batch = convertedData.slice(i, i + BATCH_SIZE);
      
      console.log(`📦 Importando lote ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(convertedData.length/BATCH_SIZE)}...`);

      const { data, error } = await supabase
        .from('regime_urbanistico')
        .insert(batch)
        .select();

      if (error) {
        console.error(`❌ Erro no lote: ${error.message}`);
        console.error('Primeiro registro do lote:', JSON.stringify(batch[0], null, 2));
        errorCount += batch.length;
      } else {
        successCount += data.length;
        console.log(`✅ ${data.length} registros importados`);
      }

      // Pequena pausa entre lotes
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n📊 Resumo da importação:');
    console.log(`✅ Sucesso: ${successCount} registros`);
    console.log(`❌ Erros: ${errorCount} registros`);

    // Verificar alguns dados
    const { data: sample } = await supabase
      .from('regime_urbanistico')
      .select('bairro, zona, altura_max_m, ca_max')
      .limit(5);

    if (sample && sample.length > 0) {
      console.log('\n📋 Amostra dos dados importados:');
      sample.forEach(row => {
        console.log(`   ${row.bairro} - ${row.zona} - Altura: ${row.altura_max_m}m - CA: ${row.ca_max}`);
      });
    }

  } catch (error) {
    console.error('❌ Erro ao importar:', error.message);
  }
}

async function importZotsBairros() {
  console.log('\n\n🚀 Importando dados de ZOTs vs Bairros...\n');

  try {
    // Ler dados
    const jsonData = JSON.parse(
      await fs.readFile(path.join(__dirname, '..', 'processed-data', 'zots-bairros-processed.json'), 'utf8')
    );

    // Se os dados estiverem em formato similar, converter
    let zotsData = [];
    
    if (jsonData.sampleData) {
      // Formato similar ao regime urbanístico
      const headers = jsonData.headers;
      const headerIndexMap = {};
      headers.forEach((header, index) => {
        headerIndexMap[header] = index;
      });

      zotsData = jsonData.sampleData.map(row => ({
        bairro: row[headerIndexMap['Bairro']] || row[headerIndexMap['bairro']] || '',
        zona: row[headerIndexMap['Zona']] || row[headerIndexMap['zona']] || '',
        caracteristicas: {},
        restricoes: {},
        incentivos: {},
        metadata: {
          total_zonas: row[headerIndexMap['Total de Zonas']] || null,
          zona_especial: row[headerIndexMap['Zona Especial']] || null
        }
      }));
    } else if (Array.isArray(jsonData)) {
      // Formato array direto
      zotsData = jsonData;
    }

    console.log(`📊 Total de registros: ${zotsData.length}`);

    if (zotsData.length === 0) {
      console.error('❌ Nenhum dado encontrado!');
      return;
    }

    // Verificar se a tabela existe
    const { error: tableError } = await supabase
      .from('zots_bairros')
      .select('id')
      .limit(1);

    if (tableError && tableError.message.includes('does not exist')) {
      console.error('❌ Tabela zots_bairros não existe!');
      console.log('💡 Execute primeiro o SQL em: scripts/create-regime-tables.sql');
      return;
    }

    // Limpar e importar
    await supabase
      .from('zots_bairros')
      .delete()
      .gte('id', 0);

    const BATCH_SIZE = 50;
    let successCount = 0;

    for (let i = 0; i < zotsData.length; i += BATCH_SIZE) {
      const batch = zotsData.slice(i, i + BATCH_SIZE);
      
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

    console.log(`✅ Importados: ${successCount} registros`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

// Executar
async function main() {
  console.log('🏗️  Iniciando conversão e importação\n');
  
  await importRegimeUrbanistico();
  await importZotsBairros();
  
  // Verificação final
  const { count: regimeCount } = await supabase
    .from('regime_urbanistico')
    .select('*', { count: 'exact', head: true });

  const { count: zotsCount } = await supabase
    .from('zots_bairros')
    .select('*', { count: 'exact', head: true });

  console.log('\n\n📊 RESUMO FINAL:');
  console.log(`✅ Regime Urbanístico: ${regimeCount || 0} registros`);
  console.log(`✅ ZOTs vs Bairros: ${zotsCount || 0} registros`);
  console.log(`📊 Total: ${(regimeCount || 0) + (zotsCount || 0)} registros`);
}

main().catch(console.error);