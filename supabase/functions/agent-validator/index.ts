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

interface ValidationCheck {
  category: string;
  passed: boolean;
  confidence: number;
  issues: string[];
  suggestions?: string[];
}

interface AgentResult {
  type: string;
  confidence: number;
  data: any;
}

/**
 * Validation and Self-Correction Agent
 * Valida respostas, detecta erros e sugere correções
 */
class ValidationAgent {
  
  /**
   * Validate agent results
   */
  async process(agentResults: AgentResult[], query: string, context: any) {
    console.log('✅ Validation Agent - Processing', agentResults.length, 'results');
    
    try {
      const checks: ValidationCheck[] = [];
      
      // 1. Validate legal citations
      if (this.hasLegalResults(agentResults)) {
        const legalCheck = await this.validateLegalCitations(agentResults);
        checks.push(legalCheck);
      }
      
      // 2. Validate numeric data
      if (this.hasNumericData(agentResults)) {
        const numericCheck = await this.validateNumericData(agentResults);
        checks.push(numericCheck);
      }
      
      // 3. Check consistency between agents
      const consistencyCheck = await this.checkConsistency(agentResults);
      checks.push(consistencyCheck);
      
      // 4. Detect contradictions
      const contradictionCheck = await this.detectContradictions(agentResults);
      checks.push(contradictionCheck);
      
      // 5. Check completeness
      const completenessCheck = this.checkCompleteness(agentResults, query);
      checks.push(completenessCheck);
      
      // 6. Validate against Knowledge Graph
      const kgValidation = await this.validateAgainstKnowledgeGraph(agentResults);
      checks.push(kgValidation);
      
      // 7. Check ambiguity
      const ambiguityCheck = this.checkAmbiguity(agentResults, context);
      checks.push(ambiguityCheck);
      
      // Calculate overall validation
      const overallValidation = this.calculateOverallValidation(checks);
      
      // Generate correction suggestions if needed
      const corrections = this.generateCorrections(checks, agentResults);
      
      return {
        type: 'validator',
        confidence: overallValidation.confidence,
        data: {
          valid: overallValidation.isValid,
          confidence: overallValidation.confidence,
          checks,
          issues: overallValidation.issues,
          requiresRefinement: overallValidation.requiresRefinement,
          corrections,
          summary: this.generateValidationSummary(checks)
        },
        metadata: {
          totalChecks: checks.length,
          passedChecks: checks.filter(c => c.passed).length,
          criticalIssues: overallValidation.issues.filter(i => i.includes('CRÍTICO')).length
        }
      };
      
    } catch (error) {
      console.error('❌ Validation Agent error:', error);
      return {
        type: 'validator',
        confidence: 0,
        data: {
          valid: false,
          error: error.message
        }
      };
    }
  }
  
  /**
   * Validate legal citations
   */
  private async validateLegalCitations(agentResults: AgentResult[]): Promise<ValidationCheck> {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let confidence = 1.0;
    
    // Get legal results
    const legalResults = agentResults.filter(r => r.type === 'legal');
    
    for (const result of legalResults) {
      if (result.data.articles && result.data.articles.length > 0) {
        for (const article of result.data.articles) {
          // Validate format
          if (!this.isValidArticleFormat(article)) {
            issues.push(`Formato inválido de artigo: ${article}`);
            suggestions.push(`Use o formato: "LEI - Art. NÚMERO"`);
            confidence -= 0.2;
          }
          
          // Check if article exists in Knowledge Graph
          const exists = await this.articleExistsInKG(article);
          if (!exists) {
            issues.push(`Artigo não encontrado no Knowledge Graph: ${article}`);
            suggestions.push(`Verificar se o artigo ${article} existe na legislação`);
            confidence -= 0.3;
          }
          
          // Validate article number range
          const articleNumber = this.extractArticleNumber(article);
          if (articleNumber) {
            if (article.includes('LUOS') && (articleNumber < 1 || articleNumber > 200)) {
              issues.push(`Número de artigo LUOS fora do range esperado: ${articleNumber}`);
              confidence -= 0.1;
            }
            if (article.includes('PDUS') && (articleNumber < 1 || articleNumber > 250)) {
              issues.push(`Número de artigo PDUS fora do range esperado: ${articleNumber}`);
              confidence -= 0.1;
            }
          }
        }
      }
    }
    
    // Check for common errors
    const hasEIVError = legalResults.some(r => 
      r.data.articles?.some((a: string) => a.includes('Art. 90') && !a.includes('Art. 89'))
    );
    if (hasEIVError) {
      issues.push('CRÍTICO: EIV está no Art. 89, não Art. 90');
      suggestions.push('Corrigir: EIV = LUOS - Art. 89');
      confidence = 0.2;
    }
    
    return {
      category: 'legal_citations',
      passed: issues.length === 0,
      confidence: Math.max(confidence, 0),
      issues,
      suggestions
    };
  }
  
