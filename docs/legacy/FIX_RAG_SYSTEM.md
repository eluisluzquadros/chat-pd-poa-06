# 🚨 PLANO DE AÇÃO DEFINITIVO - CORREÇÃO DO SISTEMA RAG

## 📊 DIAGNÓSTICO ATUAL (02/01/2025)

### ✅ O que está funcionando:
- Sistema RAG responde queries com referências de artigos (Art. 81 - III)
- Diferenciação entre queries tabulares e conceituais
- Edge Functions deployadas e operacionais

### ⚠️ Problemas Identificados:
1. **Possível dessincronização** entre código e Supabase
2. **Base de conhecimento** pode estar desatualizada
3. **Chunking hierárquico** pode não estar totalmente ativo

## 🎯 PLANO DE CORREÇÃO IMEDIATA

### PASSO 1: Re-deploy Completo (EXECUTADO ✅)
Todas as funções críticas foram re-deployadas:
- ✅ process-document (com hierarchical-chunking.ts)
- ✅ enhanced-vector-search
- ✅ response-synthesizer
- ✅ query-analyzer
- ✅ sql-generator
- ✅ agentic-rag

### PASSO 2: Verificar Função SQL Hierárquica
Execute no Supabase SQL Editor:

```sql
-- Verificar se a função existe
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'match_hierarchical_documents';

-- Se não existir, criar:
CREATE OR REPLACE FUNCTION match_hierarchical_documents(
  query_embedding vector(1536),
  match_count int DEFAULT 10,
  filter jsonb DEFAULT '{}'::jsonb
) RETURNS TABLE (
  id uuid,
  content text,
  content_chunk text,
  chunk_metadata jsonb,
  similarity float,
  document_metadata jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    de.id,
    de.content,
    de.content_chunk,
    de.chunk_metadata,
    1 - (de.embedding <=> query_embedding) as similarity,
    dm.metadata as document_metadata
  FROM document_embeddings de
  LEFT JOIN document_metadata dm ON de.document_id = dm.document_id
  WHERE 
    de.chunk_metadata IS NOT NULL
    AND (
      filter->>'hasCertification' IS NULL 
      OR de.chunk_metadata->>'hasCertification' = filter->>'hasCertification'
    )
    AND (
      filter->>'has4thDistrict' IS NULL 
      OR de.chunk_metadata->>'has4thDistrict' = filter->>'has4thDistrict'
    )
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;
```

### PASSO 3: Reprocessar Base de Conhecimento (RECOMENDADO)

#### Opção A: Reprocessamento Completo (Mais Seguro)
```bash
# Terminal 1 - Reprocessar documentos com chunking hierárquico
npx tsx scripts/reprocess-knowledge-base.ts

# Quando perguntar "Limpar dados existentes?", digite: s
```

#### Opção B: Reprocessamento Simples (Mais Rápido)
```bash
npx tsx scripts/simple-reprocess.ts
```

### PASSO 4: Testes de Validação

Execute estas queries para validar o sistema:

#### Teste 1: Certificação Sustentável
```bash
curl -L -X POST "https://ngrqwmvuhvjkeohesbxs.supabase.co/functions/v1/agentic-rag" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg" \
  -H "Content-Type: application/json" \
  --data '{"message":"Qual artigo da LUOS trata da Certificação em Sustentabilidade Ambiental?"}'
```
**Esperado**: Art. 81 - III com texto específico

#### Teste 2: 4º Distrito
```bash
curl -L -X POST "https://ngrqwmvuhvjkeohesbxs.supabase.co/functions/v1/agentic-rag" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg" \
  -H "Content-Type: application/json" \
  --data '{"message":"Qual a regra para empreendimentos do 4º distrito?"}'
```
**Esperado**: Art. 74 com detalhes da ZOT 8.2

#### Teste 3: Altura em Bairro
```bash
curl -L -X POST "https://ngrqwmvuhvjkeohesbxs.supabase.co/functions/v1/agentic-rag" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg" \
  -H "Content-Type: application/json" \
  --data '{"message":"Qual a altura máxima no Petrópolis?"}'
```
**Esperado**: Dados específicos do bairro Petrópolis

### PASSO 5: Monitoramento Contínuo

#### Script de Diagnóstico (Criar se não existir)
```typescript
// scripts/diagnose-rag-issues.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function diagnose() {
  console.log('🔍 Diagnóstico do Sistema RAG\n');
  
  // 1. Verificar chunks hierárquicos
  const { data: chunks, error: chunksError } = await supabase
    .from('document_embeddings')
    .select('id, chunk_metadata')
    .not('chunk_metadata', 'is', null)
    .limit(5);
    
  console.log('📦 Chunks Hierárquicos:', chunks?.length || 0);
  
  // 2. Verificar função SQL
  const { data: functions } = await supabase
    .rpc('pg_proc')
    .select('proname')
    .eq('proname', 'match_hierarchical_documents');
    
  console.log('🔧 Função Hierárquica:', functions?.length ? '✅' : '❌');
  
  // 3. Testar query
  const testQuery = 'certificação sustentável';
  const response = await fetch(
    `${process.env.SUPABASE_URL}/functions/v1/agentic-rag`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: testQuery })
    }
  );
  
  const result = await response.json();
  console.log('🎯 Teste de Query:', result.response?.includes('Art. 81') ? '✅' : '❌');
  
  console.log('\n📊 Resultado do Diagnóstico:');
  console.log(result);
}

diagnose().catch(console.error);
```

## 🚀 EXECUÇÃO RECOMENDADA

1. **Agora**: Executar SQL de verificação/criação da função
2. **Em seguida**: Rodar reprocessamento (Opção A)
3. **Depois**: Executar os 3 testes de validação
4. **Finalmente**: Monitorar no dashboard

## ⏰ Tempo Total Estimado: 15 minutos

- SQL: 2 min
- Reprocessamento: 10 min
- Testes: 3 min

## 📞 Se Persistir o Problema

1. Verificar logs no Supabase Dashboard
2. Executar script de diagnóstico
3. Verificar se OPENAI_API_KEY está correta na tabela secrets
4. Confirmar que não há rate limiting ativo

## ✅ Critérios de Sucesso

O sistema estará funcionando corretamente quando:
- ✅ Queries sobre certificação retornam "Art. 81 - III"
- ✅ Queries sobre 4º distrito retornam "Art. 74"
- ✅ Queries sobre bairros retornam dados tabulares precisos
- ✅ Respostas incluem trechos específicos da lei, não genéricos