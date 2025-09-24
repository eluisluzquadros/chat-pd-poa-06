# 📋 INSTRUÇÕES: Criar Tabela legal_articles no Supabase

## ⚠️ IMPORTANTE: Execute este passo ANTES de processar a base de conhecimento

## 📍 Passo a Passo:

### 1. Acesse o Supabase Dashboard
- Vá para: https://supabase.com/dashboard
- Faça login no seu projeto

### 2. Navegue até o SQL Editor
- No menu lateral, clique em **"SQL Editor"**
- Clique em **"New Query"** (Nova Consulta)

### 3. Cole o SQL
- Copie TODO o conteúdo do arquivo: **`CREATE_LEGAL_ARTICLES_TABLE.sql`**
- Cole no editor SQL

### 4. Execute o SQL
- Clique no botão **"Run"** (Executar)
- Aguarde a mensagem de sucesso

### 5. Verifique a Criação
- Vá em **"Table Editor"** no menu lateral
- Procure pela tabela **`legal_articles`**
- Ela deve aparecer na lista de tabelas

## ✅ Após criar a tabela:

Execute o processamento da base de conhecimento:

```bash
npm run kb:process
```

## 🔍 Verificação Rápida:

Para verificar se a tabela foi criada corretamente, execute este SQL no editor:

```sql
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'legal_articles'
ORDER BY ordinal_position;
```

Você deve ver as seguintes colunas:
- `id` (text)
- `content` (text)
- `embedding` (vector)
- `metadata` (jsonb)
- `created_at` (timestamp)
- `updated_at` (timestamp)

## ❌ Troubleshooting:

### Se der erro "vector type does not exist":
1. Ative a extensão pgvector:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Se der erro de permissões:
1. Certifique-se de estar usando o usuário correto
2. Execute com service_role ou postgres user

## 📝 Arquivo SQL:
O arquivo completo está em: **`CREATE_LEGAL_ARTICLES_TABLE.sql`**

---

**Após completar estes passos, a tabela estará pronta para receber os dados processados localmente!**