#!/usr/bin/env node

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';
import ora from 'ora';

// Load environment variables
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test cases organized by category
const testCases = {
  'Artigos Legais': [
    {
      query: 'O que diz o artigo 75?',
      expectedKeywords: ['regime volumétrico', 'altura', 'edificação'],
      minConfidence: 0.7
    },
    {
      query: 'O que estabelece o artigo 1 da LUOS?',
      expectedKeywords: ['lei', 'uso', 'ocupação', 'solo'],
      minConfidence: 0.7
    },
    {
      query: 'Qual o conteúdo do artigo 3?',
      expectedKeywords: ['princípios', 'fundamentais', 'função social'],
      minConfidence: 0.6
    },
    {
      query: 'O que define o artigo 119?',
      expectedKeywords: ['sistema', 'gestão', 'controle'],
      minConfidence: 0.6
    },
    {
      query: 'Explique o artigo 192',
      expectedKeywords: ['concessão', 'urbanística'],
      minConfidence: 0.6
    }
  ],
  'Regime Urbanístico': [
    {
      query: 'Qual a altura máxima permitida em Petrópolis?',
      expectedKeywords: ['metros', 'altura', 'Petrópolis'],
      minConfidence: 0.7
    },
    {
      query: 'Quais os parâmetros urbanísticos do bairro Centro?',
      expectedKeywords: ['Centro', 'parâmetros', 'zona'],
      minConfidence: 0.6
    },
    {
      query: 'Qual a taxa de ocupação no bairro Menino Deus?',
      expectedKeywords: ['taxa', 'ocupação', 'Menino Deus'],
      minConfidence: 0.6
    },
    {
      query: 'Altura máxima na Cidade Baixa',
      expectedKeywords: ['Cidade Baixa', 'altura', 'metros'],
      minConfidence: 0.6
    },
    {
      query: 'Regime urbanístico da Zona Norte',
      expectedKeywords: ['zona', 'norte', 'parâmetros'],
      minConfidence: 0.5
    }
  ],
  'Proteção e Riscos': [
    {
      query: 'Quais bairros têm proteção contra enchentes?',
      expectedKeywords: ['proteção', 'enchentes', 'bairros'],
      minConfidence: 0.8
    },
    {
      query: 'Áreas de risco de inundação em Porto Alegre',
      expectedKeywords: ['risco', 'inundação', 'áreas'],
      minConfidence: 0.7
    },
    {
      query: 'Bairros com risco de deslizamento',
      expectedKeywords: ['risco', 'deslizamento', 'bairros'],
      minConfidence: 0.6
    },
    {
      query: 'O Centro Histórico tem proteção contra enchentes?',
      expectedKeywords: ['Centro Histórico', 'proteção', 'enchentes'],
      minConfidence: 0.7
    },
    {
      query: 'Navegantes está protegido de inundações?',
      expectedKeywords: ['Navegantes', 'proteção', 'inundação'],
      minConfidence: 0.7
    }
  ],
  'Zonas e ZOTs': [
    {
      query: 'O que é a ZOT-04?',
      expectedKeywords: ['ZOT', 'zona', 'ordenamento'],
      minConfidence: 0.6
    },
    {
      query: 'Quais são os parâmetros da ZOT-08?',
      expectedKeywords: ['ZOT', 'parâmetros', 'altura'],
      minConfidence: 0.6
    },
    {
      query: 'Diferença entre ZOT-01 e ZOT-02',
      expectedKeywords: ['ZOT', 'diferença', 'zona'],
      minConfidence: 0.5
    },
    {
      query: 'Bairros que pertencem à ZOT-13',
      expectedKeywords: ['ZOT', 'bairros', 'zona'],
      minConfidence: 0.5
    },
    {
      query: 'Altura máxima na ZOT-08.1',
      expectedKeywords: ['ZOT', 'altura', 'metros'],
      minConfidence: 0.6
    }
  ],
  'Conceitos Urbanísticos': [
    {
      query: 'O que é concessão urbanística?',
      expectedKeywords: ['concessão', 'urbanística', 'instrumento'],
      minConfidence: 0.7
    },
    {
      query: 'Explique o que é certificação em sustentabilidade ambiental',
      expectedKeywords: ['certificação', 'sustentabilidade', 'ambiental'],
      minConfidence: 0.7
    },
    {
      query: 'O que é outorga onerosa?',
      expectedKeywords: ['outorga', 'onerosa', 'contrapartida'],
      minConfidence: 0.6
    },
    {
      query: 'Defina taxa de permeabilidade',
      expectedKeywords: ['taxa', 'permeabilidade', 'solo'],
      minConfidence: 0.6
    },
    {
      query: 'O que são áreas non aedificandi?',
      expectedKeywords: ['non aedificandi', 'construção', 'proibida'],
      minConfidence: 0.5
    }
  ]
};

