# 🎯 PLANO DE AÇÃO - MELHORIAS NO PIPELINE RAG
**Data:** 12/08/2025  
**Versão:** 1.0.0  
**Status:** 🟡 **EM IMPLEMENTAÇÃO**

---

## 📊 RESUMO EXECUTIVO

Este plano de ação visa corrigir os problemas críticos identificados no relatório de status de 11/08/2025, focando em melhorias no pipeline RAG para garantir citação correta de artigos de lei, diferenciação adequada de bairros e alinhamento entre testes automáticos e manuais.

---

## 🔴 PROBLEMAS PRIORITÁRIOS IDENTIFICADOS

### P1 - CRÍTICO: Falha na Citação de Artigos de Lei (~90% de falha)
**Status Atual:** O sistema raramente cita artigos específicos da LUOS/PDUS
**Meta:** 100% de citações corretas para questões legais

### P2 - CRÍTICO: Discrepância Testes Automáticos vs Manuais  
**Status Atual:** Testes automáticos reportam ~100%, manuais <50%
**Meta:** Alinhamento de 95% entre ambos

### P3 - ALTO: Diferenciação de Bairros Falha
**Status Atual:** Sistema confunde bairros com nomes similares
**Meta:** 100% de precisão na identificação

### P4 - MÉDIO: Validação QA em Loop Infinito
**Status Atual:** Processo nunca finaliza
**Meta:** Execução em <2 minutos para 10 casos

### P5 - BAIXO: Funcionalidades Admin Quebradas
**Status Atual:** Dashboard e métricas desatualizadas
**Meta:** Restaurar todas as funcionalidades

---

## 🛠️ SOLUÇÕES TÉCNICAS PROPOSTAS

### 1. IMPLEMENTAÇÃO DE RAG HÍBRIDO APRIMORADO

#### 1.1 Query Analyzer - Detecção de Intenção Legal
```typescript
// Adicionar ao query-analyzer/index.ts
interface QueryAnalysis {
  intent: 'legal_article' | 'urban_parameters' | 'general';
  requiresCitation: boolean;
  legalKeywords: string[];
  expectedArticles: string[];
}

const detectLegalIntent = (query: string): QueryAnalysis => {
  const legalPatterns = [
    { pattern: /certificação.*sustentabilidade/i, article: 'Art. 81, Inciso III' },
    { pattern: /4[º°]?\s*distrito/i, article: 'Art. 74' },
    { pattern: /altura\s+máxima/i, article: 'Art. 81' },
    { pattern: /coeficiente.*aproveitamento/i, article: 'Art. 82' },
    { pattern: /ZEIS/i, article: 'Art. 92' },
    { pattern: /outorga\s+onerosa/i, article: 'Art. 86' },
    { pattern: /estudo.*impacto.*vizinhança|EIV/i, article: 'Art. 89' },
  ];
  
  // Detectar padrões e retornar artigos esperados
  const matches = legalPatterns.filter(p => p.pattern.test(query));
  
  return {
    intent: matches.length > 0 ? 'legal_article' : 'urban_parameters',
    requiresCitation: matches.length > 0 || query.includes('artigo') || query.includes('lei'),
    legalKeywords: matches.map(m => m.pattern.source),
    expectedArticles: matches.map(m => m.article)
  };
};
```

#### 1.2 Enhanced Vector Search - Busca Semântica de Artigos
```typescript
// Adicionar ao enhanced-vector-search/index.ts
const searchLegalArticles = async (query: string, expectedArticles: string[]) => {
  // Buscar especificamente em chunks que contêm artigos
  const results = await supabase
    .rpc('match_legal_articles', {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: 5,
      article_numbers: expectedArticles
    });
    
  // Retornar com metadados estruturados
  return results.map(r => ({
    content: r.content,
    article: r.metadata.article,
    law: r.metadata.law, // LUOS ou PDUS
    relevance: r.similarity
  }));
};
```

#### 1.3 Response Synthesizer - Formatação Obrigatória de Citações
```typescript
// Melhorar response-synthesizer/index.ts
const LEGAL_CITATION_PROMPT = `
REGRA FUNDAMENTAL: Para QUALQUER pergunta sobre legislação urbana, você DEVE:

