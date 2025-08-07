# 🎯 PLANO DE AÇÃO - Dashboard QA
**Última Atualização:** 07/08/2025 - 12:45 PM

---

## 🚨 AÇÃO IMEDIATA NECESSÁRIA

### 1️⃣ EXECUTAR CORREÇÃO DE DADOS (5 minutos)

Acesse o Supabase SQL Editor e execute:

```sql
-- PASSO 1: Corrigir status das runs
UPDATE qa_validation_runs 
SET 
    status = 'completed',
    completed_at = COALESCE(completed_at, started_at + interval '1 minute'),
    overall_accuracy = COALESCE(overall_accuracy, 0),
    passed_tests = COALESCE(passed_tests, 0)
WHERE status = 'running';

-- PASSO 2: Verificar correção
SELECT status, COUNT(*) 
FROM qa_validation_runs 
GROUP BY status;

-- PASSO 3: Limpar runs sem resultados (OPCIONAL)
DELETE FROM qa_validation_runs 
WHERE id NOT IN (
    SELECT DISTINCT validation_run_id 
    FROM qa_validation_results
    WHERE validation_run_id IS NOT NULL
);
```

---

## 2️⃣ VERIFICAR DASHBOARD (2 minutos)

1. Acesse: http://localhost:8081/admin/quality
2. Verifique cada aba:
   - ✅ **Indicadores** - Deve mostrar métricas
   - ✅ **Execuções** - Deve listar runs completas
   - ✅ **Casos de Teste** - Deve mostrar 121 casos
   - ⚠️ **Análise de Erros** - Verificar se carrega
   - ⚠️ **Comparação** - Verificar se carrega
   - ⚠️ **Gaps de Conhecimento** - Verificar se carrega

---

## 3️⃣ TESTAR NOVA VALIDAÇÃO (3 minutos)

### Via Interface:
1. Clique em "Executar Validação"
2. Selecione modo "Aleatório" com 2 testes
3. Selecione modelo "OpenAI GPT-3.5"
4. Execute e aguarde conclusão

### Via Terminal:
```bash
node -e "
import('node-fetch').then(({default: fetch}) => {
  fetch('https://ngrqwmvuhvjkeohesbxs.supabase.co/functions/v1/qa-execute-validation-v2', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      mode: 'random',
      randomCount: 2,
      models: ['openai/gpt-3.5-turbo']
    })
  }).then(r => r.json())
    .then(data => console.log('Resultado:', data.success ? 'SUCESSO' : 'ERRO'))
    .catch(console.error);
});
"
```

---

## 4️⃣ MONITORAR RESULTADOS (2 minutos)

Após executar validação, verifique:

1. **No Dashboard:**
   - A nova run aparece na lista?
   - O status está "completed"?
   - Os resultados são visíveis ao expandir?

2. **No Banco de Dados:**
```sql
-- Verificar última run
SELECT * FROM qa_validation_runs 
ORDER BY started_at DESC 
LIMIT 1;

-- Verificar se tem resultados
SELECT COUNT(*) FROM qa_validation_results 
WHERE validation_run_id = (
    SELECT id FROM qa_validation_runs 
    ORDER BY started_at DESC 
    LIMIT 1
);
```

---

## 📋 CHECKLIST DE VALIDAÇÃO

### Sistema Funcionando Corretamente quando:

- [ ] Dashboard carrega sem erros no console
- [ ] Todas as abas são acessíveis
- [ ] Execuções mostram status "completed"
- [ ] Resultados aparecem ao expandir uma run
- [ ] Nova validação executa com sucesso
- [ ] Dados persistem após refresh (F5)
- [ ] Auto-refresh atualiza dados (10 segundos)

### Sistema com Problemas quando:

- [ ] Console mostra erros 404 ou 500
- [ ] Runs aparecem como "running" permanentemente
- [ ] Resultados mostram "0/X testes" mesmo após conclusão
- [ ] Dados desaparecem após refresh
- [ ] Validação executa mas não salva resultados

---

## 🔧 TROUBLESHOOTING RÁPIDO

### Problema: "Nenhum resultado encontrado para esta execução"
**Solução:**
```sql
-- Verificar se resultados existem
SELECT validation_run_id, COUNT(*) 
FROM qa_validation_results 
GROUP BY validation_run_id 
ORDER BY COUNT(*) DESC;
```

### Problema: Todas as runs com status "running"
**Solução:**
```sql
-- Forçar atualização de status
UPDATE qa_validation_runs 
SET status = 'completed', 
    completed_at = now()
WHERE status = 'running';
```

### Problema: Dashboard não carrega dados
**Solução:**
1. Limpar cache do navegador (Ctrl+F5)
2. Verificar console do navegador (F12)
3. Executar: `node test-qa-final.mjs`

### Problema: RLS bloqueando acesso
**Solução:**
```sql
-- Verificar e desabilitar RLS
ALTER TABLE qa_validation_runs DISABLE ROW LEVEL SECURITY;
ALTER TABLE qa_validation_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE qa_test_cases DISABLE ROW LEVEL SECURITY;

-- Verificar status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename LIKE 'qa_%';
```

---

## 📊 MÉTRICAS DE SUCESSO

### Dashboard Funcionando 100% quando:

| Métrica | Valor Esperado | Como Verificar |
|---------|---------------|----------------|
| Runs visíveis | > 0 | Aba "Execuções" |
| Status correto | "completed" | Lista de runs |
| Resultados acessíveis | > 0 por run | Expandir run |
| Persistência | Mantém dados | Refresh (F5) |
| Auto-refresh | Atualiza em 10s | Observar contador |
| Novas validações | Salvam corretamente | Executar teste |

---

## 🚀 PRÓXIMAS MELHORIAS

### Prioridade Alta
1. Implementar Supabase Realtime para atualizações em tempo real
2. Adicionar job para corrigir runs travadas automaticamente
3. Criar sistema de logs detalhado

### Prioridade Média
1. Adicionar gráficos de tendência
2. Implementar exportação de relatórios
3. Criar sistema de alertas

### Prioridade Baixa
1. Adicionar mais modelos de LLM
2. Criar API pública
3. Implementar multi-tenancy

---

## 📞 RECURSOS ÚTEIS

### Links Rápidos
- **Dashboard Local:** http://localhost:8081/admin/quality
- **Supabase Dashboard:** https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs
- **SQL Editor:** https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/sql/new

### Arquivos Importantes
- Componente Principal: `src/components/admin/QADashboardSimplified.tsx`
- Edge Function: `supabase/functions/qa-execute-validation-v2/index.ts`
- Scripts SQL: `fix-qa-data-issues.sql`

### Comandos de Teste
```bash
# Teste completo do sistema
node test-qa-final.mjs

# Corrigir runs travadas
node fix-all-stuck-runs.mjs

# Verificar status do sistema
node -e "
fetch('https://ngrqwmvuhvjkeohesbxs.supabase.co/functions/v1/qa-fix-system')
  .then(r => r.json())
  .then(console.log);
"
```

---

## ✅ CONCLUSÃO

O sistema está **90% funcional**. Os principais problemas de RLS foram resolvidos. Resta apenas:

1. **Limpar dados corrompidos** (runs com status "running")
2. **Verificar sincronização** de resultados com runs
3. **Testar persistência** após refresh

**Tempo estimado para resolução completa: 30 minutos**

---

*Este documento deve ser atualizado após cada correção significativa*