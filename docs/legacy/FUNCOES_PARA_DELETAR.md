# 🗑️ FUNÇÕES PARA DELETAR NO SUPABASE

## ⚠️ PROBLEMA
Temos **100+ Edge Functions** criadas! O limite do plano gratuito é muito menor.

## ✅ FUNÇÕES ESSENCIAIS (MANTER)
```
1. agentic-rag (principal - atualizar com código novo)
2. query-analyzer
3. sql-generator
4. enhanced-vector-search
5. response-synthesizer
```

## 🗑️ FUNÇÕES PARA DELETAR (OBSOLETAS)

### Funções de Debug/Teste (DELETAR TODAS)
- agentic-rag-debug
- agentic-rag-v2
- agentic-rag-v3
- agentic-rag-unified
- cache-debug
- sql-generator-debug
- qa-debug-runs
- qa-test-fixes
- test-minimal
- test-qa-cases

### Funções QA Redundantes (DELETAR)
- qa-validator-direct
- qa-validator-test
- qa-validator-simple
- qa-execute-validation-v2
- qa-batch-execution
- qa-benchmark-unified
- qa-cleanup-failed-runs
- qa-cleanup-runs
- qa-check-results-rls
- qa-delete-test-case
- qa-ensure-completed-status
- qa-fetch-runs
- qa-fix-rls
- qa-fix-simple
- qa-fix-stuck-runs
- qa-fix-system
- qa-get-run-details
- qa-update-test-case

### Funções de Chat Individuais (DELETAR - usar multiLLMService)
- claude-chat
- claude-haiku-chat
- claude-sonnet-chat
- claude-opus-chat
- deepseek-chat
- gemini-chat
- gemini-pro-chat
- gemini-vision-chat
- groq-chat
- llama-chat
- openai-advanced-chat

### Funções de Agentes Redundantes (DELETAR)
- agent-evaluation
- agent-legal
- agent-rag
- agent-reasoning
- agent-urban
- agent-validator
- orchestrator-master
- orchestrator-master-fixed
- rl-cognitive-agent

### Funções Utilitárias Redundantes (DELETAR)
- create-admin-user
- create-admin-account
- setup-demo-user
- set-user-role
- create-user-from-interest
- check-processing-status

### Funções de Processamento Antigas (DELETAR)
- fix-embeddings
- fix-embeddings-batch
- kb-reprocess-all
- kb-upload
- import-structured-kb
- process-document
- knowledge-updater
- feedback-processor

### Funções de Busca Redundantes (DELETAR)
- cursor-pagination
- paginated-search
- match-documents
- get_documents
- get_list
- format-table-response
- structured-data-search
- legal-article-finder

### Funções de Validação Redundantes (DELETAR)
- cross-validation
- cross-validation-v2
- contextual-scoring
- gap-detector
- table-coverage-monitor
- sql-validator
- universal-bairro-validator
- validate-dynamic-bairros
- ux-consistency-validator

### Funções de Response Redundantes (DELETAR)
- response-synthesizer-v2
- response-synthesizer-simple
- response-synthesizer-rag
- predefined-responses

### Funções SQL Redundantes (DELETAR)
- sql-generator-v2
- sql-generator-new

### Outras Redundantes (DELETAR)
- bairros-cache-service
- rag-neighborhood-sweep
- run-benchmark
- generate-embedding
- generate-text-embedding
- qa-ingest-kb
- qa-add-test-case

## 📋 INSTRUÇÕES PARA DELETAR

### No Dashboard Supabase:

1. Acesse: https://app.supabase.com/project/ngrqwmvuhvjkeohesbxs
2. Vá para **Edge Functions**
3. Para cada função da lista acima:
   - Clique nos 3 pontos (...) ao lado da função
   - Selecione **Delete**
   - Confirme

### ⚡ PRIORIDADE DE DELEÇÃO:

1. **Primeiro**: Funções de debug/teste (20+ funções)
2. **Segundo**: Funções QA redundantes (20+ funções)
3. **Terceiro**: Funções de chat individuais (10+ funções)
4. **Quarto**: Agentes redundantes (10+ funções)

## 🎯 RESULTADO ESPERADO

**De**: 100+ funções
**Para**: ~5-10 funções essenciais

Isso liberará espaço para:
- Atualizar `agentic-rag` com código RAG real
- Manter apenas funções necessárias
- Ficar dentro do limite do plano

## ⚠️ IMPORTANTE

**NÃO DELETE**:
- agentic-rag (principal)
- query-analyzer (se existir e estiver em uso)
- sql-generator (se existir e estiver em uso)
- enhanced-vector-search (se existir e estiver em uso)
- response-synthesizer (se existir e estiver em uso)
- multiLLMService (gerencia todos os LLMs)
- chat (se for a principal em uso)

---

**Data**: 17/01/2025
**Total para deletar**: ~90 funções obsoletas