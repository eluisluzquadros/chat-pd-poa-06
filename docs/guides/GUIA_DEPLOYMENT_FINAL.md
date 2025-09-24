# 🚀 Guia de Deployment Final - Chat PD POA

## 📋 Checklist de Pré-Deployment

### ✅ O que já foi implementado:
- Sistema de cache avançado com TTL e invalidação
- 13 índices compostos otimizados para performance
- Processamento de 772 registros de regime urbanístico
- Sistema completo de feedback e métricas
- Knowledge gaps detection com IA
- Multi-LLM com 12 modelos integrados
- Paginação cursor-based
- Otimização match_hierarchical (67% mais rápida)

### 🎯 Ações de Deployment Necessárias:

---

## 1️⃣ Aplicar Migrações SQL no Dashboard do Supabase

### 📍 Onde executar:
**Dashboard SQL Editor**: https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/sql

### 📄 Arquivo a executar:
**`TODAS_MIGRACOES_SQL_CONSOLIDADAS.sql`** (465 linhas)

### 🔧 Como executar:

1. **Acesse o SQL Editor** do Supabase
2. **Copie todo o conteúdo** do arquivo `TODAS_MIGRACOES_SQL_CONSOLIDADAS.sql`
3. **Cole no editor SQL**
4. **Clique em "Run"** (ou pressione Ctrl+Enter)

### ⚠️ Ordem IMPORTANTE das migrações:
1. Sistema de Cache (tabela query_cache)
2. Índices Compostos (13 índices)
3. Otimização match_hierarchical_documents
4. Sistema de Feedback (3 tabelas)
5. Knowledge Gaps (3 tabelas)
6. Métricas Multi-LLM (2 tabelas)
7. Regime Urbanístico (2 tabelas)

### 🔍 Verificação pós-migração:
```sql
-- Execute esta query para verificar se todas as tabelas foram criadas:
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'query_cache', 'match_hierarchical_cache', 'feedback_alerts',
    'session_quality_metrics', 'model_performance_metrics',
    'knowledge_gaps', 'knowledge_gap_content', 'knowledge_gap_resolutions',
    'llm_metrics', 'llm_model_registry', 'regime_urbanistico', 'zots_bairros'
);
-- Deve retornar 12 linhas
```

---

## 2️⃣ Deploy das Edge Functions Atualizadas

### 📁 Functions a fazer deploy:

#### A. **enhanced-vector-search** (Atualizada com fuzzy search)
```bash
cd supabase/functions/enhanced-vector-search
supabase functions deploy enhanced-vector-search
```

#### B. **agent-rag** (Nova com multi-LLM)
```bash
cd supabase/functions/agent-rag
supabase functions deploy agent-rag
```

#### C. **response-synthesizer** (Com formatação inteligente)
```bash
cd supabase/functions/response-synthesizer
supabase functions deploy response-synthesizer
```

#### D. **contextual-scoring** (Sistema de pontuação)
```bash
cd supabase/functions/contextual-scoring
supabase functions deploy contextual-scoring
```

### 🚀 Deploy em lote (recomendado):
```bash
# Na raiz do projeto, execute:
npm run deploy-functions
```

Ou manualmente:
```bash
# Deploy todas as functions de uma vez
for func in enhanced-vector-search agent-rag response-synthesizer contextual-scoring; do
  echo "Deploying $func..."
  supabase functions deploy $func --project-ref ngrqwmvuhvjkeohesbxs
done
```

### ✅ Verificar deploy:
```bash
# Listar functions deployadas
supabase functions list --project-ref ngrqwmvuhvjkeohesbxs
```

---

## 3️⃣ Importar Dados de Regime Urbanístico

### 📊 Dados a importar:
- **387 registros** de regime urbanístico
- **385 registros** de ZOTs vs Bairros
- **Total: 772 registros**

### 🔧 Método 1 - Via NPM (Recomendado):
```bash
# Verificar status atual
npm run regime:status

# Executar importação completa
npm run regime:full-setup

# Monitorar progresso em tempo real
npm run regime:monitor
```

### 🔧 Método 2 - Script Direto:
```bash
# Importação direta (mais rápida)
node scripts/import-regime-direct.mjs

# Validar importação
node scripts/test-regime-import.mjs
```

### 📈 Progresso esperado:
- Tempo total: ~30-60 segundos
- Taxa: ~12-25 registros/segundo
- Logs salvos em: `logs/import-regime-[timestamp].log`

### ✅ Verificação pós-importação:
```sql
-- No SQL Editor do Supabase
SELECT 
  'regime_urbanistico' as tabela, COUNT(*) as total 
FROM regime_urbanistico
UNION ALL
SELECT 
  'zots_bairros' as tabela, COUNT(*) as total 
FROM zots_bairros;
-- Deve retornar: 387 e 385 respectivamente
```

---

## 4️⃣ Configurar API Keys no Supabase

### 🔐 Variáveis a configurar:

