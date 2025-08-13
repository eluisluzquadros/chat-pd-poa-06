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

interface LocationEntity {
  type: 'bairro' | 'zona' | 'distrito';
  name: string;
  normalized: string;
}

interface UrbanParameter {
  parameter: string;
  value: any;
  unit?: string;
  zone?: string;
}

interface RegimeUrbanistico {
  bairro: string;
  zona: string;
  altura_maxima: number;
  coef_aproveitamento_basico: number;
  coef_aproveitamento_maximo: number;
  taxa_ocupacao: number;
  taxa_permeabilidade: number;
  recuo_frontal: number;
}

/**
 * Urban Planning Specialist Agent
 * Especializado em dados urbanísticos, zoneamento e parâmetros construtivos
 */
class UrbanPlanningAgent {
  
  /**
   * Process urban planning query
   */
  async process(query: string, context: any) {
    console.log('🏙️ Urban Agent - Processing query:', query);
    
    try {
      // 1. Extract location entities
      const locations = await this.extractLocations(query, context);
      console.log('📍 Locations identified:', locations);
      
      // 2. Query regime urbanístico
      const regimeData = await this.queryRegimeUrbanistico(locations);
      console.log('📊 Regime data found:', regimeData.length, 'records');
      
      // 3. Enrich with Knowledge Graph
      const enriched = await this.enrichWithKnowledgeGraph(regimeData);
      console.log('🔗 Enriched with KG');
      
      // 4. Calculate derived metrics
      const metrics = this.calculateUrbanMetrics(enriched);
      console.log('📈 Metrics calculated');
      
      // 5. Check restrictions and special conditions
      const restrictions = await this.checkRestrictions(locations, regimeData);
      console.log('⚠️ Restrictions found:', restrictions.length);
      
      // 6. Get disaster risk information
      const riskData = await this.getDisasterRisk(locations);
      console.log('🌊 Risk data retrieved');
      
      // 7. Calculate confidence
      const confidence = this.calculateConfidence(regimeData, enriched, locations);
      
      return {
        type: 'urban',
        confidence,
        data: {
          locations: locations.map(l => ({ type: l.type, name: l.name })),
          regime: regimeData,
          parameters: this.formatParameters(regimeData),
          metrics,
          restrictions,
          riskAreas: riskData,
          zones: enriched.zones,
          recommendations: this.generateRecommendations(regimeData, restrictions)
        },
        metadata: {
          locationsFound: locations.length,
          regimeRecords: regimeData.length,
          hasRestrictions: restrictions.length > 0,
          searchStrategy: 'structured_data+knowledge_graph'
        }
      };
      
    } catch (error) {
      console.error('❌ Urban Agent error:', error);
      return {
        type: 'urban',
        confidence: 0,
        data: {
          error: error.message
        }
      };
    }
  }
  
  /**
   * Extract location entities from query
   */
  private async extractLocations(query: string, context: any): Promise<LocationEntity[]> {
    const locations: LocationEntity[] = [];
    
    // Known neighborhoods
    const neighborhoods = [
      'Centro Histórico', 'Boa Vista', 'Boa Vista do Sul', 'Três Figueiras',
      'Mário Quintana', 'Cidade Baixa', 'Moinhos de Vento', 'Petrópolis',
      'Floresta', 'Santana', 'Azenha', 'Menino Deus', 'Praia de Belas'
    ];
    
    // Check for neighborhoods
    for (const neighborhood of neighborhoods) {
      if (query.toLowerCase().includes(neighborhood.toLowerCase())) {
        locations.push({
          type: 'bairro',
          name: neighborhood,
          normalized: this.normalizeLocation(neighborhood)
        });
      }
    }
    
    // Check for zones (ZOT)
    const zonePattern = /ZOT\s*([\d.]+)/gi;
    let zoneMatch;
    while ((zoneMatch = zonePattern.exec(query)) !== null) {
      locations.push({
        type: 'zona',
        name: `ZOT ${zoneMatch[1]}`,
        normalized: `ZOT_${zoneMatch[1].replace('.', '_')}`
      });
    }
    
    // Check for districts
    const districtPattern = /(\d+)[º°]?\s*distrito/gi;
    let districtMatch;
    while ((districtMatch = districtPattern.exec(query)) !== null) {
      locations.push({
        type: 'distrito',
        name: `${districtMatch[1]}º Distrito`,
        normalized: `DISTRITO_${districtMatch[1]}`
      });
    }
    
    // If no locations found, check context
    if (locations.length === 0 && context?.entities?.neighborhood) {
      locations.push({
        type: 'bairro',
        name: context.entities.neighborhood,
        normalized: this.normalizeLocation(context.entities.neighborhood)
      });
    }
    
    return locations;
  }
  
