/**
 * Comprehensive RAG System Test Suite
 * Tests all critical fixes and functionality
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
let supabase: SupabaseClient;

interface TestResult {
  test: string;
  status: 'pass' | 'fail' | 'warning';
  details: string;
  performance?: {
    responseTime: number;
    tokensUsed?: number;
  };
}

const testResults: TestResult[] = [];

beforeAll(async () => {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
  console.log('🧪 Starting Comprehensive RAG System Tests');
});

afterAll(async () => {
  console.log('\n📊 Test Results Summary:');
  console.log(`✅ Passed: ${testResults.filter(r => r.status === 'pass').length}`);
  console.log(`❌ Failed: ${testResults.filter(r => r.status === 'fail').length}`);
  console.log(`⚠️  Warnings: ${testResults.filter(r => r.status === 'warning').length}`);
});

describe('Height Search Functionality Tests', () => {
  const heightQueries = [
    'altura',
    'alturas',
    'elevação',
    'elevacao',
    'cota',
    'cotas',
    'nivel',
    'níveis',
    'altura máxima',
    'altura media',
    'altura mínima'
  ];

  test('Should handle various height-related search terms', async () => {
    for (const query of heightQueries) {
      const startTime = Date.now();
      
      try {
        const { data, error } = await supabase.functions.invoke('enhanced-vector-search', {
          body: { 
            query,
            limit: 5,
            threshold: 0.3
          }
        });

        const responseTime = Date.now() - startTime;

        if (error) {
          testResults.push({
            test: `Height search: "${query}"`,
            status: 'fail',
            details: `Error: ${error.message}`,
            performance: { responseTime }
          });
          continue;
        }

        const hasResults = data?.results && data.results.length > 0;
        const relevantResults = hasResults ? 
          data.results.filter((r: any) => r.similarity > 0.3).length : 0;

        testResults.push({
          test: `Height search: "${query}"`,
          status: relevantResults > 0 ? 'pass' : 'warning',
          details: `Found ${relevantResults} relevant results (similarity > 0.3)`,
          performance: { responseTime }
        });

        // Validate result structure
        if (hasResults) {
          expect(data.results[0]).toHaveProperty('content');
          expect(data.results[0]).toHaveProperty('similarity');
          expect(data.results[0]).toHaveProperty('metadata');
        }

      } catch (error) {
        testResults.push({
          test: `Height search: "${query}"`,
          status: 'fail',
          details: `Exception: ${error}`,
          performance: { responseTime: Date.now() - startTime }
        });
      }
    }
  });

  test('Should prioritize exact matches over partial matches', async () => {
    const { data } = await supabase.functions.invoke('enhanced-vector-search', {
      body: { 
        query: 'altura máxima',
        limit: 10,
        threshold: 0.2
      }
    });

    if (data?.results && data.results.length > 0) {
      // First result should have highest similarity
      const similarities = data.results.map((r: any) => r.similarity);
      const sortedSimilarities = [...similarities].sort((a, b) => b - a);
      
      expect(similarities).toEqual(sortedSimilarities);
      
      testResults.push({
        test: 'Height search result ranking',
        status: 'pass',
        details: `Results properly sorted by similarity: ${similarities.slice(0, 3).join(', ')}`
      });
    }
  });
});

describe('Embeddings Quality Validation', () => {
  test('Should generate consistent embeddings for similar terms', async () => {
    const testPhrases = [
      'altura do terreno',
      'elevação do solo',
      'cota altimétrica'
    ];

    const embeddings: number[][] = [];
    
    for (const phrase of testPhrases) {
      const { data } = await supabase.functions.invoke('process-document', {
        body: {
          content: phrase,
          metadata: { test: true }
        }
      });

      if (data?.embedding) {
        embeddings.push(data.embedding);
      }
    }

    // Calculate similarity between embeddings
    if (embeddings.length >= 2) {
      const similarity = cosineSimilarity(embeddings[0], embeddings[1]);
      
      testResults.push({
        test: 'Embeddings consistency',
        status: similarity > 0.7 ? 'pass' : 'warning',
        details: `Similarity between related terms: ${similarity.toFixed(3)}`
      });

      expect(similarity).toBeGreaterThan(0.5);
    }
  });

  test('Should generate valid embedding dimensions', async () => {
    const { data } = await supabase.functions.invoke('process-document', {
      body: {
        content: 'Teste de embedding dimension',
        metadata: { test: true }
      }
    });

    if (data?.embedding) {
      const dimension = data.embedding.length;
      
      testResults.push({
        test: 'Embedding dimensions',
        status: dimension === 1536 ? 'pass' : 'fail',
        details: `Embedding dimension: ${dimension} (expected: 1536)`
      });

      expect(dimension).toBe(1536);
    }
  });
});

describe('Document Processing Tests', () => {
  test('Should process documents with proper chunking', async () => {
    const testDocument = `
      Este é um documento de teste sobre alturas em Porto Alegre.
      A cidade possui diferentes elevações, com áreas mais altas
      e mais baixas. A altura média é de aproximadamente 10 metros
      acima do nível do mar. As cotas altimétricas variam
      significativamente entre os bairros.
    `;

    const startTime = Date.now();
    
    const { data, error } = await supabase.functions.invoke('process-document', {
      body: {
        content: testDocument,
        metadata: {
          title: 'Teste de Processamento',
          type: 'test_document'
        }
      }
    });

    const responseTime = Date.now() - startTime;

    if (error) {
      testResults.push({
        test: 'Document processing',
        status: 'fail',
        details: `Error: ${error.message}`,
        performance: { responseTime }
      });
      return;
    }

    testResults.push({
      test: 'Document processing',
      status: 'pass',
      details: `Document processed successfully with ${data?.chunks?.length || 0} chunks`,
      performance: { responseTime }
    });

    expect(data).toBeDefined();
    expect(data.chunks).toBeDefined();
    expect(Array.isArray(data.chunks)).toBe(true);
  });
});

describe('RAG Integration Tests', () => {
  test('Should provide relevant responses for height queries', async () => {
    const testQueries = [
      'Qual a altura de Porto Alegre?',
      'Quais são as elevações dos bairros?',
      'Cotas altimétricas da cidade'
    ];

    for (const query of testQueries) {
      const startTime = Date.now();
      
      const { data, error } = await supabase.functions.invoke('response-synthesizer', {
        body: { 
          query,
          context_limit: 5
        }
      });

      const responseTime = Date.now() - startTime;

      if (error) {
        testResults.push({
          test: `RAG response: "${query}"`,
          status: 'fail',
          details: `Error: ${error.message}`,
          performance: { responseTime }
        });
        continue;
      }

      const hasResponse = data?.response && data.response.length > 0;
      const hasContext = data?.context && data.context.length > 0;

      testResults.push({
        test: `RAG response: "${query}"`,
        status: hasResponse && hasContext ? 'pass' : 'warning',
        details: `Response length: ${data?.response?.length || 0}, Context items: ${data?.context?.length || 0}`,
        performance: { responseTime }
      });
    }
  });
});

describe('Contextual Scoring Tests', () => {
  test('Should score contexts accurately', async () => {
    const { data } = await supabase.functions.invoke('contextual-scoring', {
      body: {
        query: 'altura dos bairros',
        contexts: [
          'A altura média dos bairros de Porto Alegre varia entre 5 e 40 metros',
          'Os restaurantes da cidade oferecem pratos variados',
          'As elevações topográficas influenciam o desenvolvimento urbano'
        ]
      }
    });

    if (data?.scores) {
      const scores = data.scores;
      
      // First context should have highest score (most relevant)
      expect(scores[0]).toBeGreaterThan(scores[1]);
      expect(scores[2]).toBeGreaterThan(scores[1]);

      testResults.push({
        test: 'Contextual scoring accuracy',
        status: 'pass',
        details: `Scores: [${scores.map((s: number) => s.toFixed(3)).join(', ')}]`
      });
    }
  });
});

describe('Performance Benchmarks', () => {
  test('Should meet response time requirements', async () => {
    const benchmarks = [
      { function: 'enhanced-vector-search', maxTime: 2000 },
      { function: 'process-document', maxTime: 5000 },
      { function: 'response-synthesizer', maxTime: 10000 }
    ];

    for (const benchmark of benchmarks) {
      const startTime = Date.now();
      
      await supabase.functions.invoke(benchmark.function, {
        body: { query: 'teste de performance', content: 'teste' }
      });

      const responseTime = Date.now() - startTime;
      const passed = responseTime <= benchmark.maxTime;

      testResults.push({
        test: `Performance: ${benchmark.function}`,
        status: passed ? 'pass' : 'warning',
        details: `Response time: ${responseTime}ms (max: ${benchmark.maxTime}ms)`,
        performance: { responseTime }
      });
    }
  });
});

describe('Error Handling Tests', () => {
  test('Should handle invalid queries gracefully', async () => {
    const invalidQueries = ['', null, undefined, '   ', 'x'.repeat(10000)];

    for (const query of invalidQueries) {
      try {
        const { data, error } = await supabase.functions.invoke('enhanced-vector-search', {
          body: { query }
        });

        // Should either return empty results or a proper error
        const handledGracefully = (data?.results?.length === 0) || error;

        testResults.push({
          test: `Error handling: invalid query "${query}"`,
          status: handledGracefully ? 'pass' : 'fail',
          details: error ? `Error handled: ${error.message}` : 'Empty results returned'
        });

      } catch (e) {
        testResults.push({
          test: `Error handling: invalid query "${query}"`,
          status: 'pass',
          details: `Exception caught and handled: ${e}`
        });
      }
    }
  });
});

// Helper function for cosine similarity
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

// Export test results for external reporting
declare global {
  var testResults: TestResult[];
}
global.testResults = testResults;