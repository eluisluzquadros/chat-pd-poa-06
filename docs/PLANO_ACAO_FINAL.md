# 🎯 Plano de Ação - Sistema Chat PD POA
*Atualizado: 04/08/2025 17:35*

## 🚨 Ações Críticas Imediatas (Próximas 2 horas)

### 1. Corrigir Schema do Banco de Dados
**Problema**: Incompatibilidade de tipos UUID vs INTEGER

**Solução A - Migração (Recomendada)**:
```sql
-- Migration: Alterar test_case_id para aceitar ambos os tipos
ALTER TABLE qa_validation_results 
ALTER COLUMN test_case_id TYPE VARCHAR(255);

-- Ou adicionar campo UUID em qa_test_cases
ALTER TABLE qa_test_cases 
ADD COLUMN uuid UUID DEFAULT gen_random_uuid();
```

**Solução B - Workaround (Temporária)**:
- Continuar usando UUIDs placeholder gerados pelo código
- Formato: `00000000-0000-0000-0000-000000000XXX`

### 2. Debug Dashboard - Resultados Não Aparecem
**Investigar**:
1. Verificar se os dados estão sendo salvos corretamente:
```sql
SELECT COUNT(*) FROM qa_validation_results 
WHERE validation_run_id IN (
  SELECT id FROM qa_validation_runs 
  ORDER BY started_at DESC LIMIT 5
);
```

2. Verificar componente React `QADashboard.tsx`:
- Confirmar que está buscando com o campo correto
- Debug do estado após fetch dos resultados

3. Verificar CORS e permissões RLS no Supabase

### 3. Executar Validação Completa
**Comando**:
```javascript
// Script para rodar todos os 127 testes
import { validateAll } from './scripts/validate-all.js';
await validateAll({
  model: 'openai/gpt-3.5-turbo',
  batchSize: 10,
  saveResults: true
});
```

## 📊 Ações de Curto Prazo (Próxima Semana)

### 1. Análise de Padrões de Erro
**Objetivo**: Identificar tipos de perguntas que falham

**Metodologia**:
```sql
-- Query para análise
SELECT 
  tc.category,
  tc.difficulty,
  AVG(vr.accuracy_score) as avg_accuracy,
  COUNT(*) as total_tests,
  SUM(CASE WHEN vr.is_correct THEN 1 ELSE 0 END) as correct_count
FROM qa_validation_results vr
JOIN qa_test_cases tc ON tc.id::varchar = vr.test_case_id
GROUP BY tc.category, tc.difficulty
ORDER BY avg_accuracy ASC;
```

**Ações baseadas em resultados**:
- Se falhas em categoria específica → ajustar prompts
- Se falhas em SQL → melhorar sql-generator
- Se falhas em conceitos → enriquecer embeddings

### 2. Otimização de Performance
**Meta**: Reduzir tempo de resposta de 7s para <3s

**Estratégias**:
1. **Cache de Embeddings**:
```typescript
// Implementar cache Redis
const cachedEmbedding = await redis.get(`embedding:${query}`);
if (cachedEmbedding) return JSON.parse(cachedEmbedding);
```

2. **Paralelização**:
```typescript
// Executar query-analyzer e embeddings em paralelo
const [analysis, embeddings] = await Promise.all([
  analyzeQuery(query),
  getEmbeddings(query)
]);
```

3. **Índices PostgreSQL**:
```sql
CREATE INDEX idx_qa_test_cases_active ON qa_test_cases(is_active);
CREATE INDEX idx_qa_validation_results_run ON qa_validation_results(validation_run_id);
```

### 3. Melhorias no RAG
**Baseado nos resultados de validação**:

1. **Ajuste de Prompts**:
```typescript
// Template melhorado baseado em erros comuns
const improvedPrompt = `
Contexto: Plano Diretor de Porto Alegre
Instruções específicas:
- Para questões sobre zonas: sempre citar artigos específicos
- Para questões numéricas: fornecer valores exatos
- Para questões de procedimento: detalhar passo a passo
`;
```