  /**
   * Query regime urbanístico for locations
   */
  private async queryRegimeUrbanistico(locations: LocationEntity[]): Promise<RegimeUrbanistico[]> {
    const results: RegimeUrbanistico[] = [];
    
    for (const location of locations) {
      let query;
      
      if (location.type === 'bairro') {
        // Query by neighborhood
        query = supabase
          .from('regime_urbanistico_completo')
          .select('*')
          .ilike('bairro', `%${location.name}%`);
      } else if (location.type === 'zona') {
        // Query by zone
        query = supabase
          .from('regime_urbanistico_completo')
          .select('*')
          .ilike('zona', `%${location.name}%`);
      } else {
        // Query by district (4º Distrito special case)
        if (location.name.includes('4')) {
          query = supabase
            .from('regime_urbanistico_completo')
            .select('*')
            .eq('zona', 'ZOT 09');
        } else {
          continue;
        }
      }
      
      const { data, error } = await query;
      
      if (data && !error) {
        results.push(...data);
      }
    }
    
    // Remove duplicates
    const uniqueResults = results.filter((item, index, self) =>
      index === self.findIndex((r) => 
        r.bairro === item.bairro && r.zona === item.zona
      )
    );
    
    return uniqueResults;
  }
  
  /**
   * Enrich data with Knowledge Graph
   */
  private async enrichWithKnowledgeGraph(regimeData: RegimeUrbanistico[]) {
    const enriched = {
      zones: [] as any[],
      parameters: [] as any[],
      relationships: [] as any[]
    };
    
    // Get unique zones
    const uniqueZones = [...new Set(regimeData.map(r => r.zona))];
    
    for (const zone of uniqueZones) {
      // Find zone in Knowledge Graph
      const { data: zoneNode } = await supabase
        .from('knowledge_graph_nodes')
        .select('*')
        .eq('label', zone)
        .eq('node_type', 'zone')
        .single();
      
      if (zoneNode) {
        enriched.zones.push(zoneNode);
        
        // Get parameters for this zone
        const { data: paramEdges } = await supabase
          .from('knowledge_graph_edges')
          .select(`
            *,
            target:target_id (
              label,
              properties
            )
          `)
          .eq('source_id', zoneNode.id)
          .eq('relationship_type', 'HAS_PARAMETER');
        
        if (paramEdges) {
          paramEdges.forEach((edge: any) => {
            enriched.parameters.push({
              zone,
              parameter: edge.target.label,
              properties: edge.target.properties
            });
            
            enriched.relationships.push({
              source: zone,
              target: edge.target.label,
              type: 'HAS_PARAMETER'
            });
          });
        }
      }
    }
    
    return enriched;
  }
  
  /**
   * Calculate urban metrics
   */
  private calculateUrbanMetrics(enrichedData: any) {
    const metrics: any = {};
    
    // Extract regime data if available
    if (enrichedData.zones && enrichedData.zones.length > 0) {
      enrichedData.zones.forEach((zone: any) => {
        if (zone.properties) {
          const props = zone.properties;
          
          // Calculate buildable area
          if (props.coef_aproveitamento_basico) {
            metrics.potencial_construtivo_basico = {
              description: 'Potencial construtivo básico (gratuito)',
              formula: 'área_terreno × coeficiente_básico',
              coefficient: props.coef_aproveitamento_basico
            };
          }
          
          // Calculate maximum buildable area
          if (props.coef_aproveitamento_maximo) {
            metrics.potencial_construtivo_maximo = {
              description: 'Potencial construtivo máximo (com outorga)',
              formula: 'área_terreno × coeficiente_máximo',
              coefficient: props.coef_aproveitamento_maximo
            };
          }
          
          // Calculate outorga onerosa potential
          if (props.coef_aproveitamento_basico && props.coef_aproveitamento_maximo) {
            metrics.potencial_outorga = {
              description: 'Potencial adicional via outorga onerosa',
              formula: 'área_terreno × (coef_máximo - coef_básico)',
              coefficient: props.coef_aproveitamento_maximo - props.coef_aproveitamento_basico
            };
          }
        }
      });
    }
    
    return metrics;
  }
  
