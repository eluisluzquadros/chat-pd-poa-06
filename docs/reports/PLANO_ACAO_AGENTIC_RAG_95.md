# 📋 PLANO DE AÇÃO DETALHADO - AGENTIC-RAG 95%+

## 🎯 OBJETIVO
Elevar o sistema de 67% para 95%+ de precisão implementando arquitetura Agentic-RAG baseada nos exemplos n8n funcionais.

---

## 📊 SITUAÇÃO ATUAL
- **Taxa de Sucesso:** 67% (4 de 6 testes passando)
- **Tempo Médio:** 8.7 segundos
- **Problemas Principais:**
  - ❌ Navegação hierárquica não funciona (Art. 77 contexto)
  - ❌ Busca ZOT incompleta (faltam dados)
  - ⚠️ Performance lenta
  - ⚠️ Sem re-ranking de resultados
  - ⚠️ Memory management básico

---

## 🚀 FASE 1: CORREÇÕES IMEDIATAS (2 horas)

### 1.1 Corrigir Função search_zots
**Responsável:** DBA/Backend  
**Tempo:** 15 minutos  
**Ação:**
```sql
-- Execute no Supabase Dashboard
scripts/emergency-sql/15-fix-search-zots.sql
```
**Validação:**
```javascript
// Testar busca
SELECT * FROM search_zots('8', NULL);
```
**Resultado Esperado:** Retornar dados de ZOT-8 com altura, CA, TO

### 1.2 Deploy Edge Function V3
**Responsável:** DevOps  
**Tempo:** 30 minutos  
**Ações:**
1. Login no Supabase CLI:
```bash
set SUPABASE_ACCESS_TOKEN=sbp_b64d8863b5c2a1ec88484e5f210f8cd654c8dcb3
```

2. Deploy da função:
```bash
npx supabase functions deploy agentic-rag-v3 --project-ref ngrqwmvuhvjkeohesbxs
```

3. Verificar logs:
```bash
npx supabase functions logs agentic-rag-v3 --project-ref ngrqwmvuhvjkeohesbxs
```

**Validação:** Função respondendo em `/functions/v1/agentic-rag-v3`

### 1.3 Teste Inicial V3
**Responsável:** QA  
**Tempo:** 15 minutos  
**Ação:**
```bash
node test-agentic-rag-v3.mjs
```
**Resultado Esperado:** V3 com taxa >= 80%

---

## 🔧 FASE 2: OTIMIZAÇÕES CORE (4 horas)

### 2.1 Implementar Cache Inteligente
**Responsável:** Backend  
**Tempo:** 1 hora  
**Código:**
```typescript
// Em agentic-rag-v3/index.ts
class CacheManager {
  private cache = new Map();
  private ttl = 3600000; // 1 hora
  
  async get(key: string) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.data;
    }
    return null;
  }
  
  async set(key: string, data: any) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
}
```
**Integração:** Adicionar cache antes de chamar tools

### 2.2 Melhorar Metadata Extraction com LLM
**Responsável:** AI Engineer  
**Tempo:** 1.5 horas  
**Implementação:**
```typescript
class AdvancedMetadataExtractor {
  async extractWithLLM(query: string) {
    const prompt = `Extract entities from this legal query:
    Query: "${query}"
    
    Return JSON with:
    - document_type: LUOS or PDUS
    - article_numbers: array of article numbers
    - hierarchy_elements: {type, number}
    - neighborhoods: array of bairros
    - zot_numbers: array of ZOTs
    - intent: search_article|navigate_hierarchy|search_zot|general
    - key_concepts: array of important terms`;
    
    const response = await callOpenAI(prompt);
    return JSON.parse(response);
  }
}
```
**Validação:** Metadata mais preciso para queries complexas

### 2.3 Adicionar Reranking com Scoring
**Responsável:** Backend  
**Tempo:** 1 hora  
**Implementação:**
```typescript
class AdvancedReranker {
  rerank(results: any[], query: string, metadata: any) {
    return results.map(result => {
      let score = result.confidence || 0;
      
      // Boost para match exato
      if (metadata.article_number && 
          result.data?.article_number === metadata.article_number) {
        score += 0.3;
      }
      
      // Boost para hierarquia correta
      if (metadata.hierarchy_type && 
          result.hierarchy?.includes(metadata.hierarchy_type)) {
        score += 0.2;
      }
      
      // Penalidade para resultados antigos
      if (result.source === 'cache') {
        score -= 0.1;
      }
      
      return { ...result, finalScore: Math.min(score, 1.0) };
    }).sort((a, b) => b.finalScore - a.finalScore);
  }
}
```

