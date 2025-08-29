-- Migration para adicionar suporte ao sistema de keywords
-- Adiciona colunas necessárias para armazenar informações de keywords nos embeddings

-- Primeiro, adiciona as colunas se elas não existirem
DO $$ 
BEGIN
    -- Adiciona coluna keywords (JSONB para armazenar array de keywords detectadas)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_embeddings' AND column_name = 'keywords'
    ) THEN
        ALTER TABLE document_embeddings ADD COLUMN keywords JSONB DEFAULT '[]';
    END IF;
    
    -- Adiciona coluna priority_score (FLOAT para score de prioridade do chunk)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_embeddings' AND column_name = 'priority_score'
    ) THEN
        ALTER TABLE document_embeddings ADD COLUMN priority_score FLOAT DEFAULT 0.0;
    END IF;
    
    -- Adiciona coluna has_composite_keywords (BOOLEAN para chunks com keywords compostas)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_embeddings' AND column_name = 'has_composite_keywords'
    ) THEN
        ALTER TABLE document_embeddings ADD COLUMN has_composite_keywords BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Adiciona coluna legal_references_count (INTEGER para contar referências legais)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_embeddings' AND column_name = 'legal_references_count'
    ) THEN
        ALTER TABLE document_embeddings ADD COLUMN legal_references_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Cria tabela para armazenar resumos de keywords por documento
CREATE TABLE IF NOT EXISTS document_keywords_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    keywords_summary JSONB NOT NULL DEFAULT '{}',
    total_chunks INTEGER DEFAULT 0,
    high_priority_chunks INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint para garantir um resumo por documento
    UNIQUE(document_id)
);

-- Cria índices para melhorar performance das buscas
CREATE INDEX IF NOT EXISTS idx_document_embeddings_keywords 
ON document_embeddings USING GIN (keywords);

CREATE INDEX IF NOT EXISTS idx_document_embeddings_priority_score 
ON document_embeddings (priority_score DESC);

CREATE INDEX IF NOT EXISTS idx_document_embeddings_composite_keywords 
ON document_embeddings (has_composite_keywords) 
WHERE has_composite_keywords = TRUE;

CREATE INDEX IF NOT EXISTS idx_document_embeddings_legal_references 
ON document_embeddings (legal_references_count) 
WHERE legal_references_count > 0;

CREATE INDEX IF NOT EXISTS idx_document_embeddings_combined 
ON document_embeddings (document_id, priority_score DESC, has_composite_keywords);

-- Índices para a tabela de resumos
CREATE INDEX IF NOT EXISTS idx_document_keywords_summary_document_id 
ON document_keywords_summary (document_id);

CREATE INDEX IF NOT EXISTS idx_document_keywords_summary_priority_chunks 
ON document_keywords_summary (high_priority_chunks DESC);

