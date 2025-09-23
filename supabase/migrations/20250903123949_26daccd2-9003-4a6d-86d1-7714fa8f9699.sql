-- Correção geral para todas as duplicações restantes
-- Usar uma abordagem mais agressiva

-- 1. Parágrafos numerados duplicados (§ 1, § 2, etc.)
UPDATE legal_articles 
SET full_content = regexp_replace(
  full_content,
  '(\*\*§ ([0-9]+)\*\* [^*]*?\n\n)\*\*§ \2\*\* [^*]*?(\n|$)',
  '\1',
  'g'
)
WHERE article_number < 9000
  AND full_content ~ '\*\*§ ([0-9]+)\*\* [^*]*?\n\n\*\*§ \1\*\* [^*]*?';

-- 2. Parágrafo único duplicado
UPDATE legal_articles 
SET full_content = regexp_replace(
  full_content,
  '(\*\*Parágrafo único\*\* [^*]*?\n\n)\*\*Parágrafo único\*\* [^*]*?(\n|$)',
  '\1',
  'g'
)
WHERE article_number < 9000
  AND full_content ~ '\*\*Parágrafo único\*\* [^*]*?\n\n\*\*Parágrafo único\*\* [^*]*?';

-- 3. Incisos duplicados (I, II, III, etc.)
UPDATE legal_articles 
SET full_content = regexp_replace(
  full_content,
  '(\*\*([IVX]+)\s*–\*\* [^*]*?\n\n)\*\*\2\s*–\*\* [^*]*?(\n|$)',
  '\1',
  'g'
)
WHERE article_number < 9000
  AND full_content ~ '\*\*([IVX]+)\s*–\*\* [^*]*?\n\n\*\*\1\s*–\*\* [^*]*?';