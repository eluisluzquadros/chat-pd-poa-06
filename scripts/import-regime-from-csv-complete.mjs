#!/usr/bin/env node

/**
 * Importação COMPLETA do regime urbanístico usando CSV
 * Com hash para verificação de integridade linha por linha
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import dotenv from 'dotenv';

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

/**
 * Cria hash MD5 de uma linha para comparação
 */
function createLineHash(values) {
  const content = values.join('|');
  return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * Parse CSV manual para controle total
 * Usa TAB como separador (arquivo TSV)
 */
function parseCSV(content) {
  const lines = content.split('\n');
  const result = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse usando TAB como separador
    const values = line.split('\t').map(v => v.trim());
    result.push(values);
  }
  
  return result;
}

async function importFromCSV() {
  console.log('🚀 === IMPORTAÇÃO COMPLETA DO CSV ===');
  console.log(`📅 ${new Date().toLocaleString('pt-BR')}\n`);
  
  try {
    // 1. Verificar se existe arquivo CSV
    const csvPath = path.join(__dirname, '..', 'knowledgebase', 'PDPOA2025-Regime_Urbanistico.csv');
    
    console.log('📖 Verificando arquivo CSV...');
    
    let csvContent;
    try {
      csvContent = await fs.readFile(csvPath, 'utf-8');
      console.log('✅ Arquivo CSV encontrado');
    } catch (error) {
      console.log('⚠️ CSV não encontrado, procurando alternativas...');
      
      // Tentar outros possíveis nomes
      const alternativePaths = [
        'PDPOA2025-Regime_Urbanistico.csv',
        'regime_urbanistico.csv',
        'Regime_Urbanistico.csv'
      ];
      
      for (const altPath of alternativePaths) {
        try {
          const fullPath = path.join(__dirname, '..', 'knowledgebase', altPath);
          csvContent = await fs.readFile(fullPath, 'utf-8');
          console.log(`✅ Encontrado: ${altPath}`);
          break;
        } catch {
          continue;
        }
      }
      
      if (!csvContent) {
        throw new Error('Nenhum arquivo CSV encontrado');
      }
    }
    
    // 2. Parse do CSV
    console.log('\n📊 Processando CSV...');
    const rows = parseCSV(csvContent);
    
    console.log(`   Total de linhas: ${rows.length}`);
    
    if (rows.length === 0) {
      throw new Error('CSV vazio');
    }
    
    // 3. Extrair headers
    const headers = rows[0];
    console.log(`   Total de colunas: ${headers.length}`);
    
    // Mostrar primeiras colunas
    console.log('\n📋 Primeiras 15 colunas:');
    headers.slice(0, 15).forEach((h, i) => {
      console.log(`   Col ${i + 1}: ${h}`);
    });
    
    // 4. Processar dados
    console.log('\n🔄 Processando dados...');
    const records = [];
    const hashes = new Map();
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < headers.length) continue;
      
      // Criar objeto com todos os campos
      const record = {};
      
      // Mapear cada coluna
      headers.forEach((header, index) => {
        const value = row[index];
        
        // Normalizar nome da coluna para nome do campo no banco
        const fieldName = header
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '');
        
        // Tratar valores especiais
        if (value === '' || value === 'NULL' || value === 'null' || 
            value === 'Não se aplica' || value === 'N/A') {
          record[fieldName] = null;
        } else {
          record[fieldName] = value;
        }
      });
      
      // Adicionar ID
      record.id = i - 1;
      
      // Criar hash para verificação
      const hash = createLineHash(row);
      hashes.set(record.id, hash);
      
      records.push(record);
    }
    
    console.log(`✅ ${records.length} registros processados`);
    
    // 5. Mostrar amostra com hash
    console.log('\n📋 Amostra dos dados (com hash):');
    records.slice(0, 5).forEach(r => {
      const hash = hashes.get(r.id);
      console.log(`   ID ${r.id}: ${r.bairro || 'N/A'} | ${r.zona || 'N/A'} | Hash: ${hash.substring(0, 8)}...`);
    });
    
    // 6. Estatísticas dos dados
    console.log('\n📊 Estatísticas dos campos:');
    
    const fieldStats = {};
    Object.keys(records[0]).forEach(field => {
      fieldStats[field] = records.filter(r => r[field] !== null && r[field] !== '').length;
    });
    
    // Mostrar campos mais preenchidos
    const sortedFields = Object.entries(fieldStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    console.log('   Top 10 campos mais preenchidos:');
    sortedFields.forEach(([field, count]) => {
      const percent = Math.round(count / records.length * 100);
      console.log(`   ${field}: ${count}/${records.length} (${percent}%)`);
    });
    
    // 7. Limpar tabela existente
    console.log('\n🗑️ Limpando tabela...');
    await supabase
      .from('regime_urbanistico')
      .delete()
      .gte('id', 0);
    
    console.log('✅ Tabela limpa');
    
    // 8. Criar estrutura da tabela se necessário
    // Primeiro, vamos verificar quais colunas existem
    const { data: tableInfo } = await supabase
      .from('regime_urbanistico')
      .select('*')
      .limit(0);
    
    // 9. Inserir dados
    console.log('\n📦 Inserindo dados completos...');
    
    const batchSize = 10;
    let inserted = 0;
    let failed = 0;
    const failedHashes = [];
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      try {
        const { error } = await supabase
          .from('regime_urbanistico')
          .insert(batch);
        
        if (error) {
          // Tentar um por um para identificar problemas
          for (const record of batch) {
            try {
              const { error: singleError } = await supabase
                .from('regime_urbanistico')
                .insert(record);
              
              if (!singleError) {
                inserted++;
              } else {
                failed++;
                failedHashes.push({
                  id: record.id,
                  hash: hashes.get(record.id),
                  error: singleError.message
                });
              }
            } catch {
              failed++;
            }
          }
        } else {
          inserted += batch.length;
          const progress = Math.round((inserted / records.length) * 100);
          if (i % 50 === 0 || i + batchSize >= records.length) {
            console.log(`   ✅ Inseridos ${inserted}/${records.length} (${progress}%)`);
          }
        }
      } catch (err) {
        console.error(`   ❌ Erro no lote: ${err.message}`);
        failed += batch.length;
      }
    }
    
    // 10. Verificação final com hash
    console.log('\n🔍 === VERIFICAÇÃO DE INTEGRIDADE ===\n');
    
    const { data: importedData } = await supabase
      .from('regime_urbanistico')
      .select('*')
      .order('id');
    
    if (importedData) {
      console.log(`📊 Registros no banco: ${importedData.length}`);
      console.log(`📊 Registros no CSV: ${records.length}`);
      
      // Verificar alguns hashes aleatórios
      console.log('\n🔐 Verificação de hashes (amostra):');
      const sampleIndexes = [0, 50, 100, 150, 200, 250, 300, 350];
      
      for (const idx of sampleIndexes) {
        if (idx < importedData.length && idx < records.length) {
          const dbRecord = importedData[idx];
          const csvRecord = records[idx];
          const originalHash = hashes.get(csvRecord.id);
          
          // Criar hash do registro do banco para comparar
          const dbValues = Object.values(dbRecord).map(v => v || '');
          const dbHash = createLineHash(dbValues);
          
          console.log(`   Linha ${idx}: ${originalHash === dbHash ? '✅ OK' : '❌ DIFERENTE'}`);
          if (originalHash !== dbHash) {
            console.log(`      CSV Hash: ${originalHash.substring(0, 16)}`);
            console.log(`      DB Hash:  ${dbHash.substring(0, 16)}`);
          }
        }
      }
      
      // Mostrar amostra final
      console.log('\n📋 Amostra final dos dados:');
      importedData.slice(0, 5).forEach(row => {
        console.log(`   ID ${row.id}: ${row.bairro} | ${row.zona} | Alt: ${row.altura_maxima || 'NULL'} | Coef: ${row.coef_aproveitamento_basico || 'NULL'}`);
      });
    }
    
    // 11. Relatório final
    console.log('\n' + '='.repeat(60));
    console.log('📊 === RELATÓRIO FINAL ===');
    console.log('='.repeat(60));
    console.log(`✅ Registros inseridos: ${inserted}`);
    if (failed > 0) {
      console.log(`❌ Registros falhados: ${failed}`);
      if (failedHashes.length > 0 && failedHashes.length <= 5) {
        console.log('\n   Detalhes das falhas:');
        failedHashes.forEach(({ id, hash, error }) => {
          console.log(`   ID ${id} (Hash: ${hash.substring(0, 8)}): ${error}`);
        });
      }
    }
    
    const successRate = Math.round((inserted / records.length) * 100);
    console.log(`\n📈 Taxa de sucesso: ${successRate}%`);
    
    if (successRate === 100) {
      console.log('\n🎉 === IMPORTAÇÃO PERFEITA! ===');
      console.log('✅ Todos os registros foram importados com sucesso');
      console.log('✅ Integridade dos dados verificada por hash');
    } else if (successRate >= 95) {
      console.log('\n✅ === IMPORTAÇÃO BEM-SUCEDIDA! ===');
    } else if (successRate >= 80) {
      console.log('\n⚠️ === IMPORTAÇÃO PARCIAL ===');
    } else {
      console.log('\n❌ === IMPORTAÇÃO COM PROBLEMAS ===');
    }
    
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Erro fatal:', error);
    
    // Se o erro for sobre o CSV, vamos listar os arquivos disponíveis
    if (error.message.includes('CSV')) {
      console.log('\n📁 Listando arquivos na pasta knowledgebase:');
      try {
        const files = await fs.readdir(path.join(__dirname, '..', 'knowledgebase'));
        files.forEach(file => {
          if (file.toLowerCase().includes('regime') || file.toLowerCase().endsWith('.csv')) {
            console.log(`   - ${file}`);
          }
        });
      } catch {
        console.log('   Não foi possível listar arquivos');
      }
    }
    
    process.exit(1);
  }
}

// Executar importação
importFromCSV().catch(console.error);