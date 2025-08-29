// knowledge-base-search.ts
// Enhanced search strategies for knowledge base complete data

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

export interface KnowledgeSearchOptions {
  useRegimeFallback?: boolean;
  useQAKnowledge?: boolean;
  includeHierarchical?: boolean;
  maxResults?: number;
}

export class KnowledgeBaseSearch {
  private supabase: any;
  
  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }
  
  /**
   * Search regime urbanístico with fallback to chunks
   */
  async searchRegimeUrbanistico(
    neighborhood: string, 
    zone?: string,
    options: KnowledgeSearchOptions = {}
  ): Promise<any[]> {
    const results: any[] = [];
    
    // 1. Try structured table first
    const { data: structuredData, error: structuredError } = await this.supabase
      .from('regime_urbanistico_consolidado')
      .select('*')
      .ilike('bairro', `%${neighborhood}%`)
      .limit(options.maxResults || 5);
    
    if (structuredData && structuredData.length > 0) {
      console.log(`✅ Found ${structuredData.length} structured regime results`);
      results.push(...structuredData.map(r => ({
        ...r,
        source: 'structured_table',
        confidence: 1.0
      })));
    }
    
    // 2. Fallback to document chunks if enabled and no structured data found
    if (options.useRegimeFallback && results.length === 0) {
      console.log('🔄 Using regime chunks fallback...');
      
      // Search in regime chunks
      const searchQuery = zone ? 
        `${neighborhood} ${zone}` : 
        neighborhood;
      
      const { data: chunkData, error: chunkError } = await this.supabase
        .from('document_sections')
        .select('*')
        .or(`document_type.eq.regime_bairro,document_type.eq.regime_zona,document_type.eq.regime_hierarquico`)
        .textSearch('content', searchQuery, {
          config: 'portuguese'
        })
        .limit(options.maxResults || 5);
      
      if (chunkData && chunkData.length > 0) {
        console.log(`📄 Found ${chunkData.length} regime chunk results`);
        results.push(...chunkData.map(r => ({
          ...r,
          source: 'regime_chunks',
          confidence: 0.8
        })));
      }
    }
    
    return results;
  }
  
  /**
   * Search QA knowledge base for complementary information
   */
  async searchQAKnowledge(
    query: string,
    category?: string,
    options: KnowledgeSearchOptions = {}
  ): Promise<any[]> {
    if (!options.useQAKnowledge) return [];
    
    const results: any[] = [];
    
    // 1. Search in QA test cases
    const qaQuery = this.supabase
      .from('qa_test_cases')
      .select('*');
    
    if (category) {
      qaQuery.eq('category', category);
    }
    
    const { data: qaData, error: qaError } = await qaQuery
      .textSearch('expected_answer', query, {
        config: 'portuguese'
      })
      .limit(options.maxResults || 3);
    
    if (qaData && qaData.length > 0) {
      console.log(`❓ Found ${qaData.length} QA test case results`);
      results.push(...qaData.map(r => ({
        ...r,
        source: 'qa_test_cases',
        confidence: 0.9
      })));
    }
    
    // 2. Search in QA document sections
    const { data: qaSections, error: sectionsError } = await this.supabase
      .from('document_sections')
      .select('*')
      .or(`document_type.eq.qa_response,document_type.eq.qa_category`)
      .textSearch('content', query, {
        config: 'portuguese'
      })
      .limit(options.maxResults || 3);
    
    if (qaSections && qaSections.length > 0) {
      console.log(`📚 Found ${qaSections.length} QA section results`);
      results.push(...qaSections.map(r => ({
        ...r,
        source: 'qa_sections',
        confidence: 0.85
      })));
    }
    
    return results;
  }
  
  /**
   * Search hierarchical legal documents
   */
  async searchHierarchicalLegal(
    query: string,
    source?: 'LUOS' | 'PDUS',
    options: KnowledgeSearchOptions = {}
  ): Promise<any[]> {
    if (!options.includeHierarchical) return [];
    
    const results: any[] = [];
    
    // Build query
    const legalQuery = this.supabase
      .from('legal_articles')
      .select('*');
    
    if (source) {
      legalQuery.eq('source', source);
    }
    
    // Search in different hierarchy levels
    const hierarchyLevels = ['article', 'section', 'chapter', 'title', 'part', 'hierarchical'];
    
    for (const level of hierarchyLevels) {
      const { data, error } = await legalQuery
        .eq('hierarchy_level', level)
        .textSearch('content', query, {
          config: 'portuguese'
        })
        .limit(2); // Limit per level to avoid too many results
      
      if (data && data.length > 0) {
        console.log(`📖 Found ${data.length} ${level}-level legal results`);
        results.push(...data.map(r => ({
          ...r,
          source: `legal_${level}`,
          confidence: level === 'article' ? 1.0 : 0.9 - (hierarchyLevels.indexOf(level) * 0.1)
        })));
      }
    }
    
    return results;
  }
  
  /**
   * Combined smart search with all knowledge sources
   */
  async smartSearch(
    query: string,
    metadata: any,
    options: KnowledgeSearchOptions = {}
  ): Promise<{
    primary: any[],
    fallback: any[],
    complementary: any[]
  }> {
    const allResults = {
      primary: [] as any[],
      fallback: [] as any[],
      complementary: [] as any[]
    };
    
    // Determine search strategy based on metadata
    const searchPromises: Promise<any>[] = [];
    
    // 1. Regime urbanístico search
    if (metadata.neighborhood || metadata.construction_params) {
      searchPromises.push(
        this.searchRegimeUrbanistico(
          metadata.neighborhood || query,
          metadata.zot_number,
          { ...options, useRegimeFallback: true }
        ).then(results => {
          results.forEach(r => {
            if (r.source === 'structured_table') {
              allResults.primary.push(r);
            } else {
              allResults.fallback.push(r);
            }
          });
        })
      );
    }
    
    // 2. Legal articles search
    if (metadata.article_number || metadata.legal_query) {
      searchPromises.push(
        this.searchHierarchicalLegal(
          query,
          metadata.source,
          { ...options, includeHierarchical: true }
        ).then(results => {
          results.forEach(r => {
            if (r.confidence >= 0.9) {
              allResults.primary.push(r);
            } else {
              allResults.fallback.push(r);
            }
          });
        })
      );
    }
    
    // 3. QA Knowledge search (always as complementary)
    if (options.useQAKnowledge) {
      searchPromises.push(
        this.searchQAKnowledge(
          query,
          metadata.category,
          options
        ).then(results => {
          allResults.complementary.push(...results);
        })
      );
    }
    
    // Execute all searches in parallel
    await Promise.all(searchPromises);
    
    // Sort by confidence
    allResults.primary.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    allResults.fallback.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    allResults.complementary.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    
    // Limit results
    const maxResults = options.maxResults || 10;
    allResults.primary = allResults.primary.slice(0, maxResults);
    allResults.fallback = allResults.fallback.slice(0, Math.floor(maxResults / 2));
    allResults.complementary = allResults.complementary.slice(0, Math.floor(maxResults / 3));
    
    console.log(`🎯 Smart search results: ${allResults.primary.length} primary, ${allResults.fallback.length} fallback, ${allResults.complementary.length} complementary`);
    
    return allResults;
  }
  
  /**
   * Format results for response synthesis
   */
  formatResultsForSynthesis(results: {
    primary: any[],
    fallback: any[],
    complementary: any[]
  }): string {
    const sections: string[] = [];
    
    // Primary results (high confidence)
    if (results.primary.length > 0) {
      sections.push('=== DADOS PRINCIPAIS ===');
      results.primary.forEach(r => {
        if (r.source === 'structured_table') {
          // Format regime data
          sections.push(`
Bairro: ${r.bairro}
Zona: ${r.zona}
Altura Máxima: ${r.altura_maxima}m
Coeficiente Básico: ${r.coeficiente_basico}
Coeficiente Máximo: ${r.coeficiente_maximo}
Taxa Permeabilidade (>1500m²): ${r.taxa_permeabilidade_acima_1500}%
Taxa Permeabilidade (≤1500m²): ${r.taxa_permeabilidade_ate_1500}%
          `.trim());
        } else if (r.source?.startsWith('legal_')) {
          // Format legal article
          sections.push(`
${r.source === 'legal_article' ? `Artigo ${r.article_number}` : r.title}
${r.content}
          `.trim());
        } else {
          // Generic format
          sections.push(`
${r.title || 'Informação'}
${r.content || JSON.stringify(r)}
          `.trim());
        }
      });
    }
    
    // Fallback results (medium confidence)
    if (results.fallback.length > 0) {
      sections.push('\n=== INFORMAÇÕES COMPLEMENTARES (Fallback) ===');
      results.fallback.forEach(r => {
        sections.push(`
[${r.source}] ${r.title || 'Informação adicional'}
${r.content ? r.content.substring(0, 500) + '...' : JSON.stringify(r).substring(0, 500) + '...'}
        `.trim());
      });
    }
    
    // Complementary QA knowledge
    if (results.complementary.length > 0) {
      sections.push('\n=== BASE DE CONHECIMENTO QA ===');
      results.complementary.forEach(r => {
        if (r.source === 'qa_test_cases') {
          sections.push(`
Caso #${r.id} (${r.category}):
${r.expected_answer}
          `.trim());
        } else {
          sections.push(`
${r.title}:
${r.content ? r.content.substring(0, 400) + '...' : ''}
          `.trim());
        }
      });
    }
    
    return sections.join('\n\n');
  }
}

/**
 * Integration function for agentic-rag-v3
 */
export async function enhancedKnowledgeSearch(
  query: string,
  metadata: any,
  supabaseUrl: string,
  supabaseKey: string
): Promise<string> {
  const kbSearch = new KnowledgeBaseSearch(supabaseUrl, supabaseKey);
  
  // Configure search options based on query type
  const options: KnowledgeSearchOptions = {
    useRegimeFallback: true, // Always use fallback for regime data
    useQAKnowledge: true, // Always include QA knowledge
    includeHierarchical: true, // Include hierarchical legal documents
    maxResults: 10
  };
  
  // Perform smart search
  const results = await kbSearch.smartSearch(query, metadata, options);
  
  // Format results for synthesis
  const formattedContext = kbSearch.formatResultsForSynthesis(results);
  
  return formattedContext;
}