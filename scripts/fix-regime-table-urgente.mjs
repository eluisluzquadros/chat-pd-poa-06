#!/usr/bin/env node

/**
 * SCRIPT URGENTE: Corrigir tabela regime_urbanistico quebrada
 * Reimporta dados corretos do Excel
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

async function fixRegimeTable() {
  console.log('🚨 === CORREÇÃO URGENTE DA TABELA REGIME_URBANISTICO ===');
  console.log(`📅 ${new Date().toLocaleString('pt-BR')}\n`);
  
  const excelPath = path.join(__dirname, '..', 'knowledgebase', 'PDPOA2025-Regime_Urbanistico.xlsx');
  
  try {
    // 1. Verificar estado atual da tabela
    console.log('📊 Verificando estado atual da tabela...');
    const { data: sample, count } = await supabase
      .from('regime_urbanistico')
      .select('*')
      .limit(5);
    
    console.log(`   Total de registros: ${count || 0}`);
    
    if (sample && sample.length > 0) {
      console.log('   Amostra do problema:');
      sample.forEach(row => {
        console.log(`   ID ${row.id}: Bairro=${row.bairro}, Altura=${row.altura_maxima}, Coef=${row.coef_aproveitamento_basico}`);
      });
    }
    
    // 2. Carregar dados corretos do Excel
    console.log('\n📖 Carregando dados corretos do Excel...');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelPath);
    const worksheet = workbook.getWorksheet(1);
    
    if (!worksheet) {
      throw new Error('Planilha não encontrada!');
    }
    
    // 3. Mapear colunas corretamente
    console.log('📋 Mapeando colunas do Excel...');
    const headers = [];
    const headerMap = {};
    
    worksheet.getRow(1).eachCell((cell, colNumber) => {
      const header = cell.value?.toString() || '';
      headers[colNumber] = header;
      
      // Mapeamento direto de nomes de colunas
      if (header.toLowerCase().includes('bairro')) {
        headerMap.bairro = colNumber;
      } else if (header.toLowerCase().includes('zona') || header.toLowerCase().includes('zot')) {
        headerMap.zona = colNumber;
      } else if (header.toLowerCase().includes('altura') && header.toLowerCase().includes('máxima')) {
        headerMap.altura_maxima = colNumber;
      } else if (header.toLowerCase().includes('coef') && header.toLowerCase().includes('básico')) {
        headerMap.coef_aproveitamento_basico = colNumber;
      } else if (header.toLowerCase().includes('coef') && header.toLowerCase().includes('máximo')) {
        headerMap.coef_aproveitamento_maximo = colNumber;
      } else if (header.toLowerCase().includes('área') && header.toLowerCase().includes('mínima')) {
        headerMap.area_minima_lote = colNumber;
      } else if (header.toLowerCase().includes('testada') && header.toLowerCase().includes('mínima')) {
        headerMap.testada_minima_lote = colNumber;
      } else if (header.toLowerCase().includes('taxa') && header.toLowerCase().includes('ocupação')) {
        headerMap.taxa_de_ocupacao = colNumber;
      } else if (header.toLowerCase().includes('densidade')) {
        headerMap.densidade_habitacional = colNumber;
      } else if (header.toLowerCase().includes('observ')) {
        headerMap.observacoes = colNumber;
      }
    });
    
    console.log('   Colunas identificadas:');
    Object.entries(headerMap).forEach(([key, col]) => {
      console.log(`   ${key}: Coluna ${col} - "${headers[col]}"`);
    });
    
    // 4. Extrair dados corretos
    console.log('\n📊 Extraindo dados corretos...');
    const records = [];
    let rowNum = 0;
    
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      
      const record = { id: rowNum++ };
      
      // Função para obter valor limpo
      const getValue = (colNumber) => {
        if (!colNumber) return null;
        
        const cell = row.getCell(colNumber);
        let value = cell.value;
        
        // Tratar diferentes tipos de valores
        if (value === null || value === undefined || value === '') {
          return null;
        }
        
        // Se for objeto com resultado
        if (typeof value === 'object' && value.result !== undefined) {
          value = value.result;
        }
        
        // Se for data, ignorar
        if (value instanceof Date) {
          return null;
        }
        
        // Converter para string e limpar
        return value.toString().trim();
      };
      
      // Extrair valores usando mapeamento
      record.bairro = getValue(headerMap.bairro);
      record.zona = getValue(headerMap.zona);
      record.altura_maxima = getValue(headerMap.altura_maxima);
      record.coef_aproveitamento_basico = getValue(headerMap.coef_aproveitamento_basico);
      record.coef_aproveitamento_maximo = getValue(headerMap.coef_aproveitamento_maximo);
      record.area_minima_lote = getValue(headerMap.area_minima_lote);
      record.testada_minima_lote = getValue(headerMap.testada_minima_lote);
      record.taxa_de_ocupacao = getValue(headerMap.taxa_de_ocupacao);
      record.densidade_habitacional = getValue(headerMap.densidade_habitacional);
      record.observacoes = getValue(headerMap.observacoes);
      
      // Adicionar apenas se tiver dados relevantes
      if (record.bairro || record.zona) {
        records.push(record);
      }
    });
    
    console.log(`✅ ${records.length} registros extraídos corretamente`);
    
    // Mostrar amostra dos dados corretos
    console.log('\n📋 Amostra dos dados corretos:');
    records.slice(0, 5).forEach(r => {
      console.log(`   ID ${r.id}: ${r.bairro || 'N/A'} | Zona: ${r.zona || 'N/A'} | Altura: ${r.altura_maxima || 'N/A'} | Coef: ${r.coef_aproveitamento_basico || 'N/A'}`);
    });
    
    // 5. Limpar tabela existente
    console.log('\n🗑️ Limpando tabela quebrada...');
    const { error: deleteError } = await supabase
      .from('regime_urbanistico')
      .delete()
      .gte('id', 0);
    
    if (deleteError) {
      console.error('❌ Erro ao limpar tabela:', deleteError.message);
    } else {
      console.log('✅ Tabela limpa com sucesso');
    }
    
    // 6. Reinserir dados corretos
    console.log('\n📦 Reinserindo dados corretos...');
    
    const batchSize = 20;
    let inserted = 0;
    let failed = 0;
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('regime_urbanistico')
        .insert(batch)
        .select();
      
      if (error) {
        console.error(`❌ Erro no lote ${Math.floor(i/batchSize) + 1}:`, error.message);
        
        // Tentar inserir um por um
        for (const record of batch) {
          try {
            const { error: singleError } = await supabase
              .from('regime_urbanistico')
              .insert(record);
            
            if (!singleError) {
              inserted++;
            } else {
              failed++;
              if (failed <= 3) {
                console.log(`   ❌ Falha no registro ${record.id}:`, singleError.message);
              }
            }
          } catch {
            failed++;
          }
        }
      } else {
        inserted += batch.length;
        const progress = Math.round((inserted / records.length) * 100);
        console.log(`✅ Inseridos ${inserted}/${records.length} (${progress}%)`);
      }
      
      // Pausa entre lotes
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // 7. Verificar resultado final
    console.log('\n📊 === VERIFICAÇÃO FINAL ===\n');
    
    const { data: finalSample, count: finalCount } = await supabase
      .from('regime_urbanistico')
      .select('*')
      .limit(10);
    
    console.log(`✅ Total de registros inseridos: ${finalCount || 0}`);
    
    if (finalSample && finalSample.length > 0) {
      console.log('\n📋 Amostra dos dados corrigidos:');
      console.log('┌─────┬──────────────────────┬─────────┬────────┬──────────┬──────────┐');
      console.log('│ ID  │ Bairro               │ Zona    │ Altura │ Coef Bás │ Coef Máx │');
      console.log('├─────┼──────────────────────┼─────────┼────────┼──────────┼──────────┤');
      
      finalSample.forEach(row => {
        const bairro = (row.bairro || 'N/A').substring(0, 20).padEnd(20);
        const zona = (row.zona || 'N/A').substring(0, 7).padEnd(7);
        const altura = (row.altura_maxima || 'N/A').substring(0, 6).padEnd(6);
        const coefBas = (row.coef_aproveitamento_basico || 'N/A').substring(0, 8).padEnd(8);
        const coefMax = (row.coef_aproveitamento_maximo || 'N/A').substring(0, 8).padEnd(8);
        
        console.log(`│ ${row.id.toString().padEnd(3)} │ ${bairro} │ ${zona} │ ${altura} │ ${coefBas} │ ${coefMax} │`);
      });
      
      console.log('└─────┴──────────────────────┴─────────┴────────┴──────────┴──────────┘');
    }
    
    // 8. Teste de validação
    console.log('\n🧪 Testando queries...');
    
    // Teste 1: Buscar por bairro
    const { data: testBairro } = await supabase
      .from('regime_urbanistico')
      .select('*')
      .ilike('bairro', '%centro%')
      .limit(1);
    
    if (testBairro && testBairro.length > 0) {
      console.log('✅ Query por bairro funcionando');
    } else {
      console.log('⚠️ Query por bairro não retornou resultados');
    }
    
    // Teste 2: Buscar registros com altura máxima
    const { data: testAltura } = await supabase
      .from('regime_urbanistico')
      .select('*')
      .not('altura_maxima', 'is', null)
      .limit(5);
    
    console.log(`✅ Registros com altura_maxima preenchida: ${testAltura?.length || 0}`);
    
    // Teste 3: Buscar registros com coeficientes
    const { data: testCoef } = await supabase
      .from('regime_urbanistico')
      .select('*')
      .not('coef_aproveitamento_basico', 'is', null)
      .limit(5);
    
    console.log(`✅ Registros com coef_aproveitamento_basico: ${testCoef?.length || 0}`);
    
    // Resumo final
    console.log('\n' + '='.repeat(60));
    if (finalCount > 300) {
      console.log('🎉 === TABELA CORRIGIDA COM SUCESSO! ===');
      console.log(`✅ ${finalCount} registros importados corretamente`);
      console.log('✅ Dados de altura_maxima e coeficientes restaurados');
    } else if (finalCount > 100) {
      console.log('⚠️ === CORREÇÃO PARCIAL ===');
      console.log(`⚠️ Apenas ${finalCount} registros importados`);
    } else {
      console.log('❌ === CORREÇÃO FALHOU ===');
      console.log('❌ Poucos registros importados, verificar logs');
    }
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Erro fatal:', error);
    process.exit(1);
  }
}

// Executar correção
fixRegimeTable().catch(console.error);