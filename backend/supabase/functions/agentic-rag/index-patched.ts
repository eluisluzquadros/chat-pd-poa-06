// This is a PATCH file showing the changes needed in index.ts
// Add this import at the top of the file (around line 10)
import { 
  extractNeighborhoodFromQuery, 
  extractZOTFromQuery,
  buildOptimizedRegimeSearchConditions,
  buildRegimeFallbackSearch 
} from './neighborhood-extractor.ts';

// REPLACE lines 725-783 with this optimized version:
    // Search in regime_urbanistico_consolidado (structured urban planning data)
    console.log('🏗️ Searching regime urbanístico for:', query);
    
    // CRITICAL FIX: Use optimized extraction instead of searching with entire query
    const regimeSearchConditions = buildOptimizedRegimeSearchConditions(query);
    
    // Log what we're searching for debugging
    const extractedNeighborhood = extractNeighborhoodFromQuery(query);
    const extractedZOT = extractZOTFromQuery(query);
    
    if (extractedNeighborhood) {
      console.log(`🏘️ Extracted neighborhood: ${extractedNeighborhood}`);
    }
    if (extractedZOT) {
      console.log(`📍 Extracted zone: ${extractedZOT}`);
    }
    
    let regimeData = null;
    let regimeFallbackData = null;
    
    // Only search if we have valid conditions
    if (regimeSearchConditions.length > 0) {
      const { data: regimeResults } = await supabase
        .from('regime_urbanistico_consolidado')
        .select('*')
        .or(regimeSearchConditions.join(','))
        .limit(15);
      
      regimeData = regimeResults;
      console.log(`🏗️ Found ${regimeData?.length || 0} regime urbanístico results`);
    }
    
    // If no results from structured data, try REGIME_FALLBACK
    if ((!regimeData || regimeData.length === 0) && (extractedNeighborhood || extractedZOT)) {
      console.log('🔄 Trying REGIME_FALLBACK documents...');
      
      const fallbackKeywords = buildRegimeFallbackSearch(query);
      
      if (fallbackKeywords.length > 0) {
        const { data: fallbackResults } = await supabase
          .from('legal_articles')
          .select('*')
          .eq('document_type', 'REGIME_FALLBACK')
          .contains('keywords', fallbackKeywords)
          .limit(5);
        
        regimeFallbackData = fallbackResults;
        console.log(`📦 Found ${regimeFallbackData?.length || 0} fallback results`);
      }
    }
    
    // Combine regime data and fallback data
    const allRegimeData = [
      ...(regimeData || []),
      ...(regimeFallbackData || [])
    ];
    
    console.log(`🏗️ Total regime results: ${allRegimeData.length}`);