#!/usr/bin/env node

/**
 * Adicionar coluna keywords à tabela qa_test_cases
 */

import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  console.log(chalk.cyan.bold('\n🔧 ADICIONANDO COLUNA KEYWORDS\n'));
  
  const sql = `
    -- Adicionar coluna keywords à tabela qa_test_cases
    ALTER TABLE qa_test_cases 
    ADD COLUMN IF NOT EXISTS keywords text[];
  `;
  
  try {
    const { data, error } = await supabase.rpc('query', { query: sql });
    
    if (error) {
      // Tentar via SQL direto
      const { error: sqlError } = await supabase.from('qa_test_cases').select('id').limit(1);
      
      if (!sqlError) {
        console.log(chalk.yellow('⚠️ Tentando método alternativo...'));
        
        // Verificar se coluna existe
        const checkSql = `
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'qa_test_cases' 
          AND column_name = 'keywords';
        `;
        
        const { data: checkData } = await supabase.rpc('query', { query: checkSql });
        
        if (checkData && checkData.length > 0) {
          console.log(chalk.green('✅ Coluna keywords já existe!'));
        } else {
          console.log(chalk.red('❌ Erro ao adicionar coluna:', error.message));
          console.log('\n📝 Execute este SQL manualmente no Supabase:');
          console.log(chalk.gray(sql));
        }
      }
    } else {
      console.log(chalk.green('✅ Coluna keywords adicionada com sucesso!'));
    }
    
    // Verificar estrutura da tabela
    const verifySql = `
      SELECT 
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'qa_test_cases'
      ORDER BY ordinal_position;
    `;
    
    const { data: columns } = await supabase.rpc('query', { query: verifySql });
    
    if (columns) {
      console.log(chalk.cyan('\n📊 Estrutura da tabela qa_test_cases:'));
      columns.forEach(col => {
        const hasKeywords = col.column_name === 'keywords';
        const icon = hasKeywords ? '✅' : '  ';
        console.log(`${icon} ${col.column_name}: ${col.data_type}`);
      });
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Erro:'), error);
    console.log('\n📝 Execute este SQL manualmente no Supabase Dashboard:');
    console.log(chalk.gray(sql));
  }
}

main().catch(console.error);