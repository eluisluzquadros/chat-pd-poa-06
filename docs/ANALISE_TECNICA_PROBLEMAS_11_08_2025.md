# 🔬 ANÁLISE TÉCNICA DOS PROBLEMAS IDENTIFICADOS

**Data:** 11/08/2025  
**Análise por:** Claude Code Assistant  
**Status:** 🔴 Problemas Críticos Identificados

---

## 📊 RESUMO DA ANÁLISE

Após investigação profunda do código-fonte, identifiquei os pontos exatos onde o sistema está falhando em citar artigos de lei e diferenciar bairros corretamente.

---

## 🔍 PROBLEMA 1: CITAÇÕES DE ARTIGOS DE LEI

### Diagnóstico do Query Analyzer (`query-analyzer/index.ts`)

#### ✅ O QUE ESTÁ FUNCIONANDO:
- **Linhas 74-96**: Detecção de queries legais está implementada
- **Linhas 99-120**: Retorna corretamente `intent: 'legal_article'` quando detecta query legal
- **Linha 109**: Força `strategy: 'unstructured_only'` para buscar em documentos

#### ❌ PROBLEMA IDENTIFICADO:
- **Linha 103**: O `intent` está sendo marcado como tipo genérico `'conceptual'` em vez de manter `'legal_article'`
- **Linha 113**: O campo `metadata.isLegalQuery` não é propagado corretamente para o response-synthesizer
- **Problema TypeScript**: O tipo `QueryAnalysisResponse` não inclui `'legal_article'` como opção válida

### Diagnóstico do Response Synthesizer (`response-synthesizer/index.ts`)

#### ✅ O QUE ESTÁ FUNCIONANDO:
- **Linhas 253-256**: Detecta queries legais usando múltiplos critérios
- **Linhas 302-331**: Tem mapeamento hardcoded de artigos específicos
- **Linha 317**: Formato correto definido: `**Art. XX [- Inciso se aplicável]**`

#### ❌ PROBLEMAS IDENTIFICADOS:

1. **Hardcoding em vez de busca dinâmica** (Linhas 304-315):
   - Sistema tem mapeamento fixo de artigos
   - Não busca dinamicamente na base de conhecimento
   - Se o artigo não está no mapeamento, não é citado

2. **Dependência de keywords específicas** (Linhas 322-331):
   - Só responde com artigo se detectar palavras exatas
   - Não usa os resultados do `enhanced-vector-search`

3. **Falta integração com metadados** (Linha 253):
   - Verifica `analysisResult?.metadata?.isLegalQuery` mas este campo não chega populado
   - Não extrai metadados de artigos dos `vectorResults`

---

## 🔍 PROBLEMA 2: DIFERENCIAÇÃO DE BAIRROS

### Diagnóstico do SQL Generator (`sql-generator/index.ts`)

#### ✅ O QUE ESTÁ FUNCIONANDO:
- **Linhas 103-106**: Instrução para usar MAIÚSCULAS com acentos
- **Linhas 136-146**: Exemplos mostram queries corretas
- **Linha 64**: Tabela `regime_urbanistico` com 385 registros está configurada

#### ❌ PROBLEMAS IDENTIFICADOS:

1. **Normalização inconsistente** (Linhas 46-57):
   ```typescript
   // Normaliza mas não garante matching exato
   analysisResult.entities.bairros = analysisResult.entities.bairros.map((bairro: string) => 
     normalizeBairroName(bairro)
   );
   ```
   - Normaliza para maiúsculas mas não valida se o bairro existe
   - Não detecta ambiguidade (Boa Vista vs Boa Vista do Sul)

2. **Prompt do GPT permite ILIKE** (Linha 104):
   ```sql
   WHERE bairro ILIKE '%nome_parcial%' -- Permite matching parcial
   ```
   - ILIKE com % permite que "Boa Vista" encontre "Boa Vista do Sul"

3. **Falta validação de ambiguidade**:
   - Não verifica se há múltiplos bairros que correspondem
   - Não pede confirmação ao usuário quando há ambiguidade

### Diagnóstico do Query Analyzer (`query-analyzer/index.ts`)

#### ✅ O QUE ESTÁ FUNCIONANDO:
- **Linhas 506-531**: Remove "Porto Alegre" da lista de bairros (cidade, não bairro)
- **Linhas 374-379**: Instruções para diferenciar bairros no prompt

#### ❌ PROBLEMAS IDENTIFICADOS:

1. **Sem validação contra lista real** (Linha 553):
   - Não valida se o bairro extraído realmente existe no banco
   - Adiciona qualquer string que pareça um bairro

2. **Extração genérica demais** (Linhas 535-563):
   ```typescript
   const bairrosFromQuery = extractBairroTerms(query);
   // Adiciona sem validar se existe ou é ambíguo
   ```

---

