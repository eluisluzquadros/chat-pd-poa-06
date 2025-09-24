-- Script para completar a migração da coluna embedding
-- Execute este script no Supabase Dashboard SQL Editor

-- Verificar status atual
SELECT 
  COUNT(*) as total_registros,
  COUNT(embedding_json) as com_embedding_json,
  COUNT(embedding) as com_embedding_novo
FROM knowledgebase;

-- Completar a migração dos dados restantes em lotes
DO $$
DECLARE
    batch_size INTEGER := 50;
    processed INTEGER := 0;
    total_remaining INTEGER;
BEGIN
    -- Obter total de registros restantes
    SELECT COUNT(*) INTO total_remaining
    FROM knowledgebase 
    WHERE embedding_json IS NOT NULL AND embedding IS NULL;
    
    RAISE NOTICE 'Registros restantes para migrar: %', total_remaining;
    
    -- Processar em lotes
    WHILE total_remaining > 0 LOOP
        -- Atualizar próximo lote
        UPDATE knowledgebase 
        SET embedding = embedding_json
        WHERE embedding_json IS NOT NULL 
          AND embedding IS NULL
          AND id IN (
            SELECT id 
            FROM knowledgebase 
            WHERE embedding_json IS NOT NULL 
              AND embedding IS NULL
            LIMIT batch_size
          );
        
        processed := processed + batch_size;
        
        -- Atualizar contador
        SELECT COUNT(*) INTO total_remaining
        FROM knowledgebase 
        WHERE embedding_json IS NOT NULL AND embedding IS NULL;
        
        RAISE NOTICE 'Processados: %, Restantes: %', processed, total_remaining;
        
        -- Pequena pausa para não sobrecarregar
        PERFORM pg_sleep(0.1);
    END LOOP;
    
    RAISE NOTICE 'Migração de dados concluída!';
END $$;

-- Verificar se todos os dados foram migrados
SELECT 
  COUNT(*) as total_registros,
  COUNT(embedding_json) as com_embedding_json,
  COUNT(embedding) as com_embedding_novo
FROM knowledgebase;

-- Remover a coluna antiga apenas se todos os dados foram migrados
DO $$
DECLARE
    remaining_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_count
    FROM knowledgebase 
    WHERE embedding_json IS NOT NULL AND embedding IS NULL;
    
    IF remaining_count = 0 THEN
        ALTER TABLE knowledgebase DROP COLUMN embedding_json;
        RAISE NOTICE 'Coluna embedding_json removida com sucesso!';
    ELSE
        RAISE NOTICE 'ATENÇÃO: Ainda restam % registros não migrados. Não removendo coluna.', remaining_count;
    END IF;
END $$;

-- Criar índice vetorial para otimizar buscas
CREATE INDEX IF NOT EXISTS knowledgebase_embedding_idx 
ON knowledgebase 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Testar a função match_knowledgebase
WITH test_embedding AS (
  SELECT embedding 
  FROM knowledgebase 
  WHERE embedding IS NOT NULL 
  LIMIT 1
)
SELECT COUNT(*) as function_test_results
FROM match_knowledgebase(
  (SELECT embedding FROM test_embedding),
  0.5,
  5,
  'PLANO_DIRETOR'
);

-- Verificação final
SELECT 
  'Migração concluída!' as status,
  COUNT(*) as total_registros,
  COUNT(embedding) as com_embedding
FROM knowledgebase;