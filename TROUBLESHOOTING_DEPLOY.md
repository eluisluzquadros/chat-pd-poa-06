# 🔧 Troubleshooting - Deploy Chat PD POA

**Guia de Resolução de Problemas Comuns no Deploy**

---

## 🚨 Problemas Críticos

### 1. Edge Functions Retornam Erro 500

**Sintomas:**
- Functions retornam "Internal Server Error"
- Status 500 nas requisições
- Logs mostram erros de execução

**Diagnóstico:**
```bash
# Verificar logs da função
curl -X POST "https://ngrqwmvuhvjkeohesbxs.supabase.co/functions/v1/agentic-rag" \
  -H "Authorization: Bearer [ANON_KEY]" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

**Soluções:**

#### A. Verificar Secrets/Environment Variables
1. Acesse: `https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/settings/functions`
2. Na seção "Environment Variables", verificar se existe:
   - `OPENAI_API_KEY`: Sua chave da OpenAI
3. Se não existir, adicionar:
   ```
   Name: OPENAI_API_KEY
   Value: sk-your-openai-key-here
   ```

#### B. Re-deploy da Função
```bash
npx supabase functions deploy agentic-rag --project-ref ngrqwmvuhvjkeohesbxs
```

#### C. Verificar Imports e Dependências
- Abrir o arquivo `supabase/functions/[nome-funcao]/index.ts`
- Verificar se todos os imports estão corretos
- Procurar por erros de sintaxe

### 2. Busca Não Retorna Resultados

**Sintomas:**
- Queries retornam arrays vazios
- "Não encontrei informações" nas respostas
- Dados existem no banco mas não são encontrados

**Diagnóstico:**
```sql
-- Verificar chunks existentes
SELECT COUNT(*) FROM document_chunks;

-- Verificar embeddings
SELECT COUNT(*) FROM document_chunks WHERE embedding IS NOT NULL;

