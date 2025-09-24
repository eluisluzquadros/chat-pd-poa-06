# 🚀 Guia Completo de Deploy - Chat PD POA

**Data de Criação**: 31 de Janeiro de 2025  
**Versão**: 1.0  
**Status**: Sistema operacional (80% funcionalidade)

---

## 📋 Visão Geral

Este guia consolida todas as instruções necessárias para executar o deploy completo do Chat PD POA, incluindo Edge Functions, banco de dados, configurações de ambiente e validações finais.

## 🔍 Informações do Projeto

- **Project ID**: `ngrqwmvuhvjkeohesbxs`
- **URL**: `https://ngrqwmvuhvjkeohesbxs.supabase.co`
- **Dashboard**: `https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs`
- **Frontend**: Vite + React + TypeScript
- **Backend**: Supabase Edge Functions
- **Banco**: PostgreSQL + pgvector

---

## 🎯 Checklist de Pré-Deploy

### ✅ Requisitos Obrigatórios

- [ ] Node.js 18+ instalado
- [ ] Conta Supabase ativa
- [ ] Chave API OpenAI válida
- [ ] Docker Desktop (para desenvolvimento local)
- [ ] Git configurado
- [ ] Acesso ao dashboard do Supabase

### ✅ Verificações de Ambiente

- [ ] Variáveis de ambiente configuradas
- [ ] Dependências npm instaladas (`npm install`)
- [ ] Build local funcional (`npm run build`)
- [ ] Testes passando (`npm test`)

---

## 🔧 Configuração de Ambiente

### 1. Variáveis de Ambiente

Crie ou atualize o arquivo `.env.local` na raiz do projeto:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://ngrqwmvuhvjkeohesbxs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Optional - Environment specific
NODE_ENV=production
VITE_MODE=production
```

### 2. Configurar Secrets no Supabase

1. Acesse: `https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/settings/functions`
2. Na seção **"Environment Variables"**, adicione:
   - `OPENAI_API_KEY`: Sua chave da OpenAI
   - Outras variáveis necessárias para as Edge Functions

---

## 📦 Deploy das Edge Functions

### Método 1: Dashboard do Supabase (Recomendado)

#### Edge Functions Críticas para Deploy:

1. **agentic-rag** - Orquestrador principal
2. **query-analyzer** - Análise de intenções
3. **sql-generator** - Geração de consultas SQL
4. **enhanced-vector-search** - Busca vetorial
5. **response-synthesizer** - Síntese de respostas
6. **multiLLMService** - Serviço de múltiplos LLMs
7. **qa-validator** - Validação de qualidade
8. **process-document** - Processamento de documentos

#### Processo de Deploy por Função:

**Para cada função acima:**

1. Acesse o dashboard: `https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/functions`
2. Encontre a função na lista
3. Clique nos **3 pontos** → **"Edit function"**
4. **Apague todo o código** existente (Ctrl+A → Delete)
5. Abra o arquivo correspondente em `supabase/functions/[nome-funcao]/index.ts`
6. **Copie todo o conteúdo** (Ctrl+A → Ctrl+C)
7. **Cole no editor** do Supabase (Ctrl+V)
8. Clique em **"Save"** (aguarde confirmação)
9. Clique em **"Deploy"** (aguarde conclusão)
10. Verifique na aba **"Logs"** se não há erros

### Método 2: CLI do Supabase

```bash
# Instalar Supabase CLI (se necessário)
npm install -g supabase

# Navegar para o diretório do projeto
cd C:\Users\User\Documents\GitHub\chat-pd-poa-06

# Fazer login
npx supabase login

# Linkar ao projeto
npx supabase link --project-ref ngrqwmvuhvjkeohesbxs

# Deploy individual
npx supabase functions deploy agentic-rag --project-ref ngrqwmvuhvjkeohesbxs
npx supabase functions deploy query-analyzer --project-ref ngrqwmvuhvjkeohesbxs
npx supabase functions deploy sql-generator --project-ref ngrqwmvuhvjkeohesbxs
npx supabase functions deploy enhanced-vector-search --project-ref ngrqwmvuhvjkeohesbxs
npx supabase functions deploy response-synthesizer --project-ref ngrqwmvuhvjkeohesbxs
npx supabase functions deploy multiLLMService --project-ref ngrqwmvuhvjkeohesbxs

# Ou deploy de todas as funções
npx supabase functions deploy --project-ref ngrqwmvuhvjkeohesbxs
```

---

## 🗄️ Deploy do Banco de Dados

### 1. Estruturas SQL Críticas

Execute as seguintes queries no **SQL Editor** do Supabase:

#### A. Tabelas Principais

```sql
-- Verificar se as tabelas existem
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'documents', 
  'document_chunks', 
  'document_rows',
  'qa_validation_runs',
  'message_feedback',
  'query_cache',
  'disaster_risk_data'
);
```

#### B. Extensões Necessárias

```sql
-- Habilitar extensões essenciais
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Verificar extensões instaladas
SELECT name, installed_version 
FROM pg_available_extensions 
WHERE name IN ('uuid-ossp', 'vector', 'pg_trgm');
```

#### C. Funções de Busca Otimizadas

```sql
-- Função principal de busca hierárquica (crítica)
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

