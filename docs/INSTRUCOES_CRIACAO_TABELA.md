# 📋 INSTRUÇÕES PARA CRIAR TABELA DOCUMENT_SECTIONS

## ⚠️ AÇÃO NECESSÁRIA IMEDIATA

A tabela `document_sections` não existe no banco de dados. Esta tabela é **CRÍTICA** para o funcionamento do sistema RAG, pois armazena os chunks de documentos com seus embeddings para busca semântica.

---

## 🚀 PASSOS PARA CRIAR A TABELA

### Passo 1: Acessar o Supabase SQL Editor
1. Abra o navegador e acesse: https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/editor
2. Faça login se necessário

### Passo 2: Executar o SQL
1. No SQL Editor, cole TODO o conteúdo do arquivo `CREATE_DOCUMENT_SECTIONS_TABLE.sql`
2. Clique em **RUN** ou pressione **Ctrl+Enter**

### Passo 3: Verificar Criação
O script retornará:
- ✅ "Tabela criada com sucesso!"
- Lista das colunas criadas
- Confirmação das funções e índices

---

## 📊 O QUE SERÁ CRIADO

### Tabela: `document_sections`
```sql
- id: UUID (chave primária)
- content: TEXT (conteúdo do chunk)
- embedding: vector(1536) (vetor de embeddings)
- metadata: JSONB (metadados do documento)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### Índices Otimizados:
- Busca textual em português
- Busca por metadados JSON
- Busca por arquivo fonte
- Busca por tipo de conteúdo
- Busca por número de artigo

### Funções de Busca:
- `match_documents()` - Busca vetorial por similaridade
- `hybrid_search()` - Busca híbrida (vetorial + keyword)

---

## ✅ APÓS CRIAR A TABELA

### 1. Verificar no Dashboard
- Vá para **Table Editor**
- Procure a tabela `document_sections`
- Deve mostrar 0 registros (vazia inicialmente)

### 2. Executar o Reprocessamento
```bash
# No terminal, execute:
node scripts/reprocess-knowledge-base.mjs
```

### 3. Validar o Reprocessamento
```bash
# Testar se tudo funcionou:
node scripts/validate-reprocessing.mjs
```

---

## 🔍 VERIFICAÇÃO RÁPIDA

Execute este SQL para verificar se a tabela foi criada:

```sql
SELECT 
  table_name,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'document_sections'
GROUP BY table_name;
```

Resultado esperado:
- `table_name: document_sections`
- `column_count: 6`

---

## ⚠️ PROBLEMAS COMUNS

### Erro: "extension vector does not exist"
**Solução:** A extensão vector precisa ser habilitada pelo suporte do Supabase. Entre em contato com o suporte.

### Erro: "permission denied"
**Solução:** Certifique-se de estar logado com uma conta que tenha permissões de administrador.

### Erro: "relation already exists"
**Solução:** A tabela já foi criada. Pule para o passo de reprocessamento.

---

## 📞 SUPORTE

Se encontrar problemas:
1. Verifique o log de erros no SQL Editor
2. Confirme que está no projeto correto (ngrqwmvuhvjkeohesbxs)
3. Entre em contato com a equipe de desenvolvimento

---

**IMPORTANTE:** Após criar a tabela, o sistema precisa do reprocessamento completo da base de conhecimento para funcionar corretamente!