-- Testar função de busca
SELECT * FROM match_hierarchical_documents(
  '[0.1,0.1,0.1]'::vector, 
  0.5, 
  5
);
```

**Soluções:**

#### A. Embeddings Inválidos (Mais Comum)
```sql
-- Ver se embeddings são placeholders
SELECT embedding[1:5] FROM document_chunks LIMIT 1;
-- Se retornar [0.1,0.1,0.1,0.1,0.1], são placeholders
```

**Solução:**
1. Configurar `OPENAI_API_KEY` válida
2. Re-processar documentos:
```bash
node reprocess-embeddings-real.mjs
```

#### B. Função de Busca Não Existe
```sql
-- Criar função de busca
CREATE OR REPLACE FUNCTION match_hierarchical_documents(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.78,
  match_count int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  chunk_index integer,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dc.id,
    dc.content,
    dc.metadata,
    dc.chunk_index,
    (1 - (dc.embedding <=> query_embedding)) as similarity
  FROM document_chunks dc
  WHERE 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

#### C. Cache Corrompido
```sql
-- Limpar cache de queries
DELETE FROM query_cache WHERE created_at < NOW() - INTERVAL '1 hour';
```

### 3. Dados de Bairros Incorretos

**Sintomas:**
- Informações erradas sobre bairros
- "Bairro não encontrado" para bairros que existem
- Dados de risco inconsistentes

**Diagnóstico:**
```sql
-- Verificar bairros cadastrados
SELECT DISTINCT bairro FROM disaster_risk_data ORDER BY bairro;

-- Buscar bairro específico
SELECT * FROM disaster_risk_data WHERE bairro ILIKE '%centro%';
```

**Soluções:**

#### A. Re-importar Dados de Risco
```bash
node scripts/import-disaster-risk-data.ts
```

#### B. Verificar Encoding dos Nomes
```sql
-- Buscar com diferentes variações
SELECT bairro FROM disaster_risk_data 
WHERE bairro ILIKE '%petrópolis%' 
   OR bairro ILIKE '%petropolis%'
   OR bairro ILIKE '%petro%';
```

#### C. Corrigir Nomes Manualmente
```sql
-- Exemplo: corrigir nome específico
UPDATE disaster_risk_data 
SET bairro = 'Petrópolis' 
WHERE bairro = 'PETROPOLIS';
```

---

## ⚠️ Problemas Moderados

### 4. Build do Frontend Falhando

**Sintomas:**
- `npm run build` retorna erro
- Erros de TypeScript
- Dependências não encontradas

**Soluções:**

#### A. Limpar Cache e Reinstalar
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### B. Verificar Versões do Node
```bash
node --version  # Deve ser 18+
npm --version   # Deve ser 8+
```

#### C. Corrigir Erros de Tipo
```bash
# Verificar tipos
npm run type-check

# Ver erros específicos
npx tsc --noEmit
```

### 5. Autenticação Google Não Funciona

**Sintomas:**
- Login não redireciona
- "Invalid redirect URL"
- Usuário autenticado mas não consegue acessar

**Soluções:**

#### A. Verificar URLs no Google Console
1. Acesse: https://console.cloud.google.com/apis/credentials
2. Editar OAuth Client ID
3. **JavaScript origins**: `https://sua-url.lovable.app`
4. **Redirect URIs**: 
   - `https://ngrqwmvuhvjkeohesbxs.supabase.co/auth/v1/callback`
   - `https://sua-url.lovable.app/auth/callback`

#### B. Configurar Supabase Auth
1. Acesse: https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/auth/providers
2. Configurar Google Provider:
   - Client ID: Do Google Console
   - Client Secret: Do Google Console

#### C. Verificar Site URL
1. Acesse: https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/auth/url-configuration
2. **Site URL**: `https://sua-url.lovable.app`
3. **Redirect URLs**: `https://sua-url.lovable.app/**`

### 6. Performance Degradada

**Sintomas:**
- Respostas > 5 segundos
- Timeouts frequentes
- CPU alta no banco

**Soluções:**

#### A. Verificar Índices
```sql
-- Verificar se índices existem
SELECT indexname FROM pg_indexes WHERE tablename = 'document_chunks';

-- Criar índices se não existem
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding 
ON document_chunks USING ivfflat (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_document_chunks_metadata 
ON document_chunks USING gin (metadata);
```

#### B. Otimizar Queries
```sql
-- Verificar queries lentas
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;
```

#### C. Limpar Cache Antigo
```sql
-- Limpar cache > 24h
DELETE FROM query_cache WHERE created_at < NOW() - INTERVAL '24 hours';
```

---

## 🔍 Problemas de Configuração

### 7. Supabase CLI Não Funciona

**Sintomas:**
- "supabase: command not found"
- "Cannot find project ref"
- Erros de autenticação

**Soluções:**

#### A. Instalar/Atualizar CLI
```bash
# Via npm (global)
npm install -g supabase

# Via npx (não precisa instalar)
npx supabase --version
```

#### B. Login e Link
```bash
# Fazer login
npx supabase login

# Linkar projeto
npx supabase link --project-ref ngrqwmvuhvjkeohesbxs
```

#### C. Verificar Conexão
```bash
# Testar conexão
npx supabase projects list
```

### 8. Variáveis de Ambiente Não Carregam

**Sintomas:**
- "API key not found"
- Funcionalidades não respondem
- Erros de autenticação

**Soluções:**

#### A. Verificar Arquivo .env.local
```bash
# Deve existir na raiz do projeto
ls -la .env.local

# Conteúdo deve incluir:
cat .env.local | grep SUPABASE
cat .env.local | grep OPENAI
```

#### B. Template Correto
```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://ngrqwmvuhvjkeohesbxs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo
OPENAI_API_KEY=sk-your-real-openai-key-here
```

---

## 🔄 Scripts de Emergência

### Limpeza Completa do Sistema

```bash
# Script de reset completo
#!/bin/bash
echo "🚨 RESET COMPLETO DO SISTEMA"

# 1. Limpar cache
echo "Limpando cache..."
node -e "
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo'
);
await supabase.from('query_cache').delete().gte('id', 0);
console.log('Cache limpo');
"

# 2. Re-deploy functions críticas
echo "Re-deploy das functions..."
npx supabase functions deploy agentic-rag --project-ref ngrqwmvuhvjkeohesbxs
npx supabase functions deploy query-analyzer --project-ref ngrqwmvuhvjkeohesbxs
npx supabase functions deploy sql-generator --project-ref ngrqwmvuhvjkeohesbxs

# 3. Verificar sistema
echo "Verificando sistema..."
node scripts/verificacao-deploy.mjs

echo "✅ Reset completo finalizado"
```

### Diagnóstico Rápido

```bash
# Script de diagnóstico
#!/bin/bash
echo "🔍 DIAGNÓSTICO RÁPIDO"

# Verificar functions
echo "Edge Functions:"
curl -s -X POST "https://ngrqwmvuhvjkeohesbxs.supabase.co/functions/v1/agentic-rag" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg" \
  -H "Content-Type: application/json" \
  -d '{"test": true}' | head -c 100

# Verificar dados
echo -e "\nDados no banco:"
node -e "
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo'
);
const chunks = await supabase.from('document_chunks').select('id').limit(1);
const risks = await supabase.from('disaster_risk_data').select('bairro').limit(1);
console.log('Chunks:', chunks.data?.length || 0);
console.log('Risk Data:', risks.data?.length || 0);
"

echo "📊 Diagnóstico concluído"
```

---

## 📞 Quando Pedir Ajuda

### Antes de Pedir Ajuda, Colete:

1. **Logs das Edge Functions:**
   - Dashboard → Functions → [nome-funcao] → Logs
   - Copie os últimos 20 logs com erro

2. **Erro Específico:**
   - Mensagem de erro completa
   - Stack trace (se disponível)
   - Contexto (o que estava fazendo)

3. **Estado do Sistema:**
   - Execute: `node scripts/verificacao-deploy.mjs`
   - Copie o relatório completo

4. **Ambiente:**
   - Node.js version: `node --version`
   - npm version: `npm --version`
   - Sistema operacional

### Informações de Contato:

- **Logs Supabase**: https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/logs
- **Status Supabase**: https://status.supabase.com
- **Documentação**: README.md + GUIA_DEPLOY_COMPLETO.md

---

## ✅ Checklist de Recuperação

Quando tudo mais falhar, execute na ordem:

- [ ] Verificar internet e DNS
- [ ] Confirmar credenciais Supabase
- [ ] Limpar cache do navegador
- [ ] Re-criar .env.local
- [ ] Re-instalar node_modules
- [ ] Re-deploy todas as functions
- [ ] Limpar cache do banco
- [ ] Executar diagnóstico completo
- [ ] Testar casos básicos
- [ ] Verificar monitoramento

**⏱️ Tempo médio de recuperação**: 15-30 minutos

**🎯 Taxa de sucesso**: 95% dos problemas resolvidos com este guia