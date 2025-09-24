#!/usr/bin/env node

/**
 * TESTE END-TO-END GENÉRICO VIA ENDPOINT /CHAT
 * Testa o sistema completo como um usuário real faria
 * Sem assumir estruturas hardcoded ou casos específicos
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Call the actual chat endpoint (agentic-rag)
 */
async function callChatEndpoint(query, sessionId = null) {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        session_id: sessionId || `test-${Date.now()}`,
        model: 'openai/gpt-4-turbo-preview',
        bypassCache: true
      }),
      timeout: 30000
    });
    
    const elapsed = Date.now() - startTime;
    
    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `HTTP ${response.status}`,
        errorDetails: errorText.substring(0, 200),
        time: elapsed
      };
    }
    
    const data = await response.json();
    
    return {
      success: true,
      response: data.response || '',
      confidence: data.confidence || 0,
      sources: data.sources || {},
      time: elapsed,
      hasContent: (data.response?.length || 0) > 100,
      hasSpecificContent: checkSpecificContent(data.response || '')
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      time: Date.now() - startTime
    };
  }
}

/**
 * Check if response has specific content (not generic error)
 */
function checkSpecificContent(response) {
  const genericPhrases = [
    'não foi possível encontrar',
    'não há informações',
    'desculpe',
    'erro ao processar',
    'tente novamente'
  ];
  
  const hasGenericError = genericPhrases.some(phrase => 
    response.toLowerCase().includes(phrase)
  );
  
  const hasSpecificInfo = 
    response.includes('Art.') ||
    response.includes('ZOT') ||
    response.includes('altura') ||
    response.includes('coeficiente') ||
    response.includes('PDUS') ||
    response.includes('LUOS') ||
    response.length > 200;
  
  return !hasGenericError && hasSpecificInfo;
}

/**
 * Generic test categories that any urban planning RAG should handle
 */
const TEST_CATEGORIES = {
  'Legal Articles': [
    'What does article 1 state?',
    'o que diz o artigo 5?',
    'qual o conteúdo do artigo 10 da LUOS?'
  ],
  'Urban Parameters': [
    'what are the height limits?',
    'qual o coeficiente de aproveitamento?',
    'quais são os recuos obrigatórios?'
  ],
  'Zoning Information': [
    'what zones exist in the city?',
    'quais as características da zona residencial?',
    'diferenças entre zonas comerciais e residenciais'
  ],
  'Concepts & Definitions': [
    'what is sustainable urban development?',
    'o que é regime volumétrico?',
    'definição de taxa de ocupação'
  ],
  'Summaries & Analysis': [
    'summarize the main objectives',
    'principais diretrizes do plano diretor',
    'resumo das normas ambientais'
  ],
  'Specific Queries': [
    'building requirements for commercial areas',
    'requisitos para construção em área de preservação',
    'normas para edificações históricas'
  ]
};

/**
 * Run comprehensive tests
 */
