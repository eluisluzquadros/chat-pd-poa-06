-- ============================================================
-- ATUALIZAÇÃO: Art. 4º LUOS - Conteúdo Correto Fornecido
-- ============================================================
-- O usuário forneceu o conteúdo correto do Art. 4º que estava faltando
-- ============================================================

-- Inserir/Atualizar o Art. 4º com o conteúdo correto
INSERT INTO legal_articles (
    document_type,
    article_number,
    article_text,
    full_content,
    keywords
) VALUES (
    'LUOS',
    4,
    'O zoneamento do Município por Zonas de Ordenamento Territorial (ZOT) classifica o território conforme suas características e estratégias de desenvolvimento local, em conformidade com o Macrozoneamento estabelecido pelo Plano Diretor.',
    'Art. 4º O zoneamento do Município por Zonas de Ordenamento Territorial (ZOT) classifica o território conforme suas características e estratégias de desenvolvimento local, em conformidade com o Macrozoneamento estabelecido pelo Plano Diretor.',
    ARRAY['LUOS', 'Art. 4', 'zoneamento', 'ZOT', 'Zonas de Ordenamento Territorial', 'macrozoneamento', 'Plano Diretor', 'desenvolvimento local', 'classificação territorial']
) ON CONFLICT (document_type, article_number) 
DO UPDATE SET
    article_text = EXCLUDED.article_text,
    full_content = EXCLUDED.full_content,
    keywords = EXCLUDED.keywords,
    updated_at = CURRENT_TIMESTAMP;

-- Verificar se foi inserido corretamente
SELECT 
    article_number,
    article_text,
    CASE 
        WHEN full_content IS NOT NULL AND full_content NOT LIKE '%LACUNA%' THEN '✅ Conteúdo correto inserido'
        ELSE '❌ Problema na inserção'
    END as status
FROM legal_articles
WHERE document_type = 'LUOS' 
    AND article_number = 4;

-- Verificar sequência completa dos primeiros artigos
SELECT 
    article_number,
    LEFT(article_text, 80) || '...' as preview,
    CASE 
        WHEN article_text LIKE '%[%' THEN '⚠️ Placeholder'
        ELSE '✅ Conteúdo completo'
    END as status
FROM legal_articles
WHERE document_type = 'LUOS' 
    AND article_number BETWEEN 1 AND 5
ORDER BY article_number;

-- ============================================================
-- RESULTADO ESPERADO:
-- Art. 1: ✅ Conteúdo completo
-- Art. 2: ✅ Conteúdo completo  
-- Art. 3: ✅ Conteúdo completo
-- Art. 4: ✅ Conteúdo completo (AGORA CORRIGIDO!)
-- Art. 5: ✅ Conteúdo completo
-- ============================================================