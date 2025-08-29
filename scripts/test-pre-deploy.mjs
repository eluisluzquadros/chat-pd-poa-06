#!/usr/bin/env node

import fetch from 'node-fetch';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(chalk.red('❌ Missing Supabase configuration'));
  process.exit(1);
}

// Test cases covering critical functionality
const TEST_SUITE = {
  'Performance Tests': [
    {
      name: 'Simple Query Response Time',
      query: 'O que é o PDUS?',
      maxTime: 10000, // 10 seconds max
      checkFor: ['plano diretor']
    },
    {
      name: 'Legal Query with Citation',
      query: 'Qual artigo da LUOS trata da Certificação em Sustentabilidade?',
      maxTime: 15000, // 15 seconds max
      checkFor: ['LUOS', 'Art.', '81']
    },
    {
      name: 'Neighborhood Query',
      query: 'Qual a altura máxima em Boa Vista?',
      maxTime: 12000, // 12 seconds max
      checkFor: ['altura', 'metros']
    }
  ],
  'Citation Tests': [
    {
      name: 'LUOS Article Citation',
      query: 'O que diz o artigo sobre o 4º Distrito na LUOS?',
      checkFor: ['LUOS', 'Art.', '74'],
      mustInclude: 'LUOS'
    },
    {
      name: 'PDUS Article Citation',
      query: 'O que são ZEIS segundo o PDUS?',
      checkFor: ['PDUS', 'Art.', '92'],
      mustInclude: 'PDUS'
    }
  ],
  'Neighborhood Differentiation': [
    {
      name: 'Boa Vista (not Boa Vista do Sul)',
      query: 'Parâmetros urbanísticos de Boa Vista',
      mustNotInclude: 'Boa Vista do Sul',
      checkFor: ['Boa Vista']
    },
    {
      name: 'Non-existent Neighborhood',
      query: 'Vila Nova do Sul existe em Porto Alegre?',
      checkFor: ['não existe'],
      shouldFail: false
    }
  ]
};

async function testQuery(test, category) {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        query: test.query,
        bypassCache: true,
        model: 'anthropic/claude-3-5-sonnet-20241022'
      }),
      timeout: test.maxTime || 20000
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      return {
        name: test.name,
        category,
        success: false,
        error: `HTTP ${response.status}`,
        responseTime
      };
    }

    const result = await response.json();
    const responseText = result.response || '';
    
    // Validate response
    let passed = true;
    let issues = [];
    
    // Check response time
    if (test.maxTime && responseTime > test.maxTime) {
      passed = false;
      issues.push(`Response time ${responseTime}ms exceeded max ${test.maxTime}ms`);
    }
    
    // Check for required content
    if (test.checkFor) {
      for (const check of test.checkFor) {
        if (!responseText.toLowerCase().includes(check.toLowerCase())) {
          passed = false;
          issues.push(`Missing: "${check}"`);
        }
      }
    }
    
    // Check for must include
    if (test.mustInclude && !responseText.includes(test.mustInclude)) {
      passed = false;
      issues.push(`Must include: "${test.mustInclude}"`);
    }
    
    // Check for must not include
    if (test.mustNotInclude && responseText.includes(test.mustNotInclude)) {
      passed = false;
      issues.push(`Must not include: "${test.mustNotInclude}"`);
    }
    
    return {
      name: test.name,
      category,
      success: passed,
      responseTime,
      issues,
      snippet: responseText.substring(0, 150)
    };

  } catch (error) {
    return {
      name: test.name,
      category,
      success: false,
      error: error.message,
      responseTime: Date.now() - startTime
    };
  }
}

