#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2UiLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.jJCkfU7TtDdBYNf6rKyG6_YZTrGWCmJmJdNrXS6VNXU';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function applyMigration() {
  console.log('🚀 Aplicando migração do sistema de benchmark QA...\n');
  
  try {
    // Ler arquivo de migração
    const migrationPath = join(__dirname, 'supabase/migrations/20250131_create_qa_benchmarks.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    // Dividir em comandos individuais (separados por ponto e vírgula)
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0);
    
    console.log(`📋 Executando ${commands.length} comandos SQL...\n`);
    
    // Executar cada comando
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i] + ';'; // Re-adicionar ponto e vírgula
      
      // Identificar o tipo de comando
      let description = 'Comando SQL';
      if (command.includes('CREATE TABLE')) {
        const match = command.match(/CREATE TABLE[^(]+(\w+)/i);
        description = `Criando tabela ${match ? match[1] : ''}`;
      } else if (command.includes('CREATE INDEX')) {
        const match = command.match(/CREATE INDEX[^O]+ON\s+(\w+)/i);
        description = `Criando índice em ${match ? match[1] : ''}`;
      } else if (command.includes('INSERT INTO')) {
        const match = command.match(/INSERT INTO\s+(\w+)/i);
        description = `Inserindo dados em ${match ? match[1] : ''}`;
      } else if (command.includes('CREATE VIEW')) {
        const match = command.match(/CREATE[^V]+VIEW\s+(\w+)/i);
        description = `Criando view ${match ? match[1] : ''}`;
      } else if (command.includes('CREATE FUNCTION')) {
        const match = command.match(/CREATE[^F]+FUNCTION\s+(\w+)/i);
        description = `Criando função ${match ? match[1] : ''}`;
      } else if (command.includes('CREATE POLICY')) {
        const match = command.match(/CREATE POLICY\s+"([^"]+)"/i);
        description = `Criando política ${match ? match[1] : ''}`;
      }
      
      process.stdout.write(`[${i + 1}/${commands.length}] ${description}...`);
      
      const { error } = await supabase.rpc('sql_exec', { 
        sql_query: command 
      });
      
      if (error) {
        console.log(' ❌');
        console.error('Erro:', error.message);
        
        // Se for erro de tabela já existente, continuar
        if (error.message.includes('already exists')) {
          console.log('  ⚠️  Já existe, continuando...');
          continue;
        }
        
        throw error;
      }
      
      console.log(' ✅');
    }
    
    console.log('\n✅ Migração aplicada com sucesso!');
    
    // Verificar tabelas criadas
    console.log('\n📊 Verificando tabelas criadas...');
    
    const tables = ['qa_benchmarks', 'qa_test_cases', 'llm_model_configs'];
    
    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ ${table}: Erro ao verificar`);
      } else {
        console.log(`✅ ${table}: ${count} registros`);
      }
    }
    
    // Verificar view
    const { data: viewData, error: viewError } = await supabase
      .from('benchmark_analysis')
      .select('*')
      .limit(1);
    
    if (viewError) {
      console.log(`❌ benchmark_analysis view: Erro ao verificar`);
    } else {
      console.log(`✅ benchmark_analysis view: Criada com sucesso`);
    }
    
    console.log('\n🎉 Sistema de benchmark QA pronto para uso!');
    
  } catch (error) {
    console.error('\n❌ Erro ao aplicar migração:', error.message);
    process.exit(1);
  }
}

// Criar função SQL exec se não existir
async function createSqlExecFunction() {
  const createFunction = `
    CREATE OR REPLACE FUNCTION sql_exec(sql_query text)
    RETURNS void AS $$
    BEGIN
      EXECUTE sql_query;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;
  
  try {
    const { error } = await supabase.rpc('query', { 
      query: createFunction 
    });
    
    if (error && !error.message.includes('already exists')) {
      console.log('⚠️  Não foi possível criar função sql_exec, executando diretamente...');
      // Fallback: executar SQL diretamente
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

applyMigration().catch(console.error);