# 🚨 INSTRUÇÕES DE CORREÇÃO EMERGENCIAL DO SISTEMA RAG

## PROBLEMA IDENTIFICADO

O sistema RAG está com **98% de falha** devido a:
1. **Embeddings corrompidos** com ~19000 dimensões (deveria ser 1536)
2. **Função SQL de vector search ausente** (`match_document_sections`)
3. **API Key do OpenAI com problema de organização**
4. **Sistema usando respostas hardcoded** (apenas 10 artigos mapeados)

## SOLUÇÃO IMEDIATA - EXECUTE NESTA ORDEM

### PASSO 1: Corrigir Configuração da API OpenAI

Edite o arquivo `.env.local` e:

**OPÇÃO A: Remover a linha de organização (recomendado)**
```bash
# Comente ou remova esta linha:
# OPENAI_ORG_ID=org-your-organization-id
```

**OPÇÃO B: Configurar com o ID correto**
```bash
OPENAI_ORG_ID=org-SEU-ID-REAL-AQUI
```

### PASSO 2: Criar Função SQL no Supabase

1. Acesse o Supabase Dashboard:
   ```
   https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/sql
   ```

2. Execute o SQL abaixo no SQL Editor:

```sql
-- Dropar função antiga se existir
DROP FUNCTION IF EXISTS match_document_sections(vector, float, int);
DROP FUNCTION IF EXISTS match_document_sections(vector(1536), float, int);

-- Criar função de vector search
CREATE OR REPLACE FUNCTION match_document_sections(
  query_embedding vector,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ds.id,
    ds.content,
    ds.metadata,
    1 - (ds.embedding <=> query_embedding) AS similarity
  FROM document_sections ds
  WHERE ds.embedding IS NOT NULL
    AND array_length(ds.embedding::real[], 1) = array_length(query_embedding::real[], 1)
    AND 1 - (ds.embedding <=> query_embedding) > match_threshold
  ORDER BY ds.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS document_sections_embedding_idx 
ON document_sections 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

### PASSO 3: Limpar e Reprocessar Embeddings

Execute no terminal:

```bash
# Instalar dependências se necessário
npm install

# Executar correção dos embeddings
node scripts/fix-embeddings-final.mjs
```

**IMPORTANTE**: Este processo pode levar 2-4 horas para processar todos os 2822 documentos.

Se o script parar, execute novamente - ele continuará de onde parou.

### PASSO 4: Validar Correção

```bash
# Testar se vector search está funcionando
node scripts/03-test-vector-search.mjs
```

Você deve ver:
- ✅ Função RPC funcionando
- ✅ Enhanced Vector Search funcionando
- ✅ Pipeline completo funcionando

### PASSO 5: Remover Response Synthesizer Hardcoded

```bash
# Fazer backup
cp supabase/functions/response-synthesizer-simple supabase/functions/response-synthesizer-simple.bak

# Restaurar versão original
npx supabase functions deploy response-synthesizer --project-ref ngrqwmvuhvjkeohesbxs
```

## TEMPO ESTIMADO

- **Passo 1**: 2 minutos
- **Passo 2**: 5 minutos
- **Passo 3**: 2-4 horas (pode rodar em background)
- **Passo 4**: 5 minutos
- **Passo 5**: 5 minutos

**Total**: ~3-5 horas

## MONITORAMENTO DO PROGRESSO

Durante o reprocessamento (Passo 3), você verá:

```
📦 Lote 1/940
  Doc f9087f84: ✅
  Doc c8b8c1ae: ✅
  Doc a08f702e: ✅
  Progresso: 3/2822 (0.1%)
```

## SE ALGO DER ERRADO

### Erro: "401 OpenAI-Organization header"
- **Solução**: Volte ao Passo 1 e remova OPENAI_ORG_ID do .env.local

### Erro: "Rate limit exceeded"
- **Solução**: O script aguarda automaticamente. Apenas deixe rodando.

### Erro: "function match_document_sections does not exist"
- **Solução**: Execute o SQL do Passo 2 novamente

### Erro: "Could not find module 'openai'"
- **Solução**: Execute `npm install openai`

## VERIFICAÇÃO FINAL

Após completar todos os passos, teste o sistema:

1. **Via Terminal**:
   ```bash
   node scripts/test-qa-simple.mjs
   ```
   Deve mostrar >90% de sucesso

2. **Via Interface Web**:
   - Acesse http://localhost:8080
   - Teste perguntas como:
     - "Qual artigo define o EIV?"
     - "O que são ZEIS?"
     - "Qual a altura máxima em Boa Vista?"

3. **Via Admin Dashboard**:
   - Acesse http://localhost:8080/admin/quality
   - Execute teste de QA
   - Deve mostrar >90% de acurácia

## CONTATO PARA SUPORTE

Se precisar de ajuda:
1. Verifique os logs em: Supabase Dashboard → Edge Functions → Logs
2. Execute diagnóstico: `node scripts/diagnose-rag-pipeline.mjs`
3. Documente o erro e crie issue no GitHub do projeto

## IMPORTANTE

⚠️ **NÃO DEIXE O SISTEMA EM PRODUÇÃO COM RESPOSTAS HARDCODED**

Se não conseguir corrigir imediatamente:
1. Desative o acesso público
2. Coloque mensagem de manutenção
3. Notifique os usuários

Este é um sistema crítico que fornece informações legais sobre o Plano Diretor de Porto Alegre. Informações incorretas podem ter consequências sérias.