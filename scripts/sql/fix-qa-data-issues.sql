-- ============================================
-- CORRIGIR PROBLEMAS DE DADOS NO SISTEMA QA
-- ============================================

-- 1. CORRIGIR TODAS AS RUNS COM STATUS "RUNNING"
UPDATE qa_validation_runs 
SET 
    status = 'completed',
    completed_at = COALESCE(completed_at, started_at + interval '1 minute'),
    overall_accuracy = COALESCE(overall_accuracy, 0),
    passed_tests = COALESCE(passed_tests, 0)
WHERE status = 'running';

-- 2. VERIFICAR RUNS SEM RESULTADOS
WITH runs_without_results AS (
    SELECT r.id, r.model, r.total_tests, r.started_at
    FROM qa_validation_runs r
    LEFT JOIN qa_validation_results res ON res.validation_run_id = r.id
    WHERE res.id IS NULL
    GROUP BY r.id, r.model, r.total_tests, r.started_at
)
SELECT 
    COUNT(*) as runs_sem_resultados,
    STRING_AGG(id::text, ', ') as run_ids
FROM runs_without_results;

-- 3. LIMPAR RUNS VAZIAS (OPCIONAL - DESCOMENTE SE QUISER DELETAR)
-- DELETE FROM qa_validation_runs 
-- WHERE id NOT IN (
--     SELECT DISTINCT validation_run_id 
--     FROM qa_validation_results
-- );

-- 4. VERIFICAR ESTATÍSTICAS ATUAIS
SELECT 
    'Total de Runs' as metrica,
    COUNT(*)::text as valor
FROM qa_validation_runs
UNION ALL
SELECT 
    'Runs Completas',
    COUNT(*)::text
FROM qa_validation_runs
WHERE status = 'completed'
UNION ALL
SELECT 
    'Runs com Resultados',
    COUNT(DISTINCT r.id)::text
FROM qa_validation_runs r
INNER JOIN qa_validation_results res ON res.validation_run_id = r.id
UNION ALL
SELECT 
    'Total de Resultados',
    COUNT(*)::text
FROM qa_validation_results
UNION ALL
SELECT 
    'Casos de Teste Ativos',
    COUNT(*)::text
FROM qa_test_cases
WHERE is_active = true;

-- 5. LISTAR ÚLTIMAS 5 RUNS COM CONTAGEM DE RESULTADOS
SELECT 
    r.id,
    r.model,
    r.status,
    r.total_tests,
    COUNT(res.id) as resultados_salvos,
    r.started_at
FROM qa_validation_runs r
LEFT JOIN qa_validation_results res ON res.validation_run_id = r.id
GROUP BY r.id, r.model, r.status, r.total_tests, r.started_at
ORDER BY r.started_at DESC
LIMIT 5;

-- 6. MENSAGEM FINAL
SELECT 
    '✅ CORREÇÕES APLICADAS' as status,
    'Runs com status "running" foram marcadas como "completed"' as acao,
    current_timestamp as executado_em;