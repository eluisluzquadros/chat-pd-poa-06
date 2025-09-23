#!/usr/bin/env node

import fetch from 'node-fetch';
import chalk from 'chalk';
import ora from 'ora';
import dotenv from 'dotenv';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(chalk.red('❌ Missing Supabase configuration in .env.local'));
  process.exit(1);
}

// Test cases to validate deployment
const TEST_CASES = [
  {
    id: 'legal-1',
    category: 'Legal Citations',
    query: 'Qual artigo da LUOS trata da Certificação em Sustentabilidade?',
    expectedArticles: ['LUOS - Art. 81, Inciso III'],
    priority: 'HIGH'
  },
  {
    id: 'legal-2',
    category: 'Legal Citations',
    query: 'O que são ZEIS segundo o PDUS?',
    expectedArticles: ['PDUS - Art. 92'],
    priority: 'HIGH'
  },
  {
    id: 'legal-3',
    category: 'Legal Citations',
    query: 'Qual artigo define o EIV?',
    expectedArticles: ['LUOS - Art. 89'],
    priority: 'HIGH'
  },
  {
    id: 'bairro-1',
    category: 'Neighborhood Differentiation',
    query: 'Qual a altura máxima permitida em Boa Vista?',
    checkFor: 'BOA VISTA (não BOA VISTA DO SUL)',
    priority: 'HIGH'
  },
  {
    id: 'bairro-2',
    category: 'Neighborhood Differentiation',
    query: 'Vila Nova do Sul existe em Porto Alegre?',
    expectedError: 'não existe',
    priority: 'MEDIUM'
  },
  {
    id: 'hybrid-1',
    category: 'Hybrid Search',
    query: 'Qual a altura máxima no Centro Histórico e qual artigo define isso?',
    checkFor: ['altura', 'artigo'],
    priority: 'HIGH'
  }
];

// Function to test a single query
async function testQuery(testCase) {
  const spinner = ora(`Testing: ${testCase.query}`).start();
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        query: testCase.query,
        bypassCache: true,
        model: 'anthropic/claude-3-5-sonnet-20241022'
      })
    });

    if (!response.ok) {
      spinner.fail(`HTTP Error: ${response.status}`);
      return {
        ...testCase,
        success: false,
        error: `HTTP ${response.status}`,
        score: 0
      };
    }

    const result = await response.json();
    const responseText = result.response || '';
    
    // Validate result based on test case expectations
    let success = false;
    let score = 0;
    let details = [];

    if (testCase.expectedArticles) {
      // Check for legal article citations
      const foundArticles = testCase.expectedArticles.filter(article => 
        responseText.includes(article) || 
        responseText.includes(article.replace('LUOS - ', '').replace('PDUS - ', ''))
      );
      
      score = (foundArticles.length / testCase.expectedArticles.length) * 100;
      success = score >= 50;
      
      // Extra points for including law name
      if (responseText.includes('LUOS') || responseText.includes('PDUS')) {
        score = Math.min(100, score + 20);
      }
      
      details.push(`Found ${foundArticles.length}/${testCase.expectedArticles.length} articles`);
      if (foundArticles.length > 0) {
        details.push(`Articles: ${foundArticles.join(', ')}`);
      }
    }
    
    if (testCase.checkFor) {
      // Check for specific content
      const checks = Array.isArray(testCase.checkFor) ? testCase.checkFor : [testCase.checkFor];
      const found = checks.filter(check => responseText.toLowerCase().includes(check.toLowerCase()));
      
      score = (found.length / checks.length) * 100;
      success = score >= 50;
      details.push(`Found ${found.length}/${checks.length} expected elements`);
    }
    
    if (testCase.expectedError) {
      // Check for error message
      success = responseText.toLowerCase().includes(testCase.expectedError.toLowerCase());
      score = success ? 100 : 0;
      details.push(success ? 'Error message found' : 'Error message not found');
    }

    if (success) {
      spinner.succeed(`✅ ${testCase.id}: ${score.toFixed(0)}%`);
    } else {
      spinner.fail(`❌ ${testCase.id}: ${score.toFixed(0)}%`);
    }

    return {
      ...testCase,
      success,
      score,
      details,
      responseSnippet: responseText.substring(0, 200) + '...'
    };

  } catch (error) {
    spinner.fail(`Error: ${error.message}`);
    return {
      ...testCase,
      success: false,
      error: error.message,
      score: 0
    };
  }
}

