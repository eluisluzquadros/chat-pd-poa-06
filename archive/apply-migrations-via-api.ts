// Script para aplicar migrações via Management API do Supabase
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigrations() {
  console.log('🚀 Aplicando migrações via API...\n');
  
  // Lista de migrações críticas na ordem correta
  const migrations = [
    '20240131000001_add_hierarchical_chunking.sql',
    '20240131000002_add_disaster_risk_support.sql'
  ];
  
  for (const migration of migrations) {
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', migration);
    
    if (!fs.existsSync(migrationPath)) {
      console.log(`⚠️ Migração não encontrada: ${migration}`);
      continue;
    }
    
    console.log(`📝 Aplicando: ${migration}`);
    
    try {
      const sqlContent = await fs.promises.readFile(migrationPath, 'utf-8');
      
      // Dividir em comandos individuais
      const commands = sqlContent
        .split(';')
        .map(cmd => cmd.trim())
        .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
      
      console.log(`   ${commands.length} comandos SQL encontrados`);
      
      // Por enquanto, apenas salvar em arquivo consolidado
      console.log(`   ✅ Migração processada`);
      
    } catch (error) {
      console.error(`❌ Erro ao processar ${migration}:`, error);
    }
  }
  
  console.log('\n📋 Gerando arquivo SQL consolidado...');
  
  // Criar arquivo SQL consolidado com todas as estruturas necessárias
  const consolidatedSQL = `
-- Estruturas essenciais para o sistema RAG otimizado
-- Execute este arquivo no SQL Editor do Supabase Dashboard

-- 1. Tabela document_embeddings (se não existir)
CREATE TABLE IF NOT EXISTS document_embeddings (
  id SERIAL PRIMARY KEY,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  content_chunk TEXT NOT NULL,
  embedding vector(1536),
  chunk_metadata JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Índices para document_embeddings
CREATE INDEX IF NOT EXISTS idx_document_embeddings_document_id 
ON document_embeddings(document_id);

CREATE INDEX IF NOT EXISTS idx_document_embeddings_metadata 
ON document_embeddings USING gin(chunk_metadata);

CREATE INDEX IF NOT EXISTS idx_chunk_metadata_type 
ON document_embeddings((chunk_metadata->>'type'));

CREATE INDEX IF NOT EXISTS idx_chunk_metadata_article 
ON document_embeddings((chunk_metadata->>'articleNumber'));

CREATE INDEX IF NOT EXISTS idx_chunk_metadata_certification 
ON document_embeddings((chunk_metadata->>'hasCertification'));

CREATE INDEX IF NOT EXISTS idx_chunk_metadata_4th_district 
ON document_embeddings((chunk_metadata->>'has4thDistrict'));

-- 3. Adicionar colunas em documents (se não existirem)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_processed BOOLEAN DEFAULT false;

-- 4. Função match_documents atualizada
CREATE OR REPLACE FUNCTION match_documents(
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
$$;

-- 5. Função match_hierarchical_documents
CREATE OR REPLACE FUNCTION match_hierarchical_documents(
  query_embedding vector,
  match_count integer,
  document_ids uuid[],
  query_text text DEFAULT ''
)
RETURNS TABLE(
  content_chunk text,
  similarity double precision,
  chunk_metadata jsonb,
  boosted_score double precision
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH base_matches AS (
    SELECT
      de.content_chunk,
      1 - (de.embedding <=> query_embedding) as base_similarity,
      de.chunk_metadata
    FROM document_embeddings de
    WHERE 
      CASE 
        WHEN array_length(document_ids, 1) IS NULL THEN true
        ELSE de.document_id = ANY(document_ids)
      END
    ORDER BY de.embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  scored_matches AS (
    SELECT
      bm.content_chunk,
      bm.base_similarity,
      bm.chunk_metadata,
      CASE
        WHEN bm.chunk_metadata->>'has4thDistrict' = 'true' 
          AND bm.chunk_metadata->>'articleNumber' = '74' 
          AND lower(query_text) LIKE '%4º distrito%' 
        THEN bm.base_similarity * 2.0
        
        WHEN bm.chunk_metadata->>'hasCertification' = 'true' 
          AND (lower(query_text) LIKE '%certificação%' 
            OR lower(query_text) LIKE '%sustentabilidade%')
        THEN bm.base_similarity * 1.8
        
        WHEN bm.chunk_metadata->>'articleNumber' IS NOT NULL
          AND (lower(query_text) LIKE '%art. ' || (bm.chunk_metadata->>'articleNumber') || '%'
            OR lower(query_text) LIKE '%artigo ' || (bm.chunk_metadata->>'articleNumber') || '%')
        THEN bm.base_similarity * 1.5
        
        WHEN bm.chunk_metadata->>'hasImportantKeywords' = 'true'
        THEN bm.base_similarity * 1.2
        
        ELSE bm.base_similarity
      END as boosted_score
    FROM base_matches bm
  )
  SELECT
    sm.content_chunk,
    sm.base_similarity as similarity,
    sm.chunk_metadata,
    LEAST(sm.boosted_score, 1.0) as boosted_score
  FROM scored_matches sm
  ORDER BY sm.boosted_score DESC
  LIMIT match_count;
END;
$$;

-- 6. Tabela de riscos de desastre
CREATE TABLE IF NOT EXISTS bairros_risco_desastre (
  id SERIAL PRIMARY KEY,
  bairro_nome TEXT NOT NULL,
  bairro_nome_normalizado TEXT GENERATED ALWAYS AS (
    UPPER(UNACCENT(TRIM(bairro_nome)))
  ) STORED,
  risco_inundacao BOOLEAN DEFAULT FALSE,
  risco_deslizamento BOOLEAN DEFAULT FALSE,
  risco_alagamento BOOLEAN DEFAULT FALSE,
  risco_vendaval BOOLEAN DEFAULT FALSE,
  risco_granizo BOOLEAN DEFAULT FALSE,
  nivel_risco_geral INTEGER CHECK (nivel_risco_geral BETWEEN 1 AND 5),
  nivel_risco_inundacao INTEGER CHECK (nivel_risco_inundacao BETWEEN 0 AND 5),
  nivel_risco_deslizamento INTEGER CHECK (nivel_risco_deslizamento BETWEEN 0 AND 5),
  areas_criticas TEXT,
  observacoes TEXT,
  ultima_ocorrencia DATE,
  frequencia_anual INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bairro_nome_normalizado)
);

-- 7. Função get_riscos_bairro
CREATE OR REPLACE FUNCTION get_riscos_bairro(nome_bairro TEXT)
RETURNS TABLE (
  bairro TEXT,
  riscos_ativos TEXT[],
  nivel_risco INTEGER,
  descricao_riscos TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    brd.bairro_nome,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN brd.risco_inundacao THEN 'Inundação' END,
      CASE WHEN brd.risco_deslizamento THEN 'Deslizamento' END,
      CASE WHEN brd.risco_alagamento THEN 'Alagamento' END,
      CASE WHEN brd.risco_vendaval THEN 'Vendaval' END,
      CASE WHEN brd.risco_granizo THEN 'Granizo' END
    ], NULL) as riscos_ativos,
    brd.nivel_risco_geral,
    CASE 
      WHEN brd.nivel_risco_geral = 5 THEN 'Risco Muito Alto'
      WHEN brd.nivel_risco_geral = 4 THEN 'Risco Alto'
      WHEN brd.nivel_risco_geral = 3 THEN 'Risco Médio'
      WHEN brd.nivel_risco_geral = 2 THEN 'Risco Baixo'
      WHEN brd.nivel_risco_geral = 1 THEN 'Risco Muito Baixo'
      ELSE 'Sem classificação'
    END as descricao_riscos
  FROM bairros_risco_desastre brd
  WHERE UPPER(UNACCENT(TRIM(brd.bairro_nome))) = UPPER(UNACCENT(TRIM(nome_bairro)))
     OR brd.bairro_nome ILIKE '%' || nome_bairro || '%';
END;
$$;

-- 8. Tabela query_cache (se não existir)
CREATE TABLE IF NOT EXISTS query_cache (
  key TEXT PRIMARY KEY,
  query TEXT NOT NULL,
  response TEXT NOT NULL,
  confidence FLOAT,
  category TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  hit_count INTEGER DEFAULT 0,
  last_accessed TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Adicionar extensão unaccent se não existir
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 10. Verificar se vector extension está habilitada
CREATE EXTENSION IF NOT EXISTS vector;

COMMENT ON TABLE document_embeddings IS 'Armazena chunks de documentos com embeddings vetoriais e metadados hierárquicos';
COMMENT ON TABLE bairros_risco_desastre IS 'Tabela que relaciona bairros com seus respectivos riscos de desastre natural';
COMMENT ON FUNCTION match_hierarchical_documents IS 'Busca vetorial com scoring contextual baseado em metadados hierárquicos';
`;
  
  const outputPath = path.join(process.cwd(), 'EXECUTE_THIS_SQL.sql');
  await fs.promises.writeFile(outputPath, consolidatedSQL);
  
  console.log(`\n✅ Arquivo SQL consolidado criado: ${outputPath}`);
  console.log('\n📋 PRÓXIMOS PASSOS:');
  console.log('1. Abra o Supabase Dashboard');
  console.log('2. Vá para SQL Editor');
  console.log('3. Copie e cole o conteúdo de EXECUTE_THIS_SQL.sql');
  console.log('4. Execute (Run)');
  console.log('\n5. Depois, execute: npx tsx scripts/reprocess-knowledge-base.ts');
  console.log('6. Por fim: npm run dev');
}

applyMigrations().catch(console.error);