1. SEMPRE citar o artigo específico no formato: **Art. XX [- Inciso YY]**
2. SEMPRE incluir o nome da lei: (LUOS) ou (PDUS)
3. SEMPRE fornecer o texto exato do artigo quando disponível

MAPEAMENTO OBRIGATÓRIO DE CONCEITOS:
- Altura máxima → Art. 81 (LUOS) + busca complementar
- Coeficiente de aproveitamento → Art. 82 (LUOS) + valores da tabela
- Certificação Sustentabilidade → Art. 81, Inciso III (LUOS)
- 4º Distrito → Art. 74 (LUOS)
- ZEIS → Art. 92 (PDUS)

FORMATO DA RESPOSTA:
"[Resposta contextual]

**Base Legal:**
• {LEI} - Art. {número} [- Inciso {romano}]: "{texto do artigo}"

[Informações complementares se necessário]"
`;

// Adicionar lógica de híbrido
if (analysisResult.intent === 'legal_article' || analysisResult.requiresCitation) {
  // 1. Buscar dados estruturados (SQL)
  const structuredData = await searchStructuredData(query);
  
  // 2. Buscar artigos relacionados (Vector)
  const legalArticles = await searchLegalArticles(query, analysisResult.expectedArticles);
  
  // 3. Combinar resultados
  prompt = LEGAL_CITATION_PROMPT + '\n\n';
  prompt += 'Dados Estruturados:\n' + JSON.stringify(structuredData);
  prompt += '\n\nArtigos Relacionados:\n' + legalArticles.map(a => 
    `${a.law} - ${a.article}: ${a.content}`
  ).join('\n');
  
  // 4. Instruir modelo a sempre citar
  prompt += '\n\n🔴 OBRIGATÓRIO: Cite TODOS os artigos relevantes listados acima!';
}
```

### 2. CORREÇÃO DA DIFERENCIAÇÃO DE BAIRROS

#### 2.1 SQL Generator - Matching Exato
```typescript
// Melhorar sql-generator/index.ts
const generateNeighborhoodQuery = (bairro: string) => {
  // Normalizar nome do bairro
  const normalized = bairro.trim().toLowerCase();
  
  // Verificar ambiguidades conhecidas
  const ambiguousNames = {
    'boa vista': ['Boa Vista', 'Boa Vista do Sul'],
    'vila nova': ['Vila Nova', 'Vila Nova do Sul']
  };
  
  if (ambiguousNames[normalized]) {
    // Criar query com diferenciação explícita
    return `
      SELECT DISTINCT bairro, zona, altura_maxima, 
             coef_aproveitamento_basico, coef_aproveitamento_maximo
      FROM regime_urbanistico
      WHERE LOWER(bairro) = '${normalized}'
      AND bairro NOT LIKE '%do Sul%'  -- Excluir variações
      ORDER BY bairro, zona
    `;
  }
  
  // Query padrão com matching exato
  return `
    SELECT * FROM regime_urbanistico
    WHERE LOWER(TRIM(bairro)) = LOWER(TRIM('${bairro}'))
    ORDER BY zona
  `;
};
```

#### 2.2 Validação de Bairros Existentes
```typescript
// Criar função de validação
const validateNeighborhood = async (bairro: string) => {
  const { data: validBairros } = await supabase
    .from('regime_urbanistico')
    .select('DISTINCT bairro')
    .ilike('bairro', `%${bairro}%`);
    
  if (validBairros.length === 0) {
    throw new Error(`Bairro "${bairro}" não encontrado no banco de dados`);
  }
  
  if (validBairros.length > 1) {
    // Retornar opções para desambiguação
    return {
      needsDisambiguation: true,
      options: validBairros.map(b => b.bairro),
      message: `Encontrei ${validBairros.length} bairros similares. Qual você procura?`
    };
  }
  
  return { 
    needsDisambiguation: false, 
    bairro: validBairros[0].bairro 
  };
};
```

### 3. ALINHAMENTO DE TESTES

