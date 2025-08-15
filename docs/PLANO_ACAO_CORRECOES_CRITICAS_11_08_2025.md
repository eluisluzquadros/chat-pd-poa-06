# 🚀 PLANO DE AÇÃO - CORREÇÕES CRÍTICAS DO SISTEMA RAG

**Data:** 11/08/2025  
**Prioridade:** 🔴 CRÍTICA  
**Prazo Estimado:** 72-96 horas

---

## 🎯 OBJETIVO PRINCIPAL

Corrigir discrepâncias críticas entre testes automáticos e manuais, garantindo que o sistema cite corretamente artigos de lei e diferencie entidades com precisão, mantendo **100% de compatibilidade** com todos os bairros, zonas e parâmetros existentes.

---

## 📋 PROBLEMAS PRIORITÁRIOS

### P1 - CRÍTICO (Resolver em 24h)
1. **Citação obrigatória de artigos de lei** (90% de falha atual)
2. **Validação QA em loop infinito** (100% bloqueado)
3. **Discrepância testes auto/manual** (>50% divergência)

### P2 - ALTO (Resolver em 48h)
4. **Diferenciação de bairros similares** (Boa Vista vs Boa Vista do Sul)
5. **Histórico de benchmark não atualiza**

### P3 - MÉDIO (Resolver em 72h)
6. **Adicionar modelos GPT-5-mini e GPT-5-nano**
7. **Otimizar funcionalidades admin não funcionais**

---

## 🔧 AÇÕES DETALHADAS POR COMPONENTE

### 1. QUERY ANALYZER - Melhorar Detecção de Intenção Legal

#### Problema
O query analyzer não identifica quando o usuário quer citação específica de lei.

#### Solução Proposta
```typescript
// supabase/functions/query-analyzer/index.ts

interface QueryIntent {
  type: 'legal_citation' | 'general_info' | 'specific_data';
  requiresCitation: boolean;
  targetLaw?: 'PDUS' | 'LUOS' | 'BOTH';
  keywords: string[];
}

function analyzeQueryIntent(query: string): QueryIntent {
  const legalKeywords = [
    'artigo', 'art.', 'inciso', 'parágrafo', '§', 
    'lei', 'luos', 'pdus', 'legislação', 'norma',
    'regulamentação', 'decreto', 'resolução'
  ];
  
  const requiresCitation = legalKeywords.some(kw => 
    query.toLowerCase().includes(kw)
  );
  
  // SEMPRE incluir citação para perguntas sobre:
  const topicsRequiringCitation = [
    'certificação', 'sustentabilidade', 'zeis', 'zoneamento',
    'coeficiente', 'altura máxima', 'regime urbanístico',
    'parcelamento', 'uso do solo', 'ocupação'
  ];
  
  const needsCitation = requiresCitation || 
    topicsRequiringCitation.some(topic => 
      query.toLowerCase().includes(topic)
    );
    
  return {
    type: needsCitation ? 'legal_citation' : 'general_info',
    requiresCitation: needsCitation,
    targetLaw: detectTargetLaw(query),
    keywords: extractKeywords(query)
  };
}
```

#### Validação
- Testar com os 121 casos de teste
- Verificar se detecta corretamente necessidade de citação
- Taxa de sucesso esperada: >95%

---

### 2. ENHANCED VECTOR SEARCH - Incluir Metadados Legais

#### Problema
Busca vetorial não retorna metadados de fonte legal.

#### Solução Proposta
```typescript
// supabase/functions/enhanced-vector-search/index.ts

interface SearchResult {
  content: string;
  similarity: number;
  metadata: {
    source: 'PDUS' | 'LUOS' | 'QA' | 'OTHER';
    article?: string;
    inciso?: string;
    paragraph?: string;
    page?: number;
    original_text?: string;
  };
}

async function searchWithLegalContext(
  query: string,
  requiresCitation: boolean
): Promise<SearchResult[]> {
  // Se requer citação, priorizar chunks com metadados legais
  const searchQuery = requiresCitation ? `
    SELECT 
      content,
      similarity,
      metadata->>'source' as source,
      metadata->>'article' as article,
      metadata->>'inciso' as inciso,
      metadata->>'paragraph' as paragraph,
      metadata->>'original_text' as original_text
    FROM match_documents($1, $2)
    WHERE metadata->>'source' IN ('PDUS', 'LUOS')
    ORDER BY 
      CASE WHEN metadata->>'article' IS NOT NULL THEN 0 ELSE 1 END,
      similarity DESC
    LIMIT 10
  ` : existingQuery;
  
  return results;
}
```

