-- Migration: Otimização de Índices Compostos para Performance
-- Data: 31/01/2025
-- Autor: DBA Agent - Claude Flow
-- Objetivo: Criar índices compostos otimizados para melhorar performance das queries mais frequentes

-- ==============================================================================
-- ANÁLISE DE PADRÕES DE QUERY IDENTIFICADOS:
-- ==============================================================================
-- 1. Busca vetorial com filtro por document_id (mais comum)
-- 2. Busca por metadata + similarity (queries de altura/bairros)  
-- 3. Filtros por chunk_metadata->>'type' + document_id
-- 4. Queries por altura com metadata específica
-- 5. Busca por bairros com filtros de ZOT
-- 6. Queries de risco com combinação de campos
-- ==============================================================================

-- 1. ÍNDICES COMPOSTOS PARA BUSCA VETORIAL OTIMIZADA
-- ==============================================================================

-- Índice principal para busca vetorial com filtro por documento
-- Usado em: match_documents(), enhanced-vector-search
-- Pattern: WHERE document_id = ANY(ids) ORDER BY embedding <=> vector
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_embeddings_vector_composite 
ON document_embeddings (document_id, embedding vector_cosine_ops);

-- Índice especializado para queries hierárquicas com metadata
-- Usado em: match_hierarchical_documents(), busca por altura/bairros
-- Pattern: WHERE document_id + metadata filters ORDER BY similarity
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_embeddings_hierarchical 
ON document_embeddings (
    document_id, 
    (chunk_metadata->>'type'), 
    (chunk_metadata->>'articleNumber')
) WHERE chunk_metadata IS NOT NULL;

-- 2. ÍNDICES ESPECIALIZADOS PARA QUERIES DE ALTURA
-- ==============================================================================

-- Índice otimizado para queries sobre altura e gabarito
-- Usado em: queries que procuram por "altura", "gabarito", "elevação"
-- Pattern: Busca por conteúdo relacionado a altura + filtros específicos
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_embeddings_altura_queries 
ON document_embeddings (
    document_id,
    (chunk_metadata->>'has4thDistrict'),
    (chunk_metadata->>'articleNumber')
) WHERE 
    content_chunk ILIKE ANY(ARRAY['%altura%', '%gabarito%', '%elevação%', '%metros%', '%limite%']);

-- Índice para metadata de certificação e 4º distrito (comum em queries de altura)
-- Pattern: chunk_metadata->>'hasCertification' + chunk_metadata->>'has4thDistrict'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_embeddings_certification_district 
ON document_embeddings (
    document_id,
    (chunk_metadata->>'hasCertification'),
    (chunk_metadata->>'has4thDistrict')
) WHERE 
    chunk_metadata->>'hasCertification' = 'true' 
    OR chunk_metadata->>'has4thDistrict' = 'true';

-- 3. ÍNDICES PARA QUERIES DE BAIRROS E ZOTS
-- ==============================================================================

-- Índice composto para buscas por bairro + ZOT
-- Usado em: queries que combinam bairro específico com informações de ZOT
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_embeddings_neighborhood_zot 
ON document_embeddings (
    document_id,
    (chunk_metadata->>'type'),
    (chunk_metadata->>'neighborhoodMentions')
) WHERE 
    chunk_metadata->>'type' = 'zot_info' 
    OR chunk_metadata ? 'neighborhoodMentions';

-- Índice para conteúdo textual relacionado a bairros específicos
-- Pattern: Busca em content_chunk por nomes de bairros + filtros de metadata
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_embeddings_bairros_content 
ON document_embeddings (
    document_id,
    (chunk_metadata->>'type')
) WHERE 
    content_chunk ~* '(petrópolis|cristal|três figueiras|moinhos de vento|mont serrat|bela vista)';

-- 4. ÍNDICES GIN OTIMIZADOS PARA JSONB
-- ==============================================================================

-- Índice GIN especializado para keywords (se existir a coluna)
-- Usado em: search_chunks_by_keywords(), busca por termos específicos
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_embeddings' AND column_name = 'keywords'
    ) THEN
        EXECUTE 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_embeddings_keywords_optimized 
                 ON document_embeddings USING GIN (keywords jsonb_path_ops)';
    END IF;
END $$;

-- Índice GIN otimizado para chunk_metadata com operadores de path
-- Mais eficiente para queries específicas como metadata->>'type'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_embeddings_metadata_path_ops 
ON document_embeddings USING GIN (chunk_metadata jsonb_path_ops);

-- Índice GIN para operações complexas em chunk_metadata  
-- Usado em: queries que fazem múltiplas verificações em metadata
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_embeddings_metadata_full 
ON document_embeddings USING GIN (chunk_metadata);