## 🔍 PROBLEMA 3: VALIDAÇÃO QA EM LOOP INFINITO

### Suspeita Principal
O problema está na função de validação batch que não implementa:
- Timeout por caso de teste
- Limite de concorrência
- Progress tracking
- Fallback para erros

---

## 💡 SOLUÇÕES PROPOSTAS

### 1. CORRIGIR CITAÇÕES DE ARTIGOS

#### A. Query Analyzer - Adicionar tipo correto
```typescript
interface QueryAnalysisResponse {
  intent: 'conceptual' | 'tabular' | 'hybrid' | 'legal_article'; // Adicionar legal_article
  // ...
  metadata?: {
    isLegalQuery: boolean;
    requiresCitation: boolean;
  };
}
```

#### B. Response Synthesizer - Usar busca dinâmica
```typescript
// Em vez de hardcoding, extrair dos vectorResults
function extractLegalReferences(vectorResults: any[]): LegalReference[] {
  return vectorResults
    .filter(r => r.metadata?.article)
    .map(r => ({
      lei: r.metadata.source,
      artigo: r.metadata.article,
      inciso: r.metadata.inciso,
      texto: r.content
    }));
}
```

### 2. CORRIGIR DIFERENCIAÇÃO DE BAIRROS

#### A. SQL Generator - Forçar matching exato
```typescript
// Sempre usar matching exato
const query = `
  SELECT * FROM regime_urbanistico 
  WHERE bairro = '${normalizedBairro}' -- Exato, não ILIKE
`;

// Verificar ambiguidade primeiro
const checkAmbiguity = `
  SELECT DISTINCT bairro 
  FROM regime_urbanistico 
  WHERE bairro LIKE '%${partialName}%'
`;
```

#### B. Adicionar validação de bairros
```typescript
// Carregar lista de bairros válidos na inicialização
const VALID_BAIRROS = await loadValidBairros();

// Validar antes de gerar SQL
function validateBairro(name: string): ValidationResult {
  const exact = VALID_BAIRROS.find(b => b === name.toUpperCase());
  if (exact) return { valid: true, bairro: exact };
  
  const similar = VALID_BAIRROS.filter(b => b.includes(name.toUpperCase()));
  if (similar.length > 1) {
    return { 
      valid: false, 
      ambiguous: true, 
      options: similar 
    };
  }
  
  return { valid: false };
}
```

### 3. CORRIGIR VALIDAÇÃO QA

```typescript
async function validateWithTimeout(testCase: TestCase): Promise<Result> {
  return Promise.race([
    validateSingleCase(testCase),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 30000)
    )
  ]);
}

// Processar em batches com limite de concorrência
async function processBatch(cases: TestCase[], batchSize = 5) {
  const results = [];
  for (let i = 0; i < cases.length; i += batchSize) {
    const batch = cases.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map(validateWithTimeout)
    );
    results.push(...batchResults);
    
    // Progress update
    console.log(`Processed ${i + batch.length}/${cases.length}`);
  }
  return results;
}
```

---

## 📋 PRIORIZAÇÃO DAS CORREÇÕES

### 🔴 URGENTE (24h)
1. **Citações de artigos**: Remover hardcoding, usar busca dinâmica
2. **Diferenciação de bairros**: Implementar matching exato
3. **Timeout na validação QA**: Adicionar Promise.race com timeout

### 🟡 IMPORTANTE (48h)
4. **Validação de bairros**: Lista de bairros válidos
5. **Metadados legais**: Propagar corretamente do analyzer ao synthesizer
6. **Progress tracking**: Mostrar progresso da validação

### 🟢 MELHORIAS (72h)
7. **Cache inteligente**: Cache específico para queries legais
8. **Embeddings especializados**: Fine-tuning para documentos legais
9. **UI de confirmação**: Quando detectar ambiguidade

---

## 🎯 CRITÉRIOS DE SUCESSO

### Para Citações de Artigos
- ✅ 95% das queries legais devem incluir artigo específico
- ✅ Formato: "Art. XX da [LUOS/PDUS]"
- ✅ Busca dinâmica, não hardcoded

### Para Diferenciação de Bairros
- ✅ 100% de precisão na diferenciação
- ✅ Zero falsos positivos
- ✅ Confirmação quando ambíguo

### Para Validação QA
- ✅ Completar 121 casos em <5 minutos
- ✅ Zero timeouts infinitos
- ✅ Progress tracking visível

---

## 🚀 PRÓXIMOS PASSOS

1. **Implementar correções** no query-analyzer, sql-generator e response-synthesizer
2. **Executar testes** com os scripts criados
3. **Validar manualmente** no `/chat` com diferentes modelos
4. **Monitorar métricas** após deploy

---

**Conclusão**: Os problemas estão claramente identificados e localizados no código. As soluções propostas são viáveis e não requerem reestruturação major, apenas ajustes pontuais nos componentes existentes.