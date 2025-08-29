// fallback-search.ts
// Enhanced fallback search for REGIME_FALLBACK data

export class FallbackSearch {
  /**
   * Search in REGIME_FALLBACK articles when structured data is not found
   */
  static async searchRegimeFallback(
    supabase: any,
    query: string,
    neighborhood?: string,
    zone?: string
  ): Promise<any[]> {
    console.log('🔄 Searching in REGIME_FALLBACK data...');
    
    const keywords = [];
    
    // Build search keywords
    if (neighborhood) {
      // Normalize neighborhood name
      const normalizedNeighborhood = neighborhood
        .toUpperCase()
        .replace(/[ÁÀÃÂ]/g, 'A')
        .replace(/[ÉÈÊË]/g, 'E')
        .replace(/[ÍÌÎÏ]/g, 'I')
        .replace(/[ÓÒÕÔÖ]/g, 'O')
        .replace(/[ÚÙÛÜ]/g, 'U')
        .replace(/Ç/g, 'C')
        .replace(/\s+/g, '_');
      
      keywords.push(`BAIRRO_${normalizedNeighborhood}`);
      
      // Try variations
      keywords.push(`BAIRRO_${neighborhood.toUpperCase().replace(/\s+/g, '_')}`);
      keywords.push(`BAIRRO_${neighborhood.toUpperCase().replace(/\s+/g, '-')}`);
    }
    
    if (zone) {
      keywords.push(`ZONA_${zone.toUpperCase()}`);
      keywords.push(zone.toUpperCase());
      
      // Handle ZOT variations
      const zotMatch = zone.match(/\d+/);
      if (zotMatch) {
        keywords.push(`ZOT_${zotMatch[0]}`);
        keywords.push(`ZOT-${zotMatch[0]}`);
        keywords.push(`ZOT ${zotMatch[0]}`);
      }
    }
    
    if (keywords.length === 0) {
      // Generic search in content
      const searchTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 3);
      
      const { data, error } = await supabase
        .from('legal_articles')
        .select('*')
        .eq('document_type', 'REGIME_FALLBACK')
        .or(searchTerms.map(term => `full_content.ilike.%${term}%`).join(','))
        .limit(10);
      
      if (error) {
        console.error('❌ Error searching REGIME_FALLBACK:', error);
        return [];
      }
      
      return data || [];
    }
    
    // Search by keywords
    console.log('🔍 Searching with keywords:', keywords);
    
    const { data, error } = await supabase
      .from('legal_articles')
      .select('*')
      .eq('document_type', 'REGIME_FALLBACK')
      .overlaps('keywords', keywords)
      .limit(5);
    
    if (error) {
      console.error('❌ Error searching REGIME_FALLBACK:', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      // Try broader search in content
      console.log('🔄 No keyword matches, trying content search...');
      
      const contentSearch = await supabase
        .from('legal_articles')
        .select('*')
        .eq('document_type', 'REGIME_FALLBACK')
        .or(`full_content.ilike.%${neighborhood || query}%,article_text.ilike.%${neighborhood || query}%`)
        .limit(5);
      
      return contentSearch.data || [];
    }
    
    console.log(`✅ Found ${data.length} REGIME_FALLBACK results`);
    return data;
  }
  