-- 5. ÍNDICES PARA QUERIES DE RISCOS E DESASTRES
-- ==============================================================================

-- Índice especializado para queries relacionadas a riscos
-- Pattern: Busca por conteúdo de risco + filtros específicos
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_embeddings_risk_queries 
ON document_embeddings (
    document_id,
    (chunk_metadata->>'type'),
    (chunk_metadata->>'riskLevel')
) WHERE 
    content_chunk ~* '(risco|desastre|inundação|deslizamento|emergência)' 
    OR chunk_metadata ? 'riskLevel';

-- 6. ÍNDICES DE PERFORMANCE GERAL
-- ==============================================================================

-- Índice composto para ordenação por similarity + filtros
-- Usado em: ORDER BY similarity queries com filtros adicionais
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_embeddings_similarity_filters 
ON document_embeddings (
    document_id,
    created_at DESC,
    id
) WHERE chunk_metadata IS NOT NULL;

-- Índice para queries que combinam timestamp + document_id
-- Pattern: Busca temporal + filtro por documento
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_embeddings_temporal 
ON document_embeddings (
    created_at DESC,
    document_id,
    id
);

-- 7. ÍNDICES PARCIAIS PARA OTIMIZAÇÃO DE ESPAÇO
-- ==============================================================================

-- Índice parcial para chunks com alta prioridade (se a coluna existir)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_embeddings' AND column_name = 'priority_score'
    ) THEN
        EXECUTE 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_embeddings_high_priority 
                 ON document_embeddings (document_id, priority_score DESC, has_composite_keywords) 
                 WHERE priority_score > 1.0 OR has_composite_keywords = true';
    END IF;
END $$;

-- Índice parcial para chunks com referências legais específicas
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_embeddings_legal_refs 
ON document_embeddings (
    document_id,
    (chunk_metadata->>'articleNumber'),
    (chunk_metadata->>'type')
) WHERE 
    chunk_metadata->>'type' IN ('article', 'law_reference', 'regulation');

-- 8. OTIMIZAÇÕES PARA PGVECTOR
-- ==============================================================================

-- Configurar parâmetros otimizados para pgvector
-- Aumenta work_mem para queries vetoriais complexas
ALTER SYSTEM SET work_mem = '256MB';

-- Otimiza configurações específicas para busca vetorial
ALTER SYSTEM SET effective_cache_size = '2GB';
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET seq_page_cost = 1.0;

-- Reload das configurações
SELECT pg_reload_conf();

-- 9. ESTATÍSTICAS E MONITORAMENTO
-- ==============================================================================

-- Atualiza estatísticas para todos os índices recém-criados
ANALYZE document_embeddings;

-- Força coleta de estatísticas estendidas para colunas JSONB
ALTER TABLE document_embeddings 
ALTER COLUMN chunk_metadata SET STATISTICS 1000;

-- Cria estatísticas estendidas para combinações de colunas frequentes
CREATE STATISTICS IF NOT EXISTS document_embeddings_multi_stats 
ON document_id, chunk_metadata 
FROM document_embeddings;

-- 10. VIEWS OTIMIZADAS PARA QUERIES FREQUENTES
-- ==============================================================================

-- View otimizada para queries de altura
CREATE OR REPLACE VIEW altura_optimized_chunks AS
SELECT 
    de.document_id,
    de.content_chunk,
    de.chunk_metadata,
    de.embedding,
    d.title as document_title,
    -- Extrai informações relevantes de altura
    (chunk_metadata->>'articleNumber') as article_number,
    (chunk_metadata->>'has4thDistrict')::boolean as has_4th_district,
    (chunk_metadata->>'hasCertification')::boolean as has_certification
FROM document_embeddings de
JOIN documents d ON de.document_id = d.id
WHERE 
    content_chunk ~* '(altura|gabarito|elevação|metros|limite.*altura|limite.*vertical)'
    AND chunk_metadata IS NOT NULL;

-- View otimizada para queries de bairros
CREATE OR REPLACE VIEW bairros_optimized_chunks AS
SELECT 
    de.document_id,
    de.content_chunk,
    de.chunk_metadata,
    de.embedding,
    d.title as document_title,
    (chunk_metadata->>'type') as chunk_type,
    (chunk_metadata->>'neighborhoodMentions') as neighborhoods
FROM document_embeddings de
JOIN documents d ON de.document_id = d.id
WHERE 
    content_chunk ~* '(petrópolis|cristal|três figueiras|moinhos.*vento|mont.*serrat|bela vista)'
    OR chunk_metadata ? 'neighborhoodMentions';

-- 11. FUNÇÕES OTIMIZADAS PARA BUSCA
-- ==============================================================================