2. **Chunking Hierárquico Melhorado**:
```typescript
// Implementar overlap inteligente
const chunks = createHierarchicalChunks(document, {
  maxSize: 1500,
  overlap: 200,
  preserveContext: true
});
```

## 🚀 Ações de Médio Prazo (Próximo Mês)

### 1. Sistema de Feedback Contínuo
**Implementação**:
- Interface para usuários marcarem respostas como corretas/incorretas
- Pipeline automático de re-treinamento baseado em feedback
- A/B testing de diferentes estratégias de RAG

### 2. Monitoramento e Alertas
**Métricas para monitorar**:
- Taxa de acurácia por hora/dia
- Tempo médio de resposta
- Taxa de erro por modelo LLM
- Uso de tokens e custos

**Implementar**:
```typescript
// Sistema de alertas
if (accuracy < 0.8) {
  await sendAlert({
    type: 'LOW_ACCURACY',
    value: accuracy,
    timestamp: new Date()
  });
}
```

### 3. Documentação e Treinamento
**Criar**:
- Guia de troubleshooting para problemas comuns
- Documentação de API para cada Edge Function
- Tutorial de como adicionar novos modelos LLM
- Playbook de manutenção

## 📈 Métricas de Sucesso

### KPIs Principais
| Métrica | Baseline | Semana 1 | Semana 2 | Meta Final |
|---------|----------|----------|----------|------------|
| Acurácia | 60% | 70% | 80% | 90%+ |
| Tempo Resposta | 7s | 5s | 4s | <3s |
| Taxa de Erro | 5% | 3% | 2% | <1% |
| Satisfação Usuário | - | 70% | 80% | 90%+ |

### Checkpoints
- [ ] **Dia 1**: Schema corrigido, Dashboard funcional
- [ ] **Dia 3**: Primeira análise completa de 127 casos
- [ ] **Semana 1**: Acurácia >70%, identificados principais gaps
- [ ] **Semana 2**: Implementadas otimizações, acurácia >80%
- [ ] **Mês 1**: Sistema em produção com monitoramento completo

## 🛠️ Stack Técnico e Ferramentas

### Ferramentas de Debug
```bash
# Logs de Edge Functions
npx supabase functions logs qa-validator --tail

# SQL direto no banco
npx supabase db execute "SELECT * FROM qa_validation_results LIMIT 10"

# Test local de Edge Function
npx supabase functions serve qa-validator
```

### Scripts Úteis
```javascript
// validate-single.js - Testar caso específico
// validate-batch.js - Testar lote de casos
// analyze-results.js - Analisar resultados de validação
// export-metrics.js - Exportar métricas para análise
```

## 🔄 Processo de Melhoria Contínua

### Ciclo Semanal
1. **Segunda**: Análise de métricas da semana anterior
2. **Terça**: Implementação de melhorias prioritárias
3. **Quarta**: Testes de validação
4. **Quinta**: Ajustes baseados em resultados
5. **Sexta**: Deploy e documentação

### Review Mensal
- Análise profunda de todos os casos de falha
- Revisão de arquitetura e possíveis refatorações
- Planejamento de features para próximo mês
- Atualização de documentação

## 💡 Lições Aprendidas

1. **Sempre validar tipos de dados** entre tabelas relacionadas
2. **Edge Functions precisam de service role key** para chamadas internas
3. **Logs detalhados são essenciais** para debug em produção
4. **Testes incrementais** (1, 10, 100 casos) economizam tempo
5. **Documentar decisões de arquitetura** previne confusões futuras

## 📞 Contatos e Suporte

- **Dashboard Local**: http://localhost:8080
- **Supabase Project**: ngrqwmvuhvjkeohesbxs
- **Documentação**: `/docs` folder
- **Scripts**: `/scripts` folder

---

*Este plano de ação é um documento vivo e deve ser atualizado conforme o progresso das implementações.*