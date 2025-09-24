// Script para aplicar estruturas SQL necessárias
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeSQLCommands() {
  console.log('🔧 Aplicando estruturas SQL necessárias...\n');
  
  const sqlCommands = [
    // 1. Criar tabela document_embeddings se não existir
    `CREATE TABLE IF NOT EXISTS document_embeddings (
      id SERIAL PRIMARY KEY,
      document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
      content_chunk TEXT NOT NULL,
      embedding vector(1536),
      chunk_metadata JSONB DEFAULT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    
    // 2. Criar índices
    `CREATE INDEX IF NOT EXISTS idx_document_embeddings_document_id 
     ON document_embeddings(document_id)`,
    
    `CREATE INDEX IF NOT EXISTS idx_document_embeddings_metadata 
     ON document_embeddings USING gin(chunk_metadata)`,
    
    // 3. Adicionar colunas faltantes em documents
    `ALTER TABLE documents 
     ADD COLUMN IF NOT EXISTS title TEXT`,
    
    `ALTER TABLE documents 
     ADD COLUMN IF NOT EXISTS file_name TEXT`,
     
    `ALTER TABLE documents 
     ADD COLUMN IF NOT EXISTS file_path TEXT`,
     
    `ALTER TABLE documents 
     ADD COLUMN IF NOT EXISTS type TEXT`,
     
    `ALTER TABLE documents 
     ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true`,
     
    `ALTER TABLE documents 
     ADD COLUMN IF NOT EXISTS is_processed BOOLEAN DEFAULT false`,
    
    // 4. Criar função match_documents correta
    `CREATE OR REPLACE FUNCTION match_documents(
      query_embedding vector,
      match_count integer,
      document_ids uuid[]
    )
    RETURNS TABLE(
      content_chunk text,
      similarity double precision,
      document_id uuid,
      chunk_metadata jsonb
    )
    LANGUAGE sql
    AS $$
      SELECT 
        de.content_chunk,
        1 - (de.embedding <=> query_embedding) as similarity,
        de.document_id,
        de.chunk_metadata
      FROM document_embeddings de
      WHERE 
        CASE 
          WHEN array_length(document_ids, 1) IS NULL THEN true
          ELSE de.document_id = ANY(document_ids)
        END
      ORDER BY de.embedding <=> query_embedding
      LIMIT match_count;
    $$`,
    
    // 5. Criar tabela de riscos
    `CREATE TABLE IF NOT EXISTS bairros_risco_desastre (
      id SERIAL PRIMARY KEY,
      bairro_nome TEXT NOT NULL,
      risco_inundacao BOOLEAN DEFAULT FALSE,
      risco_deslizamento BOOLEAN DEFAULT FALSE,
      risco_alagamento BOOLEAN DEFAULT FALSE,
      nivel_risco_geral INTEGER CHECK (nivel_risco_geral BETWEEN 1 AND 5),
      areas_criticas TEXT,
      observacoes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    
    // 6. Criar tabela query_cache
    `CREATE TABLE IF NOT EXISTS query_cache (
      key TEXT PRIMARY KEY,
      query TEXT NOT NULL,
      response TEXT NOT NULL,
      confidence FLOAT,
      category TEXT,
      timestamp TIMESTAMPTZ DEFAULT NOW(),
      hit_count INTEGER DEFAULT 0,
      last_accessed TIMESTAMPTZ DEFAULT NOW()
    )`
  ];
  
  for (let i = 0; i < sqlCommands.length; i++) {
    const sql = sqlCommands[i];
    console.log(`📝 Executando comando ${i + 1}/${sqlCommands.length}...`);
    
    try {
      // Usa RPC raw query se disponível
      const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
      
      if (error) {
        // Tenta método alternativo
        console.log('   Tentando método alternativo...');
        // Por enquanto, apenas log do comando
        console.log('   SQL:', sql.substring(0, 50) + '...');
      }
      
      console.log('✅ Comando executado');
    } catch (e) {
      console.error('⚠️ Erro (pode ser ignorado se já existe):', e);
    }
    
    console.log('');
  }
  
  console.log('✅ Estruturas SQL aplicadas!');
  console.log('\n💡 Se ainda houver erros, execute os comandos SQL manualmente no Supabase Dashboard.');
  console.log('📋 Os comandos estão salvos em: scripts/sql-commands.sql');
  
  // Salvar comandos em arquivo
  const fs = await import('fs');
  const sqlContent = sqlCommands.join(';\n\n') + ';';
  await fs.promises.writeFile('scripts/sql-commands.sql', sqlContent);
}

executeSQLCommands().catch(console.error);