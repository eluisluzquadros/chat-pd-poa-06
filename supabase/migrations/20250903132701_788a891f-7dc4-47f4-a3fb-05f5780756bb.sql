-- Correção final usando REPLACE mais simples
UPDATE legal_articles 
SET full_content = REPLACE(
  full_content,
  '**§ 1** O PDUS abrange a totalidade do território do município.

**§ 1** O PDUS abrange a totalidade do território do município.',
  '**§ 1** O PDUS abrange a totalidade do território do município.'
)
WHERE id = 1;

UPDATE legal_articles 
SET full_content = REPLACE(
  full_content,
  '**§ 2** O PDUS destina-se a orientar o ordenamento, o uso e a ocupação do solo urbano, a elaboração dos demais planos urbanísticos, as políticas públicas e as prioridades para a aplicação de recursos orçamentários com impacto territorial.

**§ 2** O PDUS destina-se a orientar o ordenamento, o uso e a ocupação do solo urbano, a elaboração dos demais planos urbanísticos, as políticas públicas e as prioridades para a aplicação de recursos orçamentários com impacto territorial.',
  '**§ 2** O PDUS destina-se a orientar o ordenamento, o uso e a ocupação do solo urbano, a elaboração dos demais planos urbanísticos, as políticas públicas e as prioridades para a aplicação de recursos orçamentários com impacto territorial.'
)
WHERE id = 1;

UPDATE legal_articles 
SET full_content = REPLACE(
  full_content,
  '**§ 3** No desenvolvimento da política urbana, dos planos, programas e projetos urbanísticos, na aplicação, na alteração e na interpretação desta Lei Complementar, levar- se-ão em conta os seus objetivos, estratégias e diretrizes.

**§ 3** No desenvolvimento da política urbana, dos planos, programas e projetos urbanísticos, na aplicação, na alteração e na interpretação desta Lei Complementar, levar- se-ão em conta os seus objetivos, estratégias e diretrizes.',
  '**§ 3** No desenvolvimento da política urbana, dos planos, programas e projetos urbanísticos, na aplicação, na alteração e na interpretação desta Lei Complementar, levar- se-ão em conta os seus objetivos, estratégias e diretrizes.'
)
WHERE id = 1;