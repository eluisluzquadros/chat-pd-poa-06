/**
 * Teste específico para busca de "altura" - diagnóstico do problema
 */

const testQueries = [
  'altura',
  'gabarito', 
  'elevação',
  'limite vertical',
  'altura máxima',
  'gabarito máximo',
  'limite de altura',
  'altura permitida',
  'altura de edificação',
  'altura de construção'
];

async function testEnhancedVectorSearch(query) {
  console.log(`\n🔍 Testando query: "${query}"`);
  
  try {
    const response = await fetch('http://127.0.0.1:54321/functions/v1/enhanced-vector-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOEOzs7g8VPuYXEQMpRZhD3RmJ3O9A4RNxVk'
      },
      body: JSON.stringify({
        message: query,
        userRole: 'citizen'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    console.log(`📊 Resultados: ${result.matches?.length || 0} matches`);
    console.log(`🎯 Score médio: ${result.matches?.length ? (result.matches.reduce((sum, m) => sum + m.similarity, 0) / result.matches.length).toFixed(3) : 'N/A'}`);
    
    // Verificar se encontrou conteúdo sobre altura
    const heightRelated = result.matches?.filter(m => 
      m.content?.toLowerCase().includes('altura') ||
      m.content?.toLowerCase().includes('gabarito') ||
      m.content?.toLowerCase().includes('elevação')
    );
    
    console.log(`🏗️ Matches relacionados à altura: ${heightRelated?.length || 0}`);
    
    if (heightRelated?.length > 0) {
      console.log('📝 Primeiro match relevante:');
      console.log(`   Score: ${heightRelated[0].similarity?.toFixed(3)}`);
      console.log(`   Content: ${heightRelated[0].content?.substring(0, 200)}...`);
    }
    
    return result;
    
  } catch (error) {
    console.error(`❌ Erro na query "${query}":`, error.message);
    return null;
  }
}

async function runHeightSearchTests() {
  console.log('🚀 Iniciando testes de busca por altura...\n');
  
  const results = [];
  
  for (const query of testQueries) {
    const result = await testEnhancedVectorSearch(query);
    results.push({ query, result });
    
    // Pausa entre requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n📊 RESUMO DOS RESULTADOS:');
  console.log('=' .repeat(50));
  
  results.forEach(({ query, result }) => {
    if (result) {
      const heightMatches = result.matches?.filter(m => 
        m.content?.toLowerCase().includes('altura') ||
        m.content?.toLowerCase().includes('gabarito')
      ).length || 0;
      
      console.log(`${query.padEnd(20)} → ${result.matches?.length || 0} total, ${heightMatches} altura-related`);
    } else {
      console.log(`${query.padEnd(20)} → ERRO`);
    }
  });
  
  console.log('\n🎯 ANÁLISE:');
  console.log('- Queries que deveriam retornar resultados similares podem ter scores muito diferentes');
  console.log('- Sinônimos como "gabarito", "elevação" podem não ser bem detectados');
  console.log('- Busca fuzzy pode estar faltando para capturar variações');
  
  return results;
}

// Executar os testes
runHeightSearchTests().catch(console.error);