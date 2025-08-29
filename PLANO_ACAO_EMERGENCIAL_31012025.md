# 🚨 PLANO DE AÇÃO EMERGENCIAL - RECUPERAR CHAT PD POA

**Objetivo**: Restaurar funcionalidade completa do sistema em 2 horas  
**Prioridade**: CRÍTICA - Sistema 100% inoperante

---

## 🔥 FASE 1: CORREÇÕES CRÍTICAS (30 minutos)

### 1.1 Criar Tabela Secrets (5 min)

**No Supabase Dashboard SQL Editor:**
```sql
-- COPIAR E EXECUTAR TUDO DE UMA VEZ
CREATE TABLE IF NOT EXISTS secrets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON secrets
    FOR ALL USING (auth.role() = 'service_role');
```

### 1.2 Inserir API Keys (5 min)

**Pegar as chaves do arquivo .env.local e executar:**
```sql
-- SUBSTITUIR 'sua-chave-aqui' com as chaves reais do .env.local
INSERT INTO secrets (name, value) VALUES
('OPENAI_API_KEY', 'sua-chave-openai-aqui')
ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value;

-- Adicionar outras se tiver
INSERT INTO secrets (name, value) VALUES
('ANTHROPIC_API_KEY', 'sua-chave-anthropic-aqui'),
('GEMINI_API_KEY', 'sua-chave-gemini-aqui')
ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value;
```

### 1.3 Verificar Configuração (2 min)

```sql
-- Verificar se secrets foram criadas
SELECT name, substring(value, 1, 10) || '...' as value_preview 
FROM secrets;
```

### 1.4 Usar Configuração de Secrets no Supabase (10 min)

**Alternativa MAIS SIMPLES - Usar Edge Function Secrets:**

1. Vá para: https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/settings/functions
2. Clique em "Edge Functions"
3. Em "Secrets", adicione:
   - `OPENAI_API_KEY` = (sua chave)
   - `ANTHROPIC_API_KEY` = (sua chave)
   - `GEMINI_API_KEY` = (sua chave)
4. Clique em "Save"

### 1.5 Re-deploy Edge Functions (8 min)

```bash
# No terminal, executar um por vez
npx supabase functions deploy agentic-rag --project-ref ngrqwmvuhvjkeohesbxs
npx supabase functions deploy query-analyzer --project-ref ngrqwmvuhvjkeohesbxs
npx supabase functions deploy sql-generator --project-ref ngrqwmvuhvjkeohesbxs
npx supabase functions deploy enhanced-vector-search --project-ref ngrqwmvuhvjkeohesbxs
npx supabase functions deploy response-synthesizer --project-ref ngrqwmvuhvjkeohesbxs
```

---

## 🔥 FASE 2: IMPORTAR DADOS (45 minutos)

### 2.1 Verificar Estado dos Dados (5 min)

```sql
-- No SQL Editor do Supabase
SELECT 
    'documents' as table_name, COUNT(*) as count FROM documents
UNION ALL
SELECT 
    'document_chunks' as table_name, COUNT(*) as count FROM document_chunks
UNION ALL
SELECT 
    'document_rows' as table_name, COUNT(*) as count FROM document_rows
UNION ALL
SELECT 
    'regime_urbanistico' as table_name, COUNT(*) as count FROM regime_urbanistico;
```

### 2.2 Importar Documentos Base (20 min)

**Executar no terminal:**
```bash
# Processar documentos da knowledgebase
node process-docs-direct.mjs

# Se falhar, tentar alternativa
node upload-docs-simple.mjs
```

### 2.3 Verificar Importação (5 min)

```sql
-- Verificar se documentos foram importados
SELECT file_name, chunk_count, processing_status 
FROM documents 
ORDER BY created_at DESC;

-- Verificar chunks
SELECT COUNT(*) as total_chunks,
       COUNT(DISTINCT document_id) as total_docs
FROM document_chunks;
```

### 2.4 Corrigir Dados de Regime Urbanístico (15 min)

```bash
# Criar nova estrutura preservando dados originais
node create-regime-completo-table.mjs

# Importar dados completos
node import-regime-completo.mjs
```

---

## 🔥 FASE 3: VALIDAÇÃO E TESTES (30 minutos)

### 3.1 Testar Edge Functions (10 min)

```bash
# Testar query analyzer
curl -X POST https://ngrqwmvuhvjkeohesbxs.supabase.co/functions/v1/query-analyzer \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg" \
  -H "Content-Type: application/json" \
  -d '{"query": "teste", "sessionId": "test"}'

# Testar RAG completo
node test-rag-final.mjs
```

### 3.2 Testar no Frontend (10 min)

1. Abrir http://localhost:8080
2. Fazer login com Google
3. Testar perguntas:
   - "O que posso construir no bairro Moinhos de Vento?"
   - "Qual a altura máxima no Centro Histórico?"
   - "Quais são as restrições da Cidade Baixa?"

### 3.3 Verificar Logs (10 min)

1. Ir para: https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/functions
2. Clicar em cada função
3. Ver "Logs" para identificar erros

---

## 🔥 FASE 4: OTIMIZAÇÕES (15 minutos)

### 4.1 Ativar Cache (5 min)

```sql
-- Limpar cache antigo
DELETE FROM query_cache WHERE created_at < NOW() - INTERVAL '7 days';

-- Verificar cache funcionando
SELECT COUNT(*) as cache_entries,
       AVG(EXTRACT(EPOCH FROM (NOW() - created_at))) as avg_age_seconds
FROM query_cache;
```

### 4.2 Configurar Multi-LLM (5 min)

```sql
-- Verificar configuração multi-LLM
SELECT * FROM llm_configs WHERE active = true;

-- Se não existir, criar configurações padrão
INSERT INTO llm_configs (provider, model, priority, active) VALUES
('openai', 'gpt-4-turbo-preview', 1, true),
('anthropic', 'claude-3-opus', 2, true),
('google', 'gemini-pro', 3, true);
```

### 4.3 Monitorar Performance (5 min)

```bash
# Script de monitoramento
node scripts/monitor-system-health.mjs
```

---

## 📋 CHECKLIST RÁPIDO

### ✅ Emergencial (Primeiros 30 min)
- [ ] Tabela secrets criada
- [ ] API keys configuradas (secrets OU edge function settings)
- [ ] Edge functions re-deployed
- [ ] Teste básico funcionando

### ✅ Dados (Próximos 45 min)
- [ ] Documentos importados (> 0 registros)
- [ ] Chunks criados (> 0 registros)
- [ ] Embeddings gerados
- [ ] Regime urbanístico corrigido

### ✅ Validação (Últimos 30 min)
- [ ] Chat respondendo no frontend
- [ ] Queries sobre bairros funcionando
- [ ] Cache ativo
- [ ] Logs sem erros críticos

---

## 🆘 TROUBLESHOOTING RÁPIDO

### "Required secrets missing"
→ Configurar secrets no Supabase Settings > Functions

### "No documents found"  
→ Executar `node process-docs-direct.mjs`

### "Function timeout"
→ Re-deploy a função específica

### "CORS error"
→ Verificar URL do frontend em CORS settings

### "Unauthorized"
→ Verificar ANON_KEY no .env.local

---

## 🎯 RESULTADO ESPERADO

Após 2 horas:
- ✅ Chat 100% funcional
- ✅ Respostas precisas sobre o Plano Diretor
- ✅ Dados de 94 bairros disponíveis
- ✅ Performance < 3 segundos
- ✅ Sistema estável

---

**COMEÇAR AGORA**: Ir para Fase 1.1 - Criar tabela secrets no SQL Editor!