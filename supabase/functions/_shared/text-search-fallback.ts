/**
 * TEXT SEARCH FALLBACK - Emergency Solution
 * Implements search without dependency on embeddings
 * Generic solution that works for any query
 */

export interface SearchResult {
  id: string;
  content: string;
  source: string;
  relevance: number;
  metadata?: any;
}

/**
 * Extract keywords from query (generic, no hardcoding)
 */
function extractKeywords(query: string): string[] {
  // Remove common Portuguese stop words
  const stopWords = new Set([
    'o', 'a', 'de', 'da', 'do', 'em', 'para', 'com', 'que', 'qual',
    'como', 'onde', 'quando', 'por', 'sobre', 'é', 'são', 'foi', 'será'
  ]);
  
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .map(word => word.replace(/[.,;!?]/g, ''));
}

/**
 * Generic entity extraction using patterns
 */
function extractEntities(query: string): Record<string, string[]> {
  const entities: Record<string, string[]> = {
    articles: [],
    laws: [],
    numbers: [],
    uppercaseTerms: []
  };
  
  // Extract article numbers
  const articlePattern = /art(?:igo)?\.?\s*(\d+)/gi;
  let match;
  while ((match = articlePattern.exec(query)) !== null) {
    entities.articles.push(match[1]);
  }
  
  // Extract law references
  const lawPattern = /\b(PDUS|LUOS|COE|LC|lei\s+complementar)\b/gi;
  while ((match = lawPattern.exec(query)) !== null) {
    entities.laws.push(match[1].toUpperCase());
  }
  
  // Extract any numbers (could be heights, coefficients, etc)
  const numberPattern = /\b(\d+(?:\.\d+)?)\s*(m|metros?|%|por\s*cento)?\b/gi;
  while ((match = numberPattern.exec(query)) !== null) {
    entities.numbers.push(match[1]);
  }
  
  // Extract uppercase terms (likely proper nouns or acronyms)
  const words = query.split(/\s+/);
  words.forEach(word => {
    if (word.length > 3 && word === word.toUpperCase()) {
      entities.uppercaseTerms.push(word);
    }
  });
  
  return entities;
}

/**
 * Full-text search in legal_articles
 */
export async function searchLegalArticles(
  supabase: any,
  query: string,
  limit: number = 10
): Promise<SearchResult[]> {
  const keywords = extractKeywords(query);
  const entities = extractEntities(query);
  
  const searches = [];
  
  // Search by article number if detected
  if (entities.articles.length > 0) {
    for (const articleNum of entities.articles) {
      searches.push(
        supabase
          .from('legal_articles')
          .select('*')
          .or(`article_number.eq.${articleNum},article_number.eq.${parseInt(articleNum)}`)
          .limit(5)
      );
    }
  }
  
  // Search by keywords in content
  if (keywords.length > 0) {
    // Build OR condition for keywords
    const keywordConditions = keywords
      .slice(0, 3) // Limit to top 3 keywords for performance
      .map(kw => `full_content.ilike.%${kw}%`)
      .join(',');
    
    searches.push(
      supabase
        .from('legal_articles')
        .select('*')
        .or(keywordConditions)
        .limit(limit)
    );
  }
  
  // Search by law type if specified
  if (entities.laws.length > 0) {
    searches.push(
      supabase
        .from('legal_articles')
        .select('*')
        .in('document_type', entities.laws)
        .limit(limit)
    );
  }
  
  // Execute all searches in parallel
  const results = await Promise.all(searches);
  
  // Merge and deduplicate results
  const allResults = results.flatMap(r => r.data || []);
  const uniqueResults = Array.from(
    new Map(allResults.map(item => [item.id, item])).values()
  );
  
  // Convert to SearchResult format with relevance scoring
  return uniqueResults.map(item => ({
    id: item.id,
    content: item.full_content || item.article_text || '',
    source: `${item.document_type} Art. ${item.article_number}`,
    relevance: calculateRelevance(item, query, keywords),
    metadata: item
  })).sort((a, b) => b.relevance - a.relevance).slice(0, limit);
}

/**
 * Search in regime_urbanistico_consolidado
 */
