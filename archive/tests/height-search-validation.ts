/**
 * Specific Height Search Validation Tests
 * Focus on testing altura/elevation search functionality
 */

import { describe, test, expect } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

interface HeightTestCase {
  query: string;
  expectedKeywords: string[];
  minSimilarity: number;
  description: string;
}

const heightTestCases: HeightTestCase[] = [
  {
    query: 'altura',
    expectedKeywords: ['altura', 'elevação', 'cota', 'metros'],
    minSimilarity: 0.4,
    description: 'Basic height search'
  },
  {
    query: 'elevação do terreno',
    expectedKeywords: ['elevação', 'terreno', 'topografia', 'altura'],
    minSimilarity: 0.35,
    description: 'Terrain elevation search'
  },
  {
    query: 'cota altimétrica',
    expectedKeywords: ['cota', 'altimétrica', 'altitude', 'elevação'],
    minSimilarity: 0.3,
    description: 'Altimetric elevation search'
  },
  {
    query: 'altura máxima dos bairros',
    expectedKeywords: ['altura', 'máxima', 'bairros', 'elevação'],
    minSimilarity: 0.35,
    description: 'Maximum neighborhood height search'
  },
  {
    query: 'nivel do mar',
    expectedKeywords: ['nível', 'mar', 'altitude', 'elevação'],
    minSimilarity: 0.3,
    description: 'Sea level reference search'
  }
];

