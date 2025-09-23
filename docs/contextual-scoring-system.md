# Sistema de Scoring Contextual Inteligente

## Visão Geral

O Sistema de Scoring Contextual Inteligente é um componente avançado do RAG (Retrieval-Augmented Generation) que aplica scoring específico baseado no tipo de query, melhorando significativamente a relevância dos resultados retornados.

## Arquitetura

```
┌─────────────────┐    ┌──────────────────────┐    ┌─────────────────┐
│   Query Input   │───▶│  Query Classifier    │───▶│  Contextual     │
└─────────────────┘    └──────────────────────┘    │  Scorer         │
                                                    └─────────────────┘
                                                            │
┌─────────────────┐    ┌──────────────────────┐            ▼
│ Enhanced Vector │◀───│   RAG Integration    │    ┌─────────────────┐
│    Search       │    └──────────────────────┘    │ Scored Results  │
└─────────────────┘                                └─────────────────┘
```

## Funcionalidades Principais

### 1. Classificação Automática de Queries

O sistema classifica automaticamente as queries em 6 tipos principais:

#### `CERTIFICATION_SUSTAINABILITY`
- **Threshold:** 0.2
- **Características:** Consultas sobre certificação ambiental, sustentabilidade
- **Boosts:** certificação (0.8), sustentabilidade (0.8), sustentável (0.7)
- **Exemplo:** "Quais são os requisitos de certificação sustentável?"

#### `FOURTH_DISTRICT_ART74`
- **Threshold:** 0.3 
- **Características:** Consultas específicas sobre 4º distrito e Art. 74
- **Boosts:** "art. 74" (2.0), "quarto distrito" (2.0), "4º distrito" (2.0)
- **Exemplo:** "Informações sobre Art. 74 do Quarto Distrito"

#### `CONSTRUCTION_GENERIC`
- **Threshold:** 0.15
- **Características:** Consultas gerais sobre construção
- **Boosts:** altura (0.6), coeficiente (0.6), aproveitamento (0.5)
- **Exemplo:** "Qual a altura máxima permitida?"

#### `NEIGHBORHOOD_SPECIFIC`
- **Threshold:** 0.2
- **Características:** Consultas específicas sobre bairros
- **Boosts:** bairro_specific (0.7), construction_terms (0.5)
- **Exemplo:** "Regras de construção no bairro Petrópolis"

#### `ARTICLE_SPECIFIC`
- **Threshold:** 0.25
- **Características:** Consultas sobre artigos específicos da lei
- **Boosts:** exact_article (1.5), article_number (1.0), inciso (0.8)
- **Exemplo:** "Art. 45 sobre uso residencial"

#### `GENERIC`
- **Threshold:** 0.15
- **Características:** Consultas muito genéricas
- **Penalizações:** too_generic (0.3)
- **Exemplo:** "plano diretor"

### 2. Sistema de Boosts Contextuais

#### Boosts por Tipo de Query
```typescript
const SCORING_CONFIG = {
  [QueryType.CERTIFICATION_SUSTAINABILITY]: {
    boosts: {
      certification: 0.8,
      sustainability: 0.8,
      sustainable: 0.7,
      certificação: 0.8,
      sustentabilidade: 0.8,
      sustentável: 0.7,
      meio_ambiente: 0.6,
      verde: 0.5
    }
  }
  // ... outros tipos
};
```

#### Boosts Especiais
- **Bairro Específico:** Quando a query menciona um bairro específico, matches que contenham esse bairro recebem boost de 0.7
- **Match Exato de Artigo:** Quando há correspondência exata entre artigo na query e no conteúdo, boost de 1.5
- **Termos de Construção:** Para queries sobre construção, termos técnicos recebem boost de 0.5

### 3. Sistema de Penalizações

#### Penalizações Aplicadas
- **Termos Genéricos:** Queries com apenas termos muito genéricos recebem penalização de 0.3
- **Query Muito Curta:** Queries com 2 palavras ou menos recebem penalização de 0.3

### 4. Thresholds Dinâmicos

O sistema aplica thresholds diferentes baseados no tipo de query:

```typescript
const thresholds = {
  'fourth_district_art74': 0.3,      // Mais restritivo para consultas específicas
  'article_specific': 0.25,          // Restritivo para artigos específicos
  'certification_sustainability': 0.2, // Moderado para certificação
  'neighborhood_specific': 0.2,      // Moderado para bairros
  'construction_generic': 0.15,      // Mais permissivo para construção geral
  'generic': 0.15                    // Mais permissivo para genéricas
};
```

## API Reference

### Endpoint Principal

```http
POST /functions/v1/contextual-scoring
```

#### Request Body
```json
{
  "query": "string",
  "matches": [
    {
      "content": "string",
      "similarity": "number",
      "document_id": "string",
      "metadata": "object"
    }
  ],
  "analysisResult": {
    "entities": {
      "neighborhoods": ["string"],
      "zots": ["string"],
      "articles": ["string"]
    }
  }
}
```

#### Response
```json
{
  "scoredMatches": [
    {
      "content": "string",
      "originalSimilarity": "number",
      "contextualScore": "number", 
      "finalScore": "number",
      "boosts": ["string"],
      "penalties": ["string"],
      "threshold": "number",
      "passesThreshold": "boolean"
    }
  ],
  "appliedThreshold": "number",
  "queryType": "string",
  "totalProcessed": "number",
  "qualityMetrics": {
    "averageScore": "number",
    "topScore": "number",
    "passedThreshold": "number"
  }
}
```