export async function searchRegimeUrbanistico(
  supabase: any,
  query: string,
  limit: number = 10
): Promise<SearchResult[]> {
  const keywords = extractKeywords(query);
  const entities = extractEntities(query);
  
  // Build search conditions
  const conditions = [];
  
  // Search in Bairro column
  keywords.forEach(kw => {
    if (kw.length > 3) {
      conditions.push(`"Bairro".ilike.%${kw}%`);
    }
  });
  
  // Search for zone references
  if (query.toLowerCase().includes('zot') || query.toLowerCase().includes('zona')) {
    conditions.push(`"Zona".ilike.%${keywords.join('%')}%`);
  }
  
  // Search for numbers (could be heights, coefficients)
  if (entities.numbers.length > 0) {
    entities.numbers.forEach(num => {
      conditions.push(`"Altura_Maxima___Edificacao_Isolada".eq.${num}`);
    });
  }
  
  if (conditions.length === 0) {
    // If no specific conditions, do a general search
    const generalSearch = keywords
      .slice(0, 2)
      .map(kw => `"Bairro".ilike.%${kw}%`)
      .join(',');
    
    if (generalSearch) {
      conditions.push(generalSearch);
    }
  }
  
  // Execute search
  const { data, error } = conditions.length > 0
    ? await supabase
        .from('regime_urbanistico_consolidado')
        .select('*')
        .or(conditions.join(','))
        .limit(limit)
    : await supabase
        .from('regime_urbanistico_consolidado')
        .select('*')
        .limit(limit);
  
  if (error) {
    console.error('Regime search error:', error);
    return [];
  }
  
  // Convert to SearchResult format
  return (data || []).map(item => ({
    id: item.id,
    content: formatRegimeContent(item),
    source: `Regime Urbanístico - ${item.Bairro}`,
    relevance: calculateRegimeRelevance(item, query, keywords),
    metadata: item
  })).sort((a, b) => b.relevance - a.relevance);
}

/**
 * Format regime content for display
 */
function formatRegimeContent(item: any): string {
  const parts = [
    `Bairro: ${item.Bairro}`,
    `Zona: ${item.Zona}`,
    `Altura Máxima: ${item.Altura_Maxima___Edificacao_Isolada}m`,
    `Coeficiente Aproveitamento Básico: ${item.Coeficiente_de_Aproveitamento___Basico}`,
    `Coeficiente Aproveitamento Máximo: ${item.Coeficiente_de_Aproveitamento___Maximo}`,
    `Taxa de Ocupação: ${item.Taxa_de_Ocupacao___Basica}%`
  ];
  
  return parts.filter(p => !p.includes('null')).join('\n');
}

/**
 * Calculate relevance score for legal articles
 */
function calculateRelevance(
  item: any,
  query: string,
  keywords: string[]
): number {
  let score = 0;
  const content = (item.full_content || item.article_text || '').toLowerCase();
  const queryLower = query.toLowerCase();
  
  // Exact query match
  if (content.includes(queryLower)) {
    score += 10;
  }
  
  // Keyword matches
  keywords.forEach(kw => {
    if (content.includes(kw)) {
      score += 2;
    }
  });
  
  // Article number match
  if (item.article_number && query.includes(item.article_number.toString())) {
    score += 5;
  }
  
  // Document type match
  if (item.document_type && query.toUpperCase().includes(item.document_type)) {
    score += 3;
  }
  
  return score;
}

/**
 * Calculate relevance score for regime urbanistico
 */
function calculateRegimeRelevance(
  item: any,
  query: string,
  keywords: string[]
): number {
  let score = 0;
  const queryLower = query.toLowerCase();
  
  // Bairro match
  if (item.Bairro && item.Bairro.toLowerCase().includes(queryLower)) {
    score += 10;
  }
  
  // Keyword matches in Bairro
  keywords.forEach(kw => {
    if (item.Bairro && item.Bairro.toLowerCase().includes(kw)) {
      score += 3;
    }
  });
  
  // Zone match
  if (item.Zona && queryLower.includes('zot') && item.Zona.includes('ZOT')) {
    score += 5;
  }
  
  // Height query match
  if (queryLower.includes('altura') && item.Altura_Maxima___Edificacao_Isolada) {
    score += 4;
  }
  
  // Coefficient query match
  if (queryLower.includes('coeficiente') && item.Coeficiente_de_Aproveitamento___Basico) {
    score += 4;
  }
  
  return score;
}

/**
 * Main search function that combines all strategies
 */
export async function performTextSearch(
  supabase: any,
  query: string,
  options: {
    limit?: number;
    tables?: string[];
  } = {}
): Promise<SearchResult[]> {
  const limit = options.limit || 20;
  const tables = options.tables || ['legal_articles', 'regime_urbanistico_consolidado'];
  
  const searchPromises = [];
  
  if (tables.includes('legal_articles')) {
    searchPromises.push(searchLegalArticles(supabase, query, limit));
  }
  
  if (tables.includes('regime_urbanistico_consolidado')) {
    searchPromises.push(searchRegimeUrbanistico(supabase, query, limit));
  }
  
  // Execute all searches in parallel
  const results = await Promise.all(searchPromises);
  
  // Merge all results
  const allResults = results.flat();
  
  // Sort by relevance and limit
  return allResults
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit);
}