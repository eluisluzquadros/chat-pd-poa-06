-- FASE 1.3: Verificar configuração das secrets
-- Execute este script para confirmar que as chaves foram inseridas corretamente

-- Verificar se secrets foram criadas (mostra apenas os primeiros 10 caracteres por segurança)
SELECT 
    id,
    name, 
    substring(value, 1, 10) || '...' as value_preview,
    created_at,
    updated_at
FROM secrets
ORDER BY name;

-- Verificar quantidade de secrets
SELECT COUNT(*) as total_secrets FROM secrets;

-- Verificar se a tabela tem RLS habilitado
SELECT 
    schemaname, 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE tablename = 'secrets';