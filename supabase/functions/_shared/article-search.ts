/**
 * Article Search Module
 * Handles normalized article number searches with multiple strategies
 */

export interface ArticleSearchOptions {
  articleNumber: string;
  documentType?: 'PDUS' | 'LUOS' | 'COE';
  fuzzy?: boolean;
}

/**
 * Normalize article number for consistent searching
 */
function normalizeArticleNumber(articleNumber: string | number): string[] {
  const numStr = articleNumber.toString().trim();
  const variants = new Set<string>();
  
  // Original
  variants.add(numStr);
  
  // Without leading zeros
  variants.add(numStr.replace(/^0+/, ''));
  
  // With leading zeros (up to 3 digits)
  variants.add(numStr.padStart(3, '0'));
  
  // As integer string
  const asInt = parseInt(numStr, 10);
  if (!isNaN(asInt)) {
    variants.add(asInt.toString());
  }
  
  return Array.from(variants);
}

/**
 * Search for articles with multiple strategies
 */
export async function searchArticle(
  supabase: any,
  options: ArticleSearchOptions
): Promise<any[]> {
  const { articleNumber, documentType, fuzzy = true } = options;
  
  // Get all variants of the article number
  const variants = normalizeArticleNumber(articleNumber);
  
  // Strategy 1: Try exact matches with all variants
  const exactSearches = variants.map(variant => 
    supabase
      .from('legal_articles')
      .select('*')
      .eq('article_number', variant)
      .eq(documentType ? 'document_type' : '', documentType || '')
  );
  
  const exactResults = await Promise.all(exactSearches);
  const exactMatches = exactResults.flatMap(r => r.data || []);
  
  if (exactMatches.length > 0) {
    return exactMatches;
  }
  
  // Strategy 2: Text search in full_content
  if (fuzzy) {
    const textSearch = await supabase
      .from('legal_articles')
      .select('*')
      .or(`full_content.ilike.%art. ${articleNumber}%,full_content.ilike.%artigo ${articleNumber}%`)
      .eq(documentType ? 'document_type' : '', documentType || '')
      .limit(5);
    
    if (textSearch.data && textSearch.data.length > 0) {
      return textSearch.data;
    }
  }
  
  // Strategy 3: Pattern matching
  const patternSearch = await supabase
    .from('legal_articles')
    .select('*')
    .or(variants.map(v => `article_number.ilike.%${v}%`).join(','))
    .eq(documentType ? 'document_type' : '', documentType || '')
    .limit(5);
  
  return patternSearch.data || [];
}

/**
 * Extract article references from query
 */
export function extractArticleReferences(query: string): ArticleSearchOptions[] {
  const references: ArticleSearchOptions[] = [];
  
  // Pattern: artigo X da/do LEI
  const withLawPattern = /art(?:igo)?\.?\s*(\d+)\s*d[aeo]\s+(PDUS|LUOS|COE)/gi;
  let match;
  
  while ((match = withLawPattern.exec(query)) !== null) {
    references.push({
      articleNumber: match[1],
      documentType: match[2].toUpperCase() as 'PDUS' | 'LUOS' | 'COE'
    });
  }
  
  // Pattern: artigo X (without law)
  const simplePattern = /art(?:igo)?\.?\s*(\d+)/gi;
  
  while ((match = simplePattern.exec(query)) !== null) {
    // Check if not already captured with law
    if (!references.some(r => r.articleNumber === match[1])) {
      references.push({
        articleNumber: match[1]
      });
    }
  }
  
  return references;
}