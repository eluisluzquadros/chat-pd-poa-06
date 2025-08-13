import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface LegalReference {
  type: string;
  law: string;
  number: string;
  text?: string;
}

interface KnowledgeGraphNode {
  id: string;
  label: string;
  type: string;
  properties: any;
}

interface KnowledgeGraphRelation {
  source: string;
  target: string;
  type: string;
  weight: number;
}

/**
 * Legal Specialist Agent
 * Especializado em análise de documentação jurídica, citações de artigos e Knowledge Graph legal
 */
class LegalSpecialistAgent {
  
  /**
   * Process legal query
   */
  async process(query: string, context: any) {
    console.log('⚖️ Legal Agent - Processing query:', query);
    
    try {
      // 1. Extract legal references from query
      const legalRefs = this.extractLegalReferences(query);
      console.log('📜 Legal references found:', legalRefs);
      
      // 2. Search Knowledge Graph for legal concepts
      const graphResults = await this.searchKnowledgeGraph(legalRefs, query);
      console.log('🔗 Knowledge Graph results:', graphResults.nodes.length, 'nodes');
      
      // 3. Search hierarchical chunks for articles
      const articleResults = await this.searchArticles(legalRefs, query);
      console.log('📚 Article search results:', articleResults.length);
      
      // 4. Find cross-references
      const crossRefs = await this.findCrossReferences(articleResults);
      console.log('🔄 Cross-references found:', crossRefs.length);
      
      // 5. Validate citations
      const validated = await this.validateCitations(legalRefs, articleResults, graphResults);
      console.log('✅ Validated citations:', validated.validCitations.length);
      
      // 6. Calculate confidence
      const confidence = this.calculateConfidence(validated, graphResults, articleResults);
      
      return {
        type: 'legal',
        confidence,
        data: {
          articles: validated.validCitations,
          laws: this.extractLaws(legalRefs),
          concepts: graphResults.concepts,
          relationships: graphResults.relationships,
          crossReferences: crossRefs,
          definitions: await this.extractDefinitions(articleResults)
        },
        metadata: {
          totalReferences: legalRefs.length,
          validatedReferences: validated.validCitations.length,
          graphNodes: graphResults.nodes.length,
          searchStrategy: 'hierarchical+knowledge_graph'
        }
      };
      
    } catch (error) {
      console.error('❌ Legal Agent error:', error);
      return {
        type: 'legal',
        confidence: 0,
        data: {
          articles: [],
          laws: [],
          concepts: [],
          error: error.message
        }
      };
    }
  }
  
  /**
   * Extract legal references from query text
   */
  private extractLegalReferences(query: string): LegalReference[] {
    const references: LegalReference[] = [];
    
    // Pattern for articles (Art. 89, artigo 89, etc.)
    const articlePattern = /(?:artigo|art\.?)\s*(\d+)(?:\s*(?:da|do)\s*(LUOS|PDUS))?/gi;
    let match;
    
    while ((match = articlePattern.exec(query)) !== null) {
      references.push({
        type: 'article',
        law: match[2] || 'unknown',
        number: match[1],
        text: match[0]
      });
    }
    
    // Pattern for laws (LUOS, PDUS)
    const lawPattern = /(LUOS|PDUS)(?:\s*(?:de)?\s*(\d{4}))?/gi;
    while ((match = lawPattern.exec(query)) !== null) {
      // Only add if not already captured as part of article reference
      if (!references.some(r => r.text && r.text.includes(match[0]))) {
        references.push({
          type: 'law',
          law: match[1],
          number: match[2] || '2025',
          text: match[0]
        });
      }
    }
    
    // Pattern for paragraphs (§ 1º, parágrafo único)
    const paragraphPattern = /(?:§|parágrafo)\s*(\d+|único)/gi;
    while ((match = paragraphPattern.exec(query)) !== null) {
      references.push({
        type: 'paragraph',
        law: 'contextual',
        number: match[1],
        text: match[0]
      });
    }
    
    // Pattern for incisos (inciso I, II, III)
    const incisoPattern = /inciso\s+([IVXLCDM]+|\d+)/gi;
    while ((match = incisoPattern.exec(query)) !== null) {
      references.push({
        type: 'inciso',
        law: 'contextual',
        number: match[1],
        text: match[0]
      });
    }
    
    return references;
  }
  
