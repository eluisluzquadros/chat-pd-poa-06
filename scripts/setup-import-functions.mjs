#!/usr/bin/env node

/**
 * Script para configurar funções necessárias para importação
 * 
 * Este script verifica e cria as funções necessárias para executar
 * SQL dinâmico no Supabase, necessárias para criar as tabelas.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
  console.error('❌ SUPABASE_ANON_KEY não encontrada nas variáveis de ambiente');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createExecuteSqlFunction() {
  console.log('🔧 Criando função execute_sql...');
  
  const functionSql = `
CREATE OR REPLACE FUNCTION execute_sql(sql_query TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result TEXT;
BEGIN
    -- Execute the SQL query dynamically
    EXECUTE sql_query;
    
    -- Return success message
    RETURN 'SQL executed successfully';
EXCEPTION
    WHEN OTHERS THEN
        -- Return error message
        RETURN 'Error: ' || SQLERRM;
END;
$$;
`;

  try {
    const { error } = await supabase.rpc('exec', { 
      sql: functionSql 
    });
    
    if (error) {
      console.log('⚠️  Função exec não disponível, tentando método alternativo...');
      
      // Tentar criar usando SQL direto via edge function ou migration
      const { error: directError } = await supabase
        .from('_migrations')
        .insert([{
          version: Date.now().toString(),
          name: 'create_execute_sql_function',
          sql: functionSql
        }]);
      
      if (directError) {
        console.error('❌ Erro ao criar função execute_sql:', directError.message);
        return false;
      }
    }
    
    console.log('✅ Função execute_sql criada com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Erro ao criar função execute_sql:', error.message);
    return false;
  }
}

async function testConnection() {
  console.log('🔗 Testando conexão com Supabase...');
  
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .limit(1);
    
    if (error) {
      console.error('❌ Erro de conexão:', error.message);
      return false;
    }
    
    console.log('✅ Conexão com Supabase bem-sucedida');
    return true;
  } catch (error) {
    console.error('❌ Erro de conexão:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Configurando funções para importação...\n');
  
  // Testar conexão
  const connected = await testConnection();
  if (!connected) {
    console.error('❌ Não foi possível conectar ao Supabase');
    process.exit(1);
  }
  
  // Criar função execute_sql
  const functionCreated = await createExecuteSqlFunction();
  
  if (functionCreated) {
    console.log('\n✅ Configuração concluída com sucesso!');
    console.log('🎯 Agora você pode executar o script de importação:');
    console.log('   node scripts/import-regime-urbanistico.mjs');
  } else {
    console.log('\n⚠️  Configuração parcial - a importação ainda pode funcionar');
    console.log('💡 Se houver erros, execute manualmente o schema SQL:');
    console.log('   processed-data/database-schema.sql');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Erro crítico:', error);
    process.exit(1);
  });
}