### 2.4 Implementar Parallel Tool Execution
**Responsável:** Backend  
**Tempo:** 30 minutos  
**Código:**
```typescript
// Em orchestrator
const toolPromises = [];

if (metadata.article_number) {
  toolPromises.push(articleTool.execute(query, metadata));
}
if (metadata.zot_number || metadata.neighborhood) {
  toolPromises.push(zotTool.execute(query, metadata));
}
if (metadata.hierarchy_type) {
  toolPromises.push(hierarchyTool.execute(query, metadata));
}

const results = await Promise.allSettled(toolPromises);
```
**Benefício:** Reduz tempo de resposta em 40-60%

---

## 🎨 FASE 3: MELHORIAS AVANÇADAS (4 horas)

### 3.1 Criar Embedding Index Otimizado
**Responsável:** DBA  
**Tempo:** 1 hora  
**SQL:**
```sql
-- Criar índice HNSW para busca vetorial mais rápida
CREATE INDEX IF NOT EXISTS embedding_hnsw_idx 
ON legal_articles 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Criar índice para busca híbrida
CREATE INDEX IF NOT EXISTS hybrid_search_idx 
ON legal_articles (document_type, article_number)
WHERE embedding IS NOT NULL;
```

### 3.2 Implementar Context Window Management
**Responsável:** Backend  
**Tempo:** 1 hora  
**Implementação:**
```typescript
class ContextManager {
  private maxTokens = 3000;
  
  buildContext(results: any[], previousContext: any[]) {
    let context = [];
    let tokenCount = 0;
    
    // Priorizar resultados mais relevantes
    for (const result of results) {
      const tokens = this.countTokens(result.content);
      if (tokenCount + tokens <= this.maxTokens) {
        context.push(result);
        tokenCount += tokens;
      }
    }
    
    return context;
  }
  
  private countTokens(text: string): number {
    return Math.ceil(text.length / 4); // Aproximação
  }
}
```

### 3.3 Adicionar Fallback Strategies
**Responsável:** Backend  
**Tempo:** 1 hora  
**Código:**
```typescript
class FallbackStrategy {
  async execute(query: string, primaryResults: any[]) {
    if (primaryResults.length === 0) {
      // Tentar busca mais ampla
      const broadSearch = await this.broadSearch(query);
      if (broadSearch.length > 0) return broadSearch;
      
      // Tentar decomposição da query
      const decomposed = await this.decomposeQuery(query);
      if (decomposed.length > 0) return decomposed;
      
      // Sugerir queries alternativas
      return this.suggestAlternatives(query);
    }
    return primaryResults;
  }
}
```

### 3.4 Implementar Quality Scoring
**Responsável:** QA  
**Tempo:** 1 hora  
**Implementação:**
```typescript
class QualityScorer {
  async scoreResponse(response: string, query: string, metadata: any) {
    const scores = {
      relevance: 0,
      completeness: 0,
      accuracy: 0,
      clarity: 0
    };
    
    // Verificar se menciona elementos esperados
    if (metadata.article_number) {
      scores.accuracy = response.includes(`Art. ${metadata.article_number}`) ? 1 : 0;
    }
    
    // Verificar completude
    scores.completeness = response.length > 100 ? 0.8 : 0.4;
    
    // Verificar clareza
    scores.clarity = response.includes('Desculpe') ? 0.2 : 0.8;
    
    // Score final
    return Object.values(scores).reduce((a, b) => a + b) / 4;
  }
}
```

---

## 🧪 FASE 4: TESTES E VALIDAÇÃO (2 horas)

### 4.1 Teste Unitário das Tools
**Responsável:** QA  
**Tempo:** 30 minutos  
**Script:**
```javascript
// test-tools.mjs
async function testTools() {
  const tests = [
    { tool: 'ArticleSearchTool', input: {article_number: 119} },
    { tool: 'HierarchyNavigatorTool', input: {hierarchy_type: 'titulo', hierarchy_number: 'X'} },
    { tool: 'ZOTSearchTool', input: {zot_number: '8'} }
  ];
  
  for (const test of tests) {
    const result = await tools[test.tool].execute('test', test.input);
    console.log(`${test.tool}: ${result ? '✅' : '❌'}`);
  }
}
```

