#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🚀 Importação Simplificada de Regime Urbanístico\n');

// Função para limpar valores numéricos
function cleanNumericValue(value) {
  if (value === null || value === undefined || value === '') return null;
  
  // Se for uma data do Excel (número serial), retornar null
  if (typeof value === 'number' && value > 40000 && value < 50000) {
    return null;
  }
  
  const str = String(value).trim();
  const cleaned = str.replace(/[^\d.,\-]/g, '');
  const normalized = cleaned.replace(',', '.');
  const num = parseFloat(normalized);
  
  return isNaN(num) ? null : num;
}

async function checkTableStructure() {
  console.log('📋 Verificando estrutura da tabela regime_urbanistico...\n');
  
  // Vamos buscar 1 registro para ver as colunas disponíveis
  const { data, error } = await supabase
    .from('regime_urbanistico')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('❌ Erro ao verificar estrutura:', error);
    return null;
  }
  
  if (data && data.length > 0) {
    const columns = Object.keys(data[0]);
    console.log('✅ Colunas encontradas:', columns.join(', '));
    return columns;
  } else {
    // Se não houver dados, vamos assumir uma estrutura básica
    console.log('⚠️  Tabela vazia, usando estrutura padrão');
    return ['id', 'bairro', 'zona', 'created_at', 'updated_at'];
  }
}

async function importRegimeUrbanistico() {
  const regimeFile = './knowledgebase/PDPOA2025-Regime_Urbanistico.xlsx';
  
  if (!fs.existsSync(regimeFile)) {
    console.error('❌ Arquivo não encontrado:', regimeFile);
    return;
  }
  
  // Verificar estrutura primeiro
  const availableColumns = await checkTableStructure();
  if (!availableColumns) return;
  
  console.log('\n📋 Lendo arquivo Excel...');
  const workbook = XLSX.readFile(regimeFile);
  const worksheet = workbook.Sheets['Sheet'];
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  console.log(`📊 Total de registros encontrados: ${data.length}`);
  
  // Limpar tabela existente
  console.log('🧹 Limpando dados existentes...');
  const { error: deleteError } = await supabase
    .from('regime_urbanistico')
    .delete()
    .neq('id', 0);
  
  if (deleteError) {
    console.error('❌ Erro ao limpar tabela:', deleteError);
  }
  
  // Mapear colunas do Excel para colunas da tabela
  // Vamos usar uma abordagem mais flexível
  const columnMap = {
    'bairro': 'Bairro',
    'zona': 'Zona',
    'altura_maxima_isolada': 'Altura Máxima - Edificação Isolada',
    'altura_maxima_edificacao_isolada': 'Altura Máxima - Edificação Isolada',
    'coeficiente_aproveitamento_basico': 'Coeficiente de Aproveitamento - Básico',
    'coeficiente_aproveitamento_maximo': 'Coeficiente de Aproveitamento - Máximo',
    'area_minima_lote': 'Área Mínima do Lote',
    'testada_minima_lote': 'Testada Mínima do Lote'
  };
  
  // Processar dados em lotes
  const batchSize = 50;
  let successCount = 0;
  
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    
    const processedBatch = batch.map(row => {
      const record = {};
      
      // Mapear apenas as colunas que existem na tabela
      availableColumns.forEach(col => {
        if (col === 'id' || col === 'created_at' || col === 'updated_at') return;
        
        if (columnMap[col] && row[columnMap[col]] !== undefined) {
          // Se for um campo numérico conhecido
          if (col.includes('altura') || col.includes('coeficiente') || col.includes('area') || col.includes('testada')) {
            record[col] = cleanNumericValue(row[columnMap[col]]);
          } else {
            record[col] = row[columnMap[col]] || null;
          }
        } else if (col === 'metadata') {
          // Se tiver campo metadata, armazenar dados extras
          record[col] = {};
        }
      });
      
      // Garantir que pelo menos bairro e zona estejam preenchidos
      if (!record.bairro) record.bairro = row['Bairro'] || '';
      if (!record.zona) record.zona = row['Zona'] || '';
      
      return record;
    });
    
    const { data: insertedData, error } = await supabase
      .from('regime_urbanistico')
      .insert(processedBatch)
      .select();
    
    if (error) {
      console.error(`❌ Erro ao inserir lote ${i/batchSize + 1}:`, error);
    } else {
      successCount += insertedData.length;
      console.log(`✅ Lote ${i/batchSize + 1}: ${insertedData.length} registros inseridos`);
    }
  }
  
  console.log(`\n✅ Total importado: ${successCount}/${data.length} registros`);
}

async function testQueries() {
  console.log('\n🧪 Testando dados importados...');
  
  // Buscar alguns registros
  const { data, error } = await supabase
    .from('regime_urbanistico')
    .select('*')
    .limit(5);
  
  if (error) {
    console.error('❌ Erro na consulta:', error);
  } else if (data && data.length > 0) {
    console.log(`\n✅ Primeiros ${data.length} registros:`);
    data.forEach((row, idx) => {
      console.log(`\n📍 Registro ${idx + 1}:`);
      console.log(`  Bairro: ${row.bairro}`);
      console.log(`  Zona: ${row.zona}`);
      if (row.altura_maxima_isolada) console.log(`  Altura: ${row.altura_maxima_isolada}m`);
    });
  }
  
  // Contar bairros únicos
  const { data: allData } = await supabase
    .from('regime_urbanistico')
    .select('bairro');
  
  if (allData) {
    const bairrosUnicos = [...new Set(allData.map(r => r.bairro))];
    console.log(`\n📊 Total de bairros únicos: ${bairrosUnicos.length}`);
  }
}

async function main() {
  await importRegimeUrbanistico();
  
  // Verificar contagem final
  const { count } = await supabase
    .from('regime_urbanistico')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\n📊 TOTAL FINAL: ${count} registros na tabela regime_urbanistico`);
  
  await testQueries();
  
  console.log('\n🎉 Processo concluído!');
  console.log('\n💡 Nota: Se a estrutura da tabela não corresponder aos dados do Excel,');
  console.log('   execute o script SQL de criação de tabelas correto primeiro.');
}

main().catch(console.error);