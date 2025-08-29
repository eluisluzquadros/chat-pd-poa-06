# 🎯 Roadmap para Atingir 95% de Precisão no Agentic-RAG

## 📊 Situação Atual
- **Precisão Atual**: ~20% (com rate limits)
- **Meta**: 95% de precisão
- **Gap**: 75 pontos percentuais

## 🔍 Análise dos Problemas

### 1. 🔴 CRÍTICO: Busca de Artigos (40% do impacto)
**Problema**: Artigos existem no banco mas não são encontrados
- LUOS tem 398 artigos, PDUS tem 720 artigos
- Busca por article_number falha em 100% dos casos de teste
- Campo article_number pode ter tipos inconsistentes

**Solução**:
```sql
-- Normalizar campo article_number
ALTER TABLE legal_articles 
ADD COLUMN article_number_normalized TEXT;

UPDATE legal_articles 
SET article_number_normalized = TRIM(article_number::TEXT);

CREATE INDEX idx_article_normalized 
ON legal_articles(article_number_normalized, document_type);
```

### 2. 🔴 CRÍTICO: Rate Limits de Embeddings (30% do impacto)
**Problema**: "Too Many Requests" ao gerar embeddings
- Cache vazio (0 entradas)
- Sem pool de API keys
- Sem fallback adequado

**Solução**:
```typescript
// Pool de API keys com round-robin
const API_KEYS = [
  process.env.OPENAI_API_KEY_1,
  process.env.OPENAI_API_KEY_2,
  process.env.OPENAI_API_KEY_3
];

// Cache agressivo de 7 dias
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

// Fallback para BM25 quando embeddings falham
async function searchWithFallback(query) {
  try {
    return await searchWithEmbedding(query);
  } catch (error) {
    return await searchWithBM25(query);
  }
}
```

### 3. 🟡 ALTO: Extração de Entidades (15% do impacto)
**Problema**: Extração incorreta de bairros e parâmetros
- "petrópolis" não é extraído corretamente
- Artigos e leis mal identificados
- Sem fuzzy matching

**Solução**:
```typescript
// Melhor extração com NER
function extractEntities(query: string) {
  return {
    bairro: extractNeighborhood(query), // Já temos isso!
    artigo: query.match(/art(?:igo)?\.?\s*(\d+)/i)?.[1],
    lei: detectLaw(query), // PDUS, LUOS, COE
    parametro: extractParameter(query) // altura, coeficiente, etc
  };
}
```

### 4. 🟢 MÉDIO: Re-ranking (7% do impacto)
**Problema**: Resultados relevantes não aparecem no topo
- Sem re-ranking semântico
- Sem validação de relevância

**Solução**:
```typescript
// Re-rank top-k results
async function reRankResults(query: string, results: any[]) {
  const scores = await crossEncoder.rank(query, results);
  return results.sort((a, b) => scores[b.id] - scores[a.id]);
}
```

### 5. 🟢 MÉDIO: Hierarquia (5% do impacto)
**Problema**: Navegação hierárquica quebrada
- TÍTULO, CAPÍTULO, SEÇÃO não encontrados
- legal_hierarchy mal populada

**Solução**:
```sql
-- Reconstruir hierarquia
INSERT INTO legal_hierarchy (document_type, level, title, parent_id)
SELECT 
  document_type,
  CASE 
    WHEN title ILIKE '%TÍTULO%' THEN 1
    WHEN title ILIKE '%CAPÍTULO%' THEN 2
    WHEN title ILIKE '%SEÇÃO%' THEN 3
  END as level,
  title,
  parent_article_id
FROM legal_articles
WHERE title ILIKE ANY(ARRAY['%TÍTULO%', '%CAPÍTULO%', '%SEÇÃO%']);
```

## 📋 Plano de Implementação

### FASE 1: Correções Críticas (Hoje) - Meta: 70% precisão
| Tarefa | Tempo | Impacto | Status |
|--------|-------|---------|--------|
| 1. Fix article search normalization | 2h | 40% | ⏳ |
| 2. Implement cache + BM25 fallback | 2h | 15% | ⏳ |
| 3. Deploy rate limit handler | 1h | 15% | ✅ |

### FASE 2: Melhorias (Amanhã) - Meta: 85% precisão
| Tarefa | Tempo | Impacto | Status |
|--------|-------|---------|--------|
| 4. API key pool implementation | 2h | 15% | ⏳ |
| 5. Entity extraction improvements | 3h | 15% | ⏳ |
| 6. Hierarchy rebuild | 2h | 5% | ⏳ |

### FASE 3: Otimizações (2 dias) - Meta: 95%+ precisão
| Tarefa | Tempo | Impacto | Status |
|--------|-------|---------|--------|
| 7. Cross-encoder re-ranking | 4h | 7% | ⏳ |
| 8. Prompt engineering per category | 1h | 3% | ⏳ |
| 9. Integration tests | 2h | - | ⏳ |
| 10. Performance tuning | 1h | - | ⏳ |

## 🧪 Métricas de Validação

### Teste das 15 Perguntas Críticas
Executar após cada fase:
```bash
node scripts/test-15-critical-questions-ground-truth.mjs
```

### Métricas Target por Fase:
| Fase | Precisão | Tempo Resposta | Rate Limits |
|------|----------|----------------|-------------|
| Atual | 20% | 10s | Frequentes |
| Fase 1 | 70% | 3s | Raros |
| Fase 2 | 85% | 2s | Nenhum |
| Fase 3 | 95%+ | 1.5s | Nenhum |

## 🚀 Comandos de Implementação

```bash
# FASE 1
npm run fix-article-search      # Normaliza article_number
npm run implement-cache         # Cache + BM25 fallback
npm run deploy-v1-fixed         # Deploy com correções

# FASE 2  
npm run setup-api-pool          # Pool de API keys
npm run improve-entity-extraction # NER melhorado
npm run rebuild-hierarchy       # Reconstrói hierarquia

# FASE 3
npm run implement-reranking     # Cross-encoder
npm run optimize-prompts        # Prompt engineering
npm run test:integration        # Testes completos
```

## 📊 Impacto Esperado

```
Precisão Atual:     ████░░░░░░░░░░░░░░░░ 20%
                           ↓
Após Fase 1:        ██████████████░░░░░░ 70% (+50%)
                           ↓
Após Fase 2:        █████████████████░░░ 85% (+15%)
                           ↓
Após Fase 3:        ███████████████████░ 95% (+10%)
```

## ✅ Checklist de Validação

- [ ] Todos os 15 testes críticos passando
- [ ] Tempo médio de resposta < 2s
- [ ] Zero rate limits em 1000 queries
- [ ] 94 bairros reconhecidos corretamente
- [ ] Artigos LUOS/PDUS encontrados
- [ ] Hierarquia navegável
- [ ] Cache hit rate > 50%
- [ ] Fallback funcional

## 🔄 Monitoramento Contínuo

1. **Dashboard de Métricas**: `/admin/metrics`
2. **Logs de Edge Functions**: `supabase functions logs --tail`
3. **Query Cache Stats**: `/admin/cache`
4. **Test Runner**: `/admin/quality`

## 🎯 Resultado Final Esperado

Com todas as implementações:
- **95%+ de precisão** nas 15 perguntas críticas
- **100% disponibilidade** (sem rate limits)
- **< 2s tempo de resposta** médio
- **Fallback robusto** para todas as falhas

---

*Última atualização: 2025-08-23*
*Próxima revisão: Após implementação da Fase 1*