  /**
   * Extract structured data from REGIME_FALLBACK content
   */
  static parseRegimeContent(content: string): any {
    const result = {
      bairro: null as string | null,
      zona: null as string | null,
      altura_maxima: null as number | null,
      coeficiente_basico: null as number | null,
      coeficiente_maximo: null as number | null,
      taxa_permeabilidade: null as number | null,
      area_minima_lote: null as number | null,
      recuo_jardim: null as number | null,
      afastamentos: {
        frente: null as string | null,
        lateral: null as string | null,
        fundos: null as string | null
      }
    };
    
    // Extract neighborhood
    const bairroMatch = content.match(/(?:BAIRRO:|Bairro:|#\s*)([A-ZÁÊÔÓÍÚÇÃÕ\s\-]+)/i);
    if (bairroMatch) {
      result.bairro = bairroMatch[1].trim();
    }
    
    // Extract zone
    const zonaMatch = content.match(/(?:Zona:|ZONA:|ZOT)\s*([\w\s\-]+)/i);
    if (zonaMatch) {
      result.zona = zonaMatch[1].trim();
    }
    
    // Extract height
    const alturaMatch = content.match(/Altura\s+Máxima[^:]*:\s*(\d+(?:[.,]\d+)?)\s*(?:metros|m)/i);
    if (alturaMatch) {
      result.altura_maxima = parseFloat(alturaMatch[1].replace(',', '.'));
    }
    
    // Extract coefficients
    const coefBasicoMatch = content.match(/Coeficiente[^B]*Básico[^:]*:\s*(\d+(?:[.,]\d+)?)/i);
    if (coefBasicoMatch) {
      result.coeficiente_basico = parseFloat(coefBasicoMatch[1].replace(',', '.'));
    }
    
    const coefMaximoMatch = content.match(/Coeficiente[^M]*Máximo[^:]*:\s*(\d+(?:[.,]\d+)?)/i);
    if (coefMaximoMatch) {
      result.coeficiente_maximo = parseFloat(coefMaximoMatch[1].replace(',', '.'));
    }
    
    // Extract permeability
    const permeabilidadeMatch = content.match(/Taxa\s+de\s+Permeabilidade[^:]*:\s*(\d+)%/i);
    if (permeabilidadeMatch) {
      result.taxa_permeabilidade = parseInt(permeabilidadeMatch[1]);
    }
    
    // Extract lot area
    const loteMatch = content.match(/Área\s+Mínima\s+do\s+Lote[^:]*:\s*(\d+(?:[.,]\d+)?)/i);
    if (loteMatch) {
      result.area_minima_lote = parseFloat(loteMatch[1].replace(',', '.'));
    }
    
    // Extract garden setback
    const recuoMatch = content.match(/Recuo\s+de\s+Jardim[^:]*:\s*(\d+(?:[.,]\d+)?)/i);
    if (recuoMatch) {
      result.recuo_jardim = parseFloat(recuoMatch[1].replace(',', '.'));
    }
    
    // Extract setbacks
    const frenteMatch = content.match(/(?:Afastamento[^F]*)?Frente[^:]*:\s*([^\n]+)/i);
    if (frenteMatch) {
      result.afastamentos.frente = frenteMatch[1].trim();
    }
    
    const lateralMatch = content.match(/(?:Afastamento[^L]*)?Lateral[^:]*:\s*([^\n]+)/i);
    if (lateralMatch) {
      result.afastamentos.lateral = lateralMatch[1].trim();
    }
    
    const fundosMatch = content.match(/(?:Afastamento[^F]*)?Fundos[^:]*:\s*([^\n]+)/i);
    if (fundosMatch) {
      result.afastamentos.fundos = fundosMatch[1].trim();
    }
    
    return result;
  }
  
  /**
   * Format REGIME_FALLBACK data for response
   */
  static formatRegimeResponse(data: any[]): string {
    if (!data || data.length === 0) return '';
    
    const sections = [];
    
    sections.push('=== REGIME URBANÍSTICO (Dados Complementares) ===\n');
    
    data.forEach(item => {
      const parsed = this.parseRegimeContent(item.full_content || item.article_text || '');
      
      if (parsed.bairro || parsed.zona) {
        sections.push(`📍 ${parsed.bairro || 'Localização'}${parsed.zona ? ` - ${parsed.zona}` : ''}`);
        
        if (parsed.altura_maxima) {
          sections.push(`   • Altura Máxima: ${parsed.altura_maxima}m`);
        }
        
        if (parsed.coeficiente_basico || parsed.coeficiente_maximo) {
          sections.push(`   • Coeficiente de Aproveitamento:`);
          if (parsed.coeficiente_basico) sections.push(`     - Básico: ${parsed.coeficiente_basico}`);
          if (parsed.coeficiente_maximo) sections.push(`     - Máximo: ${parsed.coeficiente_maximo}`);
        }
        
        if (parsed.taxa_permeabilidade) {
          sections.push(`   • Taxa de Permeabilidade: ${parsed.taxa_permeabilidade}%`);
        }
        
        if (parsed.area_minima_lote) {
          sections.push(`   • Área Mínima do Lote: ${parsed.area_minima_lote}m²`);
        }
        
        if (parsed.recuo_jardim) {
          sections.push(`   • Recuo de Jardim: ${parsed.recuo_jardim}m`);
        }
        
        if (parsed.afastamentos.frente || parsed.afastamentos.lateral || parsed.afastamentos.fundos) {
          sections.push(`   • Afastamentos:`);
          if (parsed.afastamentos.frente) sections.push(`     - Frente: ${parsed.afastamentos.frente}`);
          if (parsed.afastamentos.lateral) sections.push(`     - Lateral: ${parsed.afastamentos.lateral}`);
          if (parsed.afastamentos.fundos) sections.push(`     - Fundos: ${parsed.afastamentos.fundos}`);
        }
        
        sections.push(''); // Empty line between entries
      }
    });
    
    return sections.join('\n');
  }
  
  /**
   * Search QA knowledge base for complementary information
   */
  static async searchQAKnowledge(
    supabase: any,
    query: string,
    category?: string
  ): Promise<any[]> {
    console.log('🔍 Searching in QA knowledge base...');
    
    // Build search query
    let searchQuery = supabase
      .from('qa_test_cases')
      .select('*');
    
    if (category) {
      searchQuery = searchQuery.eq('category', category);
    }
    
    // Search in expected_answer
    const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    
    const { data, error } = await searchQuery
      .or(keywords.map(k => `expected_answer.ilike.%${k}%`).join(','))
      .limit(3);
    
    if (error) {
      console.error('❌ Error searching QA knowledge:', error);
      return [];
    }
    
    console.log(`✅ Found ${data?.length || 0} QA knowledge results`);
    return data || [];
  }
  
  /**
   * Combine and deduplicate results from multiple sources
   */
  static combineResults(
    structuredData: any[],
    fallbackData: any[],
    qaData: any[]
  ): {
    primary: any[],
    complementary: any[],
    confidence: number
  } {
    const primary = [];
    const complementary = [];
    let confidence = 0;
    
    // Add structured data as primary
    if (structuredData && structuredData.length > 0) {
      primary.push(...structuredData);
      confidence = 0.9;
    }
    
    // Add fallback data
    if (fallbackData && fallbackData.length > 0) {
      if (primary.length === 0) {
        // Use fallback as primary if no structured data
        primary.push(...fallbackData);
        confidence = 0.7;
      } else {
        // Use as complementary
        complementary.push(...fallbackData);
      }
    }
    
    // Add QA data as complementary
    if (qaData && qaData.length > 0) {
      complementary.push(...qaData);
      if (confidence === 0) {
        confidence = 0.5; // Lowest confidence if only QA data
      }
    }
    
    // If no data at all
    if (primary.length === 0 && complementary.length === 0) {
      confidence = 0;
    }
    
    return {
      primary: primary.slice(0, 10), // Limit results
      complementary: complementary.slice(0, 5),
      confidence
    };
  }
}

export default FallbackSearch;