  /**
   * Validate numeric data
   */
  private async validateNumericData(agentResults: AgentResult[]): Promise<ValidationCheck> {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let confidence = 1.0;
    
    // Get urban results
    const urbanResults = agentResults.filter(r => r.type === 'urban');
    
    for (const result of urbanResults) {
      if (result.data.parameters) {
        for (const param of result.data.parameters) {
          // Check altura máxima
          if (param.parameter === 'Altura Máxima') {
            if (param.value < 0 || param.value > 200) {
              issues.push(`Altura máxima suspeita: ${param.value}m`);
              suggestions.push('Verificar altura máxima no banco de dados');
              confidence -= 0.2;
            }
            
            // Known maximum heights
            if (param.zone === 'ZOT 08.1' && param.value !== 130) {
              issues.push(`Centro Histórico deveria ter 130m, não ${param.value}m`);
              confidence -= 0.3;
            }
          }
          
          // Check coefficients
          if (param.parameter.includes('Coeficiente')) {
            if (param.value < 0 || param.value > 10) {
              issues.push(`Coeficiente fora do range: ${param.value}`);
              confidence -= 0.2;
            }
            
            // Basic should be less than maximum
            const basic = result.data.parameters.find((p: any) => 
              p.parameter === 'Coeficiente de Aproveitamento Básico'
            );
            const max = result.data.parameters.find((p: any) => 
              p.parameter === 'Coeficiente de Aproveitamento Máximo'
            );
            
            if (basic && max && basic.value > max.value) {
              issues.push('CRÍTICO: Coeficiente básico maior que máximo');
              suggestions.push('Inverter valores de coeficiente básico e máximo');
              confidence = 0.1;
            }
          }
          
          // Check percentages
          if (param.unit === '%') {
            if (param.value < 0 || param.value > 1) {
              issues.push(`Percentual inválido: ${param.value}`);
              suggestions.push('Percentuais devem estar entre 0 e 1');
              confidence -= 0.2;
            }
          }
        }
      }
    }
    
    return {
      category: 'numeric_data',
      passed: issues.length === 0,
      confidence: Math.max(confidence, 0),
      issues,
      suggestions
    };
  }
  
  /**
   * Check consistency between agents
   */
  private async checkConsistency(agentResults: AgentResult[]): Promise<ValidationCheck> {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let confidence = 1.0;
    
    // Check if legal and urban agents agree on zones
    const legalData = agentResults.find(r => r.type === 'legal')?.data;
    const urbanData = agentResults.find(r => r.type === 'urban')?.data;
    
    if (legalData && urbanData) {
      // Check zone consistency
      if (urbanData.zones && legalData.concepts) {
        const hasZEIS = legalData.concepts.includes('ZEIS');
        const hasZEISZone = urbanData.zones.some((z: any) => z.label?.includes('ZEIS'));
        
        if (hasZEIS && !hasZEISZone) {
          issues.push('Inconsistência: ZEIS mencionado mas zona não identificada');
          confidence -= 0.2;
        }
      }
      
      // Check article references
      if (legalData.articles && urbanData.restrictions) {
        const hasEIVArticle = legalData.articles.some((a: string) => a.includes('89'));
        const hasEIVRestriction = urbanData.restrictions.some((r: any) => 
          r.description?.includes('EIV')
        );
        
        if (hasEIVArticle !== hasEIVRestriction) {
          issues.push('Inconsistência entre citação de EIV e restrições');
          confidence -= 0.15;
        }
      }
    }
    
    // Check confidence levels
    const confidences = agentResults.map(r => r.confidence);
    const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    const variance = confidences.reduce((sum, c) => sum + Math.pow(c - avgConfidence, 2), 0) / confidences.length;
    
    if (variance > 0.2) {
      issues.push('Alta variância na confiança entre agentes');
      suggestions.push('Revisar agentes com baixa confiança');
      confidence -= 0.1;
    }
    
    return {
      category: 'consistency',
      passed: issues.length === 0,
      confidence: Math.max(confidence, 0),
      issues,
      suggestions
    };
  }
  
