# Instruções para Deploy e SQL

## 1. Executar SQL no Supabase Dashboard

Acesse o SQL Editor do Supabase e execute este código:

```sql
-- Tabela para armazenar relatórios de testes automatizados
CREATE TABLE IF NOT EXISTS qa_automated_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  run_date timestamptz NOT NULL,
  scenarios_tested integer NOT NULL,
  all_passed boolean NOT NULL,
  critical_failures integer DEFAULT 0,
  results jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Índice para performance
CREATE INDEX idx_qa_automated_reports_run_date ON qa_automated_reports(run_date DESC);

-- Permissões
GRANT SELECT ON qa_automated_reports TO authenticated;
GRANT INSERT ON qa_automated_reports TO service_role;

-- View para monitoramento em tempo real
CREATE OR REPLACE VIEW qa_quality_monitoring AS
WITH recent_runs AS (
  SELECT 
    date_trunc('hour', started_at) as hour,
    AVG(overall_accuracy) as avg_accuracy,
    COUNT(*) as run_count,
    SUM(CASE WHEN overall_accuracy < 0.8 THEN 1 ELSE 0 END) as low_quality_runs
  FROM qa_validation_runs
  WHERE started_at >= NOW() - INTERVAL '24 hours'
    AND status = 'completed'
  GROUP BY date_trunc('hour', started_at)
),
recent_feedback AS (
  SELECT 
    date_trunc('hour', created_at) as hour,
    COUNT(CASE WHEN helpful = true THEN 1 END) as positive_feedback,
    COUNT(CASE WHEN helpful = false THEN 1 END) as negative_feedback,
    COUNT(*) as total_feedback
  FROM message_feedback
  WHERE created_at >= NOW() - INTERVAL '24 hours'
  GROUP BY date_trunc('hour', created_at)
)
SELECT 
  COALESCE(r.hour, f.hour) as hour,
  COALESCE(r.avg_accuracy, 0) as qa_accuracy,
  COALESCE(r.run_count, 0) as qa_runs,
  COALESCE(r.low_quality_runs, 0) as low_quality_runs,
  COALESCE(f.positive_feedback, 0) as positive_feedback,
  COALESCE(f.negative_feedback, 0) as negative_feedback,
  CASE 
    WHEN f.total_feedback > 0 THEN (f.positive_feedback::float / f.total_feedback) 
    ELSE NULL 
  END as user_satisfaction_rate,
  -- Alertas
  CASE 
    WHEN r.avg_accuracy < 0.8 THEN 'LOW_ACCURACY'
    WHEN r.low_quality_runs > 2 THEN 'MULTIPLE_FAILURES'
    WHEN f.negative_feedback > f.positive_feedback THEN 'USER_DISSATISFACTION'
    ELSE 'OK'
  END as alert_status
FROM recent_runs r
FULL OUTER JOIN recent_feedback f ON r.hour = f.hour
ORDER BY hour DESC;

-- Permissões para a view
GRANT SELECT ON qa_quality_monitoring TO authenticated;
```

## 2. Deploy da Edge Function

### Opção A: Via Supabase Dashboard
1. Acesse Functions no painel do Supabase
2. Encontre a função `qa-validator`
3. Clique em "Deploy" ou "Update"
4. Cole o código atualizado de `supabase/functions/qa-validator/index.ts`

### Opção B: Via CLI (se você tiver configurado)
```bash
cd C:\Users\User\Documents\GitHub\chat-pd-poa-06

# Se não estiver linkado, linkar primeiro:
npx supabase link --project-ref lxnlwgkdxrfhmbpqzvqv

# Deploy da função
npx supabase functions deploy qa-validator
```

## 3. Verificar Deploy

Após o deploy, teste executando uma validação QA e verifique:
1. Se executa todos os 38 testes
2. Se a barra de progresso aparece
3. Se o monitoramento em tempo real funciona

## 4. Adicionar Script de Testes ao package.json

Edite o `package.json` e adicione:

```json
"scripts": {
  "test:qa": "tsx scripts/run-qa-tests.ts"
}
```

## 5. Testar Monitoramento

Execute esta query para verificar o monitoramento:

```sql
SELECT * FROM qa_quality_monitoring;
```

---

**Nota:** As principais mudanças no qa-validator foram:
1. Remoção do limite de 25 testes
2. Update imediato do total_tests no banco
3. Melhor logging para debug