#### Validação
- Verificar se retorna artigos específicos
- Testar com queries sobre certificação, ZEIS, etc.
- Taxa de sucesso esperada: >90%

---

### 3. SQL GENERATOR - Diferenciação Exata de Bairros

#### Problema
Não diferencia "Boa Vista" de "Boa Vista do Sul".

#### Solução Proposta
```typescript
// supabase/functions/sql-generator/index.ts

function generateBairroQuery(bairroName: string): string {
  // Matching EXATO, não parcial
  const normalizedName = normalizeBairroName(bairroName);
  
  // Verificar ambiguidade
  const checkAmbiguity = `
    WITH bairros_similares AS (
      SELECT DISTINCT bairro 
      FROM regime_urbanistico
      WHERE bairro ILIKE '%${normalizedName}%'
    )
    SELECT COUNT(*) as total FROM bairros_similares;
  `;
  
  // Se há ambiguidade, usar match exato
  const exactMatchQuery = `
    SELECT *
    FROM regime_urbanistico
    WHERE LOWER(TRIM(bairro)) = LOWER(TRIM('${normalizedName}'))
    ORDER BY zona;
  `;
  
  // Adicionar validação para evitar SQL injection
  if (!isValidBairroName(normalizedName)) {
    throw new Error('Nome de bairro inválido');
  }
  
  return exactMatchQuery;
}

function normalizeBairroName(name: string): string {
  // Manter nome completo, não truncar
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}
```

#### Validação
- Testar com todos os pares ambíguos:
  - Boa Vista vs Boa Vista do Sul
  - Vila Nova vs Vila Nova do Sul
  - Outros casos similares
- Taxa de sucesso esperada: 100%

---

### 4. RESPONSE SYNTHESIZER - Formatação com Citações

#### Problema
Não formata respostas com citações legais mesmo quando disponíveis.

#### Solução Proposta
```typescript
// supabase/functions/response-synthesizer/index.ts

interface ResponseContext {
  sqlResults?: any[];
  vectorResults?: SearchResult[];
  queryIntent: QueryIntent;
}

async function synthesizeResponse(context: ResponseContext): Promise<string> {
  const { queryIntent, vectorResults, sqlResults } = context;
  
  // Extrair todas as referências legais
  const legalReferences = extractLegalReferences(vectorResults);
  
  // Prompt específico para incluir citações
  const systemPrompt = `
Você é um assistente especializado em legislação urbana de Porto Alegre.

REGRAS OBRIGATÓRIAS:
1. SEMPRE cite o artigo específico quando disponível
2. SEMPRE identifique a lei (PDUS ou LUOS)
3. Use o formato: "De acordo com o Art. X da [LEI]..."
4. Se múltiplas leis tratam do assunto, cite ambas
5. Mantenha a resposta objetiva e precisa

Referências disponíveis:
${legalReferences.map(ref => 
  `- ${ref.source}: Art. ${ref.article}${ref.inciso ? `, Inciso ${ref.inciso}` : ''}`
).join('\n')}

Contexto da pergunta: ${JSON.stringify(queryIntent)}
`;

  // Gerar resposta com modelo
  const response = await generateWithLLM(systemPrompt, context);
  
  // Validar que citações foram incluídas
  if (queryIntent.requiresCitation && !response.includes('Art.')) {
    // Forçar inclusão de citações
    return addCitationsToResponse(response, legalReferences);
  }
  
  return response + FOOTER_TEMPLATE;
}

function extractLegalReferences(results: SearchResult[]): LegalReference[] {
  return results
    .filter(r => r.metadata.article)
    .map(r => ({
      lei: r.metadata.source as 'PDUS' | 'LUOS',
      artigo: r.metadata.article!,
      inciso: r.metadata.inciso,
      paragrafo: r.metadata.paragraph,
      texto_original: r.metadata.original_text || r.content
    }));
}
```

