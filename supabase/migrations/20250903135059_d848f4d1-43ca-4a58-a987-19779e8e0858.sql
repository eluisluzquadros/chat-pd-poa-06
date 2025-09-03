-- CORREÇÃO DEFINITIVA DE DUPLICAÇÕES EM LEGAL_ARTICLES
-- Aplicar para todos os artigos reais (article_number < 9000)

-- 1. PARÁGRAFOS NUMERADOS DUPLICADOS (§ 1, § 2, § 3, etc.)
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
                      E'**§ 1**' || E'\n\n' || '**§ 1**',
                      '**§ 1**'
                    ),
                    E'**§ 2**' || E'\n\n' || '**§ 2**',
                    '**§ 2**'
                  ),
                  E'**§ 3**' || E'\n\n' || '**§ 3**',
                  '**§ 3**'
                ),
                E'**§ 4**' || E'\n\n' || '**§ 4**',
                '**§ 4**'
              ),
              E'**§ 5**' || E'\n\n' || '**§ 5**',
              '**§ 5**'
            ),
            E'**§ 6**' || E'\n\n' || '**§ 6**',
            '**§ 6**'
          ),
          E'**§ 7**' || E'\n\n' || '**§ 7**',
          '**§ 7**'
        ),
        E'**§ 8**' || E'\n\n' || '**§ 8**',
        '**§ 8**'
      ),
      E'**§ 9**' || E'\n\n' || '**§ 9**',
      '**§ 9**'
    ),
    E'**§ 10**' || E'\n\n' || '**§ 10**',
    '**§ 10**'
  ),
  updated_at = NOW()
WHERE article_number < 9000 
  AND (
    full_content LIKE '%**§ 1**' || E'\n\n' || '**§ 1**%' OR
    full_content LIKE '%**§ 2**' || E'\n\n' || '**§ 2**%' OR
    full_content LIKE '%**§ 3**' || E'\n\n' || '**§ 3**%' OR
    full_content LIKE '%**§ 4**' || E'\n\n' || '**§ 4**%' OR
    full_content LIKE '%**§ 5**' || E'\n\n' || '**§ 5**%' OR
    full_content LIKE '%**§ 6**' || E'\n\n' || '**§ 6**%' OR
    full_content LIKE '%**§ 7**' || E'\n\n' || '**§ 7**%' OR
    full_content LIKE '%**§ 8**' || E'\n\n' || '**§ 8**%' OR
    full_content LIKE '%**§ 9**' || E'\n\n' || '**§ 9**%' OR
    full_content LIKE '%**§ 10**' || E'\n\n' || '**§ 10**%'
  );

-- 2. PARÁGRAFO ÚNICO DUPLICADO
UPDATE legal_articles 
SET full_content = REPLACE(
    full_content,
    E'**Parágrafo único**' || E'\n\n' || '**Parágrafo único**',
    '**Parágrafo único**'
  ),
  updated_at = NOW()
WHERE article_number < 9000 
  AND full_content LIKE '%**Parágrafo único**' || E'\n\n' || '**Parágrafo único**%';

-- 3. INCISOS DUPLICADOS (I, II, III, etc.)
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
                    REPLACE(
                      REPLACE(
                        REPLACE(full_content,
                          E'**I –**' || E'\n\n' || '**I –**',
                          '**I –**'
                        ),
                        E'**II –**' || E'\n\n' || '**II –**',
                        '**II –**'
                      ),
                      E'**III –**' || E'\n\n' || '**III –**',
                      '**III –**'
                    ),
                    E'**IV –**' || E'\n\n' || '**IV –**',
                    '**IV –**'
                  ),
                  E'**V –**' || E'\n\n' || '**V –**',
                  '**V –**'
                ),
                E'**VI –**' || E'\n\n' || '**VI –**',
                '**VI –**'
              ),
              E'**VII –**' || E'\n\n' || '**VII –**',
              '**VII –**'
            ),
            E'**VIII –**' || E'\n\n' || '**VIII –**',
            '**VIII –**'
          ),
          E'**IX –**' || E'\n\n' || '**IX –**',
          '**IX –**'
        ),
        E'**X –**' || E'\n\n' || '**X –**',
        '**X –**'
      ),
      E'**XI –**' || E'\n\n' || '**XI –**',
      '**XI –**'
    ),
    E'**XII –**' || E'\n\n' || '**XII –**',
    '**XII –**'
  ),
  updated_at = NOW()