#### 3.1 Validação Semântica em Testes Automáticos
```typescript
// scripts/test-qa-validation.mjs
const validateResponse = async (query, response, expectedElements) => {
  const validation = {
    hasResponse: !!response,
    responseLength: response.length,
    containsExpectedElements: {},
    semanticScore: 0
  };
  
  // Verificar elementos esperados
  for (const element of expectedElements) {
    if (element.type === 'article') {
      validation.containsExpectedElements[element.value] = 
        response.includes(element.value) || 
        response.includes(element.value.replace('Art.', 'Artigo'));
    } else if (element.type === 'value') {
      validation.containsExpectedElements[element.name] = 
        response.includes(element.value);
    }
  }
  
  // Calcular score semântico
  const hits = Object.values(validation.containsExpectedElements)
    .filter(v => v).length;
  validation.semanticScore = hits / expectedElements.length;
  
  // Teste passa apenas se score > 0.8
  validation.passed = validation.semanticScore > 0.8;
  
  return validation;
};
```

#### 3.2 Golden Dataset para Validação
```sql
-- Criar tabela de respostas validadas
CREATE TABLE qa_golden_dataset (
  id SERIAL PRIMARY KEY,
  query TEXT NOT NULL,
  expected_response TEXT NOT NULL,
  required_articles TEXT[],
  required_values JSONB,
  validation_rules JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Inserir casos validados
INSERT INTO qa_golden_dataset (query, expected_response, required_articles, required_values) VALUES
('Qual artigo da LUOS trata da Certificação em Sustentabilidade Ambiental?',
 'O Art. 81, Inciso III da LUOS trata dos acréscimos definidos em regulamento para projetos que obtenham Certificação em Sustentabilidade Ambiental.',
 ARRAY['Art. 81', 'Inciso III'],
 '{"lei": "LUOS", "tema": "certificação ambiental"}'::jsonb),
 
('Qual a altura máxima no bairro Boa Vista?',
 'No bairro Boa Vista, a altura máxima permitida varia conforme a zona...',
 ARRAY['Art. 81'],
 '{"bairro": "Boa Vista", "not_bairro": "Boa Vista do Sul"}'::jsonb);
```

### 4. FIX VALIDAÇÃO QA

#### 4.1 Implementar Chunking e Timeout
```typescript
// admin/quality endpoint
const runQAValidation = async (testCases: any[]) => {
  const CHUNK_SIZE = 5;
  const TIMEOUT_MS = 30000; // 30 segundos por chunk
  
  const results = [];
  
  for (let i = 0; i < testCases.length; i += CHUNK_SIZE) {
    const chunk = testCases.slice(i, i + CHUNK_SIZE);
    
    try {
      const chunkResults = await Promise.race([
        processQAChunk(chunk),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS)
        )
      ]);
      
      results.push(...chunkResults);
      
      // Progress update
      await updateProgress(i + chunk.length, testCases.length);
      
    } catch (error) {
      console.error(`Chunk ${i/CHUNK_SIZE} failed:`, error);
      // Continue com próximo chunk
    }
  }
  
  return results;
};
```

---

## 📅 CRONOGRAMA DE IMPLEMENTAÇÃO

### SEMANA 1 (12-16/08/2025) - Correções Críticas

#### Dia 1-2 (12-13/08)
- [ ] Implementar detecção de intenção legal no query-analyzer
- [ ] Adicionar mapeamento de artigos obrigatórios
- [ ] Testar com 20 queries legais

#### Dia 3-4 (14-15/08)
- [ ] Implementar busca híbrida (SQL + Vector)
- [ ] Criar função de busca de artigos específicos
- [ ] Integrar no pipeline principal

#### Dia 5 (16/08)
- [ ] Corrigir diferenciação de bairros
- [ ] Implementar validação de nomes
- [ ] Testar com todos os bairros ambíguos

### SEMANA 2 (19-23/08/2025) - Melhorias e Validação

#### Dia 6-7 (19-20/08)
- [ ] Implementar validação semântica nos testes
- [ ] Criar golden dataset com 50+ casos
- [ ] Alinhar testes automáticos e manuais

#### Dia 8-9 (21-22/08)
- [ ] Fix timeout validação QA
- [ ] Implementar chunking e progress tracking
- [ ] Testar com dataset completo

#### Dia 10 (23/08)
- [ ] Validação completa do sistema
- [ ] Documentação das mudanças
- [ ] Deploy em produção

---

## 📊 MÉTRICAS DE SUCESSO