  /**
   * Search Knowledge Graph for legal concepts
   */
  private async searchKnowledgeGraph(legalRefs: LegalReference[], query: string) {
    const nodes: KnowledgeGraphNode[] = [];
    const relationships: KnowledgeGraphRelation[] = [];
    const concepts: string[] = [];
    
    // Search for article nodes in Knowledge Graph
    for (const ref of legalRefs) {
      if (ref.type === 'article') {
        const label = `${ref.law} - Art. ${ref.number}`;
        
        // Find node
        const { data: node } = await supabase
          .from('knowledge_graph_nodes')
          .select('*')
          .eq('label', label)
          .single();
        
        if (node) {
          nodes.push(node);
          
          // Find relationships
          const { data: edges } = await supabase
            .from('knowledge_graph_edges')
            .select(`
              *,
              target:target_id (
                label,
                node_type,
                properties
              )
            `)
            .eq('source_id', node.id);
          
          if (edges) {
            edges.forEach((edge: any) => {
              relationships.push({
                source: node.label,
                target: edge.target.label,
                type: edge.relationship_type,
                weight: edge.weight
              });
              
              // Extract concepts
              if (edge.target.node_type === 'concept') {
                concepts.push(edge.target.label);
              }
            });
          }
        }
      }
    }
    
    // Search for concept nodes mentioned in query
    const conceptKeywords = ['EIV', 'ZEIS', 'APP', 'Outorga Onerosa', 'CMDUA', 'HIS'];
    for (const keyword of conceptKeywords) {
      if (query.toLowerCase().includes(keyword.toLowerCase())) {
        const { data: conceptNode } = await supabase
          .from('knowledge_graph_nodes')
          .select('*')
          .eq('label', keyword)
          .single();
        
        if (conceptNode) {
          nodes.push(conceptNode);
          concepts.push(keyword);
          
          // Find which articles define this concept
          const { data: definingEdges } = await supabase
            .from('knowledge_graph_edges')
            .select(`
              *,
              source:source_id (
                label,
                node_type
              )
            `)
            .eq('target_id', conceptNode.id)
            .eq('relationship_type', 'DEFINES');
          
          if (definingEdges) {
            definingEdges.forEach((edge: any) => {
              relationships.push({
                source: edge.source.label,
                target: conceptNode.label,
                type: 'DEFINES',
                weight: edge.weight
              });
            });
          }
        }
      }
    }
    
    return { nodes, relationships, concepts };
  }
  
  /**
   * Search hierarchical chunks for articles
   */
  private async searchArticles(legalRefs: LegalReference[], query: string) {
    const articles = [];
    
    // Search for specific articles
    for (const ref of legalRefs) {
      if (ref.type === 'article') {
        const { data: chunks } = await supabase
          .from('legal_document_chunks')
          .select('*')
          .eq('level_type', 'artigo')
          .eq('numero_artigo', parseInt(ref.number));
        
        if (chunks) {
          for (const chunk of chunks) {
            // Get full context (parent sections)
            const { data: context } = await supabase
              .rpc('get_hierarchical_context', { chunk_id: chunk.id });
            
            articles.push({
              ...chunk,
              context,
              law: ref.law
            });
          }
        }
      }
    }
    
    // If no specific articles, search by content
    if (articles.length === 0 && query.length > 10) {
      const { data: searchResults } = await supabase
        .from('legal_document_chunks')
        .select('*')
        .eq('level_type', 'artigo')
        .textSearch('content', query)
        .limit(5);
      
      if (searchResults) {
        articles.push(...searchResults);
      }
    }
    
    return articles;
  }
  