#### Validação
- Verificar formato de citações em todas as respostas
- Testar com perguntas sobre certificação, ZEIS, etc.
- Taxa de sucesso esperada: >95%

---

### 5. QA VALIDATOR - Corrigir Loop Infinito

#### Problema
Validação de 100% dos casos nunca termina.

#### Solução Proposta
```typescript
// supabase/functions/qa-validator/index.ts

interface ValidationConfig {
  batchSize: number;
  timeout: number;
  maxRetries: number;
}

async function validateWithTimeout(
  testCases: TestCase[],
  config: ValidationConfig = {
    batchSize: 5,
    timeout: 30000, // 30 segundos por batch
    maxRetries: 2
  }
): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  const batches = chunk(testCases, config.batchSize);
  
  for (const [index, batch] of batches.entries()) {
    console.log(`Processing batch ${index + 1}/${batches.length}`);
    
    try {
      const batchPromises = batch.map(testCase => 
        Promise.race([
          validateSingleCase(testCase),
          timeoutPromise(config.timeout, testCase.id)
        ])
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Processar resultados, marcar timeouts
      for (const [i, result] of batchResults.entries()) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            testCaseId: batch[i].id,
            success: false,
            error: 'Timeout or error',
            duration: config.timeout
          });
        }
      }
      
      // Progress update
      await updateProgress(index + 1, batches.length);
      
    } catch (error) {
      console.error(`Batch ${index + 1} failed:`, error);
    }
  }
  
  return results;
}

function timeoutPromise(ms: number, id: string): Promise<ValidationResult> {
  return new Promise((_, reject) => 
    setTimeout(() => reject(new Error(`Timeout for case ${id}`)), ms)
  );
}
```

#### Validação
- Executar com 10, 50 e 121 casos
- Verificar conclusão em tempo razoável (<5 min para 121 casos)
- Taxa de sucesso esperada: 100% de execução

---

## 📊 FRAMEWORK DE VALIDAÇÃO

### Critérios de Sucesso Redefinidos

```typescript
interface ValidationCriteria {
  // Não apenas verificar se há resposta
  hasResponse: boolean;
  
  // Verificar qualidade da resposta
  hasCitation: boolean; // quando necessário
  citationIsCorrect: boolean; // artigo correto
  
  // Verificar precisão
  answersTheQuestion: boolean;
  factuallyCorrect: boolean;
  
  // Verificar diferenciação
  correctEntity: boolean; // bairro/zona correta
}

function validateResponse(
  testCase: TestCase,
  response: string
): ValidationResult {
  const criteria: ValidationCriteria = {
    hasResponse: response.length > 10,
    hasCitation: false,
    citationIsCorrect: false,
    answersTheQuestion: false,
    factuallyCorrect: false,
    correctEntity: false
  };
  
  // Verificar citação se necessária
  if (testCase.requiresCitation) {
    criteria.hasCitation = /Art\.\s*\d+/.test(response);
    criteria.citationIsCorrect = response.includes(testCase.expectedArticle);
  }
  
  // Verificar entidade correta (bairro)
  if (testCase.entity) {
    criteria.correctEntity = response.includes(testCase.entity) &&
                             !response.includes(testCase.wrongEntity);
  }
  
  // Calcular score final
  const weights = {
    hasResponse: 0.1,
    hasCitation: 0.3,
    citationIsCorrect: 0.3,
    answersTheQuestion: 0.2,
    correctEntity: 0.1
  };
  
  const score = Object.entries(criteria)
    .reduce((acc, [key, value]) => 
      acc + (value ? weights[key] || 0 : 0), 0
    );
  
  return {
    success: score >= 0.8,
    score,
    criteria,
    details: generateValidationDetails(criteria)
  };
}
```

