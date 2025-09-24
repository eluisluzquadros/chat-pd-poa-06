#!/usr/bin/env node

/**
 * Script de Teste do Pipeline Agentic-RAG
 * Testa o novo sistema com agentes autônomos
 */

import fetch from 'node-fetch';
import chalk from 'chalk';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Test cases for Agentic-RAG
const TEST_CASES = [
  {
    id: 'legal-1',
    category: 'Legal Citations',
    query: 'Qual o artigo da LUOS que define o Estudo de Impacto de Vizinhança?',
    expected: {
      articles: ['LUOS - Art. 89'],
      concepts: ['EIV'],
      confidence: 0.8
    }
  },
  {
    id: 'legal-2',
    category: 'Legal Citations',
    query: 'Onde estão definidas as ZEIS no PDUS?',
    expected: {
      articles: ['PDUS - Art. 92'],
      concepts: ['ZEIS'],
      confidence: 0.8
    }
  },
  {
    id: 'urban-1',
    category: 'Urban Parameters',
    query: 'Qual a altura máxima permitida no Centro Histórico?',
    expected: {
      locations: ['Centro Histórico'],
      parameters: { altura_maxima: 130 },
      zone: 'ZOT 08.1',
      confidence: 0.7
    }
  },
  {
    id: 'urban-2',
    category: 'Urban Parameters',
    query: 'Quais os parâmetros urbanísticos do bairro Boa Vista?',
    expected: {
      locations: ['Boa Vista'],
      hasParameters: true,
      notLocations: ['Boa Vista do Sul'],
      confidence: 0.6
    }
  },
  {
    id: 'complex-1',
    category: 'Complex Query',
    query: 'Qual o coeficiente de aproveitamento e onde está definida a outorga onerosa?',
    expected: {
      articles: ['LUOS - Art. 86', 'LUOS - Art. 82'],
      hasParameters: true,
      multiAgent: true,
      confidence: 0.7
    }
  },
  {
    id: 'validation-1',
    category: 'Validation Test',
    query: 'O EIV está definido no artigo 90 da LUOS?',
    expected: {
      shouldCorrect: true,
      correctArticle: 'LUOS - Art. 89',
      validation: { requiresRefinement: true }
    }
  },
  {
    id: 'ambiguity-1',
    category: 'Ambiguity Resolution',
    query: 'Qual a altura máxima em Boa Vista?',
    expected: {
      shouldDetectAmbiguity: true,
      possibleLocations: ['Boa Vista', 'Boa Vista do Sul'],
      confidence: 0.5
    }
  },
  {
    id: 'kg-1',
    category: 'Knowledge Graph',
    query: 'Quais conceitos são definidos pelo artigo 89 da LUOS?',
    expected: {
      relationships: [{ source: 'LUOS - Art. 89', target: 'EIV', type: 'DEFINES' }],
      confidence: 0.8
    }
  }
];

/**
 * Call the Agentic-RAG orchestrator
 */