## Integração com Enhanced Vector Search

O sistema se integra automaticamente com o Enhanced Vector Search:

```typescript
// Chamada automática durante a busca vetorial
const scoringResponse = await fetch(`${supabaseUrl}/functions/v1/contextual-scoring`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseAnonymousKey}`,
  },
  body: JSON.stringify({
    query: message,
    matches: rawMatches,
    analysisResult: contextData
  }),
});
```

## Métricas de Qualidade

O sistema fornece métricas em tempo real:

### Métricas por Resposta
- **Average Score:** Pontuação média de todos os matches
- **Top Score:** Maior pontuação encontrada
- **Passed Threshold:** Número de matches que passaram no threshold

### Logging Detalhado
```
🎯 Contextual scoring applied
📊 Query type: certification_sustainability
🎚️ Applied threshold: 0.2
📈 Quality metrics: { averageScore: 0.67, topScore: 0.95, passedThreshold: 8 }
```

## Casos de Uso Específicos

### 1. Consulta sobre Certificação + Sustentabilidade
```
Query: "Quais são os requisitos de certificação sustentável?"
Type: certification_sustainability
Threshold: 0.2
Boosts: certification (0.8), sustentável (0.7)
Expected: Alta prioridade para conteúdo sobre certificação ambiental
```

### 2. Consulta sobre 4º Distrito + Art. 74
```
Query: "Informações sobre Art. 74 do Quarto Distrito"
Type: fourth_district_art74
Threshold: 0.3
Boosts: "art. 74" (2.0), "quarto distrito" (2.0)
Expected: Máxima prioridade para match exato do artigo
```

### 3. Consulta Genérica
```
Query: "plano diretor"
Type: generic
Threshold: 0.15
Penalties: generic_terms (0.3)
Expected: Penalização por falta de especificidade
```

## Performance e Otimização

### Benchmarks
- **Processamento de 100 matches:** < 200ms
- **Classificação de query:** < 10ms  
- **Aplicação de boosts:** < 50ms
- **Cálculo de métricas:** < 20ms

### Fallback Strategy
Se o serviço de scoring contextual falhar, o sistema automaticamente volta ao scoring PDUS básico:

```typescript
} catch (scoringError) {
  console.error('❌ Contextual scoring error, using fallback:', scoringError);
  // Fallback para scoring PDUS básico
  enhancedMatches = applyBasicPDUSScoring(matches);
}
```

## Monitoramento e Debug

### Logs Estruturados
```
🎯 Contextual Scoring started
📝 Query: "altura máxima no bairro Petrópolis"
📊 Matches to score: 15
🏷️ Query type classified as: neighborhood_specific
✅ Contextual scoring completed
📈 Quality metrics: {...}
🎯 Passed threshold: 12/15
```

### Métricas de Debug
Cada match retorna informações detalhadas de debug:
```json
{
  "contextual_boost_info": {
    "original_similarity": 0.6,
    "contextual_score": 0.8,
    "boosts": ["bairro_match:Petrópolis", "construction:altura"],
    "penalties": [],
    "threshold": 0.2,
    "passes_threshold": true
  }
}
```

## Testes

### Testes Unitários
- Classificação correta de queries
- Aplicação de boosts contextuais
- Thresholds dinâmicos
- Sistema de penalizações
- Métricas de qualidade

### Testes de Integração
- Integração com Enhanced Vector Search
- Fallback em caso de erro
- Performance com grandes volumes

### Executar Testes
```bash
npm test tests/contextual-scoring.test.ts
```

## Contribuição

### Adicionando Novos Tipos de Query
1. Definir novo enum em `QueryType`
2. Adicionar configuração em `SCORING_CONFIG`
3. Implementar lógica de classificação em `classifyQuery()`
4. Adicionar testes correspondentes

### Adicionando Novos Boosts
1. Definir boost na configuração do tipo de query
2. Implementar lógica de detecção em `calculateContextualScore()`
3. Adicionar testes para validar o boost

## Roadmap

### v1.1 (Próxima versão)
- [ ] Machine Learning para classificação automática
- [ ] Boosts baseados em feedback do usuário
- [ ] Cache inteligente de classificações
- [ ] Métricas avançadas de qualidade

### v1.2 (Futuro)
- [ ] A/B testing de diferentes estratégias de scoring
- [ ] Personalização por perfil de usuário
- [ ] Análise semântica avançada
- [ ] Dashboard de métricas em tempo real

## Troubleshooting

### Problemas Comuns

**1. Scoring muito baixo para queries específicas**
- Verificar se o tipo de query está sendo classificado corretamente
- Adicionar termos específicos ao boost configuration

**2. Muitos matches passando o threshold**
- Ajustar threshold para o tipo de query específico
- Adicionar penalizações mais restritivas

**3. Performance lenta**
- Verificar se há muitos matches sendo processados
- Otimizar regex patterns de classificação

**4. Fallback sendo usado frequentemente**
- Verificar logs de erro do serviço de scoring
- Validar conectividade entre serviços