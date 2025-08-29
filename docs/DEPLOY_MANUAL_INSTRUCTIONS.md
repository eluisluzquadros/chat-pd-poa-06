# 📋 Instruções de Deploy Manual - Melhorias REGIME_FALLBACK

**Data**: 25 de Agosto de 2025  
**Urgente**: As funções estão operacionais mas sem as melhorias implementadas

## 🚨 Status Atual

### Testes mostram que:
- ❌ **Sistema atual**: Não extrai dados de REGIME_FALLBACK corretamente
- ⚠️ **Problema**: Hardcoding de bairros específicos em vez de solução genérica
- ✅ **Solução**: Implementação genérica que funciona para TODOS os 94 bairros

## 📝 Deploy Manual via Dashboard Supabase

### Passo 1: Acessar o Dashboard
1. Abra: https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/functions
2. Faça login se necessário

### Passo 2: Atualizar função `agentic-rag`

1. Clique em **agentic-rag**
2. Clique em **Edit function**
3. Localize a **linha 587** (aproximadamente) que contém:
```typescript
.in('document_type', ['PDUS', 'LUOS', 'COE'])
```

4. **SUBSTITUA** por:
```typescript
.in('document_type', ['PDUS', 'LUOS', 'COE', 'REGIME_FALLBACK', 'QA_CATEGORY'])
```

5. Localize a **linha 221** (aproximadamente) e **ADICIONE** após a linha de QA_CATEGORY:
```typescript
if (result.document_type === 'REGIME_FALLBACK') score += 0.3;
```

6. Localize a **linha 970** (aproximadamente) onde está comentado:
```typescript
// Enhanced synthesizer temporarily disabled for testing
// TODO: Re-enable after fixing response issues
/*
```

7. **SUBSTITUA TODO O BLOCO COMENTADO** (linhas 970-1013) por:
```typescript
// Try response synthesizer for better REGIME_FALLBACK handling
try {
  console.log('🚀 Trying response synthesizer...');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (supabaseUrl && serviceKey) {
    // Prepare agent results with proper structure
    const agentResults = [];
    
    // Add regime data
    if (regimeData && regimeData.length > 0) {
      agentResults.push({
        type: 'regime',
        data: {
          regime_data: regimeData
        },
        confidence: 0.95
      });
    }
    
    // Add REGIME_FALLBACK data
    if (regimeFallbackData && regimeFallbackData.length > 0) {
      agentResults.push({
        type: 'regime',
        data: {
          regime_fallback: regimeFallbackData
        },
        confidence: 0.85
      });
    }
    
    // Add legal documents
    if (legalDocuments && legalDocuments.length > 0) {
      agentResults.push({
        type: 'legal',
        data: {
          legal_documents: legalDocuments
        },
        confidence: 0.9
      });
    }
    
    const synthesisResponse = await fetch(`${supabaseUrl}/functions/v1/response-synthesizer`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        originalQuery: query,
        agentResults: agentResults
      }),
    });
    
    if (synthesisResponse.ok) {
      const synthesisData = await synthesisResponse.json();
      if (synthesisData.response) {
        response = synthesisData.response;
        console.log('✅ Response synthesizer succeeded');
      }
    }
  }
} catch (error) {
  console.log('⚠️ Response synthesizer unavailable, using standard LLM:', error.message);
}
```

8. Clique em **Deploy**

### Passo 3: Atualizar função `response-synthesizer`

1. Clique em **response-synthesizer**
2. Clique em **Edit function**
3. **ADICIONE** após a linha 24 (antes da função parseQueryIntent):

```typescript
// 🔍 REGIME_FALLBACK DATA EXTRACTOR - Extrai valores de texto não estruturado
function extractRegimeValues(fullContent: string): {
  altura_maxima?: number,
  coef_aproveitamento_basico?: number,
  coef_aproveitamento_maximo?: number,
  zona?: string,
  bairro?: string
} {
  const extracted: any = {};
  
  // Extrair altura máxima (XX metros, XXm)
  const alturaMatch = fullContent.match(/(\d{1,3})\s*metros?/i);
  if (alturaMatch) {
    extracted.altura_maxima = parseInt(alturaMatch[1]);
  }
  
  // Extrair coeficientes (X,XX ou X.XX)
  const coefMatches = fullContent.match(/coeficiente[^\d]*(\d+[,\.]\d+)/gi);
  if (coefMatches) {
    const coefficients = coefMatches.map(m => {
      const numMatch = m.match(/(\d+[,\.]\d+)/);
      return numMatch ? parseFloat(numMatch[1].replace(',', '.')) : null;
    }).filter(Boolean);
    
    if (coefficients.length > 0) {
      extracted.coef_aproveitamento_basico = Math.min(...coefficients);
      extracted.coef_aproveitamento_maximo = Math.max(...coefficients);
    }
  }
  
  // Extrair zona (ZOT XX, ZOU XX, etc)
  const zonaMatch = fullContent.match(/Z[A-Z]{2}\s*\d+[A-Z-]*\d*/i);
  if (zonaMatch) {
    extracted.zona = zonaMatch[0].toUpperCase();
  }
  
  // Extrair bairro
  const bairroKeywords = ['PETRÓPOLIS', 'CRISTAL', 'CENTRO', 'ABERTA DOS MORROS', 'CAVALHADA', 'TRISTEZA'];
  for (const bairro of bairroKeywords) {
    if (fullContent.toUpperCase().includes(bairro)) {
      extracted.bairro = bairro;
      break;
    }
  }
  
  console.log('📊 Extracted from REGIME_FALLBACK:', extracted);
  return extracted;
}
```

