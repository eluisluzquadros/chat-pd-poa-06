# 🧹 GUIA DE LIMPEZA MANUAL - SUPABASE DASHBOARD

## ⚠️ PROBLEMA ATUAL
- **90+ Edge Functions** ativas (limite do plano gratuito: ~20)
- **`test-api-connection`** não consegue ser deployada
- **Erro Dify**: "Failed to send a request to the Edge Function"

## 🎯 OBJETIVO
Reduzir de 90+ funções para **8 funções essenciais**

---

## 🔗 ACESSO DIRETO
**Dashboard**: https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/functions

---

## ✅ FUNÇÕES QUE DEVEM SER MANTIDAS (NÃO DELETAR)

1. **`agentic-rag`** - RAG principal do sistema
2. **`test-api-connection`** - Teste de conexão Dify
3. **`chat`** - Chat principal
4. **`agentic-rag-dify`** - Integração Dify
5. **`test-rag-config`** - Configuração RAG
6. **`query-analyzer`** - Análise de queries
7. **`sql-generator`** - Geração SQL
8. **`response-synthesizer`** - Síntese de respostas

---

## 🗑️ PASSO A PASSO DA LIMPEZA

### 1. Acessar Dashboard
- Vá para: https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/functions
- Faça login se necessário

### 2. Deletar Funções Obsoletas
Para cada função **NÃO LISTADA ACIMA**:

1. Clique nos **3 pontinhos** (⋮) da função
2. Clique em **"Delete"**
3. Confirme a exclusão
4. Repita para todas as funções obsoletas

### 3. Funções Prioritárias para Deletar PRIMEIRO

#### Debug/Test (DELETE IMEDIATAMENTE):
- `agentic-rag-debug`
- `agentic-rag-v2`
- `agentic-rag-v3`
- `cache-debug`
- `sql-generator-debug`
- `test-minimal`
- `test-qa-cases`

#### QA Redundantes (DELETE):
- `qa-validator-*` (todas as variações)
- `qa-execute-*`
- `qa-batch-*`
- `qa-benchmark-*`
- `qa-cleanup-*`
- `qa-debug-*`
- `qa-test-*`
- `qa-check-*`
- `qa-delete-*`
- `qa-ensure-*`
- `qa-fetch-*`
- `qa-fix-*`
- `qa-get-*`
- `qa-update-*`

#### Chat Individuais (DELETE - usar multiLLMService):
- `claude-chat`
- `claude-haiku-chat`
- `claude-sonnet-chat`
- `claude-opus-chat`
- `deepseek-chat`
- `gemini-chat`
- `gemini-pro-chat`
- `groq-chat`
- `llama-chat`
- `openai-advanced-chat`

---

## 🚨 VALIDAÇÃO APÓS LIMPEZA

### Verificar se restaram apenas 8-10 funções:
1. Atualize a página do Dashboard
2. Conte as funções restantes
3. Deve haver **máximo 10 funções**

### Teste Automático:
Após a limpeza, a função `test-api-connection` será **automaticamente deployada**

---

## 🧪 TESTE FINAL

### 1. Aguardar Deploy Automático
- `test-api-connection` será deployada automaticamente
- Aguarde 2-3 minutos após a limpeza

### 2. Testar Conexão Dify
- Volte para `/chat`
- Clique em "Test Dify Connection"
- Deve mostrar: ✅ **"Connection successful"**

---

## 📊 RESULTADOS ESPERADOS

| Antes | Depois |
|-------|--------|
| 90+ funções | 8-10 funções |
| `test-api-connection` falha | `test-api-connection` funciona |
| Dify erro 404 | Dify conecta ✅ |

---

## ⏱️ TEMPO ESTIMADO
**5-10 minutos** para deletar todas as funções obsoletas

---

## 🆘 SE TIVER DÚVIDAS
- Mantenha APENAS as 8 funções listadas acima
- Delete TODAS as outras
- Em caso de dúvida, DELETE (podemos recriar depois)

---

**CRITICAL**: Esta é a ÚNICA solução para o problema atual. A limpeza DEVE ser feita manualmente no Dashboard.