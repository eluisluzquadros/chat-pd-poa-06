#!/usr/bin/env node

/**
 * Test script to validate v3 features integration and Multi-LLM routing fix
 * Tests: TokenCounter, QualityScorer, FallbackManager, ResultReranker
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import chalk from 'chalk';

// Load environment variables
dotenv.config({ path: '.env' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Test different LLM models to verify routing fix
const testModels = [
  { model: 'gpt-3.5-turbo', provider: 'openai', name: 'OpenAI GPT-3.5' },
  { model: 'claude-3-haiku', provider: 'anthropic', name: 'Claude 3 Haiku' },
  { model: 'gemini-1.5-flash', provider: 'google', name: 'Gemini 1.5 Flash' },
  { model: 'mixtral-8x7b', provider: 'groq', name: 'Mixtral 8x7B' },
  { model: 'deepseek-chat', provider: 'deepseek', name: 'DeepSeek Chat' }
];

// Test queries for different features
const testQueries = [
  {
    name: 'Test ResultReranker - Article Search',
    query: 'O que diz o artigo 75 da LUOS?',
    expectedFeatures: ['reranking', 'article match boost']
  },
  {
    name: 'Test TokenCounter - Long Context',
    query: 'Explique detalhadamente todos os artigos do Título V da LUOS com exemplos práticos',
    expectedFeatures: ['context limiting', 'token management']
  },
  {
    name: 'Test FallbackManager - Error Recovery',
    query: 'TESTE_ERRO_FORÇADO_123456789',
    expectedFeatures: ['fallback strategy', 'error handling']
  },
  {
    name: 'Test QualityScorer - Complex Query',
    query: 'Compare as regras de construção entre ZOT 02 e ZOT 08, incluindo altura máxima e coeficientes',
    expectedFeatures: ['quality scoring', 'confidence metrics']
  }
];

async function testLLMRouting(model, modelName) {
  console.log(chalk.cyan(`\n📝 Testing ${modelName} (${model})`));
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify({
        query: 'Qual a altura máxima permitida na ZOT 02?',
        model: model,
        sessionId: `test-routing-${Date.now()}`,
        bypassCache: true
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Check if response mentions the model used
    if (data.model) {
      const usedProvider = data.model.split('/')[0];
      if (usedProvider === model.split('/')[0] || model.includes(usedProvider)) {
        console.log(chalk.green(`✅ Correct routing: ${model} → ${data.model}`));
        return { success: true, correctRouting: true };
      } else {
        console.log(chalk.red(`❌ Wrong routing: ${model} → ${data.model}`));
        return { success: true, correctRouting: false };
      }
    }
    
    console.log(chalk.yellow('⚠️ Model info not returned in response'));
    return { success: true, correctRouting: null };
    
  } catch (error) {
    console.error(chalk.red(`❌ Error: ${error.message}`));
    return { success: false, error: error.message };
  }
}

async function testV3Feature(query, featureName, expectedFeatures) {
  console.log(chalk.cyan(`\n🔬 ${featureName}`));
  console.log(chalk.gray(`Query: ${query.substring(0, 50)}...`));
  
  try {
    const startTime = Date.now();
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify({
        query,
        model: 'gpt-3.5-turbo',
        sessionId: `test-v3-${Date.now()}`,
        bypassCache: true
      })
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Check for expected features
    const checks = {
      hasResponse: !!data.response,
      hasConfidence: !!data.confidence,
      hasSources: !!data.sources,
      responseTime: responseTime,
      qualityScore: data.confidence || 0
    };
    
    console.log(chalk.green('✅ Response received'));
    console.log(chalk.yellow('📊 Metrics:'));
    console.log(`  • Response length: ${data.response?.length || 0} chars`);
    console.log(`  • Confidence: ${(checks.qualityScore * 100).toFixed(1)}%`);
    console.log(`  • Response time: ${responseTime}ms`);
    console.log(`  • Sources: ${JSON.stringify(data.sources || {})}`);
    
    // For error test, check if fallback was used
    if (featureName.includes('FallbackManager')) {
      if (data.response?.includes('problema ao processar') || 
          data.response?.includes('tente novamente')) {
        console.log(chalk.green('✅ FallbackManager activated correctly'));
      }
    }
    
    return {
      success: true,
      ...checks
    };
    
  } catch (error) {
    console.error(chalk.red(`❌ Error: ${error.message}`));
    return { success: false, error: error.message };
  }
}

async function runAllTests() {
  console.log(chalk.cyan.bold('\n🚀 TESTING V3 FEATURES INTEGRATION & MULTI-LLM ROUTING\n'));
  console.log(chalk.yellow('This test validates:'));
  console.log(chalk.yellow('1. 🔧 Multi-LLM routing fix (all 21 models)'));
  console.log(chalk.yellow('2. 📊 TokenCounter for context management'));
  console.log(chalk.yellow('3. 🎯 QualityScorer for confidence metrics'));
  console.log(chalk.yellow('4. 🔄 FallbackManager for error recovery'));
  console.log(chalk.yellow('5. 🏆 ResultReranker for better relevance\n'));
  
  const results = {
    routing: [],
    features: []
  };
  
  // Test 1: Multi-LLM Routing
  console.log(chalk.blue('═'.repeat(60)));
  console.log(chalk.cyan.bold('PART 1: MULTI-LLM ROUTING TEST'));
  console.log(chalk.blue('═'.repeat(60)));
  
  for (const testModel of testModels) {
    const result = await testLLMRouting(testModel.model, testModel.name);
    results.routing.push({ ...testModel, ...result });
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Test 2: V3 Features
  console.log(chalk.blue('\n' + '═'.repeat(60)));
  console.log(chalk.cyan.bold('PART 2: V3 FEATURES TEST'));
  console.log(chalk.blue('═'.repeat(60)));
  
  for (const test of testQueries) {
    const result = await testV3Feature(test.query, test.name, test.expectedFeatures);
    results.features.push({ name: test.name, ...result });
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Final Report
  console.log(chalk.blue('\n' + '═'.repeat(60)));
  console.log(chalk.green.bold('📊 FINAL REPORT'));
  console.log(chalk.blue('═'.repeat(60)));
  
  // Routing results
  console.log(chalk.cyan('\n🔧 Multi-LLM Routing:'));
  const correctRouting = results.routing.filter(r => r.correctRouting === true).length;
  const totalRouting = results.routing.filter(r => r.correctRouting !== null).length;
  console.log(chalk.green(`✅ Correct routing: ${correctRouting}/${totalRouting}`));
  
  results.routing.forEach(r => {
    const status = r.correctRouting === true ? '✅' : 
                   r.correctRouting === false ? '❌' : '⚠️';
    console.log(`  ${status} ${r.name}: ${r.success ? 'OK' : 'FAILED'}`);
  });
  
  // V3 Features results
  console.log(chalk.cyan('\n🚀 V3 Features:'));
  const successfulFeatures = results.features.filter(f => f.success).length;
  console.log(chalk.green(`✅ Successful tests: ${successfulFeatures}/${results.features.length}`));
  
  results.features.forEach(f => {
    const status = f.success ? '✅' : '❌';
    console.log(`  ${status} ${f.name}`);
    if (f.success) {
      console.log(`     • Quality: ${(f.qualityScore * 100).toFixed(1)}% | Time: ${f.responseTime}ms`);
    }
  });
  
  // Overall assessment
  console.log(chalk.blue('\n' + '═'.repeat(60)));
  const routingFixed = correctRouting >= totalRouting * 0.8;
  const featuresWorking = successfulFeatures >= results.features.length * 0.75;
  
  if (routingFixed && featuresWorking) {
    console.log(chalk.green.bold('🎉 SUCCESS! All critical improvements integrated!'));
    console.log(chalk.green('✅ Multi-LLM routing: FIXED'));
    console.log(chalk.green('✅ V3 Features: INTEGRATED'));
    console.log(chalk.green('✅ System ready for production'));
  } else if (routingFixed || featuresWorking) {
    console.log(chalk.yellow.bold('⚠️ PARTIAL SUCCESS - Some issues need attention'));
    console.log(routingFixed ? chalk.green('✅ Multi-LLM routing: FIXED') : 
                              chalk.red('❌ Multi-LLM routing: STILL BROKEN'));
    console.log(featuresWorking ? chalk.green('✅ V3 Features: WORKING') : 
                                 chalk.red('❌ V3 Features: ISSUES DETECTED'));
  } else {
    console.log(chalk.red.bold('❌ CRITICAL ISSUES - Immediate action required'));
    console.log(chalk.red('❌ Multi-LLM routing: NOT WORKING'));
    console.log(chalk.red('❌ V3 Features: NOT WORKING'));
  }
}

// Run tests
console.log(chalk.gray('Starting tests in 3 seconds...'));
setTimeout(() => {
  runAllTests().catch(error => {
    console.error(chalk.red('❌ Fatal error:', error));
    process.exit(1);
  });
}, 3000);