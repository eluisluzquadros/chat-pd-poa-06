# ⚡ Quick Deploy Checklist - Chat PD POA

## 🎯 Comandos Rápidos (Copiar e Colar)

### 1️⃣ SQL no Supabase Dashboard
```sql
-- Copie TODO o conteúdo de TODAS_MIGRACOES_SQL_CONSOLIDADAS.sql
-- Cole no SQL Editor: https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/sql
-- Execute (Run)
```

### 2️⃣ Deploy Functions (Terminal)
```bash
# Opção A - Script automático
chmod +x scripts/deploy-all-functions.sh
./scripts/deploy-all-functions.sh

# Opção B - NPM
npm run deploy-functions

# Opção C - Manual
supabase functions deploy enhanced-vector-search --project-ref ngrqwmvuhvjkeohesbxs
supabase functions deploy agent-rag --project-ref ngrqwmvuhvjkeohesbxs
supabase functions deploy response-synthesizer --project-ref ngrqwmvuhvjkeohesbxs
supabase functions deploy contextual-scoring --project-ref ngrqwmvuhvjkeohesbxs
```

### 3️⃣ Importar Dados (Terminal)
```bash
# Verificar e importar
npm run regime:status
npm run regime:full-setup

# Monitorar (em outro terminal)
npm run regime:monitor
```

### 4️⃣ Configurar API Keys (Terminal)
```bash
# Mínimo necessário
supabase secrets set OPENAI_API_KEY="sk-..." --project-ref ngrqwmvuhvjkeohesbxs
supabase secrets set DEFAULT_LLM_PROVIDER="openai" --project-ref ngrqwmvuhvjkeohesbxs
supabase secrets set JWT_SECRET="your-32-character-secret-key-here" --project-ref ngrqwmvuhvjkeohesbxs

# Recomendado adicional
supabase secrets set CLAUDE_API_KEY="sk-ant-..." --project-ref ngrqwmvuhvjkeohesbxs
supabase secrets set GEMINI_API_KEY="..." --project-ref ngrqwmvuhvjkeohesbxs
```

### 5️⃣ Verificar Deploy (Terminal)
```bash
# Verificação completa
node scripts/verify-deployment.mjs

# Testes rápidos
npm run test-llm-connections
npm run regime:test
```

---

## ✅ Checklist Visual

- [ ] **SQL**: TODAS_MIGRACOES_SQL_CONSOLIDADAS.sql executado
- [ ] **Functions**: 4 functions deployadas
- [ ] **Dados**: 772 registros importados (387 + 385)
- [ ] **API Keys**: Pelo menos OPENAI_API_KEY configurada
- [ ] **Verificação**: Script verify-deployment mostra tudo verde

---

## 🚨 Se algo der errado:

### SQL falhou?
```sql
-- No SQL Editor, execute uma migração por vez
-- Começe pela seção 1 (Cache), depois 2 (Índices), etc.
```

### Function não deploya?
```bash
# Deploy individual com logs
supabase functions deploy [nome-da-function] --debug
```

### Importação falhou?
```bash
# Limpar e tentar novamente
npm run regime:clean --yes
npm run regime:import --force
```

### API Key não funciona?
```bash
# Re-set a key
supabase secrets unset OPENAI_API_KEY --project-ref ngrqwmvuhvjkeohesbxs
supabase secrets set OPENAI_API_KEY="nova-key" --project-ref ngrqwmvuhvjkeohesbxs
```

---

**Tempo estimado total**: 10-15 minutos