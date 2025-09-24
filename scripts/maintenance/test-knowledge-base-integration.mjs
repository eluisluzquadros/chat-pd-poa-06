#!/usr/bin/env node

import fetch from 'node-fetch';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(chalk.red('❌ Missing Supabase configuration'));
  process.exit(1);
}

// Queries específicas para testar integração com knowledge base
const KNOWLEDGE_BASE_TESTS = [
  {
    id: 'kb-1',
    name: 'Resumo Plano Diretor',
    query: 'resuma o plano diretor em até 25 palavras',
    expectedSources: ['document_embeddings', 'document_sections'],
    mustNotBe: 'BETA_RESPONSE',
    category: 'Knowledge Base Integration'
  },
  {
    id: 'kb-2', 
    name: 'Artigo LUOS Certificação',
    query: 'Qual artigo da LUOS trata da Certificação em Sustentabilidade Ambiental?',
    expectedContent: ['Art. 81', 'LUOS', 'Certificação'],
    category: 'Legal Citations'
  },
  {
    id: 'kb-3',
    name: 'Construção Petrópolis',
    query: 'o que posso construir no bairro petrópolis',
    expectedContent: ['Petrópolis', 'ZOT'],
    mustNotBe: 'BETA_RESPONSE',
    category: 'Urban Planning'
  },
  {
    id: 'kb-4',
    name: 'ZEIS Definição',
    query: 'O que são ZEIS no PDUS?',
    expectedContent: ['ZEIS', 'PDUS', 'Art.'],
    category: 'Legal Definitions'
  },
  {
    id: 'kb-5',
    name: 'Altura Máxima Boa Vista',
    query: 'Altura máxima em Boa Vista',
    expectedContent: ['Boa Vista'],
    mustNotInclude: ['Boa Vista do Sul'],
    category: 'Neighborhood Queries'
  },
  {
    id: 'kb-6',
    name: 'Bairro Inexistente',
    query: 'Vila Nova do Sul existe em Porto Alegre?',
    expectedContent: ['não existe'],
    canBeBeta: true,
    category: 'Invalid Queries'
  }
];

