# 🚨 Plano de Ação - Correção da Taxa de Acurácia (53% → >90%)

**Data**: 25 de Agosto de 2025  
**Situação Atual**: 53% de acurácia (8/15 testes passando)  
**Meta**: >90% de acurácia  
**Prazo Estimado**: 3-5 dias

## 📊 Análise do Problema

### Distribuição das Falhas (47% do total)
1. **40%** - Respostas evasivas ("não há informações") quando dados existem
2. **20%** - REGIME_FALLBACK não processado (dados de bairros)
3. **20%** - Não extrai valores numéricos de texto
4. **13%** - Não navega estrutura hierárquica
5. **7%** - Não busca artigos por tema

## 🎯 Plano de Correção Priorizado

### 🔴 PRIORIDADE 1: Respostas Evasivas (40% de impacto)
**Problema**: Sistema responde "não há dados" mesmo quando dados existem  
**Impacto**: 6 de 15 testes falham por isso

#### Correção Necessária:
```typescript
// ARQUIVO: backend/supabase/functions/agentic-rag/index.ts

// ANTES: Sistema assume que não há dados se não encontra na primeira tentativa
if (legalDocuments.length === 0) {
  return "Não há informações disponíveis..."
}

// DEPOIS: Implementar fallback progressivo
async function searchWithFallback(query: string) {
  // 1. Busca exata
  let results = await searchExact(query);
  
  // 2. Se vazio, busca por palavras-chave
  if (!results.length) {
    results = await searchByKeywords(extractKeywords(query));
  }
  
  // 3. Se ainda vazio, busca semântica
  if (!results.length) {
    results = await searchSemantic(query);
  }
  
  // 4. Se ainda vazio, busca em QA_CATEGORY
  if (!results.length) {
    results = await searchQACategory(query);
  }
  
  // 5. Só retorna "não há dados" se TODAS as tentativas falharem
  if (!results.length) {
    return { found: false, attempts: 4 };
  }
  
  return { found: true, data: results };
}
```

**Tempo Estimado**: 4 horas  
**Complexidade**: Média

---

### 🔴 PRIORIDADE 2: REGIME_FALLBACK (20% de impacto)
**Problema**: Dados existem em `full_content` mas não são extraídos  
**Impacto**: 3 de 15 testes falham (queries de bairros)

#### Correção Necessária:
```typescript
// ARQUIVO: backend/supabase/functions/agentic-rag/index.ts

// Adicionar após linha 760
if (extractedNeighborhood) {
  // Buscar primeiro em regime_urbanistico_consolidado
  const { data: regimeData } = await supabase
    .from('regime_urbanistico_consolidado')
    .select('*')
    .ilike('bairro', `%${extractedNeighborhood}%`);
  
  // Se não encontrar, buscar em REGIME_FALLBACK
  if (!regimeData || regimeData.length === 0) {
    const { data: fallbackData } = await supabase
      .from('legal_articles')
      .select('full_content')
      .eq('document_type', 'REGIME_FALLBACK')
      .or(
        `keywords.cs.{BAIRRO_${extractedNeighborhood.toUpperCase().replace(/\s+/g, '_')}},` +
        `full_content.ilike.%${extractedNeighborhood}%`
      );
    
    // Extrair dados estruturados do full_content
    if (fallbackData && fallbackData.length > 0) {
      regimeData = fallbackData.map(item => 
        extractRegimeFromText(item.full_content)
      );
    }
  }
}

// Função auxiliar para extrair dados
function extractRegimeFromText(text: string) {
  const extracted = {
    altura_maxima: null,
    coef_basico: null,
    coef_maximo: null,
    zona: null
  };
  
  // Extrair altura (XX metros)
  const alturaMatch = text.match(/(\d+)\s*metros/i);
  if (alturaMatch) extracted.altura_maxima = parseInt(alturaMatch[1]);
  
  // Extrair coeficientes (X,XX)
  const coefMatches = text.match(/coeficiente[^0-9]*(\d+[,\.]\d+)/gi);
  if (coefMatches) {
    const values = coefMatches.map(m => 
      parseFloat(m.match(/(\d+[,\.]\d+)/)[1].replace(',', '.'))
    );
    extracted.coef_basico = Math.min(...values);
    extracted.coef_maximo = Math.max(...values);
  }
  
  // Extrair zona (ZOT XX)
  const zonaMatch = text.match(/ZOT\s*\d+/i);
  if (zonaMatch) extracted.zona = zonaMatch[0];
  
  return extracted;
}
```

