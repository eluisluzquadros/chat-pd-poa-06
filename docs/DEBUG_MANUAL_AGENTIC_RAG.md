# 🔍 Debug Manual - Sistema Agentic-RAG

## 📊 Análise do Problema

### Problema Principal: Sistema funcionando a ~50% de capacidade
- **Acurácia atual**: 86.7% (meta: >95%)
- **Causa raiz**: Dados existem no banco mas não estão sendo consultados corretamente
- **Impacto**: Falhas em perguntas sobre regime urbanístico, riscos e assuntos gerais

## 🗂️ Edge Functions Críticas

### 1. **agentic-rag** (Principal)
- **Arquivo**: `backend/supabase/functions/agentic-rag/index.ts`
- **Função**: Orquestrador principal do RAG
- **Problemas identificados**:
  - Usa RPC `match_legal_articles` que pode estar filtrando document_types
  - Busca direta em fallback não ocorre para todos os casos
  - Não consulta `qa_test_cases` para respostas validadas

### 2. **response-synthesizer** 
- **Arquivo**: `backend/supabase/functions/response-synthesizer/index.ts`
- **Função**: Formata e enriquece respostas
- **Possui extrator para REGIME_FALLBACK mas não é usado adequadamente**

### 3. **query-analyzer**
- **Função**: Analisa e classifica queries
- **Pode estar classificando incorretamente queries de regime urbanístico**

### 4. **sql-generator**
- **Função**: Gera SQL para tabela `regime_urbanistico_consolidado`
- **Problema**: Text-to-SQL falha frequentemente com NLQ complexo

## 📁 Schemas das Tabelas

### 1. **legal_articles** (1,998 registros)
```sql
-- Estrutura atual no banco
id                 (number)
document_type      (string) -- LUOS, PDUS apenas! Missing: REGIME_FALLBACK, QA_CATEGORY
article_number     (number)
full_content       (string) -- ⚠️ ATENÇÃO: Dados em full_content, não content!
article_text       (string)
keywords           (array)
embedding          (string) -- vector 1536 dimensions
created_at         (string)
updated_at         (null)
```

**⚠️ PROBLEMA DESCOBERTO:**
- **Esperado**: 4 document_types (LUOS, PDUS, REGIME_FALLBACK, QA_CATEGORY)
- **Realidade**: Apenas 2 (LUOS: 398, PDUS: 602)
- **Missing**: 998 registros de REGIME_FALLBACK e QA_CATEGORY!

### 2. **qa_test_cases** (125 registros)
```sql
id                    (number)
test_id              (string)
query                (string)
expected_keywords    (array)
category             (string)
complexity           (string)
expected_answer      (string) -- ⚠️ Respostas validadas não usadas!
question             (string)
tags                 (array)
is_sql_related       (boolean)
difficulty           (string)
```

### 3. **regime_urbanistico_consolidado** (385 registros)
```sql
id                   (number)
Bairro              (string) -- Nome do bairro
Zona                (string) -- Ex: "ZOT 02", "ZEIS 1"
Categoria_Risco     (string) -- Risco de desastres
Altura_Maxima___Edificacao_Isolada  (number) -- metros
Coeficiente_de_Aproveitamento___Basico  (string) 
Coeficiente_de_Aproveitamento___Maximo  (string)
-- + 40 outras colunas com parâmetros urbanísticos
```

## 🐛 Bugs Críticos Identificados

### BUG #1: Dados REGIME_FALLBACK não existem no banco!
```javascript
// ESPERADO no banco (segundo CLAUDE.md):
// - REGIME_FALLBACK: 864 records
// - QA_CATEGORY: 16 records

// REALIDADE no banco:
// - REGIME_FALLBACK: 0 records ❌
// - QA_CATEGORY: 0 records ❌
```

**SOLUÇÃO**: Importar os dados faltantes!