-- Cria função para buscar chunks por keywords
CREATE OR REPLACE FUNCTION search_chunks_by_keywords(
    search_terms TEXT[],
    doc_ids UUID[] DEFAULT NULL,
    max_results INTEGER DEFAULT 10
) RETURNS TABLE (
    document_id UUID,
    content_chunk TEXT,
    chunk_index INTEGER,
    keywords JSONB,
    priority_score FLOAT,
    has_composite_keywords BOOLEAN,
    legal_references_count INTEGER,
    relevance_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    WITH keyword_matches AS (
        SELECT 
            de.document_id,
            de.content_chunk,
            de.chunk_index,
            de.keywords,
            de.priority_score,
            de.has_composite_keywords,
            de.legal_references_count,
            -- Calcula score de relevância baseado em matches de texto
            (
                -- Score base por matches de termos
                (SELECT COUNT(*) FROM unnest(search_terms) AS term 
                 WHERE LOWER(de.content_chunk) LIKE LOWER('%' || term || '%')) * 0.3 +
                
                -- Bonus por prioridade do chunk
                LEAST(de.priority_score, 2.0) * 0.3 +
                
                -- Bonus por keywords compostas
                CASE WHEN de.has_composite_keywords THEN 0.2 ELSE 0.0 END +
                
                -- Bonus por referências legais
                LEAST(de.legal_references_count, 3) * 0.1
            ) AS relevance_score
        FROM document_embeddings de
        WHERE 
            -- Filtra por documentos se especificado
            (doc_ids IS NULL OR de.document_id = ANY(doc_ids))
            AND
            -- Pelo menos um termo deve estar presente
            EXISTS (
                SELECT 1 FROM unnest(search_terms) AS term 
                WHERE LOWER(de.content_chunk) LIKE LOWER('%' || term || '%')
            )
    )
    SELECT 
        km.document_id,
        km.content_chunk,
        km.chunk_index,
        km.keywords,
        km.priority_score,
        km.has_composite_keywords,
        km.legal_references_count,
        km.relevance_score
    FROM keyword_matches km
    WHERE km.relevance_score > 0
    ORDER BY km.relevance_score DESC, km.priority_score DESC
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Cria função para buscar chunks com keywords específicas detectadas
CREATE OR REPLACE FUNCTION search_chunks_by_keyword_types(
    keyword_types TEXT[],
    doc_ids UUID[] DEFAULT NULL,
    max_results INTEGER DEFAULT 10
) RETURNS TABLE (
    document_id UUID,
    content_chunk TEXT,
    chunk_index INTEGER,
    keywords JSONB,
    priority_score FLOAT,
    matching_keywords JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        de.document_id,
        de.content_chunk,
        de.chunk_index,
        de.keywords,
        de.priority_score,
        -- Retorna apenas as keywords que fazem match com os tipos solicitados
        (
            SELECT jsonb_agg(kw)
            FROM jsonb_array_elements(de.keywords) AS kw
            WHERE kw->>'type' = ANY(keyword_types)
        ) AS matching_keywords
    FROM document_embeddings de
    WHERE 
        (doc_ids IS NULL OR de.document_id = ANY(doc_ids))
        AND
        -- Verifica se existem keywords dos tipos solicitados
        EXISTS (
            SELECT 1 
            FROM jsonb_array_elements(de.keywords) AS kw
            WHERE kw->>'type' = ANY(keyword_types)
        )
    ORDER BY de.priority_score DESC, de.has_composite_keywords DESC
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Cria função para obter estatísticas de keywords de um documento
CREATE OR REPLACE FUNCTION get_document_keywords_stats(doc_id UUID)
RETURNS TABLE (
    total_chunks INTEGER,
    chunks_with_keywords INTEGER,
    chunks_with_composite_keywords INTEGER,
    chunks_with_legal_references INTEGER,
    avg_priority_score FLOAT,
    top_keyword_types JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH stats AS (
        SELECT 
            COUNT(*) AS total_chunks,
            COUNT(*) FILTER (WHERE jsonb_array_length(de.keywords) > 0) AS chunks_with_keywords,
            COUNT(*) FILTER (WHERE de.has_composite_keywords) AS chunks_with_composite_keywords,
            COUNT(*) FILTER (WHERE de.legal_references_count > 0) AS chunks_with_legal_references,
            AVG(de.priority_score) AS avg_priority_score
        FROM document_embeddings de
        WHERE de.document_id = doc_id
    ),
    keyword_types AS (
        SELECT jsonb_agg(
            jsonb_build_object(
                'type', kw_type,
                'count', count
            ) ORDER BY count DESC
        ) AS top_types
        FROM (
            SELECT 
                kw->>'type' AS kw_type,
                COUNT(*) AS count
            FROM document_embeddings de,
                 jsonb_array_elements(de.keywords) AS kw
            WHERE de.document_id = doc_id
            GROUP BY kw->>'type'
            ORDER BY COUNT(*) DESC
            LIMIT 10
        ) t
    )
    SELECT 
        s.total_chunks,
        s.chunks_with_keywords,
        s.chunks_with_composite_keywords,
        s.chunks_with_legal_references,
        s.avg_priority_score,
        COALESCE(kt.top_types, '[]'::jsonb)
    FROM stats s
    CROSS JOIN keyword_types kt;
END;
$$ LANGUAGE plpgsql;

-- Atualiza função de trigger para manter updated_at atualizado
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Cria trigger para document_keywords_summary
DROP TRIGGER IF EXISTS update_document_keywords_summary_updated_at ON document_keywords_summary;
CREATE TRIGGER update_document_keywords_summary_updated_at
    BEFORE UPDATE ON document_keywords_summary
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Adiciona comentários para documentar as novas colunas
COMMENT ON COLUMN document_embeddings.keywords IS 'Array JSON de keywords detectadas no chunk';
COMMENT ON COLUMN document_embeddings.priority_score IS 'Score de prioridade baseado nas keywords detectadas';
COMMENT ON COLUMN document_embeddings.has_composite_keywords IS 'Indica se o chunk contém keywords compostas prioritárias';
COMMENT ON COLUMN document_embeddings.legal_references_count IS 'Número de referências legais encontradas no chunk';

COMMENT ON TABLE document_keywords_summary IS 'Resumo de keywords detectadas por documento';
COMMENT ON COLUMN document_keywords_summary.keywords_summary IS 'Resumo estatístico das keywords do documento';
COMMENT ON COLUMN document_keywords_summary.total_chunks IS 'Total de chunks no documento';
COMMENT ON COLUMN document_keywords_summary.high_priority_chunks IS 'Número de chunks com alta prioridade';

-- Cria view para facilitar consultas de chunks com alta prioridade
CREATE OR REPLACE VIEW high_priority_chunks AS
SELECT 
    de.document_id,
    d.title AS document_title,
    de.content_chunk,
    de.chunk_index,
    de.keywords,
    de.priority_score,
    de.has_composite_keywords,
    de.legal_references_count,
    -- Extrai keywords compostas
    (
        SELECT jsonb_agg(kw->>'text')
        FROM jsonb_array_elements(de.keywords) AS kw
        WHERE kw->>'type' = 'composite'
    ) AS composite_keywords,
    -- Extrai referências legais
    (
        SELECT jsonb_agg(kw->>'text')
        FROM jsonb_array_elements(de.keywords) AS kw
        WHERE kw->>'type' = 'legal_reference'
    ) AS legal_references
FROM document_embeddings de
JOIN documents d ON de.document_id = d.id
WHERE de.priority_score > 1.0 OR de.has_composite_keywords = TRUE
ORDER BY de.priority_score DESC, de.has_composite_keywords DESC;

-- Grants necessários para as funções
GRANT EXECUTE ON FUNCTION search_chunks_by_keywords(TEXT[], UUID[], INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION search_chunks_by_keyword_types(TEXT[], UUID[], INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_document_keywords_stats(UUID) TO authenticated;

-- Grants para a view
GRANT SELECT ON high_priority_chunks TO authenticated;