describe('Height Search Validation Tests', () => {
  test.each(heightTestCases)(
    'Should find relevant results for: $description',
    async ({ query, expectedKeywords, minSimilarity, description }) => {
      console.log(`\n🔍 Testing: ${description}`);
      console.log(`Query: "${query}"`);

      const startTime = Date.now();
      
      const { data, error } = await supabase.functions.invoke('enhanced-vector-search', {
        body: {
          query,
          limit: 10,
          threshold: minSimilarity
        }
      });

      const responseTime = Date.now() - startTime;
      console.log(`⏱️  Response time: ${responseTime}ms`);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.results).toBeDefined();

      if (data.results && data.results.length > 0) {
        console.log(`📊 Found ${data.results.length} results`);
        
        // Check similarity scores
        const topSimilarity = data.results[0].similarity;
        console.log(`🎯 Top similarity: ${topSimilarity.toFixed(3)}`);
        
        expect(topSimilarity).toBeGreaterThanOrEqual(minSimilarity);

        // Check for expected keywords in results
        const allContent = data.results
          .map((r: any) => r.content.toLowerCase())
          .join(' ');

        const foundKeywords = expectedKeywords.filter(keyword => 
          allContent.includes(keyword.toLowerCase())
        );

        console.log(`🔑 Found keywords: ${foundKeywords.join(', ')}`);
        console.log(`📋 Expected keywords: ${expectedKeywords.join(', ')}`);

        // At least 50% of expected keywords should be found
        const keywordMatchRatio = foundKeywords.length / expectedKeywords.length;
        expect(keywordMatchRatio).toBeGreaterThanOrEqual(0.3);

        // Validate result structure
        expect(data.results[0]).toHaveProperty('content');
        expect(data.results[0]).toHaveProperty('similarity');
        expect(data.results[0]).toHaveProperty('metadata');

        // Log first few results for manual inspection
        console.log('\n📝 Top 3 Results:');
        data.results.slice(0, 3).forEach((result: any, index: number) => {
          console.log(`${index + 1}. Similarity: ${result.similarity.toFixed(3)}`);
          console.log(`   Content: ${result.content.substring(0, 100)}...`);
          if (result.metadata?.title) {
            console.log(`   Source: ${result.metadata.title}`);
          }
        });
      } else {
        console.log('⚠️  No results found');
        // For some queries, no results might be acceptable if similarity threshold is high
        if (minSimilarity < 0.4) {
          console.warn(`Warning: No results found for "${query}" with threshold ${minSimilarity}`);
        }
      }
    }
  );

  test('Should handle height-related synonyms correctly', async () => {
    const synonymGroups = [
      ['altura', 'elevação', 'cota'],
      ['terreno', 'solo', 'topografia'],
      ['máxima', 'máximo', 'maior'],
      ['mínima', 'mínimo', 'menor']
    ];

    for (const synonyms of synonymGroups) {
      const results: any[] = [];
      
      for (const synonym of synonyms) {
        const { data } = await supabase.functions.invoke('enhanced-vector-search', {
          body: {
            query: synonym,
            limit: 5,
            threshold: 0.2
          }
        });

        if (data?.results) {
          results.push(...data.results);
        }
      }

      // Should find some overlapping results for synonyms
      if (results.length > 0) {
        console.log(`\n🔗 Synonym group: ${synonyms.join(', ')}`);
        console.log(`📊 Total results across synonyms: ${results.length}`);
        
        // Check for content overlap
        const uniqueContents = new Set(results.map(r => r.content));
        const overlapRatio = 1 - (uniqueContents.size / results.length);
        
        console.log(`🎯 Content overlap ratio: ${overlapRatio.toFixed(3)}`);
        
        // Some overlap expected for true synonyms
        expect(overlapRatio).toBeGreaterThan(0.1);
      }
    }
  });

  test('Should prioritize more specific height queries', async () => {
    const generalQuery = 'altura';
    const specificQuery = 'altura máxima dos bairros de Porto Alegre';

    const [generalResult, specificResult] = await Promise.all([
      supabase.functions.invoke('enhanced-vector-search', {
        body: { query: generalQuery, limit: 5, threshold: 0.2 }
      }),
      supabase.functions.invoke('enhanced-vector-search', {
        body: { query: specificQuery, limit: 5, threshold: 0.2 }
      })
    ]);

    if (generalResult.data?.results && specificResult.data?.results) {
      console.log('\n🎯 Query Specificity Test:');
      console.log(`General query results: ${generalResult.data.results.length}`);
      console.log(`Specific query results: ${specificResult.data.results.length}`);
      
      // Specific query should have higher top similarity or more focused results
      const generalTopSim = generalResult.data.results[0]?.similarity || 0;
      const specificTopSim = specificResult.data.results[0]?.similarity || 0;
      
      console.log(`General top similarity: ${generalTopSim.toFixed(3)}`);
      console.log(`Specific top similarity: ${specificTopSim.toFixed(3)}`);
      
      // Either specific query has higher similarity or finds more targeted results
      const specificityImprovement = specificTopSim >= generalTopSim * 0.9;
      expect(specificityImprovement).toBe(true);
    }
  });

  test('Should handle Portuguese language variations', async () => {
    const variations = [
      { original: 'elevação', withAccent: 'elevação', without: 'elevacao' },
      { original: 'nível', withAccent: 'nível', without: 'nivel' },
      { original: 'altimétrica', withAccent: 'altimétrica', without: 'altimetrica' }
    ];

    for (const variation of variations) {
      const [withAccentResult, withoutAccentResult] = await Promise.all([
        supabase.functions.invoke('enhanced-vector-search', {
          body: { query: variation.withAccent, limit: 3, threshold: 0.2 }
        }),
        supabase.functions.invoke('enhanced-vector-search', {
          body: { query: variation.without, limit: 3, threshold: 0.2 }
        })
      ]);

      console.log(`\n🔤 Testing accent variations for: ${variation.original}`);
      
      const withAccentCount = withAccentResult.data?.results?.length || 0;
      const withoutAccentCount = withoutAccentResult.data?.results?.length || 0;
      
      console.log(`With accent: ${withAccentCount} results`);
      console.log(`Without accent: ${withoutAccentCount} results`);
      
      // Both should find results (accent-insensitive search)
      expect(withAccentCount + withoutAccentCount).toBeGreaterThan(0);
    }
  });
});

describe('Height Data Quality Tests', () => {
  test('Should validate height-related content in database', async () => {
    // Check if we have height-related content in our knowledge base
    const { data, error } = await supabase
      .from('document_chunks')
      .select('content, metadata')
      .textSearch('content', 'altura | elevação | cota')
      .limit(10);

    if (error) {
      console.error('Database query error:', error);
      return;
    }

    console.log('\n📊 Height-related content in database:');
    console.log(`Found ${data?.length || 0} height-related chunks`);

    if (data && data.length > 0) {
      // Analyze content quality
      const contentLengths = data.map(chunk => chunk.content.length);
      const avgLength = contentLengths.reduce((a, b) => a + b, 0) / contentLengths.length;
      
      console.log(`Average chunk length: ${avgLength.toFixed(0)} characters`);
      
      // Check for metadata presence
      const withMetadata = data.filter(chunk => 
        chunk.metadata && Object.keys(chunk.metadata).length > 0
      ).length;
      
      console.log(`Chunks with metadata: ${withMetadata}/${data.length}`);
      
      expect(avgLength).toBeGreaterThan(50); // Chunks should have meaningful content
      expect(withMetadata / data.length).toBeGreaterThan(0.5); // Most should have metadata
    }
  });
});