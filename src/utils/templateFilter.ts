/**
 * Utility functions for filtering promotional templates from AI responses
 */

export function removePromotionalTemplate(text: string): string {
  if (!text) return '';
  
  return text
    // Remove promotional banners with stars and emoji
    .replace(/🌟.*?Experimente.*?🌟/gs, '')
    .replace(/📍.*?Explore mais:.*?$/gm, '')
    .replace(/💬.*?Dúvidas\?.*?$/gm, '')
    // Remove "Para mais informações" links
    .replace(/Para mais informações.*?visite.*?\.org/gs, '')
    // Remove tip sections
    .replace(/💡.*?Dica:.*$/gm, '')
    // Remove warning/notice sections
    .replace(/\*\*Aviso:.*?\*\*/gs, '')
    // Remove promotional footers
    .replace(/---\s*Experimente.*$/gs, '')
    // Remove link patterns
    .replace(/https:\/\/bit\.ly\/\w+\s*↗\s*↗/g, '')
    .replace(/Contribua com sugestões:.*$/gm, '')
    .replace(/Participe da Audiência Pública:.*$/gm, '')
    .replace(/Mapa com Regras Construtivas:.*$/gm, '')
    // Remove email patterns
    .replace(/planodiretor@portoalegre\.rs\.gov\.br/g, '')
    // Remove multiple consecutive line breaks
    .replace(/\n{3,}/g, '\n\n')
    // Remove extra spaces and trim
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function normalizeText(text: string): string {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
    .replace(/\s+/g, ' ')
    .trim();
}

export function calculateAccuracyWithoutTemplate(
  actualAnswer: string,
  expectedKeywords: string[],
  expectedAnswer?: string,
  category?: string
): number {
  // Clean both answers first
  const cleanActual = normalizeText(removePromotionalTemplate(actualAnswer));
  const cleanExpected = expectedAnswer ? normalizeText(removePromotionalTemplate(expectedAnswer)) : '';
  
  let accuracy = 0;
  
  // Primary method: keyword matching
  if (expectedKeywords?.length > 0) {
    const normalizedKeywords = expectedKeywords.map(k => normalizeText(k));
    const matchedKeywords = normalizedKeywords.filter(keyword => 
      cleanActual.includes(keyword) || keyword.includes(cleanActual.substring(0, 20))
    );
    accuracy = matchedKeywords.length / normalizedKeywords.length;
  } else if (cleanExpected) {
    // Fallback: semantic similarity check
    accuracy = calculateSemanticSimilarity(cleanActual, cleanExpected, category);
  }
  
  return Math.min(accuracy, 1);
}

export function calculateSemanticSimilarity(
  actual: string, 
  expected: string, 
  category?: string
): number {
  if (!actual || !expected) return 0;
  
  const actualWords = actual.split(/\s+/).filter(w => w.length > 2);
  const expectedWords = expected.split(/\s+/).filter(w => w.length > 2);
  
  if (expectedWords.length === 0) return 0;
  
  // Category-specific evaluation
  switch (category) {
    case 'zoneamento':
    case 'altura_maxima':
      return calculateNumericSimilarity(actual, expected);
    case 'uso-solo':
    case 'conceptual':
      return calculateConceptualSimilarity(actualWords, expectedWords);
    default:
      return calculateGeneralSimilarity(actualWords, expectedWords);
  }
}

function calculateNumericSimilarity(actual: string, expected: string): number {
  // Extract numbers from both texts
  const actualNumbers: string[] = actual.match(/\d+(?:\.\d+)?/g) || [];
  const expectedNumbers: string[] = expected.match(/\d+(?:\.\d+)?/g) || [];
  
  if (expectedNumbers.length === 0) return 0;
  
  let matches = 0;
  for (const num of expectedNumbers) {
    if (actualNumbers.includes(num)) {
      matches++;
    }
  }
  
  const numericScore = matches / expectedNumbers.length;
  
  // Also check for key terms
  const keyTerms = ['metros', 'zot', 'coeficiente', 'altura', 'maxima'];
  const termMatches = keyTerms.filter(term => 
    actual.includes(term) && expected.includes(term)
  ).length;
  
  return Math.max(numericScore, termMatches / keyTerms.length * 0.8);
}

function calculateConceptualSimilarity(actualWords: string[], expectedWords: string[]): number {
  const commonWords = actualWords.filter(word => 
    expectedWords.some(expWord => 
      word.includes(expWord) || expWord.includes(word) || 
      levenshteinDistance(word, expWord) <= 2
    )
  );
  
  return commonWords.length / expectedWords.length;
}

function calculateGeneralSimilarity(actualWords: string[], expectedWords: string[]): number {
  const commonWords = actualWords.filter(word => expectedWords.includes(word));
  return commonWords.length / expectedWords.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i += 1) {
    matrix[0][i] = i;
  }
  
  for (let j = 0; j <= str2.length; j += 1) {
    matrix[j][0] = j;
  }
  
  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator,
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

export function formatExpectedAnswer(expectedKeywords: string[], expectedAnswer?: string): string {
  if (expectedKeywords?.length > 0) {
    return `Palavras-chave esperadas: ${expectedKeywords.join(', ')}`;
  }
  
  return expectedAnswer || 'Não especificada';
}