-- Função otimizada para busca por altura com índices compostos
CREATE OR REPLACE FUNCTION search_altura_optimized(
    query_embedding vector,
    max_results integer DEFAULT 10,
    article_filter text DEFAULT NULL
)
RETURNS TABLE(
    content_chunk text,
    similarity double precision,
    document_title text,
    article_number text,
    has_4th_district boolean
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        aoc.content_chunk,
        1 - (aoc.embedding <=> query_embedding) as similarity,
        aoc.document_title,
        aoc.article_number,
        aoc.has_4th_district
    FROM altura_optimized_chunks aoc
    WHERE 
        article_filter IS NULL 
        OR aoc.article_number = article_filter
    ORDER BY aoc.embedding <=> query_embedding
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Função otimizada para busca por bairros
CREATE OR REPLACE FUNCTION search_bairros_optimized(
    query_embedding vector,
    bairro_name text,
    max_results integer DEFAULT 10
)
RETURNS TABLE(
    content_chunk text,
    similarity double precision,
    document_title text,
    chunk_type text,
    neighborhoods text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        boc.content_chunk,
        1 - (boc.embedding <=> query_embedding) as similarity,
        boc.document_title,
        boc.chunk_type,
        boc.neighborhoods
    FROM bairros_optimized_chunks boc
    WHERE 
        boc.content_chunk ~* bairro_name
        OR boc.neighborhoods ~* bairro_name
    ORDER BY boc.embedding <=> query_embedding
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- 12. COMENTÁRIOS E DOCUMENTAÇÃO
-- ==============================================================================

-- Documenta os índices criados
COMMENT ON INDEX idx_document_embeddings_vector_composite IS 
'Índice composto otimizado para busca vetorial com filtro por document_id. Usado nas funções match_documents.';

COMMENT ON INDEX idx_document_embeddings_hierarchical IS 
'Índice para queries hierárquicas com filtros de metadata. Otimiza buscas por tipo de chunk e artigo.';

COMMENT ON INDEX idx_document_embeddings_altura_queries IS 
'Índice especializado para queries sobre altura, gabarito e elevação. Inclui filtros por 4º distrito.';

COMMENT ON INDEX idx_document_embeddings_neighborhood_zot IS 
'Índice otimizado para queries que combinam bairros com informações de ZOT.';

COMMENT ON INDEX idx_document_embeddings_metadata_path_ops IS 
'Índice GIN com path_ops para queries específicas em chunk_metadata. Mais eficiente para operadores ->>.';

-- 13. GRANTS E PERMISSÕES
-- ==============================================================================

-- Concede permissões para as funções otimizadas
GRANT EXECUTE ON FUNCTION search_altura_optimized(vector, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION search_bairros_optimized(vector, text, integer) TO authenticated;

-- Concede acesso às views otimizadas
GRANT SELECT ON altura_optimized_chunks TO authenticated;
GRANT SELECT ON bairros_optimized_chunks TO authenticated;

-- ==============================================================================
-- RESUMO DOS ÍNDICES CRIADOS
-- ==============================================================================
-- 
-- ÍNDICES VETORIAIS:
-- - idx_document_embeddings_vector_composite: Busca vetorial + document_id
-- - idx_document_embeddings_hierarchical: Busca hierárquica + metadata
--
-- ÍNDICES ESPECIALIZADOS:
-- - idx_document_embeddings_altura_queries: Queries de altura/gabarito
-- - idx_document_embeddings_certification_district: Certificação + 4º distrito  
-- - idx_document_embeddings_neighborhood_zot: Bairros + ZOT
-- - idx_document_embeddings_bairros_content: Conteúdo textual de bairros
--
-- ÍNDICES GIN JSONB:
-- - idx_document_embeddings_keywords_optimized: Keywords (se existir)
-- - idx_document_embeddings_metadata_path_ops: Metadata com path_ops
-- - idx_document_embeddings_metadata_full: Metadata completo
--
-- ÍNDICES DE PERFORMANCE:
-- - idx_document_embeddings_similarity_filters: Similarity + filtros
-- - idx_document_embeddings_temporal: Queries temporais
-- - idx_document_embeddings_high_priority: Alta prioridade (se existir)
-- - idx_document_embeddings_legal_refs: Referências legais
--
-- VIEWS OTIMIZADAS:
-- - altura_optimized_chunks: Chunks relacionados a altura
-- - bairros_optimized_chunks: Chunks relacionados a bairros
--
-- FUNÇÕES OTIMIZADAS:
-- - search_altura_optimized(): Busca otimizada por altura
-- - search_bairros_optimized(): Busca otimizada por bairros
-- ==============================================================================