-- ============================================
-- CORREÇÃO MÍNIMA DE SEGURANÇA RLS
-- Apenas habilitar RLS nas tabelas existentes
-- ============================================

-- Habilitar RLS nas duas tabelas críticas que têm políticas mas RLS desabilitado
ALTER TABLE public.qa_test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regime_urbanistico_consolidado ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS em tabelas existentes que precisam de proteção
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Verificar resultado
SELECT 
    tablename,
    rowsecurity AS rls_enabled,
    'RLS habilitado com sucesso' AS resultado
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('qa_test_cases', 'regime_urbanistico_consolidado', 'messages', 'chat_memory', 'sessions')
ORDER BY tablename;