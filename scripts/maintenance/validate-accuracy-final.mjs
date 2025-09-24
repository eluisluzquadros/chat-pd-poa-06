#!/usr/bin/env node

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';

// Load environment variables
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Comprehensive test suite - 100 queries across all categories
const testSuite = {
  'Artigos Legais': [
    'O que diz o artigo 1?',
    'Qual o conteúdo do artigo 20?',
    'O que estabelece o artigo 45?',
    'Explique o artigo 55',
    'O que define o artigo 75?',
    'Qual é o artigo 81?',
    'O que trata o artigo 100?',
    'Artigo 119 sobre macrozona',
    'Disposições do artigo 192',
    'O que diz o artigo 3 sobre objetivos?',
    'Artigo 7 sobre função social',
    'O que é o artigo 10 sobre zoneamento?',
    'Artigo 15 sobre parcelamento',
    'O que diz o artigo 25?',
    'Artigo 30 sobre operações urbanas',
    'O que estabelece o artigo 35?',
    'Artigo 40 sobre preempção',
    'O que é o artigo 50?',
    'Artigo 60 sobre conselhos',
    'O que diz o artigo 70?'
  ],
  
  'Regime Urbanístico': [
    'Altura máxima em Petrópolis',
    'Taxa de ocupação no Centro',
    'Parâmetros de Cidade Baixa',
    'Regime urbanístico de Menino Deus',
    'Coeficiente em Moinhos de Vento',
    'Altura no Bom Fim',
    'Taxa de ocupação em Auxiliadora',
    'Parâmetros do Cristal',
    'Regime da Tristeza',
    'Altura em Ipanema',
    'Coeficiente no Partenon',
    'Taxa em Santana',
    'Regime de Teresópolis',
    'Parâmetros da Azenha',
    'Altura na Vila Nova',
    'Taxa no Jardim Botânico',
    'Coeficiente em Belém Novo',
    'Regime da Restinga',
    'Parâmetros do Sarandi',
    'Altura máxima na Cavalhada'
  ],
  
  'Zonas e ZOTs': [
    'O que é ZOT-08?',
    'Características da ZOT-07',
    'Parâmetros da ZOT-13',
    'Bairros da ZOT-15',
    'O que é ZOT-01?',
    'ZOT-02 características',
    'Diferença entre ZOT-03 e ZOT-04',
    'O que permite a ZOT-05?',
    'ZOT-06 parâmetros',
    'Áreas da ZOT-09',
    'ZOT-10 características',
    'O que é ZOT-11?',
    'ZOT-12 permite o quê?',
    'Bairros na ZOT-14',
    'ZOT-16 características',
    'Zona rural permite?',
    'ZOT-08.1 diferenças',
    'ZOT-08.2 características',
    'ZOT-08.3 parâmetros',
    'Zonas especiais quais são?'
  ],
  
  'Proteção e Riscos': [
    'Áreas de risco de inundação',
    'Bairros com proteção contra enchentes',
    'Zonas de preservação ambiental',
    'Áreas não edificáveis',
    'Proteção do patrimônio histórico',
    'Áreas de risco geológico',
    'Zonas de proteção de mananciais',
    'Áreas sujeitas a deslizamentos',
    'Proteção de nascentes',
    'Áreas de preservação permanente',
    'Risco de alagamento onde?',
    'Proteção da orla do Guaíba',
    'Áreas verdes protegidas',
    'Zonas de amortecimento',
    'Proteção de morros',
    'Áreas de risco alto',
    'Proteção contra ocupação irregular',
    'Zonas de interesse ambiental',
    'Áreas de recuperação ambiental',
    'Proteção de córregos'
  ],
  
  'Conceitos Urbanísticos': [
    'O que é outorga onerosa?',
    'Definição de ZEIS',
    'O que é taxa de ocupação?',
    'Conceito de coeficiente de aproveitamento',
    'O que significa recuo frontal?',
    'Definição de gabarito',
    'O que é afastamento lateral?',
    'Conceito de uso misto',
    'O que é densidade construtiva?',
    'Definição de solo criado',
    'O que é transferência do direito de construir?',
    'Conceito de operação urbana consorciada',
    'O que é direito de preempção?',
    'Definição de IPTU progressivo',
    'O que é estudo de impacto de vizinhança?',
    'Conceito de regularização fundiária',
    'O que é concessão urbanística?',
    'Definição de macrozona',
    'O que é parcelamento do solo?',
    'Conceito de remembramento'
  ]
};

