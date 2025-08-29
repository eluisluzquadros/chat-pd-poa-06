#!/usr/bin/env node
/**
 * Test script for Agentic RAG v3.0 - FASE 2 Optimizations
 * Tests the implemented improvements: Cache, Metadata Extraction, Reranking, Parallel Execution
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test cases focusing on FASE 2 improvements
const testCases = [
  {
    name: "Art. 119 LUOS (Disposições Transitórias)",
    query: "Art. 119 LUOS disposições transitórias",
    expectedFeatures: ['transitional_provisions', 'exact_article_match']
  },
  {
    name: "Múltiplos Artigos (75 a 79)",
    query: "artigos 75 a 79 LUOS",
    expectedFeatures: ['article_range_match', 'multiple_articles']
  },
  {
    name: "Navegação Hierárquica com Contexto",
    query: "Art. 77 contexto relacionados",
    expectedFeatures: ['context_request', 'needs_context']
  },
  {
    name: "Busca ZOT com Bairro",
    query: "ZOT Centro altura máxima",
    expectedFeatures: ['zot_match', 'neighborhood_match', 'construction_params']
  },
  {
    name: "Query PDUS Geral",
    query: "PDUS transporte mobilidade urbana",
    expectedFeatures: ['pdus_mention', 'transportation_query']
  }
];

async function testAgenticRAGv3() {
  console.log('🚀 Testing Agentic RAG v3.0 - FASE 2 Optimizations\n');
  
  const results = [];
  
  for (const testCase of testCases) {
    console.log(`📝 Testing: ${testCase.name}`);
    console.log(`   Query: "${testCase.query}"`);
    
    const startTime = Date.now();
    
    try {
      const { data, error } = await supabase.functions.invoke('agentic-rag-v3', {
        body: {
          query: testCase.query,
          sessionId: `test-${Date.now()}`
        }
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      if (error) {
        console.log(`   ❌ Error: ${error.message}`);
        results.push({
          ...testCase,
          success: false,
          error: error.message,
          duration
        });
        continue;
      }
      
      // Analyze response
      const response = data.response || '';
      const metadata = data.metadata || {};
      const sources = data.sources || 0;
      const confidence = data.confidence || 0;
      
      console.log(`   ✅ Success (${duration}ms)`);
      console.log(`   📊 Sources: ${sources}, Confidence: ${confidence.toFixed(2)}`);
      console.log(`   🎯 Intent: ${metadata.intent || 'unknown'}`);
      console.log(`   📋 Confidence Factors: ${metadata.confidence_factors?.join(', ') || 'none'}`);
      console.log(`   💬 Response: ${response.substring(0, 100)}...`);
      
      // Check if expected features were detected
      const detectedFeatures = metadata.confidence_factors || [];
      const missingFeatures = testCase.expectedFeatures.filter(f => !detectedFeatures.includes(f));
      
      if (missingFeatures.length > 0) {
        console.log(`   ⚠️  Missing features: ${missingFeatures.join(', ')}`);
      }
      
      results.push({
        ...testCase,
        success: true,
        duration,
        sources,
        confidence,
        intent: metadata.intent,
        detectedFeatures,
        missingFeatures,
        response: response.substring(0, 200)
      });
      
    } catch (err) {
      console.log(`   ❌ Exception: ${err.message}`);
      results.push({
        ...testCase,
        success: false,
        error: err.message,
        duration: Date.now() - startTime
      });
    }
    
    console.log('');
  }
  
  // Summary
  console.log('📈 FASE 2 OPTIMIZATION RESULTS');
  console.log('=' .repeat(50));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful tests: ${successful.length}/${results.length}`);
  console.log(`❌ Failed tests: ${failed.length}/${results.length}`);
  console.log(`⚡ Average response time: ${(successful.reduce((acc, r) => acc + r.duration, 0) / successful.length || 0).toFixed(0)}ms`);
  console.log(`📊 Average sources per query: ${(successful.reduce((acc, r) => acc + (r.sources || 0), 0) / successful.length || 0).toFixed(1)}`);
  console.log(`🎯 Average confidence: ${(successful.reduce((acc, r) => acc + (r.confidence || 0), 0) / successful.length || 0).toFixed(2)}`);
  
  // Feature detection analysis
  console.log('\n🔍 METADATA EXTRACTION ANALYSIS');
  console.log('-'.repeat(40));
  
  const allExpectedFeatures = [...new Set(testCases.flatMap(tc => tc.expectedFeatures))];
  
  for (const feature of allExpectedFeatures) {
    const testsWithFeature = results.filter(r => r.success && testCases.find(tc => tc.name === r.name)?.expectedFeatures.includes(feature));
    const detected = testsWithFeature.filter(r => r.detectedFeatures?.includes(feature));
    console.log(`${feature}: ${detected.length}/${testsWithFeature.length} detected`);
  }
  
  // Performance insights
  console.log('\n⚡ PERFORMANCE INSIGHTS');
  console.log('-'.repeat(40));
  
  const fastQueries = successful.filter(r => r.duration < 1000);
  const slowQueries = successful.filter(r => r.duration >= 2000);
  
  console.log(`Fast queries (<1s): ${fastQueries.length}`);
  console.log(`Slow queries (≥2s): ${slowQueries.length}`);
  
  if (slowQueries.length > 0) {
    console.log('Slow query details:');
    slowQueries.forEach(q => {
      console.log(`  - ${q.name}: ${q.duration}ms`);
    });
  }
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS');
  console.log('-'.repeat(40));
  
  if (failed.length > 0) {
    console.log('❌ Address failed test cases:');
    failed.forEach(f => {
      console.log(`  - ${f.name}: ${f.error}`);
    });
  }
  
  const lowConfidenceQueries = successful.filter(r => r.confidence < 0.7);
  if (lowConfidenceQueries.length > 0) {
    console.log('⚠️  Low confidence queries (consider improving):');
    lowConfidenceQueries.forEach(q => {
      console.log(`  - ${q.name}: ${q.confidence.toFixed(2)}`);
    });
  }
  
  if (slowQueries.length > 0) {
    console.log('🐌 Consider caching for slow queries');
  }
  
  const overallScore = (successful.length / results.length) * 100;
  console.log(`\n🏆 OVERALL PHASE 2 SCORE: ${overallScore.toFixed(1)}%`);
  
  if (overallScore >= 80) {
    console.log('🎉 FASE 2 optimizations are working well!');
  } else if (overallScore >= 60) {
    console.log('⚠️  FASE 2 needs some improvements');
  } else {
    console.log('❌ FASE 2 requires significant fixes');
  }
}

// Run the test
testAgenticRAGv3().catch(console.error);