async function runTests() {
  console.log(chalk.bold.cyan('\n' + '=' .repeat(70)));
  console.log(chalk.bold.cyan('🧪 TESTE END-TO-END VIA ENDPOINT /CHAT'));
  console.log(chalk.bold.cyan('=' .repeat(70)));
  
  console.log(chalk.yellow('\n📝 Configuração:'));
  console.log(`  Endpoint: ${supabaseUrl}/functions/v1/agentic-rag`);
  console.log(`  Modelo: openai/gpt-4-turbo-preview`);
  console.log(`  Timeout: 30s`);
  
  const results = [];
  let totalQueries = 0;
  
  // Test each category
  for (const [category, queries] of Object.entries(TEST_CATEGORIES)) {
    console.log(chalk.bold.white(`\n📂 ${category}:`));
    
    for (const query of queries) {
      totalQueries++;
      process.stdout.write(chalk.gray(`  Q${totalQueries}: "${query.substring(0, 40)}..." `));
      
      const result = await callChatEndpoint(query);
      results.push({ category, query, ...result });
      
      if (result.success) {
        if (result.hasSpecificContent) {
          console.log(chalk.green(`✅ OK (${result.time}ms, conf: ${(result.confidence * 100).toFixed(0)}%)`));
        } else {
          console.log(chalk.yellow(`⚠️ Generic (${result.time}ms)`));
        }
      } else {
        console.log(chalk.red(`❌ ${result.error} (${result.time}ms)`));
      }
      
      // Show response preview if verbose mode
      if (process.argv.includes('--verbose') && result.response) {
        console.log(chalk.gray(`     → "${result.response.substring(0, 100)}..."`));
      }
    }
  }
  
  // Calculate metrics
  console.log(chalk.bold.cyan('\n' + '=' .repeat(70)));
  console.log(chalk.bold.cyan('📊 MÉTRICAS GERAIS'));
  console.log(chalk.bold.cyan('=' .repeat(70)));
  
  const successful = results.filter(r => r.success);
  const withContent = results.filter(r => r.hasSpecificContent);
  const failed = results.filter(r => !r.success);
  
  const successRate = (successful.length / results.length) * 100;
  const contentRate = (withContent.length / results.length) * 100;
  const avgTime = successful.reduce((sum, r) => sum + r.time, 0) / successful.length || 0;
  const avgConfidence = successful.reduce((sum, r) => sum + r.confidence, 0) / successful.length || 0;
  
  console.log(chalk.white('\n📈 Resultados:'));
  console.log(`  Taxa de Sucesso: ${successRate.toFixed(1)}% (${successful.length}/${results.length})`);
  console.log(`  Taxa de Conteúdo Específico: ${contentRate.toFixed(1)}% (${withContent.length}/${results.length})`);
  console.log(`  Tempo Médio de Resposta: ${avgTime.toFixed(0)}ms`);
  console.log(`  Confiança Média: ${(avgConfidence * 100).toFixed(1)}%`);
  
  // Category breakdown
  console.log(chalk.white('\n📊 Por Categoria:'));
  const categories = [...new Set(results.map(r => r.category))];
  
  categories.forEach(cat => {
    const catResults = results.filter(r => r.category === cat);
    const catSuccess = catResults.filter(r => r.hasSpecificContent).length;
    const catRate = (catSuccess / catResults.length) * 100;
    
    const color = catRate >= 80 ? chalk.green :
                  catRate >= 50 ? chalk.yellow :
                  chalk.red;
    
    console.log(`  ${cat}: ${color(`${catRate.toFixed(0)}%`)} (${catSuccess}/${catResults.length})`);
  });
  
  // Error analysis
  if (failed.length > 0) {
    console.log(chalk.red('\n❌ Análise de Erros:'));
    const errorTypes = {};
    failed.forEach(f => {
      errorTypes[f.error] = (errorTypes[f.error] || 0) + 1;
    });
    Object.entries(errorTypes).forEach(([error, count]) => {
      console.log(`  ${error}: ${count} ocorrências`);
    });
  }
  
  // Final verdict
  console.log(chalk.bold.cyan('\n' + '=' .repeat(70)));
  console.log(chalk.bold.cyan('🎯 VEREDITO FINAL'));
  console.log(chalk.bold.cyan('=' .repeat(70)));
  
  if (contentRate >= 95) {
    console.log(chalk.bold.green('\n✅ EXCELENTE! Sistema atinge meta de 95% de precisão!'));
  } else if (contentRate >= 80) {
    console.log(chalk.bold.yellow('\n⚠️ BOM. Sistema funciona bem mas precisa melhorias.'));
  } else if (contentRate >= 50) {
    console.log(chalk.bold.yellow('\n⚠️ REGULAR. Sistema precisa melhorias significativas.'));
  } else {
    console.log(chalk.bold.red('\n❌ CRÍTICO. Sistema não está pronto para produção.'));
  }
  
  console.log(chalk.white(`\nPrecisão Atual: ${contentRate.toFixed(1)}%`));
  console.log(chalk.white(`Meta: 95%`));
  console.log(chalk.white(`Gap: ${(95 - contentRate).toFixed(1)}%`));
  
  // Recommendations
  if (contentRate < 95) {
    console.log(chalk.yellow('\n💡 Recomendações:'));
    
    if (avgTime > 5000) {
      console.log('  • Otimizar performance (tempo médio > 5s)');
    }
    if (avgConfidence < 0.7) {
      console.log('  • Melhorar confidence scoring');
    }
    if (successRate < 100) {
      console.log('  • Resolver erros de HTTP/timeout');
    }
    if (contentRate < successRate) {
      console.log('  • Reduzir respostas genéricas');
    }
    
    const worstCategory = categories.reduce((worst, cat) => {
      const catResults = results.filter(r => r.category === cat);
      const catRate = catResults.filter(r => r.hasSpecificContent).length / catResults.length;
      return catRate < worst.rate ? { name: cat, rate: catRate } : worst;
    }, { name: '', rate: 1 });
    
    if (worstCategory.rate < 0.5) {
      console.log(`  • Foco em melhorar categoria "${worstCategory.name}" (${(worstCategory.rate * 100).toFixed(0)}%)`);
    }
  }
  
  return {
    successRate,
    contentRate,
    avgTime,
    avgConfidence,
    results
  };
}

/**
 * Run specific test with verbose output
 */
async function runSingleTest(query) {
  console.log(chalk.bold.cyan('\n🧪 TESTE ÚNICO'));
  console.log(chalk.white(`Query: "${query}"\n`));
  
  const result = await callChatEndpoint(query);
  
  if (result.success) {
    console.log(chalk.green('✅ Sucesso'));
    console.log(`Tempo: ${result.time}ms`);
    console.log(`Confiança: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`Conteúdo Específico: ${result.hasSpecificContent ? 'Sim' : 'Não'}`);
    console.log('\nResposta:');
    console.log(chalk.white(result.response));
    
    if (result.sources && Object.keys(result.sources).length > 0) {
      console.log('\nFontes:');
      console.log(result.sources);
    }
  } else {
    console.log(chalk.red('❌ Erro:', result.error));
    if (result.errorDetails) {
      console.log('Detalhes:', result.errorDetails);
    }
  }
  
  return result;
}

// Main execution
const args = process.argv.slice(2);

if (args.includes('--help')) {
  console.log(chalk.cyan('Uso:'));
  console.log('  node test-chat-endpoint.mjs              # Executa todos os testes');
  console.log('  node test-chat-endpoint.mjs --verbose    # Mostra preview das respostas');
  console.log('  node test-chat-endpoint.mjs "query"      # Testa uma query específica');
  process.exit(0);
}

if (args.length > 0 && !args[0].startsWith('--')) {
  // Test single query
  runSingleTest(args[0]).catch(error => {
    console.error(chalk.red('❌ Erro fatal:', error));
    process.exit(1);
  });
} else {
  // Run all tests
  runTests().catch(error => {
    console.error(chalk.red('❌ Erro fatal:', error));
    process.exit(1);
  });
}