**Tempo Estimado**: 3 horas  
**Complexidade**: Média

---

### 🟡 PRIORIDADE 3: Extração de Valores Numéricos (20% de impacto)
**Problema**: Sistema não extrai números, alturas, coeficientes  
**Impacto**: 3 de 15 testes falham parcialmente

#### Correção Necessária:
```typescript
// ARQUIVO: backend/supabase/functions/agentic-rag/index.ts

// Adicionar função de pós-processamento
function enhanceResponseWithNumbers(response: string, documents: any[]) {
  // Se a resposta não tem números mas os documentos têm
  if (!hasNumbers(response) && documents.length > 0) {
    const numbers = extractAllNumbers(documents);
    
    if (numbers.heights.length > 0) {
      response += `\n\nAlturas encontradas: ${numbers.heights.join(', ')} metros`;
    }
    
    if (numbers.coefficients.length > 0) {
      response += `\nCoeficientes: ${numbers.coefficients.join(', ')}`;
    }
    
    if (numbers.counts.length > 0) {
      response += `\nQuantidades: ${numbers.counts.join(', ')}`;
    }
  }
  
  return response;
}

function extractAllNumbers(documents: any[]) {
  const numbers = {
    heights: [],
    coefficients: [],
    counts: []
  };
  
  documents.forEach(doc => {
    const content = doc.content || doc.full_content || '';
    
    // Alturas (XX metros)
    const heights = content.match(/(\d+)\s*metros/gi);
    if (heights) {
      numbers.heights.push(...heights.map(h => 
        parseInt(h.match(/\d+/)[0])
      ));
    }
    
    // Coeficientes (X,XX ou X.XX)
    const coefs = content.match(/\d+[,\.]\d+/g);
    if (coefs) {
      numbers.coefficients.push(...coefs.map(c => 
        parseFloat(c.replace(',', '.'))
      ));
    }
    
    // Contagens (XX bairros, XX zonas)
    const counts = content.match(/(\d+)\s*(bairros?|zonas?|áreas?)/gi);
    if (counts) {
      numbers.counts.push(...counts);
    }
  });
  
  // Remover duplicatas e ordenar
  numbers.heights = [...new Set(numbers.heights)].sort((a, b) => a - b);
  numbers.coefficients = [...new Set(numbers.coefficients)].sort((a, b) => a - b);
  numbers.counts = [...new Set(numbers.counts)];
  
  return numbers;
}
```

**Tempo Estimado**: 2 horas  
**Complexidade**: Baixa

---

### 🟡 PRIORIDADE 4: Navegação Hierárquica (13% de impacto)
**Problema**: Não consegue acessar Títulos→Capítulos→Seções  
**Impacto**: 2 de 15 testes falham

#### Correção Necessária:
```typescript
// ARQUIVO: Criar novo arquivo hierarchy-navigator.ts

export class HierarchyNavigator {
  async getStructuredContent(query: string) {
    // Detectar se pede estrutura (Parte, Título, Capítulo)
    const structureRequest = detectStructureRequest(query);
    
    if (structureRequest) {
      // Buscar hierarquia completa
      const { data: hierarchy } = await supabase
        .from('document_sections')
        .select('*')
        .eq('document_type', structureRequest.docType)
        .eq('hierarchy_level', structureRequest.level)
        .ilike('title', `%${structureRequest.identifier}%`)
        .order('section_order');
      
      // Buscar sub-elementos
      if (hierarchy && hierarchy.length > 0) {
        const parentId = hierarchy[0].id;
        const { data: children } = await supabase
          .from('document_sections')
          .select('*')
          .eq('parent_id', parentId)
          .order('section_order');
        
        return formatHierarchicalResponse(hierarchy[0], children);
      }
    }
    
    return null;
  }
  
  detectStructureRequest(query: string) {
    const patterns = {
      parte: /parte\s+(I{1,3}|[1-3])/i,
      titulo: /título\s+(\d+|I{1,3})/i,
      capitulo: /capítulo\s+(\d+|I{1,3})/i,
      secao: /seção\s+(\d+|I{1,3})/i
    };
    
    for (const [level, pattern] of Object.entries(patterns)) {
      const match = query.match(pattern);
      if (match) {
        return {
          level,
          identifier: match[1],
          docType: query.includes('PDUS') ? 'PDUS' : 'LUOS'
        };
      }
    }
    
    return null;
  }
}
```

