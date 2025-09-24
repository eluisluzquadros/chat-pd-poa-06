# 🚨 SOLUÇÃO: ERRO "relation does not exist"

## Problema Identificado
O erro `ERROR: 42P01: relation "document_chunks" does not exist` indica que as tabelas principais do sistema não foram criadas no banco de dados.

## Solução Imediata

### 1. EXECUTAR CRIAÇÃO DAS TABELAS BASE

No Supabase SQL Editor (https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/sql):

1. Abra o arquivo: `emergency-sql/00-create-all-base-tables.sql`
2. Copie TODO o conteúdo
3. Cole no SQL Editor
4. Clique em "Run"

**OU** execute em partes:

```sql
-- Parte 1: Extensões
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;
CREATE EXTENSION IF NOT EXISTS btree_gist;
```

```sql
-- Parte 2: Tabelas principais (executar o restante do arquivo)
```

### 2. VERIFICAR CRIAÇÃO

Execute este SQL para confirmar:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'documents', 'document_chunks', 'document_embeddings', 
    'document_rows', 'sessions', 'messages', 'user_queries',
    'query_cache', 'user_feedback', 'llm_configs', 
    'regime_urbanistico', 'secrets'
)
ORDER BY table_name;
```

Você deve ver 12-13 tabelas listadas.

### 3. CONTINUAR COM O PLANO EMERGENCIAL

Após criar as tabelas, volte para o `EMERGENCY-QUICK-START.md` e continue da **Fase 1**.

## Tabelas Criadas

O script `00-create-all-base-tables.sql` cria:

1. **documents** - Armazenar documentos processados
2. **document_chunks** - Chunks de texto com embeddings
3. **document_embeddings** - Embeddings vetoriais (compatibilidade)
4. **document_rows** - Dados de planilhas Excel
5. **sessions** - Sessões de usuários
6. **messages** - Histórico de mensagens
7. **user_queries** - Queries dos usuários
8. **query_cache** - Cache de respostas
9. **user_feedback** - Feedback dos usuários
10. **llm_configs** - Configurações de modelos
11. **regime_urbanistico** - Dados do regime urbanístico
12. **secrets** - API keys (se não criada antes)

## Tempo Estimado

- Criação das tabelas: 2-3 minutos
- Verificação: 1 minuto
- Total: 4 minutos adicionais ao plano

## Se receber erro "column does not exist"

Execute o script `emergency-sql/00b-fix-missing-columns.sql` que adiciona todas as colunas faltantes.

## Próximos Passos

1. ✅ Criar tabelas base
2. ✅ Adicionar colunas faltantes (se necessário)
3. ➡️ Configurar secrets e API keys
4. ➡️ Deploy das Edge Functions
5. ➡️ Importar dados
6. ➡️ Testar sistema