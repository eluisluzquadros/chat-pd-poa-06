// Sistema dinâmico de carregamento de bairros
// Substitui listas hardcoded por carregamento dinâmico da base de dados

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// Cache global compartilhado entre todas as edge functions
let bairrosCache: {
  validBairros: string[];
  invalidBairros: string[];
  ambiguousBairros: Array<{ name: string; notToBeMistakenWith: string[] }>;
  lastUpdated: number;
  ttl: number; // 30 minutos
} | null = null;

const CACHE_TTL = 30 * 60 * 1000; // 30 minutos

/**
 * Carrega bairros dinamicamente da base de dados
 */
async function loadBairrosFromDatabase(): Promise<{
  validBairros: string[];
  invalidBairros: string[];
  ambiguousBairros: Array<{ name: string; notToBeMistakenWith: string[] }>;
}> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('⚠️ Supabase credentials missing, using fallback cache');
      return getFallbackBairros();
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar todos os bairros únicos da regime_urbanistico
    const { data: bairrosData, error } = await supabase
      .from('regime_urbanistico')
      .select('bairro')
      .order('bairro');

    if (error) {
      console.error('❌ Erro ao carregar bairros da base:', error);
      return getFallbackBairros();
    }

    // Extrair bairros únicos e normalizar
    const validBairros = [...new Set(
      bairrosData
        .map(row => row.bairro?.toUpperCase().trim())
        .filter(bairro => bairro && bairro.length > 0)
    )].sort();

    console.log(`✅ Carregados ${validBairros.length} bairros dinamicamente da base`);

    // Bairros inválidos conhecidos (mantidos por questões de UX)
    const invalidBairros = [
      "BOA VISTA DO SUL",
      "VILA NOVA DO SUL", 
      "CENTRO", // O correto é CENTRO HISTÓRICO
      "PORTO ALEGRE" // É a cidade, não um bairro
    ];

    // Bairros ambíguos (dinâmicos baseados nos válidos)
    const ambiguousBairros = [
      { name: "BOA VISTA", notToBeMistakenWith: ["BOA VISTA DO SUL"] },
      { name: "VILA NOVA", notToBeMistakenWith: ["VILA NOVA DO SUL"] },
      { name: "CENTRO HISTÓRICO", notToBeMistakenWith: ["CENTRO"] }
    ].filter(ambiguous => validBairros.includes(ambiguous.name));

    return {
      validBairros,
      invalidBairros,
      ambiguousBairros
    };

  } catch (error) {
    console.error('❌ Erro crítico ao carregar bairros:', error);
    return getFallbackBairros();
  }
}

/**
 * Fallback com lista mínima essencial
 */
function getFallbackBairros() {
  console.warn('⚠️ Usando fallback de bairros essenciais');
  return {
    validBairros: [
      "CENTRO HISTÓRICO", "MOINHOS DE VENTO", "PETRÓPOLIS", 
      "AUXILIADORA", "BOM FIM", "CIDADE BAIXA", "MENINO DEUS",
      "PRAIA DE BELAS", "CRISTAL", "TRÊS FIGUEIRAS"
    ],
    invalidBairros: ["BOA VISTA DO SUL", "VILA NOVA DO SUL", "CENTRO", "PORTO ALEGRE"],
    ambiguousBairros: [
      { name: "CENTRO HISTÓRICO", notToBeMistakenWith: ["CENTRO"] }
    ]
  };
}

/**
 * Obtém lista de bairros com cache inteligente
 */
export async function getBairrosList(): Promise<{
  validBairros: string[];
  invalidBairros: string[];
  ambiguousBairros: Array<{ name: string; notToBeMistakenWith: string[] }>;
}> {
  const now = Date.now();

  // Verificar se cache é válido
  if (bairrosCache && (now - bairrosCache.lastUpdated) < bairrosCache.ttl) {
    return {
      validBairros: bairrosCache.validBairros,
      invalidBairros: bairrosCache.invalidBairros,
      ambiguousBairros: bairrosCache.ambiguousBairros
    };
  }

  // Carregar dados frescos
  const freshData = await loadBairrosFromDatabase();
  
  // Atualizar cache
  bairrosCache = {
    ...freshData,
    lastUpdated: now,
    ttl: CACHE_TTL
  };

  return freshData;
}