#### A. **Usando o Script Automatizado**:
```bash
# Gera script de deployment
npm run deploy-env

# Executa o script gerado
chmod +x supabase-env-deploy.sh
./supabase-env-deploy.sh
```

#### B. **Configuração Manual via CLI**:
```bash
# OpenAI (obrigatório)
supabase secrets set OPENAI_API_KEY="sk-..."

# Claude (opcional mas recomendado)
supabase secrets set CLAUDE_API_KEY="sk-ant-..."

# Gemini (opcional)
supabase secrets set GEMINI_API_KEY="..."

# Groq (opcional - muito rápido)
supabase secrets set GROQ_API_KEY="gsk_..."

# DeepSeek (opcional - econômico)
supabase secrets set DEEPSEEK_API_KEY="sk-..."

# Sistema
supabase secrets set DEFAULT_LLM_PROVIDER="openai"
supabase secrets set JWT_SECRET="your-32-char-secret-here"
supabase secrets set MAX_DAILY_COST_USD="50.00"
```

#### C. **Verificar Configuração**:
```bash
# Listar secrets configurados (não mostra valores)
supabase secrets list --project-ref ngrqwmvuhvjkeohesbxs

# Testar conectividade dos LLMs
npm run test-llm-connections
```

### 📊 Prioridade das API Keys:
1. **OPENAI_API_KEY** - OBRIGATÓRIA (embeddings + chat)
2. **CLAUDE_API_KEY** - Altamente recomendada (qualidade)
3. **GEMINI_API_KEY** - Recomendada (custo-benefício)
4. **GROQ_API_KEY** - Opcional (velocidade extrema)
5. **DEEPSEEK_API_KEY** - Opcional (econômico)

---

## 🧪 Testes Pós-Deployment

### 1. **Testar RAG com altura**:
```bash
npm run test-rag-altura
```

### 2. **Testar Multi-LLM**:
```bash
npm run test-llm-connections
```

### 3. **Testar Regime Urbanístico**:
```bash
npm run regime:test
```

### 4. **Testar Sistema Completo**:
```bash
npm run test:integration
```

---

## 📊 Monitoramento Pós-Deployment

### Dashboard de Métricas:
```sql
-- Performance do Cache
SELECT 
  COUNT(*) as total_cached,
  AVG(hit_count) as avg_hits,
  MAX(confidence_score) as max_confidence
FROM query_cache
WHERE created_at > NOW() - INTERVAL '1 hour';

-- Uso de LLMs
SELECT 
  model_name,
  COUNT(*) as uses,
  AVG(response_time_ms) as avg_time,
  SUM(cost_usd) as total_cost
FROM llm_metrics
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY model_name
ORDER BY uses DESC;

-- Feedback do Sistema
SELECT 
  satisfaction_rate,
  total_messages,
  positive_feedback,
  negative_feedback
FROM session_quality_metrics
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🚨 Troubleshooting

### Problema: Migração SQL falha
```sql
-- Verificar qual migração falhou
SELECT * FROM pg_stat_activity WHERE state = 'active';

-- Rollback se necessário
ROLLBACK;

-- Executar migrações uma por vez
```

### Problema: Edge Function não responde
```bash
# Verificar logs
supabase functions logs enhanced-vector-search --project-ref ngrqwmvuhvjkeohesbxs

# Re-deploy específico
supabase functions deploy enhanced-vector-search --no-verify-jwt
```

### Problema: Importação de dados falha
```bash
# Limpar e tentar novamente
npm run regime:clean --yes
npm run regime:import --force

# Verificar logs
cat logs/import-regime-*.log | grep ERROR
```

### Problema: API Keys não funcionam
```bash
# Verificar se foram setadas
supabase secrets list

# Re-configurar específica
supabase secrets unset OPENAI_API_KEY
supabase secrets set OPENAI_API_KEY="nova-key-aqui"

# Restart das functions
supabase functions serve --env-file .env.local
```

---

## ✅ Checklist Final de Verificação

- [ ] Todas as 12 tabelas criadas no banco
- [ ] 13 índices aplicados com sucesso
- [ ] 4 Edge Functions deployadas e ativas
- [ ] 772 registros de regime urbanístico importados
- [ ] API Keys configuradas (mínimo OpenAI)
- [ ] Cache funcionando (testar query repetida)
- [ ] Multi-LLM respondendo
- [ ] Sistema de feedback gravando métricas

---

## 🎯 Próximos Passos (Pós-Deploy)

1. **Monitorar performance** nas primeiras 24h
2. **Ajustar cache TTL** baseado no uso real
3. **Configurar alertas** para custos de API
4. **Ativar backup automático** no Supabase
5. **Documentar queries frequentes** para otimização

---

## 📞 Suporte

- **Logs do Sistema**: `logs/` directory
- **Relatórios**: `*-report.json` files
- **Scripts de Teste**: `test-*.mjs` no diretório raiz
- **Documentação**: `docs/` directory

---

**Última atualização**: 31/01/2025
**Status**: PRONTO PARA DEPLOYMENT 🚀