# 🚀 Instruções Finais para Ativar o Sistema RAG

## ✅ O que já foi feito:

1. **Criado bucket de storage** 'documents'
2. **Upload dos documentos** da pasta knowledgebase
3. **Criados scripts de correção**:
   - `diagnose-rag-issues.ts` - Diagnóstico completo
   - `clear-cache-and-fix.ts` - Limpeza de cache
   - `fix-storage-and-process.ts` - Upload de documentos
   - `apply-sql-structures.ts` - Estruturas SQL

4. **Gerado arquivo SQL**: `scripts/sql-commands.sql`

## 🔴 O que VOCÊ precisa fazer agora:

### 1. Aplicar SQL no Supabase Dashboard

1. Acesse seu [Supabase Dashboard](https://app.supabase.com)
2. Vá para **SQL Editor**
3. Abra o arquivo `scripts/sql-commands.sql` 
4. Copie TODO o conteúdo
5. Cole no SQL Editor
6. Execute (Run)

### 2. Deploy das Edge Functions

No Supabase Dashboard:

1. Vá para **Edge Functions**
2. Para cada função abaixo, clique em **Deploy**:
   - `process-document`
   - `enhanced-vector-search`
   - `generate-text-embedding`
   - `chat`

Ou se tiver Supabase CLI:
```bash
supabase functions deploy --no-verify-jwt
```

### 3. Processar Documentos Corretamente

Após aplicar o SQL e deployar as functions:

```bash
# Limpar e reprocessar tudo
npx tsx scripts/reprocess-knowledge-base.ts
```

### 4. Reiniciar o Servidor

```bash
# Ctrl+C para parar
npm run dev
```

## 🧪 Testar o Sistema

Após completar os passos acima, teste as queries:

1. **"Qual artigo da LUOS trata da Certificação em Sustentabilidade Ambiental?"**
   - Deve retornar: Art. 81 - III

2. **"Qual a regra para empreendimentos do 4º distrito?"**
   - Deve retornar: Art. 74

3. **"Quais bairros têm risco de inundação?"**
   - Deve retornar lista de bairros (após importar dados)

## ❓ Se ainda não funcionar:

### Opção A: Teste Simples

1. No chat, digite uma pergunta genérica primeiro: "O que é o PDUS?"
2. Se funcionar, o problema é só com queries específicas
3. Execute: `npx tsx scripts/create-test-chunks.ts` (criar este script)

### Opção B: Verificação Manual

No Supabase SQL Editor, execute:
```sql
-- Verificar se tabelas existem
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Verificar documentos
SELECT id, metadata->>'title' as title, is_processed 
FROM documents;

-- Verificar embeddings
SELECT COUNT(*) FROM document_embeddings;

-- Verificar função
SELECT proname FROM pg_proc 
WHERE proname = 'match_documents';
```

## 💡 Dica Final

O sistema foi implementado corretamente no código. O problema é que:
1. As estruturas SQL não foram criadas no banco
2. As Edge Functions não foram deployadas
3. Os documentos não foram processados com o novo sistema

Completando os passos acima, tudo deve funcionar! 🎉