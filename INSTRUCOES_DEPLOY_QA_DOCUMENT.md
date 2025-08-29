# 📋 Instruções para Deploy do PDPOA2025-QA.docx no Supabase

## ✅ Status da Extração

O documento **PDPOA2025-QA.docx** foi processado com sucesso:

- **Conteúdo extraído**: 53.618 caracteres
- **Chunks gerados**: 68 chunks
- **Keywords identificadas**: 15 termos únicos
- **Document ID**: `a743be55-7004-417d-8854-21c666132780`

## 📁 Arquivos Gerados

1. **`PDPOA2025-QA-content.txt`** - Conteúdo completo extraído do DOCX
2. **`insert-qa-document.sql`** - SQL com embeddings resumidos (para visualização)
3. **`insert-qa-document-full.sql`** - SQL com embeddings completos (para execução)

## 🚀 Como Fazer o Deploy

### Opção 1: Via Supabase SQL Editor (Recomendado)

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá para **SQL Editor**
3. Copie todo o conteúdo de `insert-qa-document-full.sql`
4. Cole no editor SQL
5. Clique em **RUN** para executar

### Opção 2: Via Supabase CLI

```bash
# Se tiver o Supabase CLI instalado
supabase db push insert-qa-document-full.sql
```

### Opção 3: Via API REST

```bash
# Use este comando curl (substitua YOUR_ANON_KEY)
curl -X POST 'https://fqyumkedaeybdxtrthvb.supabase.co/rest/v1/rpc/execute_sql' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d @insert-qa-document-full.sql
```

## 🔍 Verificação Após Deploy

Execute este SQL para verificar se o documento foi inserido corretamente:

```sql
-- Verificar documento
SELECT 
  id,
  name,
  type,
  status,
  jsonb_pretty(metadata) as metadata
FROM documents
WHERE name = 'PDPOA2025-QA.docx';

-- Verificar chunks
SELECT 
  chunk_index,
  left(content_preview, 100) as preview,
  metadata->>'keywords' as keywords
FROM document_embeddings
WHERE document_id = 'a743be55-7004-417d-8854-21c666132780'
ORDER BY chunk_index
LIMIT 5;

-- Verificar total de chunks
SELECT COUNT(*) as total_chunks
FROM document_embeddings
WHERE document_id = 'a743be55-7004-417d-8854-21c666132780';
```

## 📊 Conteúdo do Documento

O documento contém perguntas e respostas sobre o PDPOA 2025, incluindo:

- Gestão de espaços públicos
- Integração com o Guaíba
- Mobilidade urbana
- Custo de moradia
- Simplificação de regras urbanísticas
- Habitação social
- Meio ambiente
- Economia criativa
- E muito mais...

## ⚠️ Notas Importantes

1. **Embeddings**: Os embeddings foram gerados usando SHA256 hash (simulados) pois a API OpenAI não está disponível
2. **Keywords**: Foram extraídas automaticamente baseadas em termos relevantes
3. **Chunks**: O documento foi dividido em 68 chunks de aproximadamente 1000 caracteres cada

## 🎯 Próximos Passos

Após o deploy:

1. Teste queries relacionadas às perguntas do documento
2. Verifique se a busca por altura está funcionando com o novo conteúdo
3. Valide a qualidade das respostas do sistema RAG
4. Configure embeddings reais com OpenAI API quando disponível

## 💡 Dica

Para testar rapidamente se o deploy funcionou, execute uma query de teste:

```sql
-- Buscar chunks sobre altura
SELECT 
  content_preview,
  metadata->>'keywords' as keywords
FROM document_embeddings
WHERE document_id = 'a743be55-7004-417d-8854-21c666132780'
  AND (
    content ILIKE '%altura%' OR
    content ILIKE '%gabarito%' OR
    metadata->>'keywords' LIKE '%altura%'
  )
LIMIT 3;
```

---

**Gerado em**: 31/01/2025  
**Por**: Claude Code com processamento local via mammoth