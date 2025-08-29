# 🚨 INSTRUÇÕES URGENTES - Corrigir Sistema RAG

## ⚡ O Problema
O sistema RAG está retornando respostas genéricas em vez de trechos específicos dos artigos.

## 🎯 Solução Rápida (10 minutos)

### Passo 1: Execute o SQL no Supabase (3 min)

1. **Abra este link**: https://app.supabase.com/project/ngrqwmvuhvjkeohesbxs/sql/new

2. **Copie e cole TODO o conteúdo do arquivo**: `EXECUTE_THIS_SQL.sql`

3. **Clique em "Run"**

4. ✅ Deve aparecer "Success" em verde

### Passo 2: Deploy das Edge Functions (5 min)

1. **Abra este link**: https://app.supabase.com/project/ngrqwmvuhvjkeohesbxs/functions

2. Para cada função abaixo, faça:
   
   a) **process-document**:
      - Clique em "New Function"
      - Nome: `process-document`
      - Copie o código de: `supabase/functions/process-document/index.ts`
      - Clique em "Deploy"
   
   b) **generate-text-embedding**:
      - Clique em "New Function"
      - Nome: `generate-text-embedding`
      - Copie o código de: `supabase/functions/generate-text-embedding/index.ts`
      - Clique em "Deploy"
   
   c) **enhanced-vector-search**:
      - Clique em "New Function"
      - Nome: `enhanced-vector-search`
      - Copie o código de: `supabase/functions/enhanced-vector-search/index.ts`
      - Clique em "Deploy"
   
   d) **chat**:
      - Clique em "New Function"
      - Nome: `chat`
      - Copie o código de: `supabase/functions/chat/index.ts`
      - Clique em "Deploy"

### Passo 3: Reprocesse os Documentos (2 min)

No terminal do VS Code:

```bash
npx tsx scripts/reprocess-knowledge-base.ts
```

Quando perguntar "Limpar dados existentes?", digite: **s** (sim)

### Passo 4: Teste

Abra o chat e teste estas perguntas:

1. **"Qual artigo da LUOS trata da Certificação em Sustentabilidade Ambiental?"**
   - ✅ Deve retornar: **Art. 81 - Inciso III**

2. **"Qual a regra para empreendimentos do 4º distrito?"**
   - ✅ Deve retornar: **Art. 74** com detalhes específicos

3. **"Quais bairros têm risco de inundação?"**
   - ✅ Deve listar os bairros específicos

## 🆘 Se Ainda Não Funcionar

### Opção A: Use o Script Alternativo

```bash
npx tsx scripts/simple-reprocess.ts
```

### Opção B: Verifique no SQL Editor

Execute este SQL para debug:

```sql
-- Verificar se chunks hierárquicos existem
SELECT 
  content_chunk,
  chunk_metadata
FROM document_embeddings
WHERE chunk_metadata IS NOT NULL
  AND chunk_metadata->>'hasCertification' = 'true'
LIMIT 5;

-- Verificar função de busca
SELECT proname 
FROM pg_proc 
WHERE proname = 'match_hierarchical_documents';
```

## 📞 Suporte

Se precisar de ajuda:
1. Execute: `npx tsx scripts/diagnose-rag-issues.ts`
2. Envie o resultado do diagnóstico

## ⏰ Tempo Total: 10 minutos

1. SQL: 3 min
2. Edge Functions: 5 min  
3. Reprocessar: 2 min
4. Testar: 1 min

---

**IMPORTANTE**: O código está 100% correto. O problema é apenas de deploy/configuração no Supabase.