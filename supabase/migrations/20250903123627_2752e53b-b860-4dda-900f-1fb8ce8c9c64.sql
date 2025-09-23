-- Correção direta das duplicações usando REPLACE
-- Art. 1 específico primeiro
UPDATE legal_articles 
SET full_content = regexp_replace(
  full_content,
  '(\*\*§ 1\*\* O PDUS abrange a totalidade do território do município\.)\n\n\*\*§ 1\*\* O PDUS abrange a totalidade do território do município\.',
  '\1',
  'g'
)
WHERE id = 1;

-- Corrigir § 2 duplicado no Art. 1
UPDATE legal_articles 
SET full_content = regexp_replace(
  full_content,
  '(\*\*§ 2\*\* O PDUS destina-se a orientar o ordenamento, o uso e a ocupação do solo urbano, a elaboração dos demais planos urbanísticos, as políticas públicas e as prioridades para a aplicação de recursos orçamentários com impacto territorial\.)\n\n\*\*§ 2\*\* O PDUS destina-se a orientar o ordenamento, o uso e a ocupação do solo urbano, a elaboração dos demais planos urbanísticos, as políticas públicas e as prioridades para a aplicação de recursos orçamentários com impacto territorial\.',
  '\1',
  'g'
)
WHERE id = 1;

-- Corrigir § 3 duplicado no Art. 1
UPDATE legal_articles 
SET full_content = regexp_replace(
  full_content,
  '(\*\*§ 3\*\* No desenvolvimento da política urbana, dos planos, programas e projetos urbanísticos, na aplicação, na alteração e na interpretação desta Lei Complementar, levar- se-ão em conta os seus objetivos, estratégias e diretrizes\.)\n\n\*\*§ 3\*\* No desenvolvimento da política urbana, dos planos, programas e projetos urbanísticos, na aplicação, na alteração e na interpretação desta Lei Complementar, levar- se-ão em conta os seus objetivos, estratégias e diretrizes\.',
  '\1',
  'g'
)
WHERE id = 1;