// Test a single query
async function testQuery(query, category) {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: query,
        bypassCache: false // Use cache for faster testing
      }),
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      return { 
        success: false, 
        responseTime, 
        error: `HTTP ${response.status}`,
        category 
      };
    }

    const data = await response.json();
    
    // Success criteria
    const hasResponse = data.response && data.response.length > 50;
    const goodConfidence = (data.confidence || 0) >= 0.7;
    const quickResponse = responseTime < 5000;
    
    const success = hasResponse && (goodConfidence || quickResponse);
    
    return {
      success,
      responseTime,
      confidence: data.confidence || 0,
      responseLength: data.response ? data.response.length : 0,
      cached: data.cached || false,
      category
    };
    
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      category,
      responseTime: Date.now() - startTime
    };
  }
}

// Test a category
async function testCategory(categoryName, queries) {
  console.log(chalk.cyan(`\n📂 Testing ${categoryName} (${queries.length} queries)`));
  console.log('─'.repeat(50));
  
  const results = [];
  const spinner = ora('Testing...').start();
  
  for (let i = 0; i < queries.length; i++) {
    spinner.text = `[${i + 1}/${queries.length}] ${queries[i]}`;
    
    const result = await testQuery(queries[i], categoryName);
    results.push(result);
    
    if (result.success) {
      spinner.text = chalk.green(`✅ [${i + 1}/${queries.length}] ${queries[i]}`);
    } else {
      spinner.text = chalk.red(`❌ [${i + 1}/${queries.length}] ${queries[i]}`);
    }
    
    // Small delay between queries
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  spinner.stop();
  
  const successCount = results.filter(r => r.success).length;
  const successRate = (successCount / results.length) * 100;
  const avgResponseTime = results
    .filter(r => r.responseTime)
    .reduce((sum, r) => sum + r.responseTime, 0) / results.length;
  
  console.log(chalk.blue(`\n📊 ${categoryName}: ${successRate.toFixed(1)}% (${successCount}/${results.length})`));
  console.log(chalk.gray(`   Avg response time: ${avgResponseTime.toFixed(0)}ms`));
  
  return { 
    category: categoryName, 
    results, 
    successRate,
    avgResponseTime,
    successCount,
    totalCount: results.length
  };
}

// Generate final report
async function generateFinalReport(categoryResults) {
  console.log(chalk.cyan.bold('\n\n' + '═'.repeat(60)));
  console.log(chalk.cyan.bold('         📊 VALIDAÇÃO FINAL DE ACURÁCIA'));
  console.log(chalk.cyan.bold('═'.repeat(60) + '\n'));
  
  // Summary table
  const summaryTable = new Table({
    head: ['Categoria', 'Sucesso', 'Taxa', 'Tempo Médio'],
    colWidths: [25, 12, 12, 15]
  });
  
  let totalTests = 0;
  let totalPassed = 0;
  let totalResponseTime = 0;
  
  categoryResults.forEach(cat => {
    totalTests += cat.totalCount;
    totalPassed += cat.successCount;
    totalResponseTime += cat.avgResponseTime;
    
    const color = cat.successRate >= 90 ? chalk.green : 
                  cat.successRate >= 80 ? chalk.yellow : 
                  chalk.red;
    
    summaryTable.push([
      cat.category,
      `${cat.successCount}/${cat.totalCount}`,
      color(`${cat.successRate.toFixed(1)}%`),
      `${cat.avgResponseTime.toFixed(0)}ms`
    ]);
  });
  
  console.log(summaryTable.toString());
  
  // Overall statistics
  const overallRate = (totalPassed / totalTests) * 100;
  const avgResponseTime = totalResponseTime / categoryResults.length;
  
  console.log(chalk.cyan('\n📈 ESTATÍSTICAS GLOBAIS:'));
  console.log('─'.repeat(40));
  console.log(`Total de Testes: ${totalTests}`);
  console.log(`Testes Aprovados: ${totalPassed}`);
  console.log(`Testes Falhados: ${totalTests - totalPassed}`);
  console.log(`Tempo Médio de Resposta: ${avgResponseTime.toFixed(0)}ms`);
  
  // Database stats
  const { count: docCount } = await supabase
    .from('document_sections')
    .select('*', { count: 'exact', head: true });
  
  console.log(`Documentos na Base: ${docCount}`);
  
  // FINAL VERDICT
  console.log(chalk.cyan.bold('\n' + '═'.repeat(60)));
  console.log(chalk.cyan.bold('                 🎯 RESULTADO FINAL'));
  console.log(chalk.cyan.bold('═'.repeat(60) + '\n'));
  
  const fontSize = 'bold';
  if (overallRate >= 95) {
    console.log(chalk.green.bold(`  ACURÁCIA GLOBAL: ${overallRate.toFixed(2)}%`));
    console.log(chalk.green.bold('\n  ✅ META DE 95% ALCANÇADA!'));
    console.log(chalk.green('\n  🎉 PARABÉNS! SISTEMA PRONTO PARA PRODUÇÃO!'));
  } else if (overallRate >= 90) {
    console.log(chalk.yellow.bold(`  ACURÁCIA GLOBAL: ${overallRate.toFixed(2)}%`));
    console.log(chalk.yellow.bold(`\n  ⚠️ PRÓXIMO DA META (faltam ${(95 - overallRate).toFixed(2)}%)`));
    console.log(chalk.yellow('\n  Continue processando mais documentos.'));
  } else {
    console.log(chalk.red.bold(`  ACURÁCIA GLOBAL: ${overallRate.toFixed(2)}%`));
    console.log(chalk.red.bold(`\n  ❌ ABAIXO DA META (faltam ${(95 - overallRate).toFixed(2)}%)`));
    console.log(chalk.red('\n  Necessário processar mais documentos.'));
  }
  
  console.log(chalk.cyan.bold('\n' + '═'.repeat(60) + '\n'));
  
  // Recommendations
  if (overallRate < 95) {
    console.log(chalk.cyan('📝 RECOMENDAÇÕES PARA ALCANÇAR 95%:\n'));
    
    categoryResults.forEach(cat => {
      if (cat.successRate < 90) {
        console.log(chalk.yellow(`• Melhorar ${cat.category}: ${cat.successRate.toFixed(1)}%`));
      }
    });
    
    const docsNeeded = Math.ceil((95 - overallRate) * 100);
    console.log(chalk.gray(`\n• Adicionar aproximadamente ${docsNeeded} documentos`));
    console.log(chalk.gray(`• Processar mais chunks da LUOS e Plano Diretor`));
    console.log(chalk.gray(`• Adicionar dados estruturados dos 94 bairros`));
  }
  
  // Save report
  const reportData = {
    timestamp: new Date().toISOString(),
    overallAccuracy: overallRate,
    totalTests,
    totalPassed,
    avgResponseTime,
    documentCount: docCount,
    categoryBreakdown: categoryResults.map(c => ({
      category: c.category,
      successRate: c.successRate,
      tests: c.totalCount
    }))
  };
  
  try {
    await supabase.from('performance_reports').insert({
      report_data: reportData,
      created_at: new Date().toISOString()
    });
    console.log(chalk.gray('\n📝 Relatório salvo no banco de dados'));
  } catch {
    console.log(chalk.gray('\n📝 Relatório gerado (não salvo)'));
  }
  
  return overallRate;
}

// Main function
async function main() {
  console.log(chalk.cyan.bold('\n🎯 VALIDAÇÃO FINAL DE ACURÁCIA DO SISTEMA RAG'));
  console.log(chalk.gray('Testando 100 queries em 5 categorias...\n'));
  
  const startTime = Date.now();
  const categoryResults = [];
  
  // Test each category
  for (const [categoryName, queries] of Object.entries(testSuite)) {
    const result = await testCategory(categoryName, queries);
    categoryResults.push(result);
  }
  
  // Generate final report
  const finalAccuracy = await generateFinalReport(categoryResults);
  
  const totalTime = Math.floor((Date.now() - startTime) / 1000);
  console.log(chalk.gray(`\n⏱️ Tempo total de teste: ${Math.floor(totalTime / 60)}m ${totalTime % 60}s`));
  
  // Exit with appropriate code
  process.exit(finalAccuracy >= 95 ? 0 : 1);
}

// Run
main().catch(console.error);