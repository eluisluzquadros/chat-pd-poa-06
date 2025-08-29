# 📚 Guia Completo de Deploy - Supabase CLI

## 🎯 Visão Geral

Este guia documenta o processo completo de deploy de queries SQL e Edge Functions no projeto Chat PD POA usando o Supabase CLI, baseado na estrutura atual do banco de dados.

## 📊 Estrutura Atual do Banco de Dados

### Tabelas Principais

#### 1. **documents**
```sql
-- Colunas disponíveis:
- id (integer, PK)
- content (text)
- metadata (jsonb)
- embedding (vector)
- user_id (uuid)
- title (text)
- file_name (text)
- file_path (text)
- type (text)
- is_public (boolean)
- is_processed (boolean)
```

#### 2. **document_embeddings**
```sql
-- Colunas disponíveis:
- id (integer, PK)
- document_id (integer, FK)
- content_chunk (text)
- embedding (vector)
- chunk_metadata (jsonb)
- created_at (timestamp)
```

#### 3. **document_rows**
```sql
-- Colunas disponíveis:
- id (integer, PK)
- dataset_id (text)
- row_data (jsonb)
- metadata (jsonb)
- created_at (timestamp)
```

#### 4. **query_cache**
```sql
-- Colunas disponíveis:
- id (integer, PK)
- query (text)
- result (jsonb)
- created_at (timestamp)
- expires_at (timestamp)
```

## 🚀 Deploy de Edge Functions

### 1. Deploy Individual de Função

```bash
# Sintaxe básica
npx supabase functions deploy [nome-da-funcao] --project-ref ngrqwmvuhvjkeohesbxs

# Exemplos práticos
npx supabase functions deploy query-analyzer --project-ref ngrqwmvuhvjkeohesbxs
npx supabase functions deploy sql-generator --project-ref ngrqwmvuhvjkeohesbxs
npx supabase functions deploy enhanced-vector-search --project-ref ngrqwmvuhvjkeohesbxs
npx supabase functions deploy response-synthesizer --project-ref ngrqwmvuhvjkeohesbxs
npx supabase functions deploy agentic-rag --project-ref ngrqwmvuhvjkeohesbxs
```

### 2. Deploy de Todas as Funções

```bash
# Deploy todas as funções de uma vez
npx supabase functions deploy --project-ref ngrqwmvuhvjkeohesbxs
```

### 3. Verificar Functions Deployadas

```bash
# Listar funções locais
ls supabase/functions/

# Verificar no dashboard
# https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/functions
```

## 💾 Deploy de Queries SQL

### 1. Via Supabase Client (Node.js)

#### Inserir Documento

```javascript
// deploy-document.mjs
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo'
);

// Inserir novo documento
const { data, error } = await supabase
  .from('documents')
  .insert({
    file_name: 'exemplo.docx',
    file_path: 'knowledgebase/exemplo.docx',
    type: 'Q&A',
    is_public: true,
    is_processed: true,
    metadata: {
      title: 'Documento Exemplo',
      processed_at: new Date().toISOString()
    }
  })
  .select()
  .single();

console.log('Documento inserido:', data?.id);
```

#### Inserir Embeddings

```javascript
// deploy-embeddings.mjs
// Estrutura correta para document_embeddings
const { error } = await supabase
  .from('document_embeddings')
  .insert({
    document_id: 1364, // ID do documento
    content_chunk: 'Conteúdo do chunk aqui',
    embedding: JSON.stringify(new Array(1536).fill(0.1)), // Vector 1536D
    chunk_metadata: {
      keywords: ['altura', 'gabarito', 'edificação'],
      chunk_number: 1,
      topic: 'Altura de Edificações'
    }
  });
```

### 2. Via SQL Editor (Dashboard)

```sql
-- Inserir documento com estrutura correta
INSERT INTO documents (
  file_name,
  file_path,
  type,
  is_public,
  is_processed,
  metadata
) VALUES (
  'PDPOA2025-QA.docx',
  'knowledgebase/PDPOA2025-QA.docx',
  'Q&A',
  true,
  true,
  '{"title": "PDPOA2025 Q&A", "total_chunks": 5}'::jsonb
) RETURNING id;

-- Inserir embedding
INSERT INTO document_embeddings (
  document_id,
  content_chunk,
  embedding,
  chunk_metadata
) VALUES (
  1364,
  'Pergunta sobre altura máxima...',
  ARRAY_FILL(0.1::float, ARRAY[1536])::vector(1536),
  '{"keywords": ["altura", "gabarito"], "topic": "Altura"}'::jsonb
);
```

## 📝 Scripts de Deploy Práticos

### 1. Deploy de Dados Tabulares (document_rows)

