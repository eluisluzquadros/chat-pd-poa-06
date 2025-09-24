# Plano de Ação Emergencial - Sistema QA e Métricas

**Data:** 29/07/2025  
**Prioridade:** CRÍTICA  
**Prazo:** 48 horas

## 1. Problemas Críticos Identificados

### 🔴 P1: Sistema QA Não Atualiza Dashboard
- **Sintoma:** Execução parece completar mas dashboard não atualiza
- **Causa Provável:** Falta de refresh automático após conclusão
- **Impacto:** Não conseguimos validar melhorias

### 🔴 P2: Falta de Rastreamento Preciso de Tokens
- **Sintoma:** Métricas de uso imprecisas
- **Causa:** Sistema não rastreia tokens do QA validator
- **Impacto:** Impossível calcular custos reais

### 🔴 P3: Ausência de Estimativa de Custos
- **Sintoma:** Sem projeção mensal/anual
- **Causa:** Funcionalidade não implementada
- **Impacto:** Planejamento financeiro impossível

## 2. Soluções Imediatas

### Solução 1: Fix Sistema QA (4 horas)

```typescript
// 1. Adicionar auto-refresh no QADashboard.tsx
useEffect(() => {
  const interval = setInterval(() => {
    if (isRunning) {
      fetchData();
    }
  }, 5000); // Poll every 5 seconds
  
  return () => clearInterval(interval);
}, [isRunning]);

// 2. Adicionar callback de conclusão
const executeValidation = async (options) => {
  // ... existing code ...
  
  // Force refresh after completion
  setTimeout(() => {
    fetchData();
    checkRunStatus(validationRunId);
  }, 2000);
};

// 3. Implementar status check
const checkRunStatus = async (runId: string) => {
  const { data } = await supabase
    .from('qa_validation_runs')
    .select('status')
    .eq('id', runId)
    .single();
    
  if (data?.status === 'completed') {
    await fetchData();
    toast.success('Validação concluída! Dashboard atualizado.');
  }
};
```

### Solução 2: Rastreamento de Tokens QA (6 horas)

```typescript
// qa-validator/index.ts - Adicionar tracking
const trackQATokenUsage = async (
  model: string,
  question: string,
  response: string,
  validationRunId: string
) => {
  const inputTokens = estimateTokens(question);
  const outputTokens = estimateTokens(response);
  
  await supabase.from('qa_token_usage').insert({
    validation_run_id: validationRunId,
    model,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: inputTokens + outputTokens,
    estimated_cost: calculateCost(model, inputTokens, outputTokens)
  });
};

// Criar nova tabela qa_token_usage
CREATE TABLE qa_token_usage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  validation_run_id uuid REFERENCES qa_validation_runs(id),
  model text NOT NULL,
  input_tokens integer NOT NULL,
  output_tokens integer NOT NULL,
  total_tokens integer NOT NULL,
  estimated_cost numeric(10,6),
  created_at timestamptz DEFAULT now()
);
```

### Solução 3: Dashboard de Custos (8 horas)

```typescript
// Novo componente: CostProjectionDashboard.tsx
interface CostProjection {
  activeUsers: number;
  avgQueriesPerUser: number;
  avgTokensPerQuery: number;
  modelDistribution: Record<string, number>;
  monthlyCost: number;
  yearlyCost: number;
}

export function CostProjectionDashboard() {
  const calculateProjection = (users: number) => {
    const avgQueriesPerDay = 5;
    const avgTokensPerQuery = 500;
    const workingDaysPerMonth = 22;
    
    const monthlyQueries = users * avgQueriesPerDay * workingDaysPerMonth;
    const monthlyTokens = monthlyQueries * avgTokensPerQuery;
    
    // Assumindo uso principal de gpt-4o-mini
    const costPer1kTokens = 0.00015 + 0.0006; // input + output
    const monthlyCost = (monthlyTokens / 1000) * costPer1kTokens;
    
    return {
      monthly: monthlyCost,
      yearly: monthlyCost * 12,
      breakdown: {
        perUser: monthlyCost / users,
        perQuery: monthlyCost / monthlyQueries
      }
    };
  };
}
```

## 3. Implementação Passo a Passo

### Fase 1: Correção QA (Hoje - 4h)
1. [ ] Implementar auto-refresh no dashboard
2. [ ] Adicionar polling durante execução
3. [ ] Forçar atualização pós-conclusão
4. [ ] Testar ciclo completo

### Fase 2: Token Tracking (Hoje - 6h)
1. [ ] Criar migration para qa_token_usage
2. [ ] Implementar tracking no qa-validator
3. [ ] Adicionar métricas ao dashboard
4. [ ] Validar precisão dos cálculos

### Fase 3: Projeção de Custos (Amanhã - 8h)
1. [ ] Desenvolver componente de projeção
2. [ ] Integrar com dados reais de uso
3. [ ] Criar simulador interativo
4. [ ] Adicionar exportação de relatórios

## 4. Métricas de Sucesso

- ✅ Dashboard QA atualiza em tempo real
- ✅ 100% das execuções QA rastreadas
- ✅ Precisão de custos > 95%
- ✅ Projeções disponíveis para 10-10k usuários

## 5. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Timeout em validações grandes | Alta | Alto | Implementar paginação |
| Cálculo impreciso de tokens | Média | Médio | Usar tiktoken library |
| Performance do dashboard | Baixa | Baixo | Cache e otimização |

## 6. Código de Emergência

```bash
# Script para forçar atualização de runs travados
UPDATE qa_validation_runs 
SET status = 'failed', 
    error_message = 'Manual cleanup',
    completed_at = NOW()
WHERE status = 'running' 
AND started_at < NOW() - INTERVAL '30 minutes';
```

## 7. Checklist de Validação

- [ ] QA executa e atualiza dashboard
- [ ] Tokens são rastreados corretamente
- [ ] Custos batem com fatura OpenAI
- [ ] Projeções fazem sentido comercial
- [ ] Performance aceitável (<3s)

---

**AÇÃO IMEDIATA:** Começar pela correção do sistema QA para desbloquear validações.