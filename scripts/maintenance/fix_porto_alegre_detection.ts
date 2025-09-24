// Fix para query-analyzer - não tratar "porto alegre" como bairro

// Adicionar esta verificação ANTES da análise por LLM (linha ~175)
const fixedQuery = query.trim();
const queryWords = fixedQuery.toLowerCase().split(/\s+/);

// REGRA CRÍTICA: "Porto Alegre" é a cidade, NÃO um bairro
const containsPortoAlegre = 
  fixedQuery.toLowerCase().includes('porto alegre') ||
  fixedQuery.toLowerCase().includes('em porto alegre') ||
  fixedQuery.toLowerCase().includes('de porto alegre');

// Se a query menciona "porto alegre", remover da análise de bairros
let adjustedQuery = query;
if (containsPortoAlegre) {
  // Remover "porto alegre" e variações para evitar detecção como bairro
  adjustedQuery = query
    .replace(/\bem\s+porto\s+alegre\b/gi, '')
    .replace(/\bde\s+porto\s+alegre\b/gi, '')
    .replace(/\bporto\s+alegre\b/gi, '')
    .trim();
}

// Adicionar no systemPrompt (linha ~202):
const additionalRules = `
REGRA ABSOLUTA SOBRE PORTO ALEGRE:
- "Porto Alegre" é o NOME DA CIDADE, NÃO é um bairro
- NUNCA adicione "PORTO ALEGRE" em entities.bairros
- Se a query menciona "em porto alegre" ou "de porto alegre", isso indica contexto da cidade
- Exemplos:
  * "altura máxima em porto alegre" → NÃO é sobre um bairro específico
  * "coeficiente de aproveitamento de porto alegre" → consulta GENÉRICA sobre a cidade
  * "o que posso construir em porto alegre" → consulta GERAL, não específica de bairro
- Para consultas genéricas sobre a cidade, retorne intent: "conceptual" e strategy: "unstructured_only"
`;

// Modificar a chamada do LLM para usar adjustedQuery em vez de query
// E adicionar verificação pós-processamento para remover PORTO ALEGRE dos bairros
const llmResult = await callLLM(adjustedQuery);

// Pós-processamento: garantir que PORTO ALEGRE nunca apareça como bairro
if (llmResult.entities?.bairros) {
  llmResult.entities.bairros = llmResult.entities.bairros.filter(
    bairro => !bairro.toUpperCase().includes('PORTO ALEGRE')
  );
}