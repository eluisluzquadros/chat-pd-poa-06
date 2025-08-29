-- Limpar cache de respostas do RAG
-- O cache está armazenando respostas antigas e incorretas

-- 1. Verificar se existe tabela de cache
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%cache%';

-- 2. Limpar cache de mensagens se existir
DELETE FROM message_cache 
WHERE created_at < NOW() - INTERVAL '1 hour';

-- 3. Se houver tabela de cache de respostas
TRUNCATE TABLE response_cache CASCADE;

-- 4. Verificar tabelas relacionadas a cache
SELECT * FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%cache%';

-- 5. Limpar qualquer cache relacionado ao Cristal
DELETE FROM message_cache WHERE content ILIKE '%cristal%';
DELETE FROM response_cache WHERE query ILIKE '%cristal%' OR response ILIKE '%cristal%';

-- 6. Forçar limpeza de cache do Redis se estiver sendo usado
-- (Isso precisa ser feito fora do SQL, no dashboard do Supabase)