// Test a single query
async function testQuery(query, expectedKeywords, minConfidence) {
  const spinner = ora(`Testing: "${query}"`).start();
  
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: query,
        bypassCache: true
      })
    });

    if (!response.ok) {
      spinner.fail(`HTTP ${response.status}`);
      return {
        query,
        success: false,
        error: `HTTP ${response.status}`,
        confidence: 0,
        hasKeywords: false
      };
    }

    const data = await response.json();
    
    // Check confidence
    const confidenceMet = data.confidence >= minConfidence;
    
    // Check for expected keywords
    const responseText = (data.response || '').toLowerCase();
    const foundKeywords = expectedKeywords.filter(keyword => 
      responseText.includes(keyword.toLowerCase())
    );
    const hasKeywords = foundKeywords.length > 0;
    
    // Check if using RAG pipeline
    const isRealRAG = data.agentTrace && 
      data.agentTrace.some(trace => 
        trace.type === 'rag-pipeline' || 
        trace.steps?.includes('embedding_generation')
      );
    
    const success = confidenceMet && hasKeywords && isRealRAG;
    
    if (success) {
      spinner.succeed(chalk.green(`✅ Confidence: ${data.confidence}, Keywords: ${foundKeywords.join(', ')}`));
    } else {
      const issues = [];
      if (!confidenceMet) issues.push(`Low confidence: ${data.confidence}`);
      if (!hasKeywords) issues.push(`Missing keywords`);
      if (!isRealRAG) issues.push(`Not using RAG pipeline`);
      spinner.warn(chalk.yellow(`⚠️ ${issues.join(', ')}`));
    }
    
    return {
      query,
      success,
      confidence: data.confidence,
      hasKeywords,
      foundKeywords,
      isRealRAG,
      responsePreview: responseText.substring(0, 100)
    };
    
  } catch (error) {
    spinner.fail(chalk.red(`Error: ${error.message}`));
    return {
      query,
      success: false,
      error: error.message,
      confidence: 0,
      hasKeywords: false
    };
  }
}

// Run all tests
async function runQualityTests() {
  console.log(chalk.cyan.bold('\n🧪 RAG Quality Test Suite\n'));
  console.log('=' .repeat(60));
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    byCategory: {}
  };
  
  for (const [category, tests] of Object.entries(testCases)) {
    console.log(chalk.blue.bold(`\n📂 ${category}`));
    console.log('-' .repeat(40));
    
    const categoryResults = {
      total: tests.length,
      passed: 0,
      failed: 0
    };
    
    for (const test of tests) {
      const result = await testQuery(
        test.query, 
        test.expectedKeywords, 
        test.minConfidence
      );
      
      results.total++;
      categoryResults.total = tests.length;
      
      if (result.success) {
        results.passed++;
        categoryResults.passed++;
      } else {
        results.failed++;
        categoryResults.failed++;
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Category summary
    const passRate = ((categoryResults.passed / categoryResults.total) * 100).toFixed(1);
    const color = passRate >= 80 ? chalk.green : passRate >= 60 ? chalk.yellow : chalk.red;
    console.log(color(`\n📊 ${category}: ${passRate}% (${categoryResults.passed}/${categoryResults.total})`));
    
    results.byCategory[category] = categoryResults;
  }
  
  // Overall summary
  console.log('\n' + '=' .repeat(60));
  console.log(chalk.cyan.bold('📊 OVERALL RESULTS'));
  console.log('=' .repeat(60));
  
  const overallPassRate = ((results.passed / results.total) * 100).toFixed(1);
  const overallColor = overallPassRate >= 80 ? chalk.green : overallPassRate >= 60 ? chalk.yellow : chalk.red;
  
  console.log(`Total Tests: ${results.total}`);
  console.log(chalk.green(`✅ Passed: ${results.passed}`));
  console.log(chalk.red(`❌ Failed: ${results.failed}`));
  console.log(overallColor.bold(`\n🎯 Overall Pass Rate: ${overallPassRate}%`));
  
  // Category breakdown
  console.log('\n📈 Performance by Category:');
  for (const [category, catResults] of Object.entries(results.byCategory)) {
    const rate = ((catResults.passed / catResults.total) * 100).toFixed(1);
    const color = rate >= 80 ? chalk.green : rate >= 60 ? chalk.yellow : chalk.red;
    console.log(color(`  ${category}: ${rate}%`));
  }
  
  // Recommendations
  console.log('\n💡 Recommendations:');
  if (overallPassRate < 60) {
    console.log(chalk.yellow('  • Expand knowledge base with more documents'));
    console.log(chalk.yellow('  • Process specific articles mentioned in queries'));
    console.log(chalk.yellow('  • Improve embedding quality for better matching'));
  } else if (overallPassRate < 80) {
    console.log(chalk.yellow('  • Fine-tune GPT prompts for better responses'));
    console.log(chalk.yellow('  • Add more context to document chunks'));
    console.log(chalk.yellow('  • Optimize similarity thresholds'));
  } else {
    console.log(chalk.green('  • System performing well!'));
    console.log(chalk.green('  • Consider adding more complex test cases'));
    console.log(chalk.green('  • Monitor performance over time'));
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log(chalk.cyan('✨ Test suite completed!'));
}

// Install required packages if missing
async function checkDependencies() {
  try {
    await import('chalk');
    await import('ora');
  } catch {
    console.log('Installing required packages...');
    const { exec } = await import('child_process');
    await new Promise((resolve) => {
      exec('npm install chalk ora', (error) => {
        if (error) console.error('Error installing packages:', error);
        resolve();
      });
    });
  }
}

// Main execution
async function main() {
  await checkDependencies();
  await runQualityTests();
}

main().catch(console.error);