  /**
   * Detect contradictions
   */
  private async detectContradictions(agentResults: AgentResult[]): Promise<ValidationCheck> {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let confidence = 1.0;
    
    // Check for contradictory heights
    const heights = new Map<string, number[]>();
    
    for (const result of agentResults) {
      if (result.data.parameters) {
        for (const param of result.data.parameters) {
          if (param.parameter === 'Altura Máxima' && param.zone) {
            if (!heights.has(param.zone)) {
              heights.set(param.zone, []);
            }
            heights.get(param.zone)!.push(param.value);
          }
        }
      }
    }
    
    // Check for different values for same zone
    for (const [zone, values] of heights.entries()) {
      const uniqueValues = [...new Set(values)];
      if (uniqueValues.length > 1) {
        issues.push(`CRÍTICO: Valores contraditórios para ${zone}: ${uniqueValues.join(', ')}`);
        suggestions.push(`Verificar valor correto para ${zone} no banco de dados`);
        confidence = 0.3;
      }
    }
    
    // Check for Boa Vista vs Boa Vista do Sul confusion
    const locations = agentResults
      .filter(r => r.type === 'urban')
      .flatMap(r => r.data.locations || []);
    
    const hasBoaVista = locations.some((l: any) => l.name === 'Boa Vista');
    const hasBoaVistaSul = locations.some((l: any) => l.name === 'Boa Vista do Sul');
    
    if (hasBoaVista && hasBoaVistaSul) {
      issues.push('CRÍTICO: Ambiguidade entre Boa Vista e Boa Vista do Sul');
      suggestions.push('Solicitar esclarecimento ao usuário sobre qual bairro');
      confidence = 0.4;
    }
    
    return {
      category: 'contradictions',
      passed: issues.length === 0,
      confidence: Math.max(confidence, 0),
      issues,
      suggestions
    };
  }
  
  /**
   * Check completeness
   */
  private checkCompleteness(agentResults: AgentResult[], query: string): ValidationCheck {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let confidence = 1.0;
    
    // Check if query asks for article but no legal agent responded
    if (/artigo|art\.|lei/i.test(query)) {
      const hasLegalResponse = agentResults.some(r => r.type === 'legal' && r.data.articles?.length > 0);
      if (!hasLegalResponse) {
        issues.push('Query sobre artigos mas sem resposta legal');
        suggestions.push('Ativar agente legal para buscar artigos');
        confidence -= 0.3;
      }
    }
    
    // Check if query asks for height/parameters but no urban agent responded
    if (/altura|coeficiente|taxa|parâmetro/i.test(query)) {
      const hasUrbanResponse = agentResults.some(r => r.type === 'urban' && r.data.parameters?.length > 0);
      if (!hasUrbanResponse) {
        issues.push('Query sobre parâmetros mas sem dados urbanísticos');
        suggestions.push('Ativar agente urbanístico para buscar parâmetros');
        confidence -= 0.3;
      }
    }
    
    // Check if any agent returned empty data
    const emptyResponses = agentResults.filter(r => 
      !r.data || 
      (Array.isArray(r.data) && r.data.length === 0) ||
      (typeof r.data === 'object' && Object.keys(r.data).length === 0)
    );
    
    if (emptyResponses.length > 0) {
      issues.push(`${emptyResponses.length} agentes retornaram dados vazios`);
      confidence -= 0.2 * emptyResponses.length;
    }
    
    return {
      category: 'completeness',
      passed: issues.length === 0,
      confidence: Math.max(confidence, 0),
      issues,
      suggestions
    };
  }
  
  /**
   * Validate against Knowledge Graph
   */
  private async validateAgainstKnowledgeGraph(agentResults: AgentResult[]): Promise<ValidationCheck> {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let confidence = 1.0;
    
    // Validate concepts mentioned
    const concepts = new Set<string>();
    
    for (const result of agentResults) {
      if (result.data.concepts) {
        result.data.concepts.forEach((c: string) => concepts.add(c));
      }
    }
    
    for (const concept of concepts) {
      const { data: node } = await supabase
        .from('knowledge_graph_nodes')
        .select('*')
        .eq('label', concept)
        .eq('node_type', 'concept')
        .single();
      
      if (!node) {
        issues.push(`Conceito não encontrado no KG: ${concept}`);
        confidence -= 0.1;
      }
    }
    
    // Validate relationships
    const relationships = agentResults
      .filter(r => r.data.relationships)
      .flatMap(r => r.data.relationships);
    
    for (const rel of relationships) {
      if (!this.isValidRelationshipType(rel.type)) {
        issues.push(`Tipo de relação inválido: ${rel.type}`);
        suggestions.push(`Use tipos válidos: DEFINES, REFERENCES, HAS_PARAMETER`);
        confidence -= 0.05;
      }
    }
    
    return {
      category: 'knowledge_graph',
      passed: issues.length === 0,
      confidence: Math.max(confidence, 0),
      issues,
      suggestions
    };
  }
  
