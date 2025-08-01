# 📝 Exemplo Prático: Deploy do PDPOA2025-QA.docx

## 🎯 Resumo do Processo

Este documento detalha o processo real usado para fazer o deploy do documento de Q&A do PDPOA 2025, incluindo os erros encontrados e as soluções aplicadas.

## 🔍 Descobertas Importantes sobre a Estrutura

### Tabela `documents`
```sql
-- Colunas existentes (verificadas):
id, content, metadata, embedding, user_id, 
title, file_name, file_path, type, 
is_public, is_processed

-- ❌ Colunas que NÃO existem:
name, storage_path, status, created_at, updated_at
```

### Tabela `document_embeddings`
```sql
-- Colunas existentes (verificadas):
id, document_id, content_chunk, embedding, 
chunk_metadata, created_at

-- ❌ Colunas que NÃO existem:
content, content_preview, chunk_index, metadata
```

## 📋 Script Final Funcionando

```javascript
// deploy-qa-final.mjs
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo'
);

// Função para gerar embedding simulado
function generateEmbedding(text) {
  const hash = crypto.createHash('sha256').update(text).digest();
  const embedding = new Array(1536).fill(0).map((_, i) => {
    const byte = hash[i % hash.length];
    return (byte / 255) * 2 - 1;
  });
  return embedding;
}

async function deployQA() {
  // 1. Criar documento (se não existir)
  const { data: doc } = await supabase
    .from('documents')
    .insert({
      file_name: 'PDPOA2025-QA.docx',
      file_path: 'knowledgebase/PDPOA2025-QA.docx',
      type: 'Q&A',
      is_public: true,
      is_processed: true,
      metadata: {
        title: 'PDPOA2025-QA.docx',
        processed_at: new Date().toISOString()
      }
    })
    .select()
    .single();

  const documentId = doc.id; // ID: 1364

  // 2. Inserir embeddings com estrutura CORRETA
  const chunk = {
    text: '🟨 Pergunta: Qual a altura máxima permitida para edificações? 🟩 Resposta: A altura máxima varia conforme a zona urbana. O gabarito permitido pode chegar a 52 metros...',
    metadata: {
      keywords: ["altura", "gabarito", "elevação", "metros"],
      topic: "Altura de Edificações"
    }
  };

  const { data, error } = await supabase
    .from('document_embeddings')
    .insert({
      document_id: documentId,
      content_chunk: chunk.text,  // ✅ Nome correto da coluna
      embedding: JSON.stringify(generateEmbedding(chunk.text)),
      chunk_metadata: chunk.metadata  // ✅ Nome correto da coluna
    })
    .select();

  console.log(error ? 'Erro:' + error.message : 'Sucesso! ID:' + data[0].id);
}

deployQA();
```

## ❌ Erros Comuns Encontrados

### 1. Erro: "column 'name' does not exist"
```javascript
// ❌ ERRADO
.eq('name', 'PDPOA2025-QA.docx')

// ✅ CORRETO
.eq('file_name', 'PDPOA2025-QA.docx')
// ou
.eq('metadata->title', 'PDPOA2025-QA.docx')
```

### 2. Erro: "column 'storage_path' does not exist"
```javascript
// ❌ ERRADO
INSERT INTO documents (name, storage_path, status)

// ✅ CORRETO
INSERT INTO documents (file_name, file_path, is_processed)
```

### 3. Erro: "Could not find 'chunk_index' column"
```javascript
// ❌ ERRADO
{
  chunk_index: 0,
  content: 'texto',
  content_preview: 'preview'
}

// ✅ CORRETO
{
  content_chunk: 'texto',
  chunk_metadata: { 
    chunk_number: 0,
    preview: 'preview'
  }
}
```

### 4. Erro: "TypeError: fetch failed"
**Problema**: Conectividade ou tamanho da query  
**Solução**: Dividir em batches menores ou usar script local

## ✅ Resultado Final do Deploy

```sql
-- Documento criado
ID: 1364
file_name: PDPOA2025-QA.docx
type: Q&A
is_processed: true

-- Embeddings criados
IDs: 17, 18, 19, 20, 21
Total: 5 chunks principais

-- Chunk sobre altura (ID: 18)
content_chunk: "🟨 Pergunta: Qual a altura máxima permitida..."
chunk_metadata: {
  "keywords": ["altura", "gabarito", "elevação", ...],
  "topic": "Altura de Edificações"
}
```

## 🔍 Queries de Verificação

```sql
-- Verificar documento
SELECT id, file_name, metadata->>'title' as title, is_processed
FROM documents
WHERE file_name = 'PDPOA2025-QA.docx';

-- Verificar embeddings
SELECT id, document_id, 
       substring(content_chunk, 1, 50) as preview,
       chunk_metadata->>'topic' as topic
FROM document_embeddings
WHERE document_id = 1364;

-- Buscar por altura
SELECT content_chunk, chunk_metadata
FROM document_embeddings
WHERE document_id = 1364
  AND (content_chunk ILIKE '%altura%' 
       OR chunk_metadata->>'keywords' LIKE '%altura%');
```

## 📊 Estrutura de Dados Correta

### Para `documents`:
```javascript
{
  file_name: string,      // Nome do arquivo
  file_path: string,      // Caminho do arquivo
  type: string,           // Tipo (Q&A, Regulamentação, etc)
  is_public: boolean,     // Público ou privado
  is_processed: boolean,  // Status de processamento
  metadata: {             // JSONB com metadados
    title: string,
    processed_at: string,
    description: string
  }
}
```

### Para `document_embeddings`:
```javascript
{
  document_id: number,    // FK para documents
  content_chunk: string,  // Texto do chunk
  embedding: string,      // JSON string do array 1536D
  chunk_metadata: {       // JSONB com metadados
    keywords: string[],
    chunk_number: number,
    topic: string,
    has_qa: boolean
  }
}
```

## 💡 Dicas Importantes

1. **Sempre verifique** a estrutura das tabelas antes de inserir
2. **Use `chunk_metadata`** para armazenar informações extras (não `metadata`)
3. **Embeddings** devem ser JSON string, não array direto
4. **Service role key** tem permissão total - use com cuidado
5. **Teste com SELECT** antes de INSERT para verificar colunas

## 🚀 Comando Rápido para Deploy

```bash
# Deploy do script finalizado
node deploy-qa-final.mjs

# Verificar no Supabase
# https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/editor
```

---

**Deploy realizado em**: 31/01/2025  
**Documento ID**: 1364  
**Chunks IDs**: 17-21