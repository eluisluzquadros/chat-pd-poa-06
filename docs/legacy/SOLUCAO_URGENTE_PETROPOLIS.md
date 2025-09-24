# 🚨 SOLUÇÃO URGENTE - Bug Petrópolis

## Problema Identificado
Queries genéricas sobre Porto Alegre estão retornando dados específicos do bairro Petrópolis:
- "Altura máxima da construção dos prédios em porto alegre" → Retorna dados de Petrópolis
- "Como poderá ser feito a flexibilizaçao de Recuo de jardim?" → Retorna dados de Petrópolis
- "qual a altura máxima permitida?" → Retorna dados de Petrópolis

## Causa Raiz
O sistema está detectando "PORTO ALEGRE" como nome de bairro, quando na verdade é o nome da cidade. Como não existe bairro "PORTO ALEGRE" no banco, o sistema está retornando dados de algum bairro padrão (Petrópolis).

## Solução Implementada

### 1. Modificações no query-analyzer/index.ts
```typescript
// Adicionado no systemPrompt (linha ~216):
REGRA ABSOLUTA SOBRE PORTO ALEGRE:
- "Porto Alegre" é o NOME DA CIDADE, NÃO é um bairro
- NUNCA adicione "PORTO ALEGRE" em entities.bairros
- Se a query menciona "em porto alegre" ou "de porto alegre", isso indica contexto da cidade
- Exemplos:
  * "altura máxima em porto alegre" → consulta GENÉRICA sobre a cidade (intent: conceptual)
  * "coeficiente de aproveitamento de porto alegre" → consulta GENÉRICA (intent: conceptual)
  * "o que posso construir em porto alegre" → consulta GERAL (intent: conceptual)

// Adicionado pós-processamento (linha ~375):
// PÓS-PROCESSAMENTO CRÍTICO: Remover "PORTO ALEGRE" dos bairros
if (analysisResult.entities?.bairros) {
  const originalBairros = [...analysisResult.entities.bairros];
  analysisResult.entities.bairros = analysisResult.entities.bairros.filter(
    bairro => !bairro.toUpperCase().includes('PORTO ALEGRE')
  );
  
  if (originalBairros.length !== analysisResult.entities.bairros.length) {
    console.log('DEBUG - Removido "PORTO ALEGRE" da lista de bairros');
    
    // Se removemos Porto Alegre e não sobrou nenhum bairro, ajustar a análise
    if (analysisResult.entities.bairros.length === 0 && isConstructionQuery) {
      analysisResult.intent = 'conceptual';
      analysisResult.strategy = 'unstructured_only';
      analysisResult.isConstructionQuery = false;
      console.log('DEBUG - Ajustado para consulta conceitual após remover Porto Alegre');
    }
  }
}
```

### 2. Cache Limpo
- 37 entradas incorretas removidas do cache
- Queries genéricas específicas também limpas

## Status Atual
✅ Código corrigido localmente
✅ Cache limpo (37 entradas removidas)
⚠️  PENDENTE: Deploy da função query-analyzer

## Ação Necessária - DEPLOY MANUAL

### Via Dashboard Supabase:
1. Acesse: https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/functions
2. Encontre a função "query-analyzer"
3. Clique em "Edit"
4. Cole o código atualizado de: `supabase/functions/query-analyzer/index.ts`
5. Clique em "Save and Deploy"

## Resultado Esperado Após Deploy
- Queries genéricas sobre Porto Alegre → Respostas conceituais gerais
- NÃO deve mais retornar dados específicos de Petrópolis
- "Porto Alegre" não será mais detectado como bairro

## Recomendação ao Usuário
Enquanto o deploy não é feito, evite queries genéricas que mencionem "porto alegre". Em vez disso:
- ❌ "altura máxima em porto alegre"
- ✅ "quais são as alturas máximas permitidas no plano diretor?"
- ❌ "coeficiente de aproveitamento de porto alegre"
- ✅ "como funcionam os coeficientes de aproveitamento?"

---
**Última atualização:** 30/07/2025 14:50