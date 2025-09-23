#!/usr/bin/env node

/**
 * Script para verificar e corrigir estrutura das tabelas
 */

import { createClient } from '@supabase/supabase-js';
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

console.log('🔍 === VERIFICANDO ESTRUTURA DAS TABELAS ===\n');

// 1. Verificar se as tabelas existem
const checkTables = async () => {
  const { data: tables, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .in('table_name', ['document_sections', 'regime_urbanistico', 'document_rows']);
  
  if (error) {
    // Tentar método alternativo
    console.log('Usando método alternativo para verificar tabelas...\n');
    
    // Verificar regime_urbanistico
    const { error: regimeError } = await supabase
      .from('regime_urbanistico')
      .select('*')
      .limit(0);
    
    if (regimeError) {
      console.log('❌ Tabela regime_urbanistico: NÃO EXISTE ou erro:', regimeError.message);
    } else {
      console.log('✅ Tabela regime_urbanistico: EXISTE');
    }
    
    // Verificar document_sections
    const { error: sectionsError } = await supabase
      .from('document_sections')
      .select('*')
      .limit(0);
    
    if (sectionsError) {
      console.log('❌ Tabela document_sections: NÃO EXISTE');
      return false;
    } else {
      console.log('✅ Tabela document_sections: EXISTE');
    }
    
    // Verificar document_rows
    const { error: rowsError } = await supabase
      .from('document_rows')
      .select('*')
      .limit(0);
    
    if (rowsError) {
      console.log('⚠️ Tabela document_rows: NÃO EXISTE');
    } else {
      console.log('✅ Tabela document_rows: EXISTE');
    }
    
    return !sectionsError;
  }
  
  return true;
};

// 2. Criar tabela document_sections se não existir
const createDocumentSections = async () => {
  console.log('\n📦 Criando tabela document_sections...\n');
  
  // Usar SQL direto via fetch
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/execute_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    },
    body: JSON.stringify({
      query: `
        -- Criar extensão vector se não existir
        CREATE EXTENSION IF NOT EXISTS vector;
        
        -- Criar tabela document_sections
        CREATE TABLE IF NOT EXISTS document_sections (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          content TEXT NOT NULL,
          embedding vector(1536),
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Criar índices
        CREATE INDEX IF NOT EXISTS idx_document_sections_content_search 
          ON document_sections USING gin(to_tsvector('portuguese', content));
        
        CREATE INDEX IF NOT EXISTS idx_document_sections_metadata 
          ON document_sections USING gin(metadata jsonb_path_ops);
        
        CREATE INDEX IF NOT EXISTS idx_document_sections_source 
          ON document_sections((metadata->>'source_file'));
        
        -- Retornar confirmação
        SELECT 'document_sections table created' as result;
      `
    })
  });
  
  if (!response.ok) {
    console.log('⚠️ Não foi possível criar via RPC, tentando método alternativo...');
    
    // Método alternativo: criar manualmente no dashboard
    console.log('\n📋 INSTRUÇÕES PARA CRIAR A TABELA MANUALMENTE:\n');
    console.log('1. Acesse: https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/editor');
    console.log('2. Cole e execute o seguinte SQL:\n');
    console.log(`
-- Habilitar extensão vector
CREATE EXTENSION IF NOT EXISTS vector;

-- Criar tabela document_sections
CREATE TABLE IF NOT EXISTS document_sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_document_sections_content_search 
  ON document_sections USING gin(to_tsvector('portuguese', content));

CREATE INDEX IF NOT EXISTS idx_document_sections_metadata 
  ON document_sections USING gin(metadata jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_document_sections_source 
  ON document_sections((metadata->>'source_file'));
    `);
    
    return false;
  }
  
  console.log('✅ Tabela document_sections criada com sucesso!');
  return true;
};

// 3. Verificar estrutura da tabela regime_urbanistico
const checkRegimeStructure = async () => {
  console.log('\n🔍 Verificando estrutura de regime_urbanistico...\n');
  
  // Buscar uma linha para ver a estrutura
  const { data, error } = await supabase
    .from('regime_urbanistico')
    .select('*')
    .limit(1);
  
  if (error) {
    console.log('❌ Erro ao verificar regime_urbanistico:', error.message);
    return;
  }
  
  if (data && data.length > 0) {
    const columns = Object.keys(data[0]);
    console.log('📋 Colunas encontradas:', columns.length);
    console.log('Primeiras colunas:', columns.slice(0, 10).join(', '));
    
    // Verificar colunas essenciais
    const essentialColumns = ['zona', 'bairro', 'altura_maxima', 'coef_aproveitamento_basico'];
    const missing = essentialColumns.filter(col => !columns.includes(col));
    
    if (missing.length > 0) {
      console.log('⚠️ Colunas essenciais faltando:', missing.join(', '));
    } else {
      console.log('✅ Todas as colunas essenciais presentes');
    }
  }
};

// Executar verificações
const main = async () => {
  console.log('🚀 Iniciando verificação e correção de tabelas...\n');
  
  // Verificar se tabelas existem
  const tablesExist = await checkTables();
  
  if (!tablesExist) {
    // Criar document_sections
    const created = await createDocumentSections();
    
    if (!created) {
      console.log('\n⚠️ Por favor, crie a tabela manualmente no Supabase Dashboard');
      console.log('Depois execute novamente este script ou o script de reprocessamento.');
      process.exit(1);
    }
  }
  
  // Verificar estrutura de regime_urbanistico
  await checkRegimeStructure();
  
  // Verificar contagens finais
  console.log('\n📊 === ESTATÍSTICAS FINAIS ===\n');
  
  const { count: regimeCount } = await supabase
    .from('regime_urbanistico')
    .select('*', { count: 'exact', head: true });
  
  const { count: sectionsCount } = await supabase
    .from('document_sections')
    .select('*', { count: 'exact', head: true });
  
  console.log(`Regime urbanístico: ${regimeCount || 0} registros`);
  console.log(`Document sections: ${sectionsCount || 0} registros`);
  
  if (sectionsCount === 0) {
    console.log('\n⚠️ Tabela document_sections está vazia.');
    console.log('Execute o script de reprocessamento para popular com dados.');
  }
  
  console.log('\n✅ Verificação concluída!');
};

main().catch(console.error);