-- Função de busca por bairros de risco
CREATE OR REPLACE FUNCTION get_disaster_risk_by_neighborhood(
  neighborhood_name text
)
RETURNS TABLE (
  bairro text,
  risco_inundacao integer,
  risco_alagamento integer,
  risco_deslizamento integer,
  risco_vendaval integer,
  risco_granizo integer,
  nivel_risco_max integer
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dr.bairro,
    dr.risco_inundacao,
    dr.risco_alagamento,
    dr.risco_deslizamento,
    dr.risco_vendaval,
    dr.risco_granizo,
    GREATEST(
      COALESCE(dr.risco_inundacao, 0),
      COALESCE(dr.risco_alagamento, 0),
      COALESCE(dr.risco_deslizamento, 0),
      COALESCE(dr.risco_vendaval, 0),
      COALESCE(dr.risco_granizo, 0)
    ) as nivel_risco_max
  FROM disaster_risk_data dr
  WHERE dr.bairro ILIKE '%' || neighborhood_name || '%'
  ORDER BY nivel_risco_max DESC;
END;
$$;
```

#### D. Índices de Performance

```sql
-- Índices críticos para performance
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding 
ON document_chunks USING ivfflat (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_document_chunks_metadata 
ON document_chunks USING gin (metadata);

CREATE INDEX IF NOT EXISTS idx_document_rows_bairro 
ON document_rows USING gin ((row_data->>'Bairro') gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_disaster_risk_bairro 
ON disaster_risk_data USING gin (bairro gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_query_cache_query 
ON query_cache USING gin (query gin_trgm_ops);
```

### 2. Dados Essenciais

#### Verificar Status dos Dados:

```sql
-- Contar registros principais
SELECT 
  'documents' as tabela, COUNT(*) as registros
FROM documents
UNION ALL
SELECT 
  'document_chunks' as tabela, COUNT(*) as registros  
FROM document_chunks
UNION ALL
SELECT 
  'document_rows' as tabela, COUNT(*) as registros
FROM document_rows
UNION ALL
SELECT 
  'disaster_risk_data' as tabela, COUNT(*) as registros
FROM disaster_risk_data;
```

#### Importar Dados de Risco (se necessário):

```bash
# Execute o script de importação
node scripts/import-disaster-risk-data.ts
```

---

## 🌐 Deploy do Frontend

### 1. Build Local

```bash
# Instalar dependências
npm install

# Verificar tipos
npm run type-check

# Executar testes
npm test

# Build de produção
npm run build

# Testar build localmente
npm run preview
```

### 2. Deploy para Plataforma

#### Lovable.dev (Atual):
- O projeto já está configurado para deploy automático
- Commits na branch `main` disparam deploy automático
- URL: Fornecida pela plataforma

#### Vercel (Alternativa):
```bash
# Instalar Vercel CLI
npm install -g vercel

# Deploy
vercel

# Deploy de produção
vercel --prod
```

#### Netlify (Alternativa):
```bash
# Instalar Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy

# Deploy de produção
netlify deploy --prod
```

---

## 🔍 Validação Pós-Deploy

### 1. Checklist de Validação Técnica

#### Edge Functions:
- [ ] Todas as 8 funções críticas deployadas
- [ ] Status "Deployed" no dashboard
- [ ] Logs sem erros críticos
- [ ] Respostas HTTP 200 em testes básicos

#### Banco de Dados:
- [ ] Todas as tabelas existem
- [ ] Funções SQL funcionais
- [ ] Índices criados
- [ ] Dados importados (95 bairros, 16+ chunks)

#### Frontend:
- [ ] Build sem erros
- [ ] Carregamento < 3 segundos
- [ ] Autenticação Google funcional
- [ ] Interface responsiva

### 2. Testes Funcionais

#### Casos de Teste Obrigatórios:

```bash
# Execute o script de testes QA
npm run test:qa
```

**Ou teste manualmente no chat:**

1. **"Qual artigo da LUOS trata da Certificação em Sustentabilidade Ambiental?"**
   - Esperado: Art. 81 - III
   
2. **"Qual a regra para empreendimentos do 4º distrito?"**
   - Esperado: Art. 74
   
3. **"Quais bairros têm risco de inundação?"**
   - Esperado: Lista de 25 bairros
   
4. **"Qual o risco do Centro Histórico?"**
   - Esperado: Risco Muito Alto - Inundação e Alagamento
   
5. **"O que diz sobre altura de edificação?"**
   - Esperado: Art. 81 e Art. 23

### 3. Monitoramento em Tempo Real

#### Dashboard de Qualidade:
- Acesse: `https://sua-url.com/admin/quality`
- Verifique métricas de QA
- Monitore taxa de sucesso > 80%

#### Logs do Sistema:
```sql
-- Query para monitorar qualidade
SELECT * FROM qa_quality_monitoring 
ORDER BY hour DESC 
LIMIT 24;
```

---

## 🔧 Troubleshooting Comum

### Problema: Edge Functions com Erro 500

**Sintomas**: Functions retornam erro interno
**Soluções**:
1. Verificar secrets configurados (OPENAI_API_KEY)
2. Checar logs da função no dashboard
3. Validar imports e dependências
4. Re-deploy da função

### Problema: Busca não Retorna Resultados

**Sintomas**: Queries não encontram documentos
**Soluções**:
1. Verificar embeddings processados:
```sql
SELECT COUNT(*) FROM document_chunks WHERE embedding IS NOT NULL;
```
2. Limpar cache:
```sql
DELETE FROM query_cache WHERE created_at < NOW() - INTERVAL '1 hour';
```
3. Re-processar documentos:
```bash
node process-docs-direct.mjs
```

### Problema: Dados de Bairros Inconsistentes

**Sintomas**: Informações incorretas sobre bairros
**Soluções**:
1. Verificar tabela disaster_risk_data:
```sql
SELECT DISTINCT bairro FROM disaster_risk_data ORDER BY bairro;
```
2. Re-importar dados:
```bash
node scripts/import-disaster-risk-data.ts
```

### Problema: Autenticação Google Falhando

**Sintomas**: Login não funciona
**Soluções**:
1. Verificar URLs no Google Console
2. Conferir configurações no Supabase Auth
3. Validar redirect URLs
4. Consultar: `GOOGLE_AUTH_SETUP.md`

---

## 📊 Monitoramento de Performance

### 1. Métricas Críticas

- **Taxa de Aprovação QA**: > 80%
- **Tempo de Resposta**: < 3 segundos
- **Disponibilidade**: > 99%
- **Satisfação do Usuário**: > 85%

### 2. Alertas Configurados

```sql
-- Query para detectar problemas
SELECT 
  alert_status,
  COUNT(*) as frequency
FROM qa_quality_monitoring 
WHERE hour >= NOW() - INTERVAL '24 hours'
GROUP BY alert_status;
```

### 3. Backup e Recuperação

```bash
# Backup do banco (manual)
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Script de backup automatizado
node scripts/backup-database.ts
```

---

## 🚀 Script de Deploy Automatizado

Crie o arquivo `deploy.sh` para automatizar o processo:

```bash
#!/bin/bash

echo "🚀 Iniciando Deploy Completo - Chat PD POA"

# 1. Verificações pré-deploy
echo "✅ Verificando pré-requisitos..."
npm run type-check
npm test

# 2. Build
echo "🔨 Executando build..."
npm run build

# 3. Deploy Edge Functions
echo "⚡ Deploy das Edge Functions..."
npx supabase functions deploy agentic-rag --project-ref ngrqwmvuhvjkeohesbxs
npx supabase functions deploy query-analyzer --project-ref ngrqwmvuhvjkeohesbxs
npx supabase functions deploy sql-generator --project-ref ngrqwmvuhvjkeohesbxs
npx supabase functions deploy enhanced-vector-search --project-ref ngrqwmvuhvjkeohesbxs
npx supabase functions deploy response-synthesizer --project-ref ngrqwmvuhvjkeohesbxs
npx supabase functions deploy multiLLMService --project-ref ngrqwmvuhvjkeohesbxs

# 4. Validações pós-deploy
echo "🔍 Executando validações..."
npm run test:qa

echo "✅ Deploy concluído com sucesso!"
```

---

## 📝 Checklist Final de Deploy

### Pré-Deploy
- [ ] Código testado localmente
- [ ] Build sem erros
- [ ] Variáveis de ambiente configuradas
- [ ] Backup do banco realizado

### Durante o Deploy
- [ ] Edge Functions deployadas (8 críticas)
- [ ] SQL executado sem erros
- [ ] Dados importados corretamente
- [ ] Secrets configurados

### Pós-Deploy
- [ ] Todos os testes QA passando (4/5 mínimo)
- [ ] Frontend carregando corretamente
- [ ] Autenticação funcionando
- [ ] Monitoramento ativo
- [ ] Documentação atualizada

### Validação de Produção
- [ ] Performance < 3s
- [ ] Taxa de erro < 5%
- [ ] Disponibilidade > 99%
- [ ] Logs sem erros críticos

---

## 📞 Suporte e Contatos

### Em Caso de Problemas:
1. **Consultar logs**: Dashboard do Supabase > Functions > Logs
2. **Verificar status**: `https://status.supabase.com`
3. **Documentação**: Este guia + README.md
4. **Backup**: Sempre disponível para rollback

### Informações de Contato:
- **Projeto**: Chat PD POA
- **Mantenedores**: Equipe de Desenvolvimento
- **Última Atualização**: 31/01/2025

---

**🎯 Resultado Esperado**: Sistema 100% operacional com todas as funcionalidades disponíveis, performance otimizada e monitoramento ativo.

**⏱️ Tempo Estimado de Deploy**: 30-60 minutos (dependendo da experiência)

**🔄 Frequência de Atualizações**: Conforme necessário, com rollback disponível em caso de problemas.