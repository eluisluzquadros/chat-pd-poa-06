// ============================================
// Serviço de filtro de palavras-chave ruidosas
// ============================================

// Palavras de teste/técnicas a serem ignoradas
const TEST_NOISE_WORDS = new Set([
  // Palavras de teste
  'teste', 'test', 'testing', 'testando', 'testar',
  
  // Nomes de agentes/versões
  'agente', 'agent',
  
  // Sistemas operacionais
  'ios', 'android', 'windows', 'linux', 'macos', 'desktop', 'mobile',
  
  // Browsers
  'safari', 'chrome', 'firefox', 'edge', 'opera', 'browser',
  
  // Siglas técnicas
  'pd', 'pdpoa', 'pduap',
  
  // Ferramentas/Plataformas
  'lovable', 'lovable ai', 'gpt', 'chatgpt', 'openai',
  
  // Versões
  'v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9', 'v10',
  'versao', 'versão', 'version', 'ver',
]);

// Padrões regex para identificar ruído
const NOISE_PATTERNS = [
  /^agente\s+pd\s+v\d+$/i,  // "agente pd v1", "agente pd v2"
  /^v\d+$/i,                 // "v1", "v2"
  /^teste\s+\d+$/i,          // "teste 1", "teste 2"
  /^\d+$/,                   // apenas números
  /^agente\s+v\d+$/i,        // "agente v1"
];

/**
 * Filtra palavras-chave ruidosas (testes, versões, termos técnicos)
 */
export function filterNoiseKeywords(keywords: string[]): string[] {
  return keywords.filter(keyword => {
    if (!keyword) return false;
    
    const normalized = keyword.toLowerCase().trim();
    
    // 1. Filtrar palavras da lista
    if (TEST_NOISE_WORDS.has(normalized)) return false;
    
    // 2. Filtrar padrões regex
    if (NOISE_PATTERNS.some(pattern => pattern.test(normalized))) return false;
    
    // 3. Filtrar palavras muito curtas (< 3 caracteres)
    if (normalized.length < 3) return false;
    
    return true;
  });
}

/**
 * Adiciona palavra à lista de exclusão (útil para ajustes dinâmicos)
 */
export function addNoiseWord(word: string) {
  TEST_NOISE_WORDS.add(word.toLowerCase().trim());
}

/**
 * Verifica se uma palavra está na lista de ruído
 */
export function isNoiseKeyword(keyword: string): boolean {
  const normalized = keyword.toLowerCase().trim();
  return TEST_NOISE_WORDS.has(normalized) || 
         NOISE_PATTERNS.some(pattern => pattern.test(normalized));
}

/**
 * Filtra tópicos ruidosos (mesma lógica de keywords)
 */
export function filterNoiseTopics(topics: string[]): string[] {
  return filterNoiseKeywords(topics);
}
