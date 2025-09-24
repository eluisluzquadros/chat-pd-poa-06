#!/usr/bin/env node

/**
 * CORREÇÃO DEFINITIVA: Importar regime_urbanistico convertendo valores problemáticos
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

async function fixRegimeDefinitivo() {
  console.log('🚨 === CORREÇÃO DEFINITIVA DO REGIME_URBANISTICO ===');
  console.log(`📅 ${new Date().toLocaleString('pt-BR')}\n`);
  
  const excelPath = path.join(__dirname, '..', 'knowledgebase', 'PDPOA2025-Regime_Urbanistico.xlsx');
  
  try {
    // 1. Carregar Excel
    console.log('📖 Carregando Excel...');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelPath);
    const worksheet = workbook.getWorksheet(1);
    
    if (!worksheet) {
      throw new Error('Planilha não encontrada!');
    }
    
    // 2. Analisar headers
    console.log('📋 Analisando estrutura da planilha...');
    const headers = [];
    worksheet.getRow(1).eachCell((cell, colNumber) => {
      headers[colNumber] = cell.value?.toString() || '';
    });
    
    console.log(`   ${headers.length} colunas encontradas`);
    
    // Mostrar primeiras colunas para entender estrutura
    console.log('\n   Primeiras colunas:');
    for (let i = 1; i <= Math.min(10, headers.length); i++) {
      if (headers[i]) {
        console.log(`   Col ${i}: ${headers[i]}`);
      }
    }
    
    // 3. Processar dados com conversão inteligente
    console.log('\n📊 Processando dados com conversão...');
    const records = [];
    let rowId = 0;
    
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      
      const record = { id: rowId++ };
      
      // Função para converter valores
      const convertValue = (value, isNumeric = false) => {
        if (value === null || value === undefined || value === '') {
          return null;
        }
        
        // Extrair valor se for objeto
        if (typeof value === 'object' && value.result !== undefined) {
          value = value.result;
        }
        
        // Se for data, ignorar
        if (value instanceof Date) {
          return null;
        }
        
        // Converter para string
        const strValue = value.toString().trim();
        
        // Para campos numéricos, tratar valores especiais
        if (isNumeric) {
          // Valores que devem ser NULL
          if (strValue.toLowerCase() === 'não se aplica' || 
              strValue.toLowerCase() === 'n/a' ||
              strValue.toLowerCase() === 'conforme projeto' ||
              strValue === '-' ||
              strValue === '') {
            return null;
          }
          
          // Tentar extrair número
          const numMatch = strValue.match(/[\d.,]+/);
          if (numMatch) {
            return numMatch[0].replace(',', '.');
          }
          
          return null;
        }
        
        // Para campos de texto, retornar como está
        return strValue;
      };
      
      // Mapear valores por posição de coluna (mais confiável)
      // Baseado na análise anterior:
      // Col 2: Bairro
      // Col 3: Zona
      // Col 4: Altura Máxima
      // Col 5-29: Outros parâmetros urbanísticos
      
      record.bairro = convertValue(row.getCell(2).value, false);
      record.zona = convertValue(row.getCell(3).value, false);
      record.altura_maxima = convertValue(row.getCell(4).value, true);
      
      // Buscar coeficientes em diferentes posições possíveis
      // Tentar múltiplas colunas que podem conter coeficientes
      for (let col = 5; col <= 30; col++) {
        const cellValue = row.getCell(col).value;
        const header = headers[col]?.toLowerCase() || '';
        
        if (header.includes('coef') && header.includes('básico')) {
          record.coef_aproveitamento_basico = convertValue(cellValue, true);
        } else if (header.includes('coef') && header.includes('máximo')) {
          record.coef_aproveitamento_maximo = convertValue(cellValue, true);
        } else if (header.includes('área') && header.includes('mínima')) {
          record.area_minima_lote = convertValue(cellValue, true);
        } else if (header.includes('testada')) {
          record.testada_minima_lote = convertValue(cellValue, true);
        } else if (header.includes('taxa') && header.includes('ocupação')) {
          record.taxa_de_ocupacao = convertValue(cellValue, true);
        } else if (header.includes('densidade')) {
          record.densidade_habitacional = convertValue(cellValue, true);
        } else if (header.includes('observ')) {
          record.observacoes = convertValue(cellValue, false);
        }
      }
      
      // Adicionar apenas se tiver bairro ou zona
      if (record.bairro || record.zona) {
        records.push(record);
      }
    });
    
    console.log(`✅ ${records.length} registros processados`);
    
    // Mostrar estatísticas
    const stats = {
      comAltura: records.filter(r => r.altura_maxima !== null).length,
      comCoefBasico: records.filter(r => r.coef_aproveitamento_basico !== null).length,
      comCoefMaximo: records.filter(r => r.coef_aproveitamento_maximo !== null).length,
      comBairro: records.filter(r => r.bairro !== null).length,
      comZona: records.filter(r => r.zona !== null).length
    };
    
    console.log('\n📊 Estatísticas dos dados:');
    console.log(`   Com bairro: ${stats.comBairro}`);
    console.log(`   Com zona: ${stats.comZona}`);
    console.log(`   Com altura_maxima: ${stats.comAltura}`);
    console.log(`   Com coef_basico: ${stats.comCoefBasico}`);
    console.log(`   Com coef_maximo: ${stats.comCoefMaximo}`);
    
    // Amostra
    console.log('\n📋 Amostra dos dados processados:');
    records.slice(0, 5).forEach(r => {
      console.log(`   ${r.bairro || 'SEM_BAIRRO'} | ${r.zona || 'SEM_ZONA'} | Alt: ${r.altura_maxima || 'NULL'} | Coef: ${r.coef_aproveitamento_basico || 'NULL'}`);
    });
    
    // 4. Limpar tabela
    console.log('\n🗑️ Limpando tabela...');
    await supabase
      .from('regime_urbanistico')
      .delete()
      .gte('id', 0);
    
    console.log('✅ Tabela limpa');
    
    // 5. Inserir dados convertidos
    console.log('\n📦 Inserindo dados convertidos...');
    
    const batchSize = 10;
    let inserted = 0;
    let failed = 0;
    const failedRecords = [];
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      
      const { error } = await supabase
        .from('regime_urbanistico')
        .insert(batch);
      
      if (error) {
        // Tentar um por um para identificar problema
        for (const record of batch) {
          const { error: singleError } = await supabase
            .from('regime_urbanistico')
            .insert(record);
          
          if (!singleError) {
            inserted++;
          } else {
            failed++;
            if (failedRecords.length < 3) {
              failedRecords.push({ record, error: singleError.message });
            }
          }
        }
      } else {
        inserted += batch.length;
        if (batchNum % 5 === 0 || i + batchSize >= records.length) {
          console.log(`   ✅ Inseridos ${inserted}/${records.length}`);
        }
      }
    }
    
    // 6. Verificação final
    console.log('\n📊 === VERIFICAÇÃO FINAL ===\n');
    
    const { count: finalCount } = await supabase
      .from('regime_urbanistico')
      .select('*', { count: 'exact', head: true });
    
    console.log(`✅ Total inserido: ${finalCount || 0} registros`);
    
    if (failed > 0) {
      console.log(`⚠️ Falhas: ${failed} registros`);
      if (failedRecords.length > 0) {
        console.log('\n❌ Exemplos de falhas:');
        failedRecords.forEach(({ record, error }) => {
          console.log(`   Bairro: ${record.bairro}, Erro: ${error}`);
        });
      }
    }
    
    // Teste de validação
    console.log('\n🧪 Validando dados inseridos...');
    
    const { data: sampleData } = await supabase
      .from('regime_urbanistico')
      .select('*')
      .limit(10);
    
    if (sampleData && sampleData.length > 0) {
      console.log('\n📋 Amostra final:');
      console.log('┌────┬────────────────────┬─────────┬────────┬──────┬──────┐');
      console.log('│ ID │ Bairro             │ Zona    │ Altura │ C.Bás│ C.Máx│');
      console.log('├────┼────────────────────┼─────────┼────────┼──────┼──────┤');
      
      sampleData.forEach(row => {
        const bairro = (row.bairro || 'NULL').substring(0, 18).padEnd(18);
        const zona = (row.zona || 'NULL').substring(0, 7).padEnd(7);
        const altura = (row.altura_maxima || 'NULL').substring(0, 6).padEnd(6);
        const coefBas = (row.coef_aproveitamento_basico || 'NULL').substring(0, 4).padEnd(4);
        const coefMax = (row.coef_aproveitamento_maximo || 'NULL').substring(0, 4).padEnd(4);
        
        console.log(`│ ${row.id.toString().padStart(2)} │ ${bairro} │ ${zona} │ ${altura} │ ${coefBas} │ ${coefMax} │`);
      });
      
      console.log('└────┴────────────────────┴─────────┴────────┴──────┴──────┘');
    }
    
    // Estatísticas finais
    const { data: statsData } = await supabase
      .from('regime_urbanistico')
      .select('altura_maxima, coef_aproveitamento_basico, coef_aproveitamento_maximo');
    
    if (statsData) {
      const finalStats = {
        comAltura: statsData.filter(r => r.altura_maxima !== null).length,
        comCoefBasico: statsData.filter(r => r.coef_aproveitamento_basico !== null).length,
        comCoefMaximo: statsData.filter(r => r.coef_aproveitamento_maximo !== null).length
      };
      
      console.log('\n📈 Estatísticas finais:');
      console.log(`   Registros com altura_maxima: ${finalStats.comAltura}`);
      console.log(`   Registros com coef_basico: ${finalStats.comCoefBasico}`);
      console.log(`   Registros com coef_maximo: ${finalStats.comCoefMaximo}`);
    }
    
    // Conclusão
    console.log('\n' + '='.repeat(60));
    if (finalCount === 385) {
      console.log('🎉 === CORREÇÃO COMPLETA! ===');
      console.log('✅ Todos os 385 registros foram importados');
      console.log('✅ Valores "Não se aplica" convertidos para NULL');
      console.log('✅ Dados numéricos preservados corretamente');
    } else if (finalCount >= 350) {
      console.log('✅ === CORREÇÃO BEM-SUCEDIDA! ===');
      console.log(`✅ ${finalCount}/385 registros importados (${Math.round(finalCount/385*100)}%)`);
    } else if (finalCount >= 200) {
      console.log('⚠️ === CORREÇÃO PARCIAL ===');
      console.log(`⚠️ Apenas ${finalCount}/385 registros importados`);
    } else {
      console.log('❌ === NECESSÁRIO INVESTIGAR ===');
      console.log(`❌ Apenas ${finalCount} registros importados`);
    }
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Erro fatal:', error);
    process.exit(1);
  }
}

// Executar correção definitiva
fixRegimeDefinitivo().catch(console.error);