async function runTestSuite() {
  console.log(chalk.cyan.bold('\n🧪 PRE-DEPLOYMENT VALIDATION TEST SUITE\n'));
  console.log(chalk.gray('Testing critical functionality before deployment...\n'));
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    avgResponseTime: 0,
    categories: {}
  };
  
  const allResponseTimes = [];
  
  for (const [category, tests] of Object.entries(TEST_SUITE)) {
    console.log(chalk.yellow(`\n📋 ${category}:`));
    
    results.categories[category] = {
      total: tests.length,
      passed: 0,
      failed: 0
    };
    
    for (const test of tests) {
      process.stdout.write(`   ${test.name}... `);
      
      const result = await testQuery(test, category);
      results.total++;
      allResponseTimes.push(result.responseTime);
      
      if (result.success) {
        results.passed++;
        results.categories[category].passed++;
        console.log(chalk.green(`✅ (${result.responseTime}ms)`));
      } else {
        results.failed++;
        results.categories[category].failed++;
        console.log(chalk.red(`❌ (${result.responseTime}ms)`));
        if (result.error) {
          console.log(chalk.red(`      Error: ${result.error}`));
        }
        if (result.issues && result.issues.length > 0) {
          result.issues.forEach(issue => {
            console.log(chalk.red(`      Issue: ${issue}`));
          });
        }
      }
      
      // Add delay between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Calculate average response time
  results.avgResponseTime = Math.round(
    allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length
  );
  
  // Print summary
  console.log(chalk.cyan('\n' + '═'.repeat(60)));
  console.log(chalk.cyan.bold('📊 TEST SUMMARY'));
  console.log(chalk.cyan('═'.repeat(60) + '\n'));
  
  const successRate = (results.passed / results.total * 100).toFixed(1);
  const statusColor = successRate >= 80 ? chalk.green : successRate >= 60 ? chalk.yellow : chalk.red;
  
  console.log(chalk.bold('Overall Results:'));
  console.log(`  Total Tests: ${results.total}`);
  console.log(`  ✅ Passed: ${results.passed} (${chalk.green(successRate + '%')})`);
  console.log(`  ❌ Failed: ${results.failed}`);
  console.log(`  ⏱️  Avg Response Time: ${results.avgResponseTime}ms`);
  
  console.log(chalk.bold('\nBy Category:'));
  for (const [category, stats] of Object.entries(results.categories)) {
    const catRate = (stats.passed / stats.total * 100).toFixed(0);
    const catColor = catRate >= 80 ? chalk.green : catRate >= 60 ? chalk.yellow : chalk.red;
    console.log(`  ${category}: ${catColor(catRate + '%')} (${stats.passed}/${stats.total})`);
  }
  
  // Deployment recommendation
  console.log(chalk.cyan('\n' + '═'.repeat(60)));
  
  if (successRate >= 80 && results.avgResponseTime < 10000) {
    console.log(chalk.green.bold('✅ READY FOR DEPLOYMENT'));
    console.log(chalk.green('All critical tests passed with good performance.'));
    console.log(chalk.gray('\nRun deployment with:'));
    console.log(chalk.gray('  node scripts/deploy-bypass-env.mjs'));
  } else if (successRate >= 60) {
    console.log(chalk.yellow.bold('⚠️  CONDITIONAL DEPLOYMENT'));
    console.log(chalk.yellow('Some tests failed. Review issues before deploying.'));
    if (results.avgResponseTime > 10000) {
      console.log(chalk.yellow('Performance issues detected (avg > 10s).'));
    }
  } else {
    console.log(chalk.red.bold('❌ NOT READY FOR DEPLOYMENT'));
    console.log(chalk.red('Critical tests failed. Fix issues before deploying.'));
  }
  
  // Save test results
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const resultsPath = path.join(__dirname, '..', 'test-reports', `pre-deploy-${timestamp}.json`);
  
  try {
    const fs = await import('fs');
    const reportDir = path.dirname(resultsPath);
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(resultsPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      results,
      recommendation: successRate >= 80 ? 'DEPLOY' : successRate >= 60 ? 'REVIEW' : 'DO_NOT_DEPLOY'
    }, null, 2));
    
    console.log(chalk.gray(`\n📁 Test report saved to: ${resultsPath}`));
  } catch (error) {
    console.error(chalk.red(`Failed to save report: ${error.message}`));
  }
  
  // Exit with appropriate code
  process.exit(successRate >= 60 ? 0 : 1);
}

// Run the test suite
console.log(chalk.cyan('🚀 Starting pre-deployment validation...'));
console.log(chalk.gray('This will test the CURRENT PRODUCTION system.\n'));

runTestSuite().catch(error => {
  console.error(chalk.red('\n💥 Fatal error:'), error);
  process.exit(1);
});