// Main test runner
async function runTests() {
  console.log(chalk.cyan.bold('\n🚀 POST-DEPLOYMENT VALIDATION TEST\n'));
  console.log(chalk.gray(`Testing ${TEST_CASES.length} critical scenarios...\n`));

  const results = {
    byCategory: {},
    overall: {
      total: TEST_CASES.length,
      passed: 0,
      failed: 0,
      averageScore: 0
    }
  };

  // Run tests
  for (const testCase of TEST_CASES) {
    const result = await testQuery(testCase);
    
    // Update category stats
    if (!results.byCategory[testCase.category]) {
      results.byCategory[testCase.category] = {
        total: 0,
        passed: 0,
        failed: 0,
        totalScore: 0
      };
    }
    
    const category = results.byCategory[testCase.category];
    category.total++;
    category.totalScore += result.score;
    
    if (result.success) {
      category.passed++;
      results.overall.passed++;
    } else {
      category.failed++;
      results.overall.failed++;
    }
    
    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Calculate overall average score
  results.overall.averageScore = TEST_CASES.reduce((sum, _, i) => {
    const category = Object.values(results.byCategory)[Math.floor(i / 2)];
    return sum + (category?.totalScore || 0);
  }, 0) / TEST_CASES.length;

  // Print summary
  console.log(chalk.cyan('\n' + '═'.repeat(60)));
  console.log(chalk.cyan.bold('📊 VALIDATION SUMMARY'));
  console.log(chalk.cyan('═'.repeat(60) + '\n'));

  // Overall stats
  const successRate = (results.overall.passed / results.overall.total * 100).toFixed(1);
  const statusColor = successRate >= 80 ? chalk.green : successRate >= 60 ? chalk.yellow : chalk.red;
  
  console.log(chalk.bold('Overall Results:'));
  console.log(`  Total Tests: ${results.overall.total}`);
  console.log(`  ✅ Passed: ${results.overall.passed} (${chalk.green(successRate + '%')})`);
  console.log(`  ❌ Failed: ${results.overall.failed}`);
  console.log(`  📈 Average Score: ${statusColor(results.overall.averageScore.toFixed(1) + '%')}`);

  // Category breakdown
  console.log(chalk.bold('\nBy Category:'));
  for (const [categoryName, stats] of Object.entries(results.byCategory)) {
    const avgScore = (stats.totalScore / stats.total).toFixed(1);
    const categoryColor = avgScore >= 80 ? chalk.green : avgScore >= 60 ? chalk.yellow : chalk.red;
    
    console.log(`\n  ${chalk.bold(categoryName)}:`);
    console.log(`    Tests: ${stats.total}`);
    console.log(`    Passed: ${stats.passed}/${stats.total}`);
    console.log(`    Average Score: ${categoryColor(avgScore + '%')}`);
  }

  // Deployment status
  console.log(chalk.cyan('\n' + '═'.repeat(60)));
  
  if (successRate >= 80) {
    console.log(chalk.green.bold('✅ DEPLOYMENT VALIDATED SUCCESSFULLY!'));
    console.log(chalk.green('All critical features are working as expected.'));
  } else if (successRate >= 60) {
    console.log(chalk.yellow.bold('⚠️ DEPLOYMENT PARTIALLY SUCCESSFUL'));
    console.log(chalk.yellow('Some features need attention. Check the logs above.'));
  } else {
    console.log(chalk.red.bold('❌ DEPLOYMENT VALIDATION FAILED'));
    console.log(chalk.red('Critical issues detected. Review and fix before production use.'));
  }

  // Recommendations
  console.log(chalk.cyan('\n📝 Recommendations:'));
  
  if (results.byCategory['Legal Citations']?.totalScore < 300) {
    console.log(chalk.yellow('  • Legal citations need improvement'));
  }
  
  if (results.byCategory['Neighborhood Differentiation']?.totalScore < 150) {
    console.log(chalk.yellow('  • Neighborhood differentiation needs attention'));
  }
  
  if (results.byCategory['Hybrid Search']?.totalScore < 100) {
    console.log(chalk.yellow('  • Hybrid search functionality should be enhanced'));
  }

  console.log(chalk.gray('\n💡 Run full test suite with: npm run test:integration'));
  
  // Save results
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const resultsPath = path.join(__dirname, '..', 'test-reports', `post-deploy-${timestamp}.json`);
  
  try {
    const fs = await import('fs');
    const reportDir = path.dirname(resultsPath);
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(resultsPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      results,
      testCases: TEST_CASES
    }, null, 2));
    
    console.log(chalk.gray(`\n📁 Detailed report saved to: ${resultsPath}`));
  } catch (error) {
    console.error(chalk.red(`Failed to save report: ${error.message}`));
  }
}

// Run tests
runTests().catch(error => {
  console.error(chalk.red('\n💥 Fatal error:'), error);
  process.exit(1);
});