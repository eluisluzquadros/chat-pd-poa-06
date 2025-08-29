#!/usr/bin/env node

import fetch from 'node-fetch';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(chalk.red('❌ Missing Supabase configuration'));
  process.exit(1);
}

// Final test suite
const FINAL_TESTS = [
  {
    id: 'perf-1',
    name: 'Response Time Check',
    query: 'O que é PDUS?',
    maxTime: 15000,
    category: 'Performance'
  },
  {
    id: 'legal-1',
    name: 'LUOS Citation',
    query: 'Qual artigo da LUOS trata da Certificação em Sustentabilidade?',
    checkFor: ['LUOS', 'Art.', '81'],
    category: 'Legal Citations'
  },
  {
    id: 'legal-2',
    name: 'PDUS Citation',
    query: 'O que são ZEIS no PDUS?',
    checkFor: ['PDUS', 'Art.', '92'],
    category: 'Legal Citations'
  },
  {
    id: 'bairro-1',
    name: 'Boa Vista Query',
    query: 'Altura máxima em Boa Vista',
    checkFor: ['Boa Vista'],
    mustNotInclude: 'Boa Vista do Sul',
    category: 'Neighborhoods'
  },
  {
    id: 'bairro-2',
    name: 'Invalid Neighborhood',
    query: 'Vila Nova do Sul existe?',
    checkFor: ['não existe'],
    category: 'Neighborhoods'
  }
];

async function testSingleQuery(test) {
  const startTime = Date.now();
  
  try {
    // Set a hard timeout using Promise.race
    const fetchPromise = fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        query: test.query,
        bypassCache: true,
        model: 'anthropic/claude-3-5-sonnet-20241022'
      })
    });
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), test.maxTime || 20000)
    );
    
    const response = await Promise.race([fetchPromise, timeoutPromise]);
    const responseTime = Date.now() - startTime;
    
    if (!response.ok) {
      return {
        ...test,
        success: false,
        responseTime,
        error: `HTTP ${response.status}`
      };
    }
    
    const result = await response.json();
    const text = result.response || '';
    
    // Check criteria
    let passed = true;
    let issues = [];
    
    if (test.checkFor) {
      for (const check of test.checkFor) {
        if (!text.toLowerCase().includes(check.toLowerCase())) {
          passed = false;
          issues.push(`Missing: ${check}`);
        }
      }
    }
    
    if (test.mustNotInclude && text.includes(test.mustNotInclude)) {
      passed = false;
      issues.push(`Should not include: ${test.mustNotInclude}`);
    }
    
    if (test.maxTime && responseTime > test.maxTime) {
      passed = false;
      issues.push(`Slow: ${responseTime}ms > ${test.maxTime}ms`);
    }
    
    return {
      ...test,
      success: passed,
      responseTime,
      issues,
      snippet: text.substring(0, 100)
    };
    
  } catch (error) {
    return {
      ...test,
      success: false,
      responseTime: Date.now() - startTime,
      error: error.message
    };
  }
}

async function runFinalTests() {
  console.log(chalk.cyan.bold('\n🏆 FINAL VALIDATION TEST SUITE\n'));
  console.log(chalk.gray('Testing system after all fixes and deployments...\n'));
  
  const results = {
    total: FINAL_TESTS.length,
    passed: 0,
    failed: 0,
    byCategory: {}
  };
  
  for (const test of FINAL_TESTS) {
    // Initialize category
    if (!results.byCategory[test.category]) {
      results.byCategory[test.category] = { passed: 0, failed: 0, total: 0 };
    }
    results.byCategory[test.category].total++;
    
    // Run test
    process.stdout.write(`${test.id}: ${test.name}... `);
    const result = await testSingleQuery(test);
    
    if (result.success) {
      results.passed++;
      results.byCategory[test.category].passed++;
      console.log(chalk.green(`✅ (${result.responseTime}ms)`));
    } else {
      results.failed++;
      results.byCategory[test.category].failed++;
      console.log(chalk.red(`❌ (${result.responseTime}ms)`));
      if (result.error) {
        console.log(chalk.red(`   Error: ${result.error}`));
      }
      if (result.issues && result.issues.length > 0) {
        result.issues.forEach(issue => {
          console.log(chalk.red(`   ${issue}`));
        });
      }
    }
    
    // Delay between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Print summary
  console.log(chalk.cyan('\n' + '═'.repeat(60)));
  console.log(chalk.cyan.bold('📊 FINAL RESULTS'));
  console.log(chalk.cyan('═'.repeat(60) + '\n'));
  
  const successRate = (results.passed / results.total * 100).toFixed(0);
  
  console.log(chalk.bold('Overall:'));
  console.log(`  Success Rate: ${successRate}%`);
  console.log(`  Passed: ${results.passed}/${results.total}`);
  console.log(`  Failed: ${results.failed}/${results.total}`);
  
  console.log(chalk.bold('\nBy Category:'));
  for (const [cat, stats] of Object.entries(results.byCategory)) {
    const catRate = (stats.passed / stats.total * 100).toFixed(0);
    const color = catRate >= 80 ? chalk.green : catRate >= 50 ? chalk.yellow : chalk.red;
    console.log(`  ${cat}: ${color(catRate + '%')} (${stats.passed}/${stats.total})`);
  }
  
  // Final verdict
  console.log(chalk.cyan('\n' + '═'.repeat(60)));
  
  if (successRate >= 80) {
    console.log(chalk.green.bold('✅ SYSTEM READY FOR PRODUCTION'));
    console.log(chalk.green('All critical features working correctly.'));
  } else if (successRate >= 60) {
    console.log(chalk.yellow.bold('⚠️ SYSTEM PARTIALLY READY'));
    console.log(chalk.yellow('Some features need attention.'));
  } else {
    console.log(chalk.red.bold('❌ SYSTEM NOT READY'));
    console.log(chalk.red('Critical issues remain.'));
  }
  
  // Save results
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const resultsPath = path.join(__dirname, 'test-reports', `final-${timestamp}.json`);
  
  try {
    const fs = await import('fs');
    const reportDir = path.dirname(resultsPath);
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(resultsPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      successRate,
      results,
      verdict: successRate >= 80 ? 'READY' : successRate >= 60 ? 'PARTIAL' : 'NOT_READY'
    }, null, 2));
    
    console.log(chalk.gray(`\n📁 Report saved to: ${resultsPath}`));
  } catch (error) {
    console.error(chalk.red(`Failed to save report: ${error.message}`));
  }
}

// Run final tests
console.log(chalk.cyan('🚀 Starting final validation...'));
runFinalTests().catch(error => {
  console.error(chalk.red('\n💥 Fatal error:'), error);
  process.exit(1);
});