async function testKnowledgeBaseIntegration() {
  console.log(chalk.cyan.bold('\n🧠 TESTE DE INTEGRAÇÃO COM BASE DE CONHECIMENTO\n'));
  console.log(chalk.gray('Validando se os agentes corrigidos acessam corretamente os dados...\n'));
  
  const results = {
    total: KNOWLEDGE_BASE_TESTS.length,
    passed: 0,
    failed: 0,
    dataInvention: 0,
    properKBUsage: 0
  };
  
  for (const test of KNOWLEDGE_BASE_TESTS) {
    process.stdout.write(`${test.id}: ${test.name}... `);
    
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag-v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          query: test.query,
          bypassCache: true,
          model: 'anthropic/claude-3-5-sonnet-20241022',
          options: {
            useAgenticRAG: true,
            useKnowledgeGraph: true,
            useHierarchicalChunks: true
          }
        })
      });
      
      const responseTime = Date.now() - startTime;
      
      if (!response.ok) {
        console.log(chalk.red(`❌ HTTP ${response.status}`));
        results.failed++;
        continue;
      }
      
      const result = await response.json();
      const text = result.response || '';
      const confidence = result.confidence || 0;
      const sources = result.sources || {};
      
      // Verificar critérios
      let passed = true;
      let issues = [];
      
      // Verificar se não é BETA quando não deveria ser
      if (test.mustNotBe === 'BETA_RESPONSE' && text.includes('versão Beta')) {
        passed = false;
        issues.push('Respondeu BETA quando deveria ter dados');
        results.dataInvention++;
      }
      
      // Verificar se pode ser BETA
      if (!test.canBeBeta && text.includes('versão Beta')) {
        passed = false;
        issues.push('BETA_RESPONSE inesperado');
      }
      
      // Verificar conteúdo esperado
      if (test.expectedContent) {
        for (const content of test.expectedContent) {
          if (!text.toLowerCase().includes(content.toLowerCase())) {
            passed = false;
            issues.push(`Missing: ${content}`);
          }
        }
      }
      
      // Verificar conteúdo que não deve incluir
      if (test.mustNotInclude) {
        for (const content of test.mustNotInclude) {
          if (text.includes(content)) {
            passed = false;
            issues.push(`Should not include: ${content}`);
          }
        }
      }
      
      // Verificar uso de fontes
      if (test.expectedSources) {
        const hasProperSources = test.expectedSources.some(source => 
          sources[source] > 0 || text.includes('documento') || text.includes('base de conhecimento')
        );
        if (hasProperSources) {
          results.properKBUsage++;
        }
      }
      
      if (passed) {
        results.passed++;
        console.log(chalk.green(`✅ (${responseTime}ms, conf: ${(confidence * 100).toFixed(0)}%)`));
      } else {
        results.failed++;
        console.log(chalk.red(`❌ (${responseTime}ms)`));
        issues.forEach(issue => {
          console.log(chalk.red(`   ${issue}`));
        });
      }
      
    } catch (error) {
      console.log(chalk.red(`❌ Error: ${error.message}`));
      results.failed++;
    }
    
    // Delay entre testes
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  
  // Resultados finais
  console.log(chalk.cyan('\n' + '═'.repeat(60)));
  console.log(chalk.cyan.bold('📊 RESULTADOS DA INTEGRAÇÃO'));
  console.log(chalk.cyan('═'.repeat(60) + '\n'));
  
  const successRate = (results.passed / results.total * 100).toFixed(0);
  const kbUsageRate = (results.properKBUsage / results.total * 100).toFixed(0);
  const inventionRate = (results.dataInvention / results.total * 100).toFixed(0);
  
  console.log(chalk.bold('Métricas Críticas:'));
  console.log(`  Taxa de Sucesso: ${successRate}%`);
  console.log(`  Uso da Knowledge Base: ${kbUsageRate}%`);
  console.log(`  Taxa de Invenção: ${inventionRate}%`);
  console.log(`  Passed: ${results.passed}/${results.total}`);
  console.log(`  Failed: ${results.failed}/${results.total}`);
  
  // Veredicto
  console.log(chalk.cyan('\n' + '═'.repeat(60)));
  
  if (inventionRate == 0 && successRate >= 80) {
    console.log(chalk.green.bold('✅ KNOWLEDGE BASE TOTALMENTE INTEGRADA'));
    console.log(chalk.green('Agentes acessando dados corretamente, zero invenção.'));
  } else if (inventionRate <= 10 && successRate >= 60) {
    console.log(chalk.yellow.bold('⚠️ INTEGRAÇÃO PARCIAL'));
    console.log(chalk.yellow('Melhorias necessárias na busca.'));
  } else {
    console.log(chalk.red.bold('❌ PROBLEMAS NA INTEGRAÇÃO'));
    console.log(chalk.red('Agentes ainda inventando dados ou não acessando KB.'));
  }
  
  // Salvar relatório
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const reportPath = path.join(__dirname, '../test-reports', `kb-integration-${timestamp}.json`);
  
  try {
    const fs = await import('fs');
    const reportDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      successRate,
      inventionRate,
      kbUsageRate,
      results,
      verdict: inventionRate == 0 && successRate >= 80 ? 'INTEGRATED' : 'NEEDS_WORK'
    }, null, 2));
    
    console.log(chalk.gray(`\n📁 Report saved to: ${reportPath}`));
  } catch (error) {
    console.error(chalk.red(`Failed to save report: ${error.message}`));
  }
}

console.log(chalk.cyan('🚀 Iniciando teste de integração com knowledge base...'));
testKnowledgeBaseIntegration().catch(error => {
  console.error(chalk.red('\n💥 Fatal error:'), error);
  process.exit(1);
});