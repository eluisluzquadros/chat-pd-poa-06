#!/usr/bin/env node

/**
 * Script para importar apenas os dados do Regime Urbanístico
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

console.log('📊 === IMPORTANDO REGIME URBANÍSTICO ===');
console.log(`📅 ${new Date().toLocaleString('pt-BR')}\n`);

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
    
    // Obter headers - normalizar nomes
    const headers = [];
    const headerMap = {};
    
    worksheet.getRow(1).eachCell((cell, colNumber) => {
      const original = cell.value?.toString() || '';
      // Normalizar: remover acentos, espaços por _, lowercase
      const normalized = original
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^\w\s]/g, '') // Remove caracteres especiais
        .replace(/\s+/g, '_') // Espaços por _
        .replace(/__+/g, '_') // Remove __ duplicados
        .trim();
      
      headers[colNumber - 1] = normalized || `col_${colNumber}`;
      headerMap[normalized] = original; // Mapear normalizado -> original
    });
    
    console.log(`📋 ${headers.length} colunas identificadas`);
    console.log(`📋 Primeiras colunas: ${headers.slice(0, 6).join(', ')}\n`);
    
    // Processar linhas
    const records = [];
    let rowNum = 0;
    
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      
      const record = {};
      let hasData = false;
      
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1];
        if (header && cell.value !== null && cell.value !== undefined && cell.value !== '') {
          let value = cell.value;
          
          // Tratar valores
          if (typeof value === 'object' && value.result !== undefined) {
            value = value.result;
          }
          
          // Converter números para string
          if (typeof value === 'number') {
            value = value.toString();
          }
          
          // Limitar tamanho de strings muito grandes
          if (typeof value === 'string' && value.length > 1000) {
            value = value.substring(0, 1000);
          }
          
          record[header] = value;
          hasData = true;
        }
      });
      
      if (hasData && (record.bairro || record.zona)) { // Só adicionar se tiver bairro ou zona
        // Garantir que tem um ID
        record.id = rowNum++;
        
        // Mapear campos específicos se necessário
        if (record.altura_maxima_edificacao_isolada && !record.altura_maxima) {
          record.altura_maxima = record.altura_maxima_edificacao_isolada;
        }
        if (record.coeficiente_de_aproveitamento_basico && !record.coef_aproveitamento_basico) {
          record.coef_aproveitamento_basico = record.coeficiente_de_aproveitamento_basico;
        }
        if (record.coeficiente_de_aproveitamento_maximo && !record.coef_aproveitamento_maximo) {
          record.coef_aproveitamento_maximo = record.coeficiente_de_aproveitamento_maximo;
        }
        
        records.push(record);
      }
    });
    
    console.log(`📊 ${records.length} registros válidos encontrados\n`);
    
    // Limpar tabela
    console.log('🗑️ Limpando tabela existente...');
    const { error: deleteError } = await supabase
      .from('regime_urbanistico')
      .delete()
      .gte('id', 0);
    
    if (deleteError && !deleteError.message.includes('no rows')) {
      console.warn('⚠️ Aviso ao limpar:', deleteError.message);
    }
    
    // Inserir em lotes menores
    const batchSize = 20; // Lotes menores para evitar erros
    let inserted = 0;
    let failed = 0;
    
    console.log(`\n📦 Inserindo em lotes de ${batchSize}...\n`);
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(records.length / batchSize);
      
      try {
        // Tentar inserir o lote
        const { data, error } = await supabase
          .from('regime_urbanistico')
          .insert(batch)
          .select();
        
        if (error) {
          console.error(`❌ Lote ${batchNum}/${totalBatches} falhou:`, error.message);
          
          // Tentar inserir um por um para identificar o problema
          console.log(`   Tentando inserir individualmente...`);
          for (const record of batch) {
            const { error: singleError } = await supabase
              .from('regime_urbanistico')
              .insert(record);
            
            if (singleError) {
              failed++;
              if (failed <= 3) { // Mostrar apenas os primeiros erros
                console.log(`      ❌ Registro ${record.id} falhou:`, singleError.message);
              }
            } else {
              inserted++;
            }
          }
        } else {
          inserted += batch.length;
          console.log(`✅ Lote ${batchNum}/${totalBatches} inserido (${inserted}/${records.length})`);
        }
        
      } catch (err) {
        console.error(`❌ Erro no lote ${batchNum}:`, err.message);
        failed += batch.length;
      }
      
      // Pequena pausa entre lotes
      if (i + batchSize < records.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
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
    
    // Mostrar amostra dos dados
    console.log('\n📋 Amostra dos dados inseridos:');
    const { data: sample } = await supabase
      .from('regime_urbanistico')
      .select('id, bairro, zona, altura_maxima')
      .limit(5);
    
    if (sample) {
      sample.forEach(row => {
        console.log(`   ID ${row.id}: ${row.bairro || 'N/A'} - ${row.zona || 'N/A'} - Alt: ${row.altura_maxima || 'N/A'}`);
      });
    }
    
    if (count > 300) {
      console.log('\n✅ === IMPORTAÇÃO BEM-SUCEDIDA! ===');
    } else if (count > 0) {
      console.log('\n⚠️ === IMPORTAÇÃO PARCIAL ===');
      console.log('Alguns registros podem não ter sido importados.');
    } else {
      console.log('\n❌ === IMPORTAÇÃO FALHOU ===');
      console.log('Verifique a estrutura da tabela e os dados do Excel.');
    }
    
  } catch (error) {
    console.error('\n❌ Erro fatal:', error);
    process.exit(1);
  }
}

// Executar
importRegime().catch(console.error);