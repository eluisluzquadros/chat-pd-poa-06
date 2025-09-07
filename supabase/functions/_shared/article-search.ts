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
 * UPDATED: Search for articles in knowledgebase (migrated from legal_articles)
 */
export async function searchArticle(
  supabase: any,
  options: ArticleSearchOptions
): Promise<any[]> {
  const { articleNumber, documentType, fuzzy = true } = options;
  
  console.log(`📄 Searching for article ${articleNumber} in knowledgebase`);
  
  try {
    // Use the knowledgebase RPC function for article search
    const { data: articles, error } = await supabase.rpc('search_articles_knowledgebase', {
      article_number_search: articleNumber.toString(),
      document_type_filter: documentType?.toLowerCase()
    });
    
    if (!error && articles && articles.length > 0) {
      console.log(`✅ Found ${articles.length} articles for ${articleNumber}`);
      return articles.map((article: any) => ({
        id: article.id,
        article_number: articleNumber,
        document_type: documentType,
        full_content: article.texto || article.resposta || '',
        article_text: article.texto || article.resposta || '',
        title: article.titulo,
        source: 'knowledgebase',
        metadata: {
          tipo_documento: article.tipo_documento,
          parte: article.parte,
          capitulo: article.capitulo,
          secao: article.secao,
          subsecao: article.subsecao
        }
      }));
    }
    
    // If no exact match and fuzzy search enabled, try text search
    if (fuzzy) {
      console.log(`🔤 Trying fuzzy search for article ${articleNumber}`);
      
      const { data: fuzzyResults, error: fuzzyError } = await supabase.rpc('search_knowledgebase_by_content', {
        search_text: `artigo ${articleNumber}`,
        match_count: 5
      });
      
      if (!fuzzyError && fuzzyResults && fuzzyResults.length > 0) {
        console.log(`✅ Found ${fuzzyResults.length} fuzzy results for ${articleNumber}`);
        return fuzzyResults.map((result: any) => ({
          id: result.id,
          article_number: articleNumber,
          document_type: documentType,
          full_content: result.texto || result.resposta || '',
          article_text: result.texto || result.resposta || '',
          title: result.titulo || result.pergunta,
          source: 'knowledgebase',
          relevance_score: result.relevance_score,
          metadata: {
            tipo_documento: result.tipo_documento,
            parte: result.parte,
            capitulo: result.capitulo
          }
        }));
      }
    }
    
    console.log(`❌ No results found for article ${articleNumber}`);
    return [];
    
  } catch (error) {
    console.error(`❌ Error searching for article ${articleNumber}:`, error);
    return [];
  }
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
      documentType: match[2] as 'PDUS' | 'LUOS' | 'COE'
    });
  }
  
  // Pattern: just artigo X
  const simplePattern = /art(?:igo)?\.?\s*(\d+)/gi;
  while ((match = simplePattern.exec(query)) !== null) {
    // Only add if not already captured by the previous pattern
    if (!references.some(ref => ref.articleNumber === match[1])) {
      references.push({
        articleNumber: match[1]
      });
    }
  }
  
  return references;