### BUG #2: RPC match_legal_articles pode estar filtrando
```sql
-- Verificar definição da função no Postgres:
CREATE OR REPLACE FUNCTION match_legal_articles(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
-- PRECISA VERIFICAR SE FILTRA document_type!
```

### BUG #3: Campo errado sendo consultado
```javascript
// ERRADO (algumas buscas):
.or('content.ilike.%${query}%')  // ❌ campo 'content' não existe!

// CORRETO:
.or('full_content.ilike.%${query}%')  // ✅ campo correto
```

## 🔧 Scripts de Diagnóstico

### 1. Verificar dados REGIME_FALLBACK
```javascript
// test-regime-data.mjs
const { data } = await supabase
  .from('legal_articles')
  .select('document_type')
  .in('document_type', ['REGIME_FALLBACK', 'QA_CATEGORY']);

console.log('REGIME_FALLBACK count:', data?.filter(d => d.document_type === 'REGIME_FALLBACK').length);
console.log('QA_CATEGORY count:', data?.filter(d => d.document_type === 'QA_CATEGORY').length);
```

### 2. Verificar RPC function
```sql
-- No Supabase SQL Editor:
SELECT 
  proname as function_name,
  prosrc as source_code
FROM pg_proc
WHERE proname = 'match_legal_articles';
```

### 3. Test de busca direta
```javascript
// Testar busca em todos document_types
const { data: allTypes } = await supabase
  .from('legal_articles')
  .select('document_type, COUNT(*)')
  .group('document_type');
```

## 📋 Checklist de Correção

### Passo 1: Verificar e Importar Dados
- [ ] Confirmar se REGIME_FALLBACK existe no banco
- [ ] Confirmar se QA_CATEGORY existe no banco  
- [ ] Se não existem, rodar script de importação:
  ```bash
  cd scripts
  npm run import-regime-fallback
  npm run import-qa-categories
  ```

### Passo 2: Corrigir RPC match_legal_articles
- [ ] Verificar definição atual da função
- [ ] Remover filtros de document_type se existirem
- [ ] Ou criar nova RPC sem filtros

### Passo 3: Corrigir agentic-rag
- [ ] Linha ~714: Adicionar fallback para TODOS document_types
- [ ] Adicionar busca em qa_test_cases.expected_answer
- [ ] Corrigir referências de 'content' para 'full_content'

### Passo 4: Melhorar SQL Generator
- [ ] Implementar mapping direto de perguntas comuns
- [ ] Adicionar cache de queries SQL bem-sucedidas
- [ ] Criar fallback para tabela pré-processada

## 🚀 Scripts de Teste

### Test completo após correções:
```bash
# Rodar teste de QA
cd scripts
npm run test-qa-comprehensive

# Testar especificamente regime urbanístico
node test-regime-fallback.mjs

# Validar respostas do chat
node test-chat-validation.mjs
```

## 📈 Métricas de Sucesso

### Antes das correções:
- Acurácia: 86.7%
- Dados utilizados: ~56% (apenas LUOS + PDUS)
- Falhas em regime urbanístico: ~80%

### Após correções esperadas:
- Acurácia: >95%
- Dados utilizados: 100%
- Falhas em regime urbanístico: <10%

## 🔍 Próximos Passos

1. **URGENTE**: Verificar se dados REGIME_FALLBACK e QA_CATEGORY existem
2. **CRÍTICO**: Se não existem, importá-los imediatamente
3. **IMPORTANTE**: Corrigir RPC e queries
4. **VALIDAR**: Rodar suite completa de testes

## 📝 Notas Adicionais

- Sistema tem cache de 24h que pode mascarar correções
- Limpar cache após correções: `DELETE FROM query_cache WHERE created_at > now() - interval '1 day'`
- Monitorar logs em tempo real durante testes
- Considerar implementar fallback chain mais robusto

---
**Última atualização**: 25/08/2025
**Status**: 🔴 Sistema operando a ~50% - Correções urgentes necessárias