**Tempo Estimado**: 4 horas  
**Complexidade**: Alta

---

### 🟢 PRIORIDADE 5: Busca por Tema (7% de impacto)
**Problema**: Não encontra artigos sobre temas específicos  
**Impacto**: 1 de 15 testes falha

#### Correção Necessária:
```typescript
// ARQUIVO: backend/supabase/functions/agentic-rag/index.ts

// Adicionar busca temática
async function searchByTheme(theme: string) {
  // Mapa de temas para palavras-chave
  const themeKeywords = {
    'sustentabilidade': ['ambiental', 'sustentável', 'certificação', 'verde'],
    'enchente': ['inundação', 'alagamento', 'cota', 'risco', 'proteção'],
    'altura': ['gabarito', 'volumétrico', 'metros', 'elevação'],
    // ... mais temas
  };
  
  const keywords = themeKeywords[theme.toLowerCase()] || [theme];
  
  // Buscar em todos os campos relevantes
  const { data } = await supabase
    .from('legal_articles')
    .select('*')
    .or(keywords.map(kw => 
      `title.ilike.%${kw}%,content.ilike.%${kw}%,keywords.cs.{${kw}}`
    ).join(','))
    .limit(10);
  
  return data;
}
```

**Tempo Estimado**: 2 horas  
**Complexidade**: Baixa

---

## 📅 Cronograma de Implementação

### Dia 1 (8 horas)
- ✅ Prioridade 1: Respostas Evasivas (4h)
- ✅ Prioridade 2: REGIME_FALLBACK (3h)
- ✅ Testes de validação (1h)

### Dia 2 (6 horas)
- ✅ Prioridade 3: Extração Numérica (2h)
- ✅ Prioridade 4: Navegação Hierárquica (4h)

### Dia 3 (3 horas)
- ✅ Prioridade 5: Busca por Tema (2h)
- ✅ Teste completo e ajustes (1h)

## 📊 Impacto Esperado

| Correção | Testes Afetados | Melhoria Esperada |
|----------|-----------------|-------------------|
| Respostas Evasivas | 6/15 | +40% |
| REGIME_FALLBACK | 3/15 | +20% |
| Extração Numérica | 3/15 | +20% |
| Navegação Hierárquica | 2/15 | +13% |
| Busca por Tema | 1/15 | +7% |
| **TOTAL** | **15/15** | **53% → 93%** |

## 🚀 Implementação Imediata

### Passo 1: Backup
```bash
cp backend/supabase/functions/agentic-rag/index.ts \
   backend/supabase/functions/agentic-rag/index.ts.backup
```

### Passo 2: Aplicar Correções
1. Editar `agentic-rag/index.ts` com as correções de Prioridade 1 e 2
2. Criar `hierarchy-navigator.ts` para Prioridade 4
3. Atualizar `response-synthesizer/index.ts` para extração numérica

### Passo 3: Deploy
```bash
npx supabase functions deploy agentic-rag --project-ref ngrqwmvuhvjkeohesbxs
npx supabase functions deploy response-synthesizer --project-ref ngrqwmvuhvjkeohesbxs
```

### Passo 4: Validação
```bash
node test-chat-validation.mjs
```

## ✅ Critérios de Sucesso

- [ ] Taxa de sucesso ≥ 90% (14/15 testes passando)
- [ ] Nenhuma resposta "não há dados" quando dados existem
- [ ] Todos os bairros retornam dados de regime
- [ ] Valores numéricos sempre extraídos
- [ ] Navegação hierárquica funcional

## 🔍 Monitoramento Pós-Deploy

1. Executar teste completo com 125 casos
2. Monitorar logs por 24h
3. Coletar feedback de usuários
4. Ajustar se necessário

---

**Resultado Esperado**: Sistema com >90% de acurácia em 3 dias de desenvolvimento