WHERE article_number < 9000 
  AND (
    full_content LIKE '%**I –**' || E'\n\n' || '**I –**%' OR
    full_content LIKE '%**II –**' || E'\n\n' || '**II –**%' OR
    full_content LIKE '%**III –**' || E'\n\n' || '**III –**%' OR
    full_content LIKE '%**IV –**' || E'\n\n' || '**IV –**%' OR
    full_content LIKE '%**V –**' || E'\n\n' || '**V –**%' OR
    full_content LIKE '%**VI –**' || E'\n\n' || '**VI –**%' OR
    full_content LIKE '%**VII –**' || E'\n\n' || '**VII –**%' OR
    full_content LIKE '%**VIII –**' || E'\n\n' || '**VIII –**%' OR
    full_content LIKE '%**IX –**' || E'\n\n' || '**IX –**%' OR
    full_content LIKE '%**X –**' || E'\n\n' || '**X –**%' OR
    full_content LIKE '%**XI –**' || E'\n\n' || '**XI –**%' OR
    full_content LIKE '%**XII –**' || E'\n\n' || '**XII –**%'
  );

-- 4. ALÍNEAS DUPLICADAS (a), b), c), etc.)
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
                      E'**a)**' || E'\n\n' || '**a)**',
                      '**a)**'
                    ),
                    E'**b)**' || E'\n\n' || '**b)**',
                    '**b)**'
                  ),
                  E'**c)**' || E'\n\n' || '**c)**',
                  '**c)**'
                ),
                E'**d)**' || E'\n\n' || '**d)**',
                '**d)**'
              ),
              E'**e)**' || E'\n\n' || '**e)**',
              '**e)**'
            ),
            E'**f)**' || E'\n\n' || '**f)**',
            '**f)**'
          ),
          E'**g)**' || E'\n\n' || '**g)**',
          '**g)**'
        ),
        E'**h)**' || E'\n\n' || '**h)**',
        '**h)**'
      ),
      E'**i)**' || E'\n\n' || '**i)**',
      '**i)**'
    ),
    E'**j)**' || E'\n\n' || '**j)**',
    '**j)**'
  ),
  updated_at = NOW()
WHERE article_number < 9000 
  AND (
    full_content LIKE '%**a)**' || E'\n\n' || '**a)**%' OR
    full_content LIKE '%**b)**' || E'\n\n' || '**b)**%' OR
    full_content LIKE '%**c)**' || E'\n\n' || '**c)**%' OR
    full_content LIKE '%**d)**' || E'\n\n' || '**d)**%' OR
    full_content LIKE '%**e)**' || E'\n\n' || '**e)**%' OR
    full_content LIKE '%**f)**' || E'\n\n' || '**f)**%' OR
    full_content LIKE '%**g)**' || E'\n\n' || '**g)**%' OR
    full_content LIKE '%**h)**' || E'\n\n' || '**h)**%' OR
    full_content LIKE '%**i)**' || E'\n\n' || '**i)**%' OR
    full_content LIKE '%**j)**' || E'\n\n' || '**j)**%'
  );

-- 5. VERIFICAÇÃO FINAL - Contar artigos ainda com duplicações
SELECT 
  'RESULTADO DA CORREÇÃO' as status,
  COUNT(*) as artigos_com_duplicacoes_restantes
FROM legal_articles 
WHERE article_number < 9000
  AND (
    full_content ~ '\*\*§ \d+\*\*.*\n\n\*\*§ \d+\*\*.*' OR
    full_content ~ '\*\*Parágrafo único\*\*.*\n\n\*\*Parágrafo único\*\*.*' OR
    full_content ~ '\*\*[IVX]+ –\*\*.*\n\n\*\*[IVX]+ –\*\*.*' OR
    full_content ~ '\*\*[a-j]\)\*\*.*\n\n\*\*[a-j]\)\*\*.*'
  );