  /**
   * Check restrictions and special conditions
   */
  private async checkRestrictions(locations: LocationEntity[], regimeData: RegimeUrbanistico[]) {
    const restrictions: any[] = [];
    
    // Check for heritage areas
    for (const location of locations) {
      if (location.name.toLowerCase().includes('centro histórico')) {
        restrictions.push({
          type: 'heritage',
          description: 'Área de preservação do patrimônio histórico',
          implications: 'Restrições adicionais para alterações de fachada e gabarito'
        });
      }
    }
    
    // Check for environmental restrictions
    const environmentalKeywords = ['APP', 'preservação', 'ambiental', 'verde'];
    for (const keyword of environmentalKeywords) {
      if (locations.some(l => l.name.toLowerCase().includes(keyword.toLowerCase()))) {
        restrictions.push({
          type: 'environmental',
          description: 'Área de preservação ambiental',
          implications: 'Restrições para construção e impermeabilização'
        });
      }
    }
    
    // Check height restrictions
    for (const regime of regimeData) {
      if (regime.altura_maxima && regime.altura_maxima <= 12) {
        restrictions.push({
          type: 'height',
          description: `Altura máxima limitada a ${regime.altura_maxima}m`,
          zone: regime.zona,
          implications: 'Área predominantemente residencial de baixa densidade'
        });
      }
    }
    
    return restrictions;
  }
  
  /**
   * Get disaster risk information
   */
  private async getDisasterRisk(locations: LocationEntity[]) {
    const riskData: any[] = [];
    
    // Query disaster risk table
    for (const location of locations) {
      if (location.type === 'bairro') {
        const { data } = await supabase
          .from('document_rows')
          .select('*')
          .ilike('metadata->>bairro', `%${location.name}%`)
          .ilike('content', '%risco%');
        
        if (data && data.length > 0) {
          data.forEach(row => {
            const riskType = this.extractRiskType(row.content);
            if (riskType) {
              riskData.push({
                location: location.name,
                riskType,
                severity: this.extractRiskSeverity(row.content),
                source: row.metadata?.source || 'Plano Diretor'
              });
            }
          });
        }
      }
    }
    
    // Known flood risk areas
    const floodRiskAreas = ['Mário Quintana', 'Sarandi', 'Humaitá', 'Navegantes'];
    for (const location of locations) {
      if (floodRiskAreas.some(area => location.name.toLowerCase().includes(area.toLowerCase()))) {
        riskData.push({
          location: location.name,
          riskType: 'inundação',
          severity: 'alto',
          source: 'Mapeamento de áreas de risco 2024'
        });
      }
    }
    
    return riskData;
  }
  
  /**
   * Format parameters for response
   */
  private formatParameters(regimeData: RegimeUrbanistico[]): UrbanParameter[] {
    const parameters: UrbanParameter[] = [];
    
    for (const regime of regimeData) {
      parameters.push(
        {
          parameter: 'Altura Máxima',
          value: regime.altura_maxima,
          unit: 'metros',
          zone: regime.zona
        },
        {
          parameter: 'Coeficiente de Aproveitamento Básico',
          value: regime.coef_aproveitamento_basico,
          zone: regime.zona
        },
        {
          parameter: 'Coeficiente de Aproveitamento Máximo',
          value: regime.coef_aproveitamento_maximo,
          zone: regime.zona
        },
        {
          parameter: 'Taxa de Ocupação',
          value: regime.taxa_ocupacao,
          unit: '%',
          zone: regime.zona
        },
        {
          parameter: 'Taxa de Permeabilidade',
          value: regime.taxa_permeabilidade,
          unit: '%',
          zone: regime.zona
        }
      );
    }
    
    return parameters;
  }
  
