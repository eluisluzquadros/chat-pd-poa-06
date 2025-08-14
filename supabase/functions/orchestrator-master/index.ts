import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// Multi-LLM support
const SUPPORTED_MODELS = [
  // OpenAI
  'gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-4o', 'gpt-4o-mini',
  // Anthropic
  'anthropic/claude-3-5-sonnet-20241022', 'anthropic/claude-3-5-haiku-20241022', 'anthropic/claude-3-opus-20240229',
  // Google
  'google/gemini-1.5-pro', 'google/gemini-1.5-flash', 'google/gemini-1.5-flash-8b',
  // DeepSeek
  'deepseek/deepseek-chat', 'deepseek/deepseek-coder',
  // Groq
  'groq/llama-3.1-70b-versatile', 'groq/mixtral-8x7b-32768',
  // ZhipuAI
  'zhipuai/glm-4-plus', 'zhipuai/glm-4-0520', 'zhipuai/glm-4-long', 'zhipuai/glm-4-air', 'zhipuai/glm-4-airx', 'zhipuai/glm-4-flash'
];

function validateModel(model: string): string {
  if (!model) return 'gpt-3.5-turbo';
  
  // Check if model is supported
  const isSupported = SUPPORTED_MODELS.some(supportedModel => 
    model === supportedModel || supportedModel.includes(model)
  );
  
  return isSupported ? model : 'gpt-3.5-turbo';
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface AgentResult {
  type: string;
  confidence: number;
  data: any;
  metadata?: any;
}

interface ValidationResult {
  isValid: boolean;
  confidence: number;
  issues: string[];
  requiresRefinement: boolean;
}

class MasterOrchestrator {
  private sessionMemory: Map<string, any[]> = new Map();
  
  /**
   * Main query processing pipeline
   */
  async processQuery(query: string, sessionId: string, options: any = {}) {
    console.log('🎯 Master Orchestrator - Processing query:', { query, sessionId });
    
    try {
      // 1. Context Analysis
      const context = await this.analyzeContext(query, sessionId);
      context.originalQuery = query; // Add original query for synthesis
      console.log('📊 Context analysis:', context);
      
      // 2. Intelligent Routing
      const routing = this.decideRouting(context);
      console.log('🔀 Routing decision:', routing);
      
      // 3. Parallel Agent Execution
      const agentResults = await this.executeAgents(routing, query, context);
      console.log('🤖 Agent results:', agentResults.length, 'agents responded');
      
      // 4. Multi-criteria Reranking
      const ranked = await this.rerank(agentResults, context);
      console.log('📈 Reranked results');
      
      // 5. Validation
      const validation = await this.validate(ranked);
      console.log('✅ Validation:', validation);
      
      // 6. Refinement Loop if needed
      if (validation.requiresRefinement && !options.skipRefinement) {
        console.log('🔄 Refinement required');
        return await this.refine(query, validation, context, sessionId, options);
      }
      
      // 7. Final Synthesis with multi-LLM support
      const response = await this.synthesize(ranked, validation, context, options);
      
      // 8. Store in session memory
      await this.storeInMemory(sessionId, query, context, agentResults, response);
      
      return {
        response: response.text,
        confidence: validation.confidence,
        metadata: {
          agents_used: routing.map(r => r.agent),
          validation: validation,
          context: context,
          refined: false
        }
      };
      
    } catch (error) {
      console.error('❌ Orchestrator error:', error);
      throw error;
    }
  }
  
  /**
   * Analyze query context and intent
   */
  private async analyzeContext(query: string, sessionId: string) {
    // Get session history
    const history = await this.getSessionHistory(sessionId);
    
    // Enhanced legal concepts recognition
    const legalConcepts = [
      'eiv', 'estudo de impacto', 'impacto de vizinhança',
      'zeis', 'zonas especiais', 'interesse social',
      'outorga onerosa', 'direito de construir',
      'coeficiente de aproveitamento', 'coeficiente',
      'taxa de ocupação', 'taxa de permeabilidade',
      'app', 'área de preservação', 'preservação permanente',
      'zone', 'zoneamento', 'uso do solo',
      'plano diretor', 'política urbana'
    ];
    
    // Enhanced location recognition
    const locationTerms = [
      'bairro', 'zona', 'zot', 'centro', 'distrito',
      'boa vista', 'centro histórico', 'restinga',
      'cidade baixa', 'moinhos de vento', 'ipanema'
    ];
    
    // Enhanced parameter recognition
    const parameterTerms = [
      'altura', 'coeficiente', 'taxa', 'regime', 'parâmetro',
      'máxima', 'mínima', 'permitida', 'gabarito',
      'aproveitamento', 'ocupação', 'permeabilidade'
    ];
    
    const queryLower = query.toLowerCase();
    
    // Extract entities and intent
    const analysis = {
      hasLegalReferences: /(?:artigo|art\.?)\s*\d+|(?:luos|pdus)/i.test(query) || 
                         legalConcepts.some(concept => queryLower.includes(concept)),
      hasLocationReferences: locationTerms.some(term => queryLower.includes(term)),
      hasParameterQueries: parameterTerms.some(param => queryLower.includes(param)),
      needsConceptualExplanation: /(?:o que é|como funciona|explique|defina|onde|qual)/i.test(query),
      requiresCalculation: /(?:calcular|quanto|valor|total)/i.test(query),
      
      // Extracted entities
      entities: this.extractEntities(query),
      
      // Session context
      previousTopics: history.map(h => h.topics).flat(),
      clarifications: history.filter(h => h.needsClarification).length > 0,
      
      // Query complexity
      complexity: this.assessComplexity(query),
      
      // Temporal context
      temporal: this.extractTemporalContext(query)
    };
    
    return analysis;
  }
  
  /**
   * Decide which agents to invoke based on context
   */
  private decideRouting(context: any): Array<{agent: string, priority: string}> {
    const routing = [];
    
    // Always include validator
    routing.push({ agent: 'validator', priority: 'critical' });
    
    // Route based on context analysis
    if (context.hasLegalReferences) {
      routing.push({ agent: 'legal', priority: 'high' });
    }
    
    if (context.hasLocationReferences || context.hasParameterQueries) {
      routing.push({ agent: 'urban', priority: 'high' });
      routing.push({ agent: 'geographic', priority: 'medium' });
    }
    
    if (context.needsConceptualExplanation) {
      routing.push({ agent: 'conceptual', priority: 'medium' });
    }
    
    if (context.requiresCalculation) {
      routing.push({ agent: 'calculator', priority: 'high' });
    }
    
    // Add knowledge graph agent for complex queries
    if (context.complexity === 'high' || routing.length > 3) {
      routing.push({ agent: 'knowledge_graph', priority: 'high' });
    }
    
    return routing;
  }
  
  /**
   * Execute agents in parallel
   */
  private async executeAgents(routing: any[], query: string, context: any): Promise<AgentResult[]> {
    const agentPromises = routing.map(async (route) => {
      try {
        const result = await this.callAgent(route.agent, query, context);
        return {
          ...result,
          priority: route.priority
        };
      } catch (error) {
        console.error(`Agent ${route.agent} failed:`, error);
        return null;
      }
    });
    
    const results = await Promise.all(agentPromises);
    return results.filter(r => r !== null) as AgentResult[];
  }
  
  /**
   * Call specific agent
   */
  private async callAgent(agentType: string, query: string, context: any): Promise<AgentResult> {
    const agentUrl = `${supabaseUrl}/functions/v1/agent-${agentType}`;
    
    const response = await fetch(agentUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, context })
    });
    
    if (!response.ok) {
      // Fallback for agents not yet implemented
      return this.mockAgent(agentType, query, context);
    }
    
    return await response.json();
  }
  
  /**
   * Mock agent for testing (remove when real agents are deployed)
   */
  private mockAgent(agentType: string, query: string, context: any): AgentResult {
    switch (agentType) {
      case 'legal':
        return {
          type: 'legal',
          confidence: 0.8,
          data: {
            articles: context.hasLegalReferences ? ['LUOS - Art. 89', 'PDUS - Art. 92'] : [],
            laws: ['LUOS', 'PDUS'],
            concepts: ['EIV', 'ZEIS']
          }
        };
      
      case 'urban':
        return {
          type: 'urban',
          confidence: 0.75,
          data: {
            zones: ['ZOT 08.1'],
            parameters: {
              altura_maxima: 130,
              coef_aproveitamento: 2.0
            }
          }
        };
      
      case 'validator':
        return {
          type: 'validator',
          confidence: 0.9,
          data: {
            valid: true,
            issues: []
          }
        };
      
      case 'knowledge_graph':
        return {
          type: 'knowledge_graph',
          confidence: 0.85,
          data: {
            nodes: ['EIV', 'LUOS - Art. 89'],
            relationships: [{ source: 'LUOS - Art. 89', target: 'EIV', type: 'DEFINES' }]
          }
        };
      
      default:
        return {
          type: agentType,
          confidence: 0.5,
          data: {}
        };
    }
  }
  
  /**
   * Rerank results using multiple criteria
   */
  private async rerank(results: AgentResult[], context: any): Promise<AgentResult[]> {
    const weights = {
      confidence: 0.25,
      priority: 0.20,
      relevance: 0.25,
      completeness: 0.15,
      authority: 0.15
    };
    
    const scored = results.map(result => {
      const scores = {
        confidence: result.confidence,
        priority: result.priority === 'critical' ? 1.0 : result.priority === 'high' ? 0.8 : 0.5,
        relevance: this.calculateRelevance(result, context),
        completeness: this.calculateCompleteness(result),
        authority: result.type === 'legal' || result.type === 'knowledge_graph' ? 0.9 : 0.7
      };
      
      const finalScore = Object.entries(scores).reduce(
        (sum, [criterion, score]) => sum + score * weights[criterion as keyof typeof weights],
        0
      );
      
      return {
        ...result,
        scores,
        finalScore
      };
    });
    
    return scored.sort((a, b) => b.finalScore - a.finalScore);
  }
  
  /**
   * Validate results
   */
  private async validate(results: AgentResult[]): Promise<ValidationResult> {
    const validatorResult = results.find(r => r.type === 'validator');
    const issues: string[] = [];
    
    // Check for contradictions
    const legalResults = results.filter(r => r.type === 'legal');
    if (legalResults.length > 1) {
      const articles = legalResults.map(r => r.data.articles).flat();
      const uniqueArticles = [...new Set(articles)];
      if (articles.length !== uniqueArticles.length) {
        issues.push('Duplicate article citations detected');
      }
    }
    
    // Check completeness
    if (results.length === 0) {
      issues.push('No agent results available');
    }
    
    // Calculate overall confidence
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / (results.length || 1);
    
    return {
      isValid: issues.length === 0,
      confidence: avgConfidence,
      issues,
      requiresRefinement: avgConfidence < 0.7 || issues.length > 0
    };
  }
  
  /**
   * Refine results if validation fails
   */
  private async refine(query: string, validation: ValidationResult, context: any, sessionId: string, options: any = {}) {
    console.log('🔄 Starting refinement process');
    
    // Add validation feedback to context
    const refinedContext = {
      ...context,
      validationIssues: validation.issues,
      previousConfidence: validation.confidence,
      refinementRound: 1
    };
    
    // Re-process with additional agents or modified routing
    const additionalRouting = [
      { agent: 'knowledge_graph', priority: 'critical' },
      { agent: 'legal', priority: 'critical' }
    ];
    
    const refinedResults = await this.executeAgents(additionalRouting, query, refinedContext);
    const reranked = await this.rerank(refinedResults, refinedContext);
    const revalidation = await this.validate(reranked);
    
    const response = await this.synthesize(reranked, revalidation, refinedContext, options);
    
    return {
      response: response.text,
      confidence: revalidation.confidence,
      metadata: {
        agents_used: additionalRouting.map(r => r.agent),
        validation: revalidation,
        context: refinedContext,
        refined: true
      }
    };
  }
  
  /**
   * Synthesize final response using multi-LLM response-synthesizer
   */
  private async synthesize(results: AgentResult[], validation: ValidationResult, context: any, options: any = {}) {
    // Try to use external response-synthesizer with multi-LLM support
    try {
      const synthesizerUrl = `${supabaseUrl}/functions/v1/response-synthesizer`;
      
      // Format agent results for synthesizer
      const combinedData = {
        legal: results.filter(r => r.type === 'legal').map(r => r.data),
        urban: results.filter(r => r.type === 'urban').map(r => r.data),
        conceptual: results.filter(r => r.type === 'conceptual').map(r => r.data),
        knowledge_graph: results.filter(r => r.type === 'knowledge_graph').map(r => r.data)
      };
      
      const response = await fetch(synthesizerUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalQuery: context.originalQuery || 'Query via Agentic-RAG',
          analysisResult: { strategy: 'agentic' },
          sqlResults: combinedData.urban,
          vectorResults: combinedData.legal,
          model: options.model || 'gpt-3.5-turbo',
          agentResults: results,
          validation: validation
        })
      });
      
      if (response.ok) {
        const synthResult = await response.json();
        console.log('✅ Multi-LLM synthesis successful');
        return {
          text: synthResult.response,
          confidence: synthResult.confidence,
          sources: results.map(r => r.type),
          model: options.model
        };
      }
    } catch (error) {
      console.warn('⚠️ Multi-LLM synthesis failed, using fallback:', error.message);
    }
    
    // Fallback to basic synthesis
    const combinedData = {
      legal: results.filter(r => r.type === 'legal').map(r => r.data),
      urban: results.filter(r => r.type === 'urban').map(r => r.data),
      conceptual: results.filter(r => r.type === 'conceptual').map(r => r.data),
      knowledge_graph: results.filter(r => r.type === 'knowledge_graph').map(r => r.data)
    };
    
    // Build response based on agent data
    let responseText = '';
    
    // Add legal citations if available
    if (combinedData.legal.length > 0 && combinedData.legal[0].articles?.length > 0) {
      const articles = combinedData.legal[0].articles;
      responseText += `De acordo com a legislação: ${articles.join(', ')}.\n\n`;
    }
    
    // Add knowledge graph relationships
    if (combinedData.knowledge_graph.length > 0 && combinedData.knowledge_graph[0].relationships) {
      const relationships = combinedData.knowledge_graph[0].relationships;
      relationships.forEach((rel: any) => {
        responseText += `${rel.source} ${rel.type.toLowerCase()} ${rel.target}.\n`;
      });
    }
    
    // Add confidence disclaimer if low
    if (validation.confidence < 0.7) {
      responseText += '\n⚠️ Nota: Esta resposta tem confiança moderada. Recomenda-se verificação adicional.';
    }
    
    return {
      text: responseText || 'Não foi possível processar sua solicitação. Por favor, reformule a pergunta.',
      confidence: validation.confidence,
      sources: results.map(r => r.type)
    };
  }
  
  /**
   * Helper: Extract entities from query
   */
  private extractEntities(query: string) {
    const entities: any = {};
    
    // Extract article numbers
    const articleMatches = query.match(/(?:artigo|art\.?)\s*(\d+)/gi);
    if (articleMatches) {
      entities.articles = articleMatches.map(m => m.match(/\d+/)?.[0]).filter(Boolean);
    }
    
    // Extract neighborhoods
    const neighborhoods = ['Centro Histórico', 'Boa Vista', 'Três Figueiras', 'Mário Quintana'];
    neighborhoods.forEach(n => {
      if (query.toLowerCase().includes(n.toLowerCase())) {
        entities.neighborhood = n;
      }
    });
    
    // Extract zones
    const zoneMatch = query.match(/ZOT\s*[\d.]+/i);
    if (zoneMatch) {
      entities.zone = zoneMatch[0];
    }
    
    return entities;
  }
  
  /**
   * Helper: Assess query complexity
   */
  private assessComplexity(query: string): 'low' | 'medium' | 'high' {
    const wordCount = query.split(/\s+/).length;
    const hasMultipleTopics = /\se\s|\sou\s|,/i.test(query);
    const hasComparison = /(?:diferença|comparar|versus|melhor)/i.test(query);
    
    if (wordCount > 30 || hasComparison) return 'high';
    if (wordCount > 15 || hasMultipleTopics) return 'medium';
    return 'low';
  }
  
  /**
   * Helper: Extract temporal context
   */
  private extractTemporalContext(query: string) {
    const temporal: any = {};
    
    if (/(?:novo|nova|atual|2025)/i.test(query)) {
      temporal.version = '2025';
    }
    
    if (/(?:antes|anterior|antigo|2024)/i.test(query)) {
      temporal.version = '2024';
    }
    
    if (/(?:mudança|alteração|diferença)/i.test(query)) {
      temporal.comparison = true;
    }
    
    return temporal;
  }
  
  /**
   * Helper: Calculate relevance score
   */
  private calculateRelevance(result: AgentResult, context: any): number {
    let score = 0.5;
    
    // Check if agent type matches context needs
    if (result.type === 'legal' && context.hasLegalReferences) score += 0.3;
    if (result.type === 'urban' && context.hasLocationReferences) score += 0.3;
    if (result.type === 'conceptual' && context.needsConceptualExplanation) score += 0.2;
    
    // Check if data contains requested entities
    if (context.entities.articles && result.data.articles) {
      const matchingArticles = result.data.articles.filter((a: string) => 
        context.entities.articles.some((ea: string) => a.includes(ea))
      );
      if (matchingArticles.length > 0) score += 0.2;
    }
    
    return Math.min(score, 1.0);
  }
  
  /**
   * Helper: Calculate completeness score
   */
  private calculateCompleteness(result: AgentResult): number {
    let score = 0.5;
    
    // Check data completeness
    if (result.data) {
      const dataKeys = Object.keys(result.data);
      if (dataKeys.length > 3) score += 0.3;
      if (dataKeys.length > 5) score += 0.2;
      
      // Check for empty values
      const hasEmptyValues = Object.values(result.data).some(v => 
        v === null || v === undefined || (Array.isArray(v) && v.length === 0)
      );
      if (!hasEmptyValues) score += 0.2;
    }
    
    return Math.min(score, 1.0);
  }
  
  /**
   * Get session history from database
   */
  private async getSessionHistory(sessionId: string, limit: number = 5) {
    const { data, error } = await supabase
      .from('session_memory')
      .select('*')
      .eq('session_id', sessionId)
      .order('turn_number', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching session history:', error);
      return [];
    }
    
    return data || [];
  }
  
  /**
   * Store interaction in session memory
   */
  private async storeInMemory(
    sessionId: string, 
    query: string, 
    context: any, 
    agentResults: AgentResult[], 
    response: any
  ) {
    // Get next turn number
    const { data: lastTurn } = await supabase
      .from('session_memory')
      .select('turn_number')
      .eq('session_id', sessionId)
      .order('turn_number', { ascending: false })
      .limit(1)
      .single();
    
    const turnNumber = (lastTurn?.turn_number || 0) + 1;
    
    // Store in database
    const { error } = await supabase
      .from('session_memory')
      .insert({
        session_id: sessionId,
        turn_number: turnNumber,
        query,
        context,
        agent_results: agentResults,
        response: response.text,
        confidence: response.confidence,
        metadata: {
          agents_used: agentResults.map(r => r.type),
          timestamp: new Date().toISOString()
        }
      });
    
    if (error) {
      console.error('Error storing session memory:', error);
    }
  }
}

// Main handler
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, sessionId, options, model } = await req.json();
    
    if (!query) {
      throw new Error('Query is required');
    }
    
    // Validate and set model for multi-LLM support
    const validatedModel = validateModel(model || options?.model || 'gpt-3.5-turbo');
    console.log(`🎯 Using validated model: ${validatedModel}`);
    
    const processedOptions = {
      ...options,
      model: validatedModel
    };
    
    const orchestrator = new MasterOrchestrator();
    const result = await orchestrator.processQuery(
      query,
      sessionId || `session_${Date.now()}`,
      processedOptions
    );
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Orchestrator error:', error);
    
    return new Response(JSON.stringify({
      error: error.message,
      response: 'Desculpe, ocorreu um erro ao processar sua solicitação.',
      confidence: 0
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});