---

## 🚀 CRONOGRAMA DE IMPLEMENTAÇÃO

### DIA 1 (11/08 - Hoje)
**Manhã (4h)**
- [ ] Diagnóstico completo do pipeline
- [ ] Identificar todos os bairros ambíguos
- [ ] Mapear casos de teste por categoria

**Tarde (4h)**
- [ ] Implementar melhorias no query-analyzer
- [ ] Testar detecção de intenção legal
- [ ] Documentar formato de citações

### DIA 2 (12/08)
**Manhã (4h)**
- [ ] Implementar extração de metadados legais
- [ ] Corrigir enhanced-vector-search
- [ ] Testar com 20 casos prioritários

**Tarde (4h)**
- [ ] Implementar diferenciação de bairros
- [ ] Corrigir sql-generator
- [ ] Validar com todos os bairros ambíguos

### DIA 3 (13/08)
**Manhã (4h)**
- [ ] Implementar formatação com citações
- [ ] Corrigir response-synthesizer
- [ ] Testar pipeline completo

**Tarde (4h)**
- [ ] Corrigir loop infinito QA validator
- [ ] Implementar progress tracking
- [ ] Executar validação completa (121 casos)

### DIA 4 (14/08)
**Manhã (4h)**
- [ ] Adicionar modelos GPT-5-mini e GPT-5-nano
- [ ] Corrigir histórico de benchmark
- [ ] Otimizar funcionalidades admin

**Tarde (4h)**
- [ ] Testes finais manuais
- [ ] Documentação das correções
- [ ] Deploy em produção

---

## ✅ CHECKLIST DE VALIDAÇÃO FINAL

### Antes do Deploy
- [ ] 100% dos casos de teste passando com score >0.8
- [ ] Citações presentes em >95% das respostas que requerem
- [ ] Zero confusão entre bairros similares
- [ ] Validação QA completa em <5 minutos
- [ ] Histórico de benchmark funcionando
- [ ] Teste manual de 20 perguntas aleatórias

### Critérios de Rollback
Se qualquer um destes ocorrer após deploy:
- Acurácia cai abaixo de 75%
- Citações ausentes em >20% dos casos
- Qualquer confusão de bairros
- Erros críticos em >5% das queries

---

## 📈 MÉTRICAS DE MONITORAMENTO

### Dashboard Essencial
```typescript
interface SystemMetrics {
  // Acurácia
  overallAccuracy: number;
  citationAccuracy: number;
  entityAccuracy: number;
  
  // Performance
  avgResponseTime: number;
  p95ResponseTime: number;
  timeoutRate: number;
  
  // Qualidade
  userSatisfaction: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  
  // Sistema
  cacheHitRate: number;
  errorRate: number;
  throughput: number;
}

// Alertas automáticos se:
// - overallAccuracy < 80%
// - citationAccuracy < 90%
// - entityAccuracy < 100%
// - avgResponseTime > 10s
// - errorRate > 5%
```

---

## 🔒 PRINCÍPIOS INVIOLÁVEIS

1. **ZERO HARDCODING**: Nenhuma solução específica para casos individuais
2. **100% GENÉRICO**: Sistema deve funcionar para QUALQUER bairro/zona/parâmetro
3. **CITAÇÕES SEMPRE**: Quando relevante, SEMPRE incluir referência legal
4. **VALIDAÇÃO DUPLA**: Sempre testar automático E manual
5. **TRANSPARÊNCIA**: Usuário deve saber de qual lei vem a informação

---

## 📞 PONTOS DE CONTATO

**Dúvidas Técnicas**: Documentar em `/docs/technical-questions.md`  
**Problemas Encontrados**: Registrar em `/docs/issues-found.md`  
**Decisões Tomadas**: Documentar em `/docs/decisions.md`

---

**Status**: 🟡 Em Execução  
**Próxima Atualização**: 11/08/2025 - 18:00  
**Revisão Final**: 14/08/2025 - 18:00