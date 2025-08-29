# 🚨 EXECUTE ISTO PRIMEIRO!

## Problema: "relation does not exist"

As tabelas do banco de dados não existem. Execute os passos abaixo NA ORDEM:

## 1️⃣ PRIMEIRO: Habilitar Extensões

No Supabase SQL Editor, execute:

```sql
-- Habilitar extensão vector (ESSENCIAL!)
CREATE EXTENSION IF NOT EXISTS vector;
```

## 2️⃣ SEGUNDO: Criar Tabelas Essenciais

Execute o arquivo `emergency-sql/00-create-essential-tables-simple.sql`

OU copie e cole o conteúdo diretamente no SQL Editor.

## 3️⃣ TERCEIRO: Verificar Criação

Execute esta query para confirmar:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'documents', 
    'document_chunks', 
    'document_rows',
    'regime_urbanistico',
    'query_cache'
)
ORDER BY table_name;
```

Você deve ver pelo menos 5 tabelas.

## 4️⃣ QUARTO: Continuar com o Plano

Agora volte para o `EMERGENCY-QUICK-START.md` e continue da Fase 1.

## ⏱️ Tempo: 2-3 minutos

## ⚠️ Se der erro na extensão vector:

```sql
-- Tente esta alternativa
CREATE EXTENSION IF NOT EXISTS "vector";

-- Se ainda falhar, pule e crie as tabelas sem a coluna embedding
-- (será necessário ajustar depois)
```