// ============================================
// Serviço de limpeza de texto para análise NLP
// ============================================

// Stop words PT-BR (palavras comuns sem significado analítico)
const STOP_WORDS = new Set([
  'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas',
  'de', 'do', 'da', 'dos', 'das', 'dum', 'duma', 'duns', 'dumas',
  'em', 'no', 'na', 'nos', 'nas', 'num', 'numa', 'nuns', 'numas',
  'por', 'pelo', 'pela', 'pelos', 'pelas',
  'para', 'pra', 'pro', 'pros',
  'com', 'sem', 'sob', 'sobre',
  'e', 'ou', 'mas', 'porém', 'contudo', 'todavia',
  'se', 'que', 'qual', 'quais', 'quando', 'onde',
  'este', 'esta', 'estes', 'estas', 'esse', 'essa', 'esses', 'essas',
  'aquele', 'aquela', 'aqueles', 'aquelas', 'isto', 'isso', 'aquilo',
  'eu', 'tu', 'ele', 'ela', 'nós', 'vós', 'eles', 'elas',
  'meu', 'minha', 'meus', 'minhas', 'teu', 'tua', 'teus', 'tuas',
  'seu', 'sua', 'seus', 'suas', 'nosso', 'nossa', 'nossos', 'nossas',
  'me', 'te', 'lhe', 'lhes', 'nos', 'vos',
  'ser', 'estar', 'ter', 'haver', 'fazer', 'ir', 'vir',
  'muito', 'pouco', 'mais', 'menos', 'bem', 'mal',
  'já', 'ainda', 'também', 'só', 'apenas', 'somente',
  'sim', 'não', 'nunca', 'sempre', 'jamais',
  'aqui', 'ali', 'lá', 'aí', 'acolá',
  'hoje', 'ontem', 'amanhã', 'agora', 'depois', 'antes',
  'à', 'ao', 'aos', 'às'
]);

// Saudações e cumprimentos PT-BR
const GREETINGS = new Set([
  'oi', 'olá', 'ola', 'oie', 'oii',
  'bom dia', 'boa tarde', 'boa noite',
  'coe', 'e ai', 'eai', 'e aí', 'eaí',
  'salve', 'fala', 'opa', 'hey', 'hi', 'hello',
  'tchau', 'até logo', 'até mais', 'até',
  'obrigado', 'obrigada', 'valeu', 'vlw',
  'desculpa', 'desculpe', 'perdão'
]);

/**
 * Remove acentos e normaliza caracteres
 */
function removeAccents(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Limpa e normaliza texto para análise NLP
 * - Converte para minúsculas
 * - Remove pontuação
 * - Normaliza espaços
 * - Remove acentos
 */
export function cleanText(text: string): string {
  if (!text) return '';
  
  // 1. Converter para minúsculas
  let cleaned = text.toLowerCase();
  
  // 2. Remover pontuação, mantendo espaços
  cleaned = cleaned.replace(/[^\w\s]/g, ' ');
  
  // 3. Normalizar espaços (múltiplos espaços → 1 espaço)
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

/**
 * Remove stop words e saudações de um array de palavras
 */
export function removeStopWords(words: string[]): string[] {
  return words.filter(word => {
    const normalized = removeAccents(word);
    return (
      !STOP_WORDS.has(word) &&
      !STOP_WORDS.has(normalized) &&
      !GREETINGS.has(word) &&
      !GREETINGS.has(normalized) &&
      word.length > 2 // Remove palavras muito curtas
    );
  });
}

/**
 * Extrai palavras-chave relevantes de um texto
 * (com limpeza e remoção de stop words)
 */
export function extractKeywords(text: string): string[] {
  const cleaned = cleanText(text);
  const words = cleaned.split(' ').filter(w => w.length > 0);
  return removeStopWords(words);
}

/**
 * Verifica se uma frase é apenas uma saudação
 */
export function isGreeting(text: string): boolean {
  const cleaned = cleanText(text);
  const words = cleaned.split(' ');
  
  // Se todas as palavras são saudações ou stop words, é só saudação
  const meaningfulWords = words.filter(word => 
    !STOP_WORDS.has(word) && 
    !GREETINGS.has(word)
  );
  
  return meaningfulWords.length === 0;
}

/**
 * Conta frequência de palavras em um array de textos
 * (útil para nuvem de palavras)
 */
export function getWordFrequency(texts: string[]): Map<string, number> {
  const frequency = new Map<string, number>();
  
  texts.forEach(text => {
    const keywords = extractKeywords(text);
    keywords.forEach(word => {
      frequency.set(word, (frequency.get(word) || 0) + 1);
    });
  });
  
  return frequency;
}

/**
 * Obtém top N palavras mais frequentes
 */
export function getTopKeywords(texts: string[], topN: number = 50): Array<{ text: string; value: number }> {
  const frequency = getWordFrequency(texts);
  
  return Array.from(frequency.entries())
    .map(([text, value]) => ({ text, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, topN);
}
