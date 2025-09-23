#!/usr/bin/env node

/**
 * Script para importar apenas campos essenciais do Regime Urbanístico
 * Ignora campos problemáticos que causam erros
 */

import { createClient } from '@supabase/supabase-js';
import ExcelJS from 'exceljs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variáveis de ambiente não configuradas!');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('📊 === IMPORTANDO APENAS CAMPOS ESSENCIAIS DO REGIME ===');
console.log(`📅 ${new Date().toLocaleString('pt-BR')}\n`);

// Campos essenciais que queremos importar (que sabemos que existem na tabela)
const ESSENTIAL_FIELDS = [
  'id',
  'bairro',
  'zona',
  'altura_maxima',
  'altura_maxima_edificacao_isolada',
  'coef_aproveitamento_basico',
  'coef_aproveitamento_maximo',
  'coeficiente_de_aproveitamento_basico',
  'coeficiente_de_aproveitamento_maximo',
  'area_minima_lote',
  'area_minima_do_lote',
  'testada_minima_lote',
  'testada_minima_do_lote',
  'taxa_de_ocupacao',
  'densidade_habitacional',
  'observacoes'
];

async function importRegime() {
  const excelPath = path.join(__dirname, '..', 'knowledgebase', 'PDPOA2025-Regime_Urbanistico.xlsx');
  
  try {
    // Carregar Excel
    console.log('📖 Carregando arquivo Excel...');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelPath);
    
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      throw new Error('Planilha não encontrada');
    }
    
    console.log(`✅ Planilha carregada: ${worksheet.rowCount} linhas\n`);
    
    // Obter headers
    const headers = [];
    const headerMap = new Map();
    
    worksheet.getRow(1).eachCell((cell, colNumber) => {
      const original = cell.value?.toString() || '';
      const normalized = original
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, '_')
        .trim();
      
      headers[colNumber - 1] = normalized;
      headerMap.set(colNumber - 1, normalized);
    });
    
    console.log(`📋 ${headers.length} colunas no Excel`);
    console.log(`📋 Importando apenas campos essenciais\n`);
    
    // Processar linhas - apenas campos essenciais
    const records = [];
    let rowNum = 0;
    
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      
      const record = { id: rowNum++ };
      let hasData = false;
      
      row.eachCell((cell, colNumber) => {
        const header = headerMap.get(colNumber - 1);
        
        // Só processar se for um campo essencial
        if (header && ESSENTIAL_FIELDS.includes(header)) {
          const value = cell.value;
          
          if (value !== null && value !== undefined && value !== '') {
            // Converter valor
            let finalValue = value;
            if (typeof value === 'object' && value.result !== undefined) {
              finalValue = value.result;
            }
            if (typeof finalValue === 'number') {
              finalValue = finalValue.toString();
            }
            
            record[header] = finalValue;
            hasData = true;
          }
        }
      });
      
      // Adicionar registro se tiver pelo menos bairro ou zona
      if (hasData && (record.bairro || record.zona)) {
        // Mapear campos alternativos
        if (!record.altura_maxima && record.altura_maxima_edificacao_isolada) {
          record.altura_maxima = record.altura_maxima_edificacao_isolada;
        }
        if (!record.coef_aproveitamento_basico && record.coeficiente_de_aproveitamento_basico) {
          record.coef_aproveitamento_basico = record.coeficiente_de_aproveitamento_basico;
        }
        if (!record.coef_aproveitamento_maximo && record.coeficiente_de_aproveitamento_maximo) {
          record.coef_aproveitamento_maximo = record.coeficiente_de_aproveitamento_maximo;
        }
        if (!record.area_minima_lote && record.area_minima_do_lote) {
          record.area_minima_lote = record.area_minima_do_lote;
        }
        
        // Limpar campos desnecessários
        delete record.altura_maxima_edificacao_isolada;
        delete record.coeficiente_de_aproveitamento_basico;
        delete record.coeficiente_de_aproveitamento_maximo;
        delete record.area_minima_do_lote;
        delete record.testada_minima_do_lote;
        
        records.push(record);
      }
    });
    
    console.log(`📊 ${records.length} registros preparados\n`);
    
    // Mostrar amostra
    console.log('📋 Amostra dos dados:');
    records.slice(0, 3).forEach(r => {
      console.log(`   ${r.bairro || 'N/A'} - ${r.zona || 'N/A'} - Alt: ${r.altura_maxima || 'N/A'}`);
    });
    console.log('');
    
    // Limpar tabela
    console.log('🗑️ Limpando tabela existente...');
    await supabase
      .from('regime_urbanistico')
      .delete()
      .gte('id', 0);
    
    // Inserir em lotes pequenos
    const batchSize = 10;
    let inserted = 0;
    let failed = 0;
    
    console.log(`📦 Inserindo em lotes de ${batchSize}...\n`);
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(records.length / batchSize);
      
      try {
        const { data, error } = await supabase
          .from('regime_urbanistico')
          .insert(batch)
          .select();
        
        if (error) {
          console.error(`❌ Lote ${batchNum}/${totalBatches} falhou:`, error.message);
          
          // Tentar inserir individualmente
          for (const record of batch) {
            try {
              const { error: singleError } = await supabase
                .from('regime_urbanistico')
                .insert(record);
              
              if (!singleError) {
                inserted++;
              } else {
                failed++;
                if (failed <= 2) {
                  console.log(`   ❌ Falha:`, singleError.message);
                }
              }
            } catch {
              failed++;
            }
          }
        } else {
          inserted += batch.length;
          const progress = Math.round((inserted / records.length) * 100);
          console.log(`✅ Lote ${batchNum}/${totalBatches} - ${inserted}/${records.length} (${progress}%)`);
        }
        
      } catch (err) {
        console.error(`❌ Erro no lote ${batchNum}:`, err.message);
        failed += batch.length;
      }
      
      // Pausa entre lotes
      if (i + batchSize < records.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    // Verificar resultado final
    console.log('\n📊 === RESULTADO FINAL ===\n');
    
    const { count } = await supabase
      .from('regime_urbanistico')
      .select('*', { count: 'exact', head: true });
    
    console.log(`✅ Inseridos com sucesso: ${inserted} registros`);
    if (failed > 0) {
      console.log(`❌ Falharam: ${failed} registros`);
    }
    console.log(`📊 Total na tabela: ${count || 0} registros`);
    
    // Mostrar amostra final
    const { data: sample } = await supabase
      .from('regime_urbanistico')
      .select('id, bairro, zona, altura_maxima, coef_aproveitamento_basico')
      .limit(5);
    
    if (sample && sample.length > 0) {
      console.log('\n📋 Amostra dos dados inseridos:');
      sample.forEach(row => {
        console.log(`   ID ${row.id}: ${row.bairro || 'N/A'} - ${row.zona || 'N/A'} - Alt: ${row.altura_maxima || 'N/A'} - Coef: ${row.coef_aproveitamento_basico || 'N/A'}`);
      });
    }
    
    if (count > 300) {
      console.log('\n✅ === IMPORTAÇÃO BEM-SUCEDIDA! ===');
    } else if (count > 100) {
      console.log('\n⚠️ === IMPORTAÇÃO PARCIAL ===');
    } else if (count > 0) {
      console.log('\n⚠️ === POUCOS REGISTROS IMPORTADOS ===');
    } else {
      console.log('\n❌ === IMPORTAÇÃO FALHOU ===');
    }
    
  } catch (error) {
    console.error('\n❌ Erro fatal:', error);
    process.exit(1);
  }
}

// Executar
importRegime().catch(console.error);