```javascript
// deploy-tabular-data.mjs
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  '[SERVICE_ROLE_KEY]'
);

async function deployTabularData() {
  // Dados de bairros com risco
  const bairrosData = [
    {
      dataset_id: 'bairros_risco_2024',
      row_data: {
        Bairro: 'CENTRO HISTÓRICO',
        NivelRisco: 'Alto',
        TipoRisco: 'Inundação',
        Observacao: 'Área próxima ao Guaíba'
      },
      metadata: { source: 'Defesa Civil POA', year: 2024 }
    }
    // ... mais bairros
  ];

  const { error } = await supabase
    .from('document_rows')
    .insert(bairrosData);

  console.log(error ? 'Erro' : 'Dados inseridos com sucesso');
}
```

### 2. Deploy de Cache de Queries

```javascript
// manage-query-cache.mjs
// Limpar cache antigo
const { error: clearError } = await supabase
  .from('query_cache')
  .delete()
  .lt('expires_at', new Date().toISOString());

// Inserir cache de query
const { error: cacheError } = await supabase
  .from('query_cache')
  .insert({
    query: 'altura máxima centro histórico',
    result: { 
      answer: 'A altura máxima no Centro Histórico é 42 metros',
      sources: ['LUOS Art. 123']
    },
    expires_at: new Date(Date.now() + 24*60*60*1000).toISOString() // 24h
  });
```

## 🔧 Workflow Completo de Deploy

### 1. Preparação

```bash
# Verificar estrutura das tabelas
node -e "
import { createClient } from '@supabase/supabase-js';
const supabase = createClient('[URL]', '[KEY]');
const { data } = await supabase.from('documents').select('*').limit(1);
console.log('Colunas:', Object.keys(data[0]));
"
```

### 2. Deploy de Documento + Embeddings

```javascript
// deploy-complete-document.mjs
async function deployCompleteDocument() {
  // 1. Criar documento
  const { data: doc } = await supabase
    .from('documents')
    .insert({
      file_name: 'novo-documento.docx',
      file_path: 'knowledgebase/novo-documento.docx',
      type: 'Regulamentação',
      is_public: true,
      is_processed: false,
      metadata: { title: 'Novo Documento' }
    })
    .select()
    .single();

  // 2. Processar e criar chunks
  const chunks = processDocument(content); // sua lógica aqui

  // 3. Inserir embeddings
  const embeddings = chunks.map((chunk, idx) => ({
    document_id: doc.id,
    content_chunk: chunk.text,
    embedding: generateEmbedding(chunk.text),
    chunk_metadata: {
      chunk_number: idx,
      keywords: extractKeywords(chunk.text)
    }
  }));

  await supabase
    .from('document_embeddings')
    .insert(embeddings);

  // 4. Marcar como processado
  await supabase
    .from('documents')
    .update({ is_processed: true })
    .eq('id', doc.id);
}
```

### 3. Deploy de Edge Functions com Variáveis

```bash
# Deploy com secrets/variáveis de ambiente
npx supabase functions deploy query-analyzer \
  --project-ref ngrqwmvuhvjkeohesbxs \
  --no-verify-jwt

# Definir variáveis de ambiente
npx supabase secrets set OPENAI_API_KEY=sk-... \
  --project-ref ngrqwmvuhvjkeohesbxs
```

## 🐛 Troubleshooting

### Erros Comuns e Soluções

#### 1. "Column does not exist"
```javascript
// ❌ ERRADO - coluna 'name' não existe
.eq('name', 'documento.docx')

// ✅ CORRETO - usar metadata
.eq('metadata->title', 'documento.docx')
// ou
.eq('file_name', 'documento.docx')
```

#### 2. "Could not find column in schema cache"
```javascript
// ❌ ERRADO - colunas incorretas
{
  content: 'texto',         // não existe
  content_preview: 'preview', // não existe
  chunk_index: 0            // não existe
}

// ✅ CORRETO - colunas existentes
{
  content_chunk: 'texto',
  chunk_metadata: { chunk_number: 0 }
}
```

#### 3. Vector/Embedding Issues
```javascript
// ❌ ERRADO - formato incorreto
embedding: [0.1, 0.2, 0.3] // array simples

// ✅ CORRETO - JSON string
embedding: JSON.stringify(new Array(1536).fill(0.1))
```

## 📋 Checklist de Deploy

- [ ] Verificar estrutura das tabelas antes do deploy
- [ ] Usar colunas corretas (content_chunk, não content)
- [ ] Embeddings como JSON string de 1536 dimensões
- [ ] Incluir project-ref em todos os comandos CLI
- [ ] Testar queries no dashboard antes de automatizar
- [ ] Verificar logs de Edge Functions após deploy
- [ ] Limpar cache se necessário após mudanças

## 🔗 Links Úteis

- **Dashboard**: https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs
- **SQL Editor**: https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/sql
- **Edge Functions**: https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/functions
- **Logs**: https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/logs/edge-functions

## 💡 Dicas Finais

1. **Sempre teste localmente** antes de deployar
2. **Use transações** para operações múltiplas
3. **Monitore logs** após cada deploy
4. **Mantenha backups** antes de alterações grandes
5. **Documente mudanças** no schema

---

**Última atualização**: 31/01/2025  
**Versão**: 2.0