### 4.2 Teste de Integração End-to-End
**Responsável:** QA  
**Tempo:** 45 minutos  
**Cenários:**
```javascript
const testScenarios = [
  // Cenário 1: Consulta simples de artigo
  {
    query: "O que diz o artigo 119 da LUOS?",
    expected: ["projetos", "protocolados", "transitórias"]
  },
  // Cenário 2: Navegação hierárquica
  {
    query: "Em qual título está o artigo 77?",
    expected: ["Título VI", "Uso e Ocupação", "Taxa de Permeabilidade"]
  },
  // Cenário 3: Consulta de ZOT
  {
    query: "Qual a altura máxima na ZOT 8?",
    expected: ["altura", "metros", "ZOT"]
  },
  // Cenário 4: Query complexa
  {
    query: "Quais são os artigos sobre taxa de permeabilidade no Título VI?",
    expected: ["Art. 76", "Art. 77", "Art. 78", "Art. 79"]
  }
];
```

### 4.3 Teste de Performance
**Responsável:** DevOps  
**Tempo:** 30 minutos  
**Métricas:**
- P50: < 2 segundos
- P95: < 5 segundos
- P99: < 8 segundos

**Script:**
```bash
# Load test com 100 requests
for i in {1..100}; do
  time curl -X POST $EDGE_FUNCTION_URL_V3 \
    -H "Content-Type: application/json" \
    -d '{"query":"teste query '$i'"}' &
done
wait
```

### 4.4 Validação com QA Test Suite
**Responsável:** QA  
**Tempo:** 15 minutos  
**Comando:**
```bash
npm run test:qa
```
**Meta:** 95%+ dos 121 casos de teste passando

---

## 📈 FASE 5: MONITORAMENTO E AJUSTES (Contínuo)

### 5.1 Dashboard de Métricas
**Implementar:**
- Taxa de sucesso por categoria
- Tempo médio de resposta
- Queries sem resultados
- Erros por hora

### 5.2 Feedback Loop
```typescript
// Adicionar ao final de cada resposta
class FeedbackCollector {
  async collect(sessionId: string, query: string, response: string) {
    await supabase.from('feedback').insert({
      session_id: sessionId,
      query,
      response,
      useful: null, // Usuário marca se foi útil
      timestamp: new Date()
    });
  }
}
```

### 5.3 A/B Testing
- 20% tráfego para V3
- 80% tráfego para V2
- Comparar métricas por 24h
- Migrar 100% se V3 superior

---

## 📊 MÉTRICAS DE SUCESSO

### KPIs Principais
| Métrica | Atual | Meta | Prazo |
|---------|-------|------|-------|
| Taxa de Sucesso | 67% | 95% | 48h |
| Tempo Médio | 8.7s | <3s | 24h |
| Navegação Hierárquica | 0% | 100% | 12h |
| Busca ZOT | 33% | 95% | 12h |
| Memory Recall | Básico | Avançado | 72h |

### Checkpoints
- **4 horas:** Fase 1 completa, V3 deployed
- **8 horas:** Fase 2 completa, 85%+ precisão
- **12 horas:** Fase 3 completa, <3s resposta
- **14 horas:** Fase 4 completa, 95%+ precisão
- **24 horas:** Sistema em produção com monitoramento

---

## 🚨 RISCOS E MITIGAÇÕES

### Risco 1: Deploy falha
**Mitigação:** Manter V2 ativo, rollback automático

### Risco 2: Performance degrada
**Mitigação:** Cache agressivo, rate limiting

### Risco 3: Custos LLM aumentam
**Mitigação:** Cache de respostas, modelos menores para metadata

### Risco 4: Dados incorretos
**Mitigação:** Validação dupla, logs detalhados

---

## ✅ CHECKLIST FINAL

### Antes do Deploy
- [ ] Todos os testes passando localmente
- [ ] Backup do banco de dados
- [ ] Logs configurados
- [ ] Monitoramento ativo
- [ ] Plano de rollback documentado

### Durante o Deploy
- [ ] Deploy em horário de baixo tráfego
- [ ] Monitorar logs em tempo real
- [ ] Testar queries críticas
- [ ] Verificar métricas de performance

### Após o Deploy
- [ ] Confirmar 95%+ precisão
- [ ] Tempo médio <3s
- [ ] Zero erros críticos
- [ ] Feedback positivo dos usuários
- [ ] Documentação atualizada

---

## 🎯 RESULTADO ESPERADO

Após completar todas as fases:
- **Taxa de Sucesso:** 95%+ ✅
- **Tempo de Resposta:** <3s ⚡
- **Navegação Hierárquica:** 100% funcional 📚
- **Busca ZOT:** Completa e precisa 🏙️
- **Memory Management:** Contexto persistente 🧠
- **Escalabilidade:** 1000+ req/min 🚀

---

**Data de Início:** Imediato  
**Data de Conclusão Esperada:** 24-48 horas  
**Responsável Técnico:** Equipe DevOps + Backend  
**Aprovação:** Gerência de Produto