/**
 * Força atualização do cache
 */
export async function refreshBairrosCache(): Promise<void> {
  bairrosCache = null;
  await getBairrosList();
}

/**
 * Valida se um bairro existe no banco de dados (dinâmico)
 */
export async function isValidBairro(bairroName: string): Promise<boolean> {
  const normalized = bairroName.toUpperCase().trim();
  const { validBairros } = await getBairrosList();
  return validBairros.includes(normalized);
}

/**
 * Verifica se um nome é um bairro inválido conhecido
 */
export async function isKnownInvalidBairro(bairroName: string): Promise<boolean> {
  const normalized = bairroName.toUpperCase().trim();
  const { invalidBairros } = await getBairrosList();
  return invalidBairros.includes(normalized);
}

/**
 * Encontra bairros similares para sugestão (dinâmico)
 */
export async function findSimilarBairros(bairroName: string, maxSuggestions = 3): Promise<string[]> {
  const normalized = bairroName.toUpperCase().trim();
  const { validBairros } = await getBairrosList();
  const suggestions: string[] = [];
  
  // Busca por bairros que contêm o termo
  for (const bairro of validBairros) {
    if (bairro.includes(normalized) || normalized.includes(bairro)) {
      suggestions.push(bairro);
      if (suggestions.length >= maxSuggestions) break;
    }
  }
  
  // Se não encontrou, busca por início similar
  if (suggestions.length === 0) {
    const firstWord = normalized.split(' ')[0];
    for (const bairro of validBairros) {
      if (bairro.startsWith(firstWord)) {
        suggestions.push(bairro);
        if (suggestions.length >= maxSuggestions) break;
      }
    }
  }
  
  return suggestions;
}

/**
 * Retorna mensagem de erro apropriada para bairro inválido (dinâmico)
 */
export async function getBairroErrorMessage(bairroName: string): Promise<string> {
  const normalized = bairroName.toUpperCase().trim();
  
  if (normalized === "BOA VISTA DO SUL" || normalized === "VILA NOVA DO SUL") {
    return `O bairro "${bairroName}" não existe em Porto Alegre. Você quis dizer "${normalized.replace(' DO SUL', '')}"?`;
  }
  
  if (normalized === "CENTRO") {
    return `O bairro correto é "Centro Histórico", não apenas "Centro".`;
  }
  
  if (normalized === "PORTO ALEGRE") {
    return `Porto Alegre é o nome da cidade, não de um bairro específico. Qual bairro você gostaria de consultar?`;
  }
  
  const suggestions = await findSimilarBairros(bairroName);
  if (suggestions.length > 0) {
    return `O bairro "${bairroName}" não foi encontrado. Você quis dizer: ${suggestions.join(', ')}?`;
  }
  
  return `O bairro "${bairroName}" não existe no banco de dados de Porto Alegre.`;
}

/**
 * Obtém estatísticas do cache
 */
export function getCacheStats() {
  if (!bairrosCache) {
    return { status: 'empty', lastUpdated: null, validBairrosCount: 0 };
  }

  const now = Date.now();
  const age = now - bairrosCache.lastUpdated;
  const isExpired = age > bairrosCache.ttl;

  return {
    status: isExpired ? 'expired' : 'valid',
    lastUpdated: new Date(bairrosCache.lastUpdated).toISOString(),
    age: `${Math.round(age / 1000 / 60)}min`,
    validBairrosCount: bairrosCache.validBairros.length,
    ttl: `${Math.round(bairrosCache.ttl / 1000 / 60)}min`
  };
}