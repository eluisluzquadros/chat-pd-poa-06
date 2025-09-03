-- CORREÇÃO DEFINITIVA DE DUPLICAÇÕES - ESTRATÉGIA ROBUSTA
-- Aplicar múltiplos REPLACE aninhados para garantir remoção completa

-- Correção de parágrafos numerados duplicados (§ 1, § 2, etc.)
UPDATE legal_articles 
SET full_content = 
  REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(
              REPLACE(
                REPLACE(
                  REPLACE(
                    REPLACE(full_content,
                      E'**§ 1**\n\n**§ 1**', '**§ 1**'),
                    E'**§ 2**\n\n**§ 2**', '**§ 2**'),
                  E'**§ 3**\n\n**§ 3**', '**§ 3**'),
                E'**§ 4**\n\n**§ 4**', '**§ 4**'),
              E'**§ 5**\n\n**§ 5**', '**§ 5**'),
            E'**§ 6**\n\n**§ 6**', '**§ 6**'),
          E'**§ 7**\n\n**§ 7**', '**§ 7**'),
        E'**§ 8**\n\n**§ 8**', '**§ 8**'),
      E'**§ 9**\n\n**§ 9**', '**§ 9**'),
    E'**§ 10**\n\n**§ 10**', '**§ 10**'),
  updated_at = NOW()
WHERE article_number < 9000 
  AND (
    full_content LIKE '%**§ 1**%**§ 1**%' OR
    full_content LIKE '%**§ 2**%**§ 2**%' OR
    full_content LIKE '%**§ 3**%**§ 3**%' OR
    full_content LIKE '%**§ 4**%**§ 4**%' OR
    full_content LIKE '%**§ 5**%**§ 5**%' OR
    full_content LIKE '%**§ 6**%**§ 6**%' OR
    full_content LIKE '%**§ 7**%**§ 7**%' OR
    full_content LIKE '%**§ 8**%**§ 8**%' OR
    full_content LIKE '%**§ 9**%**§ 9**%' OR
    full_content LIKE '%**§ 10**%**§ 10**%'
  );

-- Correção de "Parágrafo único" duplicado
UPDATE legal_articles 
SET full_content = REPLACE(full_content, 
    E'**Parágrafo único**\n\n**Parágrafo único**', 
    '**Parágrafo único**'),
  updated_at = NOW()
WHERE article_number < 9000 
  AND full_content LIKE '%**Parágrafo único**%**Parágrafo único**%';

-- Correção de Incisos duplicados (I, II, III, etc.)
UPDATE legal_articles 
SET full_content = 
  REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(
              REPLACE(
                REPLACE(full_content,
                  E'**I –**\n\n**I –**', '**I –**'),
                E'**II –**\n\n**II –**', '**II –**'),
              E'**III –**\n\n**III –**', '**III –**'),
            E'**IV –**\n\n**IV –**', '**IV –**'),
          E'**V –**\n\n**V –**', '**V –**'),
        E'**VI –**\n\n**VI –**', '**VI –**'),
      E'**VII –**\n\n**VII –**', '**VII –**'),
    E'**VIII –**\n\n**VIII –**', '**VIII –**'),
  updated_at = NOW()
WHERE article_number < 9000 
  AND (
    full_content LIKE '%**I –**%**I –**%' OR
    full_content LIKE '%**II –**%**II –**%' OR
    full_content LIKE '%**III –**%**III –**%' OR
    full_content LIKE '%**IV –**%**IV –**%' OR
    full_content LIKE '%**V –**%**V –**%' OR
    full_content LIKE '%**VI –**%**VI –**%' OR
    full_content LIKE '%**VII –**%**VII –**%' OR
    full_content LIKE '%**VIII –**%**VIII –**%'
  );

-- Limpeza de espaços extras
UPDATE legal_articles 
SET full_content = REGEXP_REPLACE(full_content, E'\n\n\n+', E'\n\n', 'g'),
    updated_at = NOW()
WHERE article_number < 9000 
  AND full_content ~ E'\n\n\n+';

-- RELATÓRIO FINAL: Verificar se ainda existem duplicações
SELECT 
  'RELATÓRIO DE DUPLICAÇÕES APÓS CORREÇÃO' as relatorio,
  COUNT(*) as total_artigos_com_duplicacoes
FROM legal_articles 
WHERE article_number < 9000 
  AND (
    full_content ~ '\*\*§ (\d+)\*\*.*\n\n\*\*§ \1\*\*' OR
    full_content ~ '\*\*Parágrafo único\*\*.*\n\n\*\*Parágrafo único\*\*' OR
    full_content ~ '\*\*I\s*–\*\*.*\n\n\*\*I\s*–\*\*' OR
    full_content ~ '\*\*II\s*–\*\*.*\n\n\*\*II\s*–\*\*' OR
    full_content ~ '\*\*III\s*–\*\*.*\n\n\*\*III\s*–\*\*'
  );