| Métrica | Baseline | Meta Semana 1 | Meta Semana 2 | Como Medir |
|---------|----------|---------------|---------------|------------|
| **Citação de Artigos** | 10% | 70% | 95% | % respostas com Art. citado |
| **Acurácia Manual** | <50% | 70% | 85% | Teste manual 20 queries |
| **Diferenciação Bairros** | Falha | 90% | 100% | Zero confusões Boa Vista |
| **Tempo Validação QA** | Infinito | <5min | <2min | Tempo para 10 casos |
| **Alinhamento Testes** | 50% | 80% | 95% | Correlação auto vs manual |

---

## 🚀 SCRIPTS DE TESTE E VALIDAÇÃO

### Test Script 1: Validação de Citações Legais
```javascript
// scripts/test-legal-citations.mjs
const testCases = [
  {
    query: "Qual artigo trata da certificação ambiental?",
    expectedArticles: ["Art. 81", "Inciso III"],
    mustInclude: ["LUOS", "Certificação em Sustentabilidade Ambiental"]
  },
  {
    query: "O que diz a lei sobre o 4º distrito?",
    expectedArticles: ["Art. 74"],
    mustInclude: ["ZOT 8.2", "4º Distrito"]
  }
];

for (const test of testCases) {
  const response = await callRAG(test.query);
  const hasAllArticles = test.expectedArticles.every(a => response.includes(a));
  const hasAllTerms = test.mustInclude.every(t => response.includes(t));
  
  console.log(`✅ Query: ${test.query}`);
  console.log(`   Articles: ${hasAllArticles ? '✓' : '✗'}`);
  console.log(`   Terms: ${hasAllTerms ? '✓' : '✗'}`);
}
```

### Test Script 2: Validação de Diferenciação de Bairros
```javascript
// scripts/test-bairro-differentiation.mjs
const ambiguousCases = [
  { query: "altura máxima Boa Vista", notExpected: "Boa Vista do Sul" },
  { query: "zona Vila Nova", notExpected: "Vila Nova do Sul" }
];

for (const test of ambiguousCases) {
  const response = await callRAG(test.query);
  const hasWrongBairro = response.includes(test.notExpected);
  
  console.log(`✅ Query: ${test.query}`);
  console.log(`   Correct: ${!hasWrongBairro ? '✓' : '✗ (found ' + test.notExpected + ')'}`);
}
```

---

## ⚠️ RISCOS E MITIGAÇÕES

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Embeddings não capturam contexto legal | Alta | Alto | Re-treinar com dataset legal brasileiro |
| Performance degradada com busca híbrida | Média | Médio | Implementar cache inteligente |
| Modelos LLM inconsistentes | Média | Alto | Criar prompts específicos por modelo |
| Breaking changes no frontend | Baixa | Médio | Testes E2E antes do deploy |

---

## 📝 NOTAS IMPORTANTES

### Sobre "Altura Máxima" sem citação de artigo
Quando usuário pergunta "qual a altura máxima do bairro X", isso é primariamente uma consulta de **dados estruturados** (SQL). A citação do Art. 81 é **complementar** e não obrigatória, pois:
1. O dado factual vem da tabela `regime_urbanistico`
2. O Art. 81 explica o **conceito** de altura máxima
3. A resposta híbrida pode adicionar contexto legal como **enriquecimento**

### Sobre "Vila Nova do Sul"
Este bairro **não existe** no banco de dados. O sistema deve:
1. Retornar erro claro: "Bairro não encontrado"
2. Sugerir alternativas: "Você quis dizer Vila Nova?"
3. Nunca inventar dados para bairros inexistentes

---

## 🎯 CONCLUSÃO

Este plano de ação aborda todos os problemas críticos identificados, com foco em:
1. **Citação obrigatória de artigos** para questões legais
2. **Diferenciação precisa de bairros** com nomes similares
3. **Alinhamento de testes** através de validação semântica
4. **Correção de funcionalidades** quebradas

A implementação seguirá abordagem incremental, com validação contínua e métricas claras de sucesso.

---

**Responsável:** Equipe de Desenvolvimento  
**Aprovação:** Pendente  
**Início:** 12/08/2025  
**Previsão de Conclusão:** 23/08/2025