  /**
   * Check for ambiguity
   */
  private checkAmbiguity(agentResults: AgentResult[], context: any): ValidationCheck {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let confidence = 1.0;
    
    // Check for ambiguous locations
    const locations = agentResults
      .filter(r => r.type === 'urban')
      .flatMap(r => r.data.locations || []);
    
    const ambiguousNames = [
      ['Boa Vista', 'Boa Vista do Sul'],
      ['Vila Nova', 'Vila Nova do Sul'],
      ['Santana', 'Sant\'Ana']
    ];
    
    for (const [name1, name2] of ambiguousNames) {
      const hasFirst = locations.some((l: any) => l.name === name1);
      const hasSecond = locations.some((l: any) => l.name === name2);
      
      if (hasFirst || hasSecond) {
        const found = hasFirst ? name1 : name2;
        issues.push(`Possível ambiguidade: ${found}`);
        suggestions.push(`Confirmar se é ${name1} ou ${name2}`);
        confidence -= 0.15;
      }
    }
    
    // Check for temporal ambiguity
    if (context?.temporal?.comparison) {
      const hasVersionInfo = agentResults.some(r => 
        r.data.version || r.metadata?.version
      );
      
      if (!hasVersionInfo) {
        issues.push('Comparação temporal solicitada mas sem informação de versão');
        suggestions.push('Especificar versão do Plano Diretor (2024 vs 2025)');
        confidence -= 0.2;
      }
    }
    
    return {
      category: 'ambiguity',
      passed: issues.length === 0,
      confidence: Math.max(confidence, 0),
      issues,
      suggestions
    };
  }
  
  /**
   * Calculate overall validation
   */
  private calculateOverallValidation(checks: ValidationCheck[]) {
    const allIssues = checks.flatMap(c => c.issues);
    const criticalIssues = allIssues.filter(i => i.includes('CRÍTICO'));
    
    const avgConfidence = checks.reduce((sum, c) => sum + c.confidence, 0) / checks.length;
    const allPassed = checks.every(c => c.passed);
    
    return {
      isValid: allPassed && criticalIssues.length === 0,
      confidence: avgConfidence,
      issues: allIssues,
      requiresRefinement: avgConfidence < 0.7 || criticalIssues.length > 0
    };
  }
  
  /**
   * Generate corrections
   */
  private generateCorrections(checks: ValidationCheck[], agentResults: AgentResult[]) {
    const corrections: any[] = [];
    
    // Generate corrections for each failed check
    for (const check of checks) {
      if (!check.passed && check.suggestions && check.suggestions.length > 0) {
        corrections.push({
          category: check.category,
          priority: check.issues.some(i => i.includes('CRÍTICO')) ? 'high' : 'medium',
          suggestions: check.suggestions,
          confidence: check.confidence
        });
      }
    }
    
    // Sort by priority
    corrections.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority as keyof typeof priorityOrder] - 
             priorityOrder[b.priority as keyof typeof priorityOrder];
    });
    
    return corrections;
  }
  
  /**
   * Generate validation summary
   */
  private generateValidationSummary(checks: ValidationCheck[]): string {
    const passed = checks.filter(c => c.passed).length;
    const total = checks.length;
    const avgConfidence = checks.reduce((sum, c) => sum + c.confidence, 0) / total;
    
    if (passed === total) {
      return `✅ Todas as ${total} validações passaram (confiança: ${(avgConfidence * 100).toFixed(0)}%)`;
    } else {
      const failed = total - passed;
      return `⚠️ ${failed} de ${total} validações falharam (confiança: ${(avgConfidence * 100).toFixed(0)}%)`;
    }
  }
  
  // Helper methods
  
  private hasLegalResults(results: AgentResult[]): boolean {
    return results.some(r => r.type === 'legal');
  }
  
  private hasNumericData(results: AgentResult[]): boolean {
    return results.some(r => r.data.parameters || r.data.metrics);
  }
  
  private isValidArticleFormat(article: string): boolean {
    return /^(LUOS|PDUS)\s*-\s*Art\.\s*\d+/.test(article);
  }
  
  private async articleExistsInKG(article: string): Promise<boolean> {
    const { data } = await supabase
      .from('knowledge_graph_nodes')
      .select('id')
      .eq('label', article)
      .eq('node_type', 'article')
      .single();
    
    return !!data;
  }
  
  private extractArticleNumber(article: string): number | null {
    const match = article.match(/Art\.\s*(\d+)/);
    return match ? parseInt(match[1]) : null;
  }
  
  private isValidRelationshipType(type: string): boolean {
    const validTypes = [
      'DEFINES', 'REFERENCES', 'BELONGS_TO', 'HAS_PARAMETER',
      'LOCATED_IN', 'MODIFIES', 'REVOKES', 'REGULATES',
      'CONTRADICTS', 'COMPLEMENTS', 'IMPLEMENTS'
    ];
    return validTypes.includes(type);
  }
}

// Main handler
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { agentResults, query, context } = await req.json();
    
    if (!agentResults || !Array.isArray(agentResults)) {
      throw new Error('Agent results array is required');
    }
    
    const validator = new ValidationAgent();
    const result = await validator.process(agentResults, query || '', context || {});
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Validation Agent error:', error);
    
    return new Response(JSON.stringify({
      type: 'validator',
      confidence: 0,
      data: {
        valid: false,
        error: error.message
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});