  /**
   * Find cross-references between articles
   */
  private async findCrossReferences(articles: any[]) {
    const crossRefs = [];
    
    for (const article of articles) {
      const { data: refs } = await supabase
        .from('chunk_cross_references')
        .select(`
          *,
          target:target_chunk_id (
            numero_artigo,
            title,
            content
          )
        `)
        .eq('source_chunk_id', article.id);
      
      if (refs) {
        refs.forEach((ref: any) => {
          crossRefs.push({
            source: `Art. ${article.numero_artigo}`,
            target: `Art. ${ref.target.numero_artigo}`,
            type: ref.reference_type,
            text: ref.reference_text
          });
        });
      }
    }
    
    return crossRefs;
  }
  
  /**
   * Validate citations against Knowledge Graph and chunks
   */
  private async validateCitations(
    legalRefs: LegalReference[], 
    articles: any[], 
    graphResults: any
  ) {
    const validCitations: string[] = [];
    const invalidCitations: string[] = [];
    
    for (const ref of legalRefs) {
      if (ref.type === 'article') {
        const citation = `${ref.law} - Art. ${ref.number}`;
        
        // Check if exists in articles found
        const existsInChunks = articles.some(a => 
          a.numero_artigo === parseInt(ref.number)
        );
        
        // Check if exists in Knowledge Graph
        const existsInGraph = graphResults.nodes.some((n: any) => 
          n.label === citation
        );
        
        if (existsInChunks || existsInGraph) {
          validCitations.push(citation);
        } else {
          invalidCitations.push(citation);
        }
      }
    }
    
    return { validCitations, invalidCitations };
  }
  
  /**
   * Extract definitions from articles
   */
  private async extractDefinitions(articles: any[]) {
    const definitions: any = {};
    
    for (const article of articles) {
      // Look for definition patterns
      const definePattern = /(?:define-se|entende-se|considera-se|é)\s+(.+?)(?:\.|;|:)/gi;
      const matches = article.content?.matchAll(definePattern);
      
      if (matches) {
        for (const match of matches) {
          const term = this.extractDefinedTerm(match[0]);
          if (term) {
            definitions[term] = {
              article: `Art. ${article.numero_artigo}`,
              text: match[0],
              fullContext: article.content
            };
          }
        }
      }
    }
    
    return definitions;
  }
  
  /**
   * Extract defined term from definition text
   */
  private extractDefinedTerm(text: string): string | null {
    // Extract the term being defined
    const patterns = [
      /por\s+"([^"]+)"/,
      /por\s+([A-Z][A-Za-z\s]+?)(?:\s+entende-se|\s+define-se)/,
      /^([A-Z][A-Za-z\s]+?):\s*/
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    return null;
  }
  
  /**
   * Extract laws mentioned
   */
  private extractLaws(legalRefs: LegalReference[]): string[] {
    const laws = new Set<string>();
    
    legalRefs.forEach(ref => {
      if (ref.law && ref.law !== 'unknown' && ref.law !== 'contextual') {
        laws.add(ref.law);
      }
    });
    
    return Array.from(laws);
  }
  
  /**
   * Calculate confidence score
   */
  private calculateConfidence(validated: any, graphResults: any, articles: any[]): number {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence based on validation
    if (validated.validCitations.length > 0) {
      confidence += 0.2 * (validated.validCitations.length / (validated.validCitations.length + validated.invalidCitations.length));
    }
    
    // Increase confidence if found in Knowledge Graph
    if (graphResults.nodes.length > 0) {
      confidence += 0.15;
    }
    
    // Increase confidence if found relationships
    if (graphResults.relationships.length > 0) {
      confidence += 0.1;
    }
    
    // Increase confidence if found articles with context
    if (articles.length > 0) {
      confidence += 0.15;
      if (articles.some(a => a.context?.length > 1)) {
        confidence += 0.1; // Extra for hierarchical context
      }
    }
    
    return Math.min(confidence, 1.0);
  }
}

// Main handler
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, context } = await req.json();
    
    if (!query) {
      throw new Error('Query is required');
    }
    
    const agent = new LegalSpecialistAgent();
    const result = await agent.process(query, context || {});
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Legal Agent error:', error);
    
    return new Response(JSON.stringify({
      type: 'legal',
      confidence: 0,
      data: {
        error: error.message
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});