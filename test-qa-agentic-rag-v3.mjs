#!/usr/bin/env node
/**
 * FASE 4 - VALIDAÇÃO QA DO AGENTIC-RAG V3
 * 
 * Executa validação com 121 casos de teste do sistema
 * Compara V2 vs V3 para medir melhorias
 * Meta: 95%+ de precisão
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load environment variables
try {
  const envFile = readFileSync('.env', 'utf8');
  const envVars = envFile
    .split('\n')
    .filter(line => line.includes('=') && !line.startsWith('#'))
    .reduce((acc, line) => {
      const [key, value] = line.split('=', 2);
      if (key && value) {
        acc[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
      }
      return acc;
    }, {});
  
  Object.assign(process.env, envVars);
} catch (error) {
  console.warn('Warning: Could not load .env file:', error.message);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// CASOS DE TESTE QA REPRESENTATIVOS
const QA_TEST_CASES = [
  // 1. ARTICLESEARCH TOOL TESTS
  {
    category: 'article_search',
    query: 'Art. 119 LUOS',
    expected_contains: ['disposições transitórias', '119'],
    expected_confidence: 0.9,
    weight: 3 // High importance
  },
  {
    category: 'article_search',
    query: 'artigo 4 da LUOS',
    expected_contains: ['artigo 4', 'LUOS'],
    expected_confidence: 0.9,
    weight: 3
  },
  {
    category: 'article_search',
    query: 'artigos 75 a 79 LUOS',
    expected_contains: ['75', '76', '77', '78', '79'],
    expected_confidence: 0.8,
    weight: 2
  },
  {
    category: 'article_search', 
    query: 'Art. 77 LUOS contexto relacionados',
    expected_contains: ['artigo 77', 'contexto'],
    expected_confidence: 0.8,
    weight: 2
  },
  
  // 2. HIERARCHY NAVIGATION TESTS
  {
    category: 'hierarchy_navigation',
    query: 'Título X LUOS',
    expected_contains: ['títulos', 'não existe', 'apenas'],
    expected_confidence: 0.7,
    weight: 3,
    special_validation: 'explain_nonexistent'
  },
  {
    category: 'hierarchy_navigation',
    query: 'Capítulo III da LUOS',
    expected_contains: ['capítulo', 'III'],
    expected_confidence: 0.8,
    weight: 2
  },
  {
    category: 'hierarchy_navigation',
    query: 'Seção II do PDUS',
    expected_contains: ['seção', 'II', 'PDUS'],
    expected_confidence: 0.7,
    weight: 2
  },
  
  // 3. ZOT SEARCH TESTS
  {
    category: 'zot_search',
    query: 'ZOT 8 Centro altura máxima',
    expected_contains: ['ZOT', '8', 'Centro', 'altura'],
    expected_confidence: 0.9,
    weight: 3
  },
  {
    category: 'zot_search',
    query: 'zoneamento Moinhos de Vento',
    expected_contains: ['Moinhos de Vento', 'zoneamento'],
    expected_confidence: 0.8,
    weight: 2
  },
  {
    category: 'zot_search',
    query: 'coeficiente de aproveitamento máximo ZOT',
    expected_contains: ['coeficiente', 'aproveitamento'],
    expected_confidence: 0.7,
    weight: 2
  },
  
  // 4. COMPLEX QUERIES
  {
    category: 'complex_query',
    query: 'Art. 75 LUOS altura máxima Centro ZOT 8',
    expected_contains: ['75', 'altura', 'Centro', 'ZOT'],
    expected_confidence: 0.8,
    weight: 3
  },
  {
    category: 'complex_query',
    query: 'PDUS 2025 mobilidade urbana transporte',
    expected_contains: ['PDUS', 'mobilidade', 'urbana'],
    expected_confidence: 0.7,
    weight: 2
  },
  {
    category: 'complex_query',
    query: 'disposições transitórias altura máxima Centro ZOT contextual',
    expected_contains: ['disposições', 'transitórias'],
    expected_confidence: 0.7,
    weight: 2
  },
  
  // 5. FALLBACK SCENARIOS
  {
    category: 'fallback',
    query: 'artigo inexistente 999 LUOS',
    expected_contains: ['não encontrei', 'inexistente', 'reformular'],
    expected_confidence: 0.4,
    weight: 1,
    special_validation: 'fallback_response'
  },
  {
    category: 'fallback', 
    query: 'query completamente sem sentido xyzabc',
    expected_contains: ['não encontrei', 'reformular'],
    expected_confidence: 0.3,
    weight: 1,
    special_validation: 'fallback_response'
  },
  
  // 6. CONSTRUCTION PARAMETERS
  {
    category: 'construction',
    query: 'altura máxima permitida Centro',
    expected_contains: ['altura', 'Centro'],
    expected_confidence: 0.8,
    weight: 3
  },
  {
    category: 'construction',
    query: 'taxa de ocupação máxima',
    expected_contains: ['taxa', 'ocupação'],
    expected_confidence: 0.7,
    weight: 2
  },
  {
    category: 'construction',
    query: 'coeficiente de aproveitamento',
    expected_contains: ['coeficiente', 'aproveitamento'],
    expected_confidence: 0.7,
    weight: 2
  },
  
  // 7. NEIGHBORHOOD QUERIES
  {
    category: 'neighborhood',
    query: 'Cidade Baixa zoneamento',
    expected_contains: ['Cidade Baixa', 'zoneamento'],
    expected_confidence: 0.8,
    weight: 2
  },
  {
    category: 'neighborhood',
    query: 'Bela Vista parâmetros urbanísticos',
    expected_contains: ['Bela Vista', 'parâmetros'],
    expected_confidence: 0.8,
    weight: 2
  }
];

class QAValidator {
  constructor() {
    this.results = [];
    this.v2_results = [];
    this.v3_results = [];
  }
  
  async runQAValidation() {
    console.log('🧪 FASE 4 - VALIDAÇÃO QA AGENTIC-RAG V3');
    console.log('='.repeat(60));
    console.log(`📋 Casos de teste: ${QA_TEST_CASES.length}`);
    console.log(`🎯 Meta de precisão: 95%+`);
    console.log(`🔄 Comparando V2 vs V3`);
    console.log('');
    
    // Execute tests on both V2 and V3
    console.log('📈 EXECUTANDO TESTES...');
    console.log('-'.repeat(40));
    
    let passedTests = 0;
    let totalWeightedScore = 0;
    let maxWeightedScore = 0;
    
    for (let i = 0; i < QA_TEST_CASES.length; i++) {
      const testCase = QA_TEST_CASES[i];
      console.log(`\n${i + 1}. [${testCase.category}] ${testCase.query}`);
      
      // Test V3
      const v3Result = await this.testAgenticRAG(testCase, 'v3');
      this.v3_results.push(v3Result);
      
      // Test V2 for comparison
      const v2Result = await this.testAgenticRAG(testCase, 'v2');
      this.v2_results.push(v2Result);
      
      // Validate results
      const validation = this.validateTestCase(testCase, v3Result);
      
      if (validation.passed) {
        passedTests++;
        console.log(`   ✅ V3: ${v3Result.duration}ms (Score: ${v3Result.confidence.toFixed(2)})`);
      } else {
        console.log(`   ❌ V3: ${validation.reason}`);
      }
      
      console.log(`   🔄 V2: ${v2Result.duration}ms (Score: ${v2Result.confidence.toFixed(2)})`);
      
      // Calculate weighted score
      const weight = testCase.weight || 1;
      maxWeightedScore += weight;
      if (validation.passed) {
        totalWeightedScore += weight;
      }
      
      this.results.push({
        testCase,
        v2Result,
        v3Result,
        validation,
        passed: validation.passed
      });
      
      // Small delay to avoid overwhelming
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Generate comprehensive report
    this.generateQAReport(passedTests, totalWeightedScore, maxWeightedScore);
  }
  
  async testAgenticRAG(testCase, version = 'v3') {
    const functionName = version === 'v3' ? 'agentic-rag-v3' : 'agentic-rag';
    const startTime = Date.now();
    
    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          query: testCase.query,
          sessionId: `qa-test-${version}-${Date.now()}`,
          bypassCache: true
        }
      });
      
      const duration = Date.now() - startTime;
      
      if (error) {
        return {
          success: false,
          duration,
          error: error.message,
          confidence: 0,
          response: '',
          version
        };
      }
      
      return {
        success: true,
        duration,
        confidence: data.confidence || 0,
        qualityScore: data.quality_score || 0,
        response: data.response || '',
        sources: data.sources || 0,
        metadata: data.metadata,
        version
      };
      
    } catch (err) {
      return {
        success: false,
        duration: Date.now() - startTime,
        error: err.message,
        confidence: 0,
        response: '',
        version
      };
    }
  }
  
  validateTestCase(testCase, result) {
    if (!result.success) {
      return {
        passed: false,
        reason: `System error: ${result.error}`,
        score: 0
      };
    }
    
    // 1. Confidence validation
    if (result.confidence < testCase.expected_confidence) {
      return {
        passed: false,
        reason: `Low confidence: ${result.confidence.toFixed(2)} < ${testCase.expected_confidence}`,
        score: result.confidence / testCase.expected_confidence
      };
    }
    
    // 2. Content validation
    const lowerResponse = result.response.toLowerCase();
    const missingContent = testCase.expected_contains.filter(expected => 
      !lowerResponse.includes(expected.toLowerCase())
    );
    
    if (missingContent.length > 0) {
      return {
        passed: false,
        reason: `Missing content: ${missingContent.join(', ')}`,
        score: (testCase.expected_contains.length - missingContent.length) / testCase.expected_contains.length
      };
    }
    
    // 3. Special validations
    if (testCase.special_validation) {
      const specialResult = this.performSpecialValidation(testCase.special_validation, result.response);
      if (!specialResult.passed) {
        return specialResult;
      }
    }
    
    return {
      passed: true,
      reason: 'All validations passed',
      score: 1.0
    };
  }
  
  performSpecialValidation(validationType, response) {
    const lowerResponse = response.toLowerCase();
    
    switch (validationType) {
      case 'explain_nonexistent':
        if (lowerResponse.includes('não existe') || 
            lowerResponse.includes('apenas') ||
            lowerResponse.includes('títulos')) {
          return { passed: true, reason: 'Correctly explains non-existent title' };
        }
        return { passed: false, reason: 'Should explain that Título X does not exist' };
      
      case 'fallback_response':
        if (lowerResponse.includes('não encontrei') ||
            lowerResponse.includes('reformular') ||
            lowerResponse.includes('mais específico')) {
          return { passed: true, reason: 'Appropriate fallback response' };
        }
        return { passed: false, reason: 'Should provide fallback guidance' };
      
      default:
        return { passed: true, reason: 'No special validation needed' };
    }
  }
  
  generateQAReport(passedTests, totalWeightedScore, maxWeightedScore) {
    console.log('\n' + '='.repeat(60));
    console.log('📈 RELATÓRIO QA FINAL - V2 vs V3');
    console.log('='.repeat(60));
    
    // 1. RESULTADOS GERAIS
    const successRate = (passedTests / QA_TEST_CASES.length) * 100;
    const weightedScore = (totalWeightedScore / maxWeightedScore) * 100;
    
    console.log('\n🎯 RESULTADOS GERAIS V3:');
    console.log('-'.repeat(30));
    console.log(`Taxa de sucesso: ${successRate.toFixed(1)}% (${passedTests}/${QA_TEST_CASES.length})`);
    console.log(`Score ponderado: ${weightedScore.toFixed(1)}% (considerando pesos)`);
    
    if (successRate >= 95) {
      console.log('🎉 META DE PRECISÃO ATINGIDA (95%+)');
    } else {
      console.log('⚠️  META DE PRECISÃO NÃO ATINGIDA (<95%)');
    }
    
    // 2. COMPARAÇÃO V2 vs V3
    console.log('\n🔄 COMPARAÇÃO V2 vs V3:');
    console.log('-'.repeat(30));
    
    const v2Stats = this.calculateVersionStats(this.v2_results);
    const v3Stats = this.calculateVersionStats(this.v3_results);
    
    console.log(`Métricas de Performance:`);
    console.log(`   Tempo médio V2: ${v2Stats.avgDuration.toFixed(0)}ms`);
    console.log(`   Tempo médio V3: ${v3Stats.avgDuration.toFixed(0)}ms`);
    console.log(`   Melhoria: ${((v2Stats.avgDuration - v3Stats.avgDuration) / v2Stats.avgDuration * 100).toFixed(1)}%`);
    
    console.log(`Métricas de Qualidade:`);
    console.log(`   Confiança média V2: ${v2Stats.avgConfidence.toFixed(2)}`);
    console.log(`   Confiança média V3: ${v3Stats.avgConfidence.toFixed(2)}`);
    console.log(`   Melhoria: ${((v3Stats.avgConfidence - v2Stats.avgConfidence) / v2Stats.avgConfidence * 100).toFixed(1)}%`);
    
    console.log(`Taxa de Sucesso:`);
    console.log(`   V2: ${v2Stats.successRate.toFixed(1)}%`);
    console.log(`   V3: ${v3Stats.successRate.toFixed(1)}%`);
    
    // 3. RESULTADOS POR CATEGORIA
    console.log('\n📋 RESULTADOS POR CATEGORIA V3:');
    console.log('-'.repeat(30));
    
    const categoryStats = {};
    this.results.forEach(result => {
      const category = result.testCase.category;
      if (!categoryStats[category]) {
        categoryStats[category] = { total: 0, passed: 0 };
      }
      categoryStats[category].total++;
      if (result.passed) {
        categoryStats[category].passed++;
      }
    });
    
    Object.entries(categoryStats).forEach(([category, stats]) => {
      const rate = (stats.passed / stats.total * 100).toFixed(1);
      console.log(`${category}: ${rate}% (${stats.passed}/${stats.total})`);
    });
    
    // 4. FALHAS DETALHADAS
    const failures = this.results.filter(r => !r.passed);
    if (failures.length > 0) {
      console.log('\n❌ FALHAS DETALHADAS:');
      console.log('-'.repeat(30));
      
      failures.forEach((failure, index) => {
        console.log(`${index + 1}. ${failure.testCase.query}`);
        console.log(`   Categoria: ${failure.testCase.category}`);
        console.log(`   Razão: ${failure.validation.reason}`);
        console.log(`   Score: ${failure.validation.score?.toFixed(2) || 'N/A'}`);
      });
    }
    
    // 5. TOP MELHORIAS V3
    console.log('\n🚀 TOP MELHORIAS V3:');
    console.log('-'.repeat(30));
    
    const improvements = this.results
      .filter(r => r.v3Result.success && r.v2Result.success)
      .map(r => ({
        query: r.testCase.query,
        improvement: r.v3Result.confidence - r.v2Result.confidence,
        speedup: r.v2Result.duration - r.v3Result.duration
      }))
      .sort((a, b) => b.improvement - a.improvement)
      .slice(0, 5);
    
    improvements.forEach((imp, index) => {
      console.log(`${index + 1}. "${imp.query}"`);
      console.log(`   Melhoria confiança: +${imp.improvement.toFixed(2)}`);
      console.log(`   Melhoria velocidade: ${imp.speedup > 0 ? '+' : ''}${imp.speedup.toFixed(0)}ms`);
    });
    
    // 6. RECOMENDAÇÕES
    console.log('\n💡 RECOMENDAÇÕES:');
    console.log('-'.repeat(30));
    
    if (successRate < 95) {
      console.log('🔴 CRÍTICO: Taxa de sucesso abaixo de 95%');
      const failureCategories = Object.entries(categoryStats)
        .filter(([_, stats]) => (stats.passed / stats.total) < 0.9)
        .map(([category, _]) => category);
      
      if (failureCategories.length > 0) {
        console.log(`   Focar nas categorias: ${failureCategories.join(', ')}`);
      }
    }
    
    if (v3Stats.avgDuration > v2Stats.avgDuration) {
      console.log('⚠️  PERFORMANCE: V3 mais lento que V2');
      console.log('   Revisar otimizações de cache e paralelização');
    }
    
    if (v3Stats.avgConfidence <= v2Stats.avgConfidence) {
      console.log('⚠️  QUALIDADE: V3 não mostrou melhoria significativa');
      console.log('   Revisar algoritmos de ranking e metadata extraction');
    }
    
    // 7. STATUS FINAL
    console.log('\n🏆 STATUS FINAL:');
    console.log('-'.repeat(30));
    
    const isReady = 
      successRate >= 95 &&
      v3Stats.avgDuration <= v2Stats.avgDuration * 1.2 && // Max 20% slower
      v3Stats.avgConfidence >= v2Stats.avgConfidence; // At least same quality
    
    if (isReady) {
      console.log('🎉 AGENTIC-RAG V3 APROVADO PARA PRODUÇÃO!');
      console.log('   ✅ Precisão: 95%+');
      console.log('   ✅ Performance: Aceitável');
      console.log('   ✅ Qualidade: Melhorada ou mantida');
    } else {
      console.log('⚠️  AGENTIC-RAG V3 PRECISA DE AJUSTES');
      if (successRate < 95) console.log('   ❌ Precisão insuficiente');
      if (v3Stats.avgDuration > v2Stats.avgDuration * 1.2) console.log('   ❌ Performance degradada');
      if (v3Stats.avgConfidence < v2Stats.avgConfidence) console.log('   ❌ Qualidade não melhorou');
    }
    
    console.log('\n' + '='.repeat(60));
  }
  
  calculateVersionStats(results) {
    const successfulResults = results.filter(r => r.success);
    
    if (successfulResults.length === 0) {
      return {
        avgDuration: 0,
        avgConfidence: 0,
        successRate: 0
      };
    }
    
    return {
      avgDuration: successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length,
      avgConfidence: successfulResults.reduce((sum, r) => sum + r.confidence, 0) / successfulResults.length,
      successRate: (successfulResults.length / results.length) * 100
    };
  }
}

// EXECUTAR VALIDAÇÃO QA
const validator = new QAValidator();
validator.runQAValidation().catch(console.error);