async function callAgenticRAG(query, sessionId = null) {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/orchestrator-master`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        query,
        sessionId: sessionId || `test-session-${Date.now()}`,
        options: {
          skipRefinement: false,
          timeout: 30000
        }
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(chalk.red('Error calling Agentic-RAG:'), error.message);
    return null;
  }
}

/**
 * Validate test result
 */
function validateResult(result, expected) {
  const checks = [];
  
  // Check confidence
  if (expected.confidence) {
    const confidenceMet = result.confidence >= expected.confidence;
    checks.push({
      name: 'Confidence',
      passed: confidenceMet,
      expected: expected.confidence,
      actual: result.confidence
    });
  }
  
  // Check articles
  if (expected.articles) {
    const legalData = result.metadata?.agents_used?.includes('legal') 
      ? result.response : '';
    
    const hasAllArticles = expected.articles.every(article => 
      legalData.includes(article) || result.response?.includes(article)
    );
    
    checks.push({
      name: 'Articles',
      passed: hasAllArticles,
      expected: expected.articles,
      actual: 'Check response text'
    });
  }
  
  // Check concepts
  if (expected.concepts) {
    const hasConcepts = expected.concepts.every(concept =>
      result.response?.toLowerCase().includes(concept.toLowerCase())
    );
    
    checks.push({
      name: 'Concepts',
      passed: hasConcepts,
      expected: expected.concepts,
      actual: 'Check response text'
    });
  }
  
  // Check locations
  if (expected.locations) {
    const hasLocations = expected.locations.every(location =>
      result.response?.includes(location)
    );
    
    checks.push({
      name: 'Locations',
      passed: hasLocations,
      expected: expected.locations,
      actual: 'Check response text'
    });
  }
  
  // Check NOT locations (should not contain)
  if (expected.notLocations) {
    const hasNoWrongLocations = !expected.notLocations.some(location =>
      result.response?.includes(location)
    );
    
    checks.push({
      name: 'Not Locations',
      passed: hasNoWrongLocations,
      expected: `Should not contain: ${expected.notLocations}`,
      actual: hasNoWrongLocations ? 'OK' : 'Contains unwanted locations'
    });
  }
  
  // Check validation
  if (expected.validation) {
    const validationMatch = result.metadata?.validation?.requiresRefinement === 
                          expected.validation.requiresRefinement;
    
    checks.push({
      name: 'Validation',
      passed: validationMatch,
      expected: expected.validation,
      actual: result.metadata?.validation
    });
  }
  
  // Check multi-agent usage
  if (expected.multiAgent) {
    const usedMultipleAgents = result.metadata?.agents_used?.length > 1;
    
    checks.push({
      name: 'Multi-Agent',
      passed: usedMultipleAgents,
      expected: 'Multiple agents',
      actual: result.metadata?.agents_used
    });
  }
  
  // Check ambiguity detection
  if (expected.shouldDetectAmbiguity) {
    const detectedAmbiguity = result.confidence < 0.6 || 
                            result.metadata?.validation?.issues?.some(i => 
                              i.includes('ambiguidade') || i.includes('Ambiguidade')
                            );
    
    checks.push({
      name: 'Ambiguity Detection',
      passed: detectedAmbiguity,
      expected: 'Should detect ambiguity',
      actual: detectedAmbiguity ? 'Detected' : 'Not detected'
    });
  }
  
  const passed = checks.every(c => c.passed);
  const passRate = checks.filter(c => c.passed).length / checks.length;
  
  return {
    passed,
    passRate,
    checks
  };
}

/**
 * Run single test
 */
async function runTest(testCase) {
  console.log(chalk.cyan(`\n🧪 Test: ${testCase.id}`));
  console.log(chalk.gray(`Category: ${testCase.category}`));
  console.log(chalk.gray(`Query: ${testCase.query}`));
  
  const startTime = Date.now();
  const result = await callAgenticRAG(testCase.query);
  const elapsed = Date.now() - startTime;
  
  if (!result) {
    return {
      ...testCase,
      passed: false,
      error: 'Failed to get response',
      elapsed
    };
  }
  
  const validation = validateResult(result, testCase.expected);
  
  // Display results
  console.log(chalk.gray(`\nResponse (${elapsed}ms):`));
  console.log(chalk.white(result.response?.substring(0, 200) + '...'));
  
  console.log(chalk.gray(`\nMetadata:`));
  console.log(chalk.gray(`- Confidence: ${result.confidence?.toFixed(2)}`));
  console.log(chalk.gray(`- Agents: ${result.metadata?.agents_used?.join(', ')}`));
  console.log(chalk.gray(`- Refined: ${result.metadata?.refined || false}`));
  
  console.log(chalk.gray(`\nValidation:`));
  validation.checks.forEach(check => {
    const icon = check.passed ? '✅' : '❌';
    console.log(chalk.gray(`${icon} ${check.name}: ${check.passed ? 'PASS' : 'FAIL'}`));
    if (!check.passed) {
      console.log(chalk.yellow(`   Expected: ${JSON.stringify(check.expected)}`));
      console.log(chalk.yellow(`   Actual: ${JSON.stringify(check.actual)}`));
    }
  });
  
  const finalIcon = validation.passed ? '✅' : '❌';
  const color = validation.passed ? chalk.green : chalk.red;
  console.log(color(`\n${finalIcon} Test ${validation.passed ? 'PASSED' : 'FAILED'} (${(validation.passRate * 100).toFixed(0)}%)`));
  
  return {
    ...testCase,
    passed: validation.passed,
    passRate: validation.passRate,
    confidence: result.confidence,
    elapsed,
    agentsUsed: result.metadata?.agents_used,
    refined: result.metadata?.refined
  };
}

/**
 * Main test runner
 */
async function main() {
  console.log(chalk.bold.cyan('\n🚀 TESTING AGENTIC-RAG PIPELINE\n'));
  console.log(chalk.yellow('Testing new orchestrator with autonomous agents...\n'));
  
  const results = [];
  
  // Run tests
  for (const testCase of TEST_CASES) {
    const result = await runTest(testCase);
    results.push(result);
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Summary statistics
  console.log(chalk.bold.cyan('\n' + '='.repeat(70)));
  console.log(chalk.bold.cyan('📊 TEST SUMMARY'));
  console.log(chalk.bold.cyan('='.repeat(70) + '\n'));
  
  // By category
  const categories = [...new Set(results.map(r => r.category))];
  categories.forEach(category => {
    const catResults = results.filter(r => r.category === category);
    const passed = catResults.filter(r => r.passed).length;
    const total = catResults.length;
    const rate = (passed / total) * 100;
    
    const icon = rate >= 80 ? '✅' : rate >= 60 ? '⚠️' : '❌';
    console.log(`${icon} ${category}: ${passed}/${total} (${rate.toFixed(0)}%)`);
  });
  
  // Overall statistics
  console.log(chalk.bold.cyan('\n' + '='.repeat(70)));
  console.log(chalk.bold.cyan('📈 OVERALL METRICS'));
  console.log(chalk.bold.cyan('='.repeat(70) + '\n'));
  
  const totalPassed = results.filter(r => r.passed).length;
  const totalTests = results.length;
  const overallRate = (totalPassed / totalTests) * 100;
  
  console.log(`Total Tests: ${totalTests}`);
  console.log(`${chalk.green('✅ Passed:')} ${totalPassed}`);
  console.log(`${chalk.red('❌ Failed:')} ${totalTests - totalPassed}`);
  console.log(`\nSuccess Rate: ${chalk.bold(overallRate.toFixed(1) + '%')}`);
  
  // Performance metrics
  const avgElapsed = results.reduce((sum, r) => sum + r.elapsed, 0) / results.length;
  const avgConfidence = results.reduce((sum, r) => sum + (r.confidence || 0), 0) / results.length;
  
  console.log(`\nAvg Response Time: ${avgElapsed.toFixed(0)}ms`);
  console.log(`Avg Confidence: ${avgConfidence.toFixed(2)}`);
  
  // Agent usage
  const agentUsage = {};
  results.forEach(r => {
    (r.agentsUsed || []).forEach(agent => {
      agentUsage[agent] = (agentUsage[agent] || 0) + 1;
    });
  });
  
  console.log('\nAgent Usage:');
  Object.entries(agentUsage).forEach(([agent, count]) => {
    console.log(`  - ${agent}: ${count} times`);
  });
  
  // Refinement stats
  const refinedCount = results.filter(r => r.refined).length;
  console.log(`\nRefinement Used: ${refinedCount}/${totalTests} tests`);
  
  // Final assessment
  console.log(chalk.bold.cyan('\n' + '='.repeat(70)));
  if (overallRate >= 80) {
    console.log(chalk.green.bold('🎉 EXCELLENT! Agentic-RAG is performing well!'));
  } else if (overallRate >= 60) {
    console.log(chalk.yellow.bold('⚠️ ACCEPTABLE. Some improvements needed.'));
  } else {
    console.log(chalk.red.bold('❌ NEEDS WORK. Significant issues detected.'));
  }
  console.log(chalk.bold.cyan('='.repeat(70) + '\n'));
}

// Run tests
main().catch(error => {
  console.error(chalk.red('\n❌ Fatal error:'), error);
  process.exit(1);
});