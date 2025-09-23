# 🚨 GUIA RÁPIDO DE RECUPERAÇÃO - CHAT PD POA

## ⚡ EXECUÇÃO RÁPIDA (COPIAR E COLAR)

### 0️⃣ CRIAR TABELAS BASE (SE NECESSÁRIO) - 3 minutos

**Se receber erro "relation does not exist":**
```sql
-- Execute o arquivo emergency-sql/00-create-all-base-tables.sql
-- OU copie e cole o conteúdo completo no SQL Editor
```

### 1️⃣ NO SUPABASE SQL EDITOR (5 minutos)

**Passo 1: Criar tabela secrets**
```sql
-- COPIAR TUDO E EXECUTAR
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

**Passo 2: Inserir OpenAI key**
```sql
-- EXECUTAR COM A CHAVE REAL
INSERT INTO secrets (name, value) VALUES
('OPENAI_API_KEY', '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')
ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value;
```

**Passo 3: Verificar**
```sql
SELECT name, substring(value, 1, 10) || '...' as preview FROM secrets;
```

### 2️⃣ NO SUPABASE DASHBOARD (3 minutos)

1. Ir para: **Settings > Functions**
2. Clicar em **Edge Functions Secrets**
3. Adicionar:
   - Name: `OPENAI_API_KEY`
   - Value: `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`
4. Clicar **Save**

### 3️⃣ NO TERMINAL (10 minutos)

**Deploy das funções:**
```bash
# Executar um por vez
npx supabase functions deploy agentic-rag --project-ref ngrqwmvuhvjkeohesbxs
npx supabase functions deploy query-analyzer --project-ref ngrqwmvuhvjkeohesbxs
npx supabase functions deploy enhanced-vector-search --project-ref ngrqwmvuhvjkeohesbxs
npx supabase functions deploy response-synthesizer --project-ref ngrqwmvuhvjkeohesbxs
```

### 4️⃣ TESTAR (2 minutos)

```bash
# Testar o sistema
node emergency-test-rag.mjs
```

## 🎯 RESULTADO ESPERADO

Após 20 minutos você deve ter:
- ✅ Tabela secrets criada
- ✅ API key configurada
- ✅ Edge Functions deployed
- ✅ Sistema respondendo

## 🆘 SE ALGO DER ERRADO

### "Required secrets missing"
→ Repetir passo 2 (Supabase Dashboard)

### "Function not found"
→ Repetir passo 3 (Deploy)

### "No response"
→ Verificar logs em: Functions > [Nome da função] > Logs

## 📞 PRÓXIMOS PASSOS

Se o teste básico funcionar:
1. Importar documentos: `node process-docs-direct.mjs`
2. Testar no frontend: http://localhost:8080
3. Monitorar: `node scripts/monitor-system-health.mjs`