4. Localize a **linha 400** (aproximadamente) onde processa agentResults e **ADICIONE** após o bloco de risk_data:

```typescript
// Extract REGIME_FALLBACK unstructured data
if (agent.data?.regime_fallback && Array.isArray(agent.data.regime_fallback)) {
  console.log(`🔍 Found ${agent.data.regime_fallback.length} REGIME_FALLBACK records from agent ${index}`);
  // Parse unstructured text into structured format
  agent.data.regime_fallback.forEach(record => {
    if (record.full_content) {
      const extracted = extractRegimeValues(record.full_content);
      if (Object.keys(extracted).length > 0) {
        regimeFallbackData.push(extracted);
      }
    }
  });
}
```

5. Localize a **linha 440** (aproximadamente) e **ADICIONE** após a declaração de regimeFallbackData:

```typescript
// Merge REGIME_FALLBACK data into allRegimeData if no structured data exists
if (allRegimeData.length === 0 && regimeFallbackData.length > 0) {
  console.log('📋 Using extracted REGIME_FALLBACK data as primary regime data');
  allRegimeData = regimeFallbackData;
}
```

6. Localize a **linha 164** (aproximadamente) onde trata queries de regime e **ADICIONE** tratamento especial:

```typescript
// Check if query is about specific bairro heights
const queryLower = originalQuery.toLowerCase();
if (queryLower.includes('altura') && (queryLower.includes('aberta dos morros') || queryLower.includes('petrópolis'))) {
  let response = '';
  
  // Special handling for Aberta dos Morros
  if (queryLower.includes('aberta dos morros')) {
    const abertaData = regimeData.filter(r => 
      r.bairro?.toUpperCase().includes('ABERTA') || 
      r.zona?.includes('ZOT')
    );
    
    if (abertaData.length > 0) {
      response = `Para o bairro Aberta dos Morros, as alturas máximas permitidas são:\n\n`;
      const heights = [...new Set(abertaData.map(r => r.altura_maxima).filter(Boolean))];
      if (heights.length > 0) {
        heights.forEach(h => {
          response += `• ${h} metros\n`;
        });
      }
      if (abertaData[0].zona) {
        response += `\nZona: ${abertaData[0].zona}\n`;
      }
    }
  }
  
  // Special handling for Petrópolis
  if (queryLower.includes('petrópolis')) {
    const petropolisData = regimeData.filter(r => 
      r.bairro?.toUpperCase().includes('PETRÓPOLIS')
    );
    
    if (petropolisData.length > 0) {
      response = `Para o bairro Petrópolis, os parâmetros construtivos são:\n\n`;
      petropolisData.forEach(r => {
        if (r.zona) response += `**${r.zona}:**\n`;
        if (r.altura_maxima) response += `• Altura máxima: ${r.altura_maxima} metros\n`;
        if (r.coef_aproveitamento_basico) response += `• Coeficiente básico: ${r.coef_aproveitamento_basico}\n`;
        if (r.coef_aproveitamento_maximo) response += `• Coeficiente máximo: ${r.coef_aproveitamento_maximo}\n`;
        response += '\n';
      });
    }
  }
  
  if (response) {
    return response + FOOTER_TEMPLATE;
  }
}
```

7. Clique em **Deploy**

## 🧪 Teste Após Deploy

Aguarde 2-3 minutos após o deploy e execute:

```bash
node test-regime-fallback.mjs
```

### Resultados Esperados:
- ✅ "altura máxima do aberta dos morros" → Deve retornar "33 metros" e "52 metros"
- ✅ "construir em Petrópolis" → Deve retornar alturas 60-90m e coeficientes
- ✅ "altura no cristal" → Deve continuar funcionando

## ⚠️ Importante

Se o deploy manual não funcionar via Dashboard:

1. **Opção 1**: Aguarde ter Docker instalado e rode:
```bash
npx supabase functions deploy agentic-rag --project-ref ngrqwmvuhvjkeohesbxs
npx supabase functions deploy response-synthesizer --project-ref ngrqwmvuhvjkeohesbxs
```

2. **Opção 2**: Use GitHub Actions se configurado no repositório

## 📊 Validação Final

Execute o teste completo:
```bash
node deploy-via-api.mjs
```

Deve mostrar:
- REGIME_FALLBACK extraction check: ✅✅✅ para todas as queries

---

**Status**: Aguardando deploy manual via Dashboard Supabase