  /**
   * Generate recommendations based on data
   */
  private generateRecommendations(regimeData: RegimeUrbanistico[], restrictions: any[]) {
    const recommendations: string[] = [];
    
    // Check for outorga onerosa opportunity
    for (const regime of regimeData) {
      if (regime.coef_aproveitamento_maximo > regime.coef_aproveitamento_basico) {
        const adicional = regime.coef_aproveitamento_maximo - regime.coef_aproveitamento_basico;
        recommendations.push(
          `Possibilidade de utilizar Outorga Onerosa para adicional de ${adicional.toFixed(1)} no coeficiente de aproveitamento`
        );
      }
    }
    
    // Check for low permeability requirement
    for (const regime of regimeData) {
      if (regime.taxa_permeabilidade >= 0.25) {
        recommendations.push(
          `Alta taxa de permeabilidade exigida (${(regime.taxa_permeabilidade * 100).toFixed(0)}%). Considere soluções de drenagem sustentável.`
        );
      }
    }
    
    // Heritage area recommendations
    if (restrictions.some(r => r.type === 'heritage')) {
      recommendations.push(
        'Consultar IPHAN/SMC para aprovação de projetos em área de patrimônio histórico'
      );
    }
    
    // Environmental recommendations
    if (restrictions.some(r => r.type === 'environmental')) {
      recommendations.push(
        'Necessário estudo ambiental e aprovação da SMAM para intervenções'
      );
    }
    
    return recommendations;
  }
  
  /**
   * Helper: Normalize location name
   */
  private normalizeLocation(name: string): string {
    return name
      .toUpperCase()
      .replace(/\s+/g, '_')
      .replace(/[áàâã]/gi, 'A')
      .replace(/[éèê]/gi, 'E')
      .replace(/[íì]/gi, 'I')
      .replace(/[óòôõ]/gi, 'O')
      .replace(/[úù]/gi, 'U')
      .replace(/[ç]/gi, 'C');
  }
  
  /**
   * Helper: Extract risk type from content
   */
  private extractRiskType(content: string): string | null {
    const riskTypes = {
      'inundação': /inunda[çc][ãa]o|alagamento|enchente/i,
      'deslizamento': /deslizamento|escorregamento|movimento de massa/i,
      'contaminação': /contamina[çc][ãa]o|polu[íi][çc][ãa]o/i
    };
    
    for (const [type, pattern] of Object.entries(riskTypes)) {
      if (pattern.test(content)) {
        return type;
      }
    }
    
    return null;
  }
  
  /**
   * Helper: Extract risk severity
   */
  private extractRiskSeverity(content: string): string {
    if (/muito alto|crítico|extremo/i.test(content)) return 'muito alto';
    if (/alto|elevado|significativo/i.test(content)) return 'alto';
    if (/médio|moderado/i.test(content)) return 'médio';
    if (/baixo|reduzido/i.test(content)) return 'baixo';
    return 'indefinido';
  }
  
  /**
   * Calculate confidence score
   */
  private calculateConfidence(regimeData: any[], enriched: any, locations: LocationEntity[]): number {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence if regime data found
    if (regimeData.length > 0) {
      confidence += 0.25;
    }
    
    // Increase confidence if enriched with KG
    if (enriched.zones && enriched.zones.length > 0) {
      confidence += 0.15;
    }
    
    // Increase confidence based on location precision
    if (locations.some(l => l.type === 'zona')) {
      confidence += 0.1; // Zone is more precise
    }
    
    // Decrease confidence if ambiguous locations
    if (locations.some(l => l.name.includes('Boa Vista'))) {
      confidence -= 0.1; // Ambiguity between Boa Vista and Boa Vista do Sul
    }
    
    return Math.min(Math.max(confidence, 0), 1.0);
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
    
    const agent = new UrbanPlanningAgent();
    const result = await agent.process(query, context || {});
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Urban Agent error:', error);
    
    return new Response(JSON.stringify({
      type: 'urban',
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