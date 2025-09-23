/**
 * UPDATED: Text Search Fallback - Now using only KNOWLEDGEBASE
 * Migrated from legal_articles and regime_urbanistico_consolidado
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
 * UPDATED: Search in knowledgebase (migrated from legal_articles)
 */
export async function searchKnowledgebase(
  supabase: any,
  query: string,
  limit: number = 10
): Promise<SearchResult[]> {
  const keywords = extractKeywords(query);
  const entities = extractEntities(query);
  
  const results: SearchResult[] = [];
  
  // Search by article number if detected
  if (entities.articles.length > 0) {
    for (const articleNum of entities.articles) {
      try {
        const { data: articles } = await supabase.rpc('search_articles_knowledgebase', {
          article_number_search: articleNum,
          document_type_filter: null
        });
        
        if (articles && articles.length > 0) {
          articles.forEach((article: any) => {
            results.push({
              id: article.id,
              content: article.texto || article.resposta || '',
              source: 'knowledgebase',
              relevance: 0.9,
              metadata: {
                tipo_documento: article.tipo_documento,
                titulo: article.titulo,
                article_number: articleNum
              }
            });
          });
        }
      } catch (error) {
        console.error(`Error searching for article ${articleNum}:`, error);
      }
    }
  }
  
  // Search by keywords in content using text search
  if (keywords.length > 0) {
    for (const keyword of keywords.slice(0, 3)) { // Limit to avoid too many requests
      try {
        const { data: textResults } = await supabase.rpc('search_knowledgebase_by_content', {
          search_text: keyword,
          match_count: 5
        });
        
        if (textResults && textResults.length > 0) {
          textResults.forEach((result: any) => {
            results.push({
              id: result.id,
              content: result.texto || result.resposta || '',
              source: 'knowledgebase',
              relevance: result.relevance_score || 0.5,
              metadata: {
                tipo_documento: result.tipo_documento,
                titulo: result.titulo,
                pergunta: result.pergunta
              }
            });
          });
        }
      } catch (error) {
        console.error(`Error searching for keyword ${keyword}:`, error);
      }
    }
  }
  
  // Remove duplicates and sort by relevance
  const uniqueResults = results.filter((result, index, self) => 
    index === self.findIndex(r => r.id === result.id)
  );
  
  return uniqueResults
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit);
}

/**
 * UPDATED: Generic fallback search (now uses knowledgebase only)
 */
export async function fallbackMultiTableSearch(
  supabase: any,
  query: string,
  options: { tables?: string[], maxResults?: number } = {}
): Promise<SearchResult[]> {
  console.log(`🔍 Fallback search (knowledgebase only): "${query}"`);
  
  // All searches now go to knowledgebase
  const results = await searchKnowledgebase(supabase, query, options.maxResults || 10);
  
  console.log(`✅ Fallback search found ${results.length} results from knowledgebase`);
  return results;
}

/**
 * Legacy compatibility - redirects all searches to knowledgebase
 */
export async function searchLegalArticles(
  supabase: any,
  query: string,
  limit: number = 10
): Promise<SearchResult[]> {
  console.log('🔄 Legacy legal articles search redirected to knowledgebase');
  return searchKnowledgebase(supabase, query, limit);
}

export async function searchRegimeUrbanistico(
  supabase: any,
  query: string,
  limit: number = 10
): Promise<SearchResult[]> {
  console.log('🔄 Legacy regime urbanístico search redirected to knowledgebase');
  return searchKnowledgebase(supabase, query, limit);
}