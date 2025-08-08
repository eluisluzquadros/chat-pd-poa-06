/**
 * Utility functions for filtering promotional templates from AI responses
 */

export function removePromotionalTemplate(text: string): string {
  if (!text) return '';
  
  return text
    // Remove promotional banners with stars
    .replace(/🌟.*?Experimente.*?🌟/gs, '')
    // Remove "Para mais informações" links
    .replace(/Para mais informações.*?visite.*?\.org/gs, '')
    // Remove tip sections
    .replace(/💡.*?Dica:.*$/gm, '')
    // Remove warning/notice sections
    .replace(/\*\*Aviso:.*?\*\*/gs, '')
    // Remove promotional footers
    .replace(/---\s*Experimente.*$/gs, '')
    // Remove multiple consecutive line breaks
    .replace(/\n{3,}/g, '\n\n')
    // Trim whitespace
    .trim();
}

export function calculateAccuracyWithoutTemplate(
  actualAnswer: string,
  expectedKeywords: string[],
  expectedAnswer?: string
): number {
  // Clean the response first
  const cleanAnswer = removePromotionalTemplate(actualAnswer).toLowerCase();
  
  // Primary method: keyword matching
  if (expectedKeywords?.length > 0) {
    const matchedKeywords = expectedKeywords.filter(keyword => 
      cleanAnswer.includes(keyword.toLowerCase())
    );
    return matchedKeywords.length / expectedKeywords.length;
  }
  
  // Fallback: simple similarity check with expected answer
  if (expectedAnswer) {
    const expectedLower = expectedAnswer.toLowerCase();
    const commonWords = expectedLower.split(/\s+/).filter(word => 
      word.length > 3 && cleanAnswer.includes(word)
    );
    return Math.min(commonWords.length / 10, 1); // Cap at 1
  }
  
  // No keywords or expected answer available
  return 0;
}

export function formatExpectedAnswer(expectedKeywords: string[], expectedAnswer?: string): string {
  if (expectedKeywords?.length > 0) {
    return `Palavras-chave esperadas: ${expectedKeywords.join(', ')}`;
  }
  
  return expectedAnswer || 'Não especificada';
}