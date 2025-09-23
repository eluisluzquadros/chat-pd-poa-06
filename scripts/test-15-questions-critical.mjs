#!/usr/bin/env node

/**
 * TESTE CRÍTICO - 15 Perguntas Essenciais
 * Testa usando apenas a base de conhecimento armazenada no Supabase
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config({ path: '.env' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const criticalQuestions = [
  {
    id: 1,
    query: "escreva um resumo de até 25 palavras sobre a lei do plano diretor de porto alegre",
    expectedKeywords: ["plano diretor", "sustentável", "desenvolvimento"],
    category: "geral"
  },
  {
    id: 2,
    query: "qual é a altura máxima e coef. básico e máx do aberta dos morros para cada zot",
    expectedKeywords: ["altura", "coeficiente", "ZOT"],
    category: "regime"
  },
  {
    id: 3,
    query: "Quantos bairros estão 'Protegidos pelo Sistema Atual' para proteção contra enchentes?",
    expectedKeywords: ["bairros", "protegidos", "enchentes"],
    category: "risco"
  },
  {
    id: 4,
    query: "Qual artigo da LUOS trata da Certificação em Sustentabilidade Ambiental?",
    expectedKeywords: ["Art", "81", "certificação", "sustentabilidade"],
    category: "legal"
  },
  {
    id: 5,
    query: "Como o Regime Volumétrico é tratado na LUOS?",
    expectedKeywords: ["Art", "75", "regime volumétrico"],
    category: "legal"
  },
  {
    id: 6,
    query: "o que afirma literalmente o Art 1º da LUOS?",
    expectedKeywords: ["Lei de Uso e Ocupação", "Porto Alegre"],
    category: "legal"
  },
  {
    id: 7,
    query: "do que se trata o Art. 119 da LUOS?",
    expectedKeywords: ["análise", "processamento", "projetos"],
    category: "legal"
  },
  {
    id: 8,
    query: "O Art. 3º O Plano Diretor Urbano Sustentável de Porto Alegre será regido por princípios fundamentais. quais são eles?",
    expectedKeywords: ["princípios", "sustentabilidade", "equidade"],
    category: "legal"
  },
  {
    id: 9,
    query: "o que posso construir no bairro Petrópolis",
    expectedKeywords: ["60", "90", "ZOT", "altura", "coeficiente"],
    category: "regime"
  },
  {
    id: 10,
    query: "qual a altura máxima da construção dos prédios em Porto Alegre?",
    expectedKeywords: ["altura", "metros", "zona"],
    category: "geral"
  },
  {
    id: 11,
    query: "o que diz o artigo 38 da luos?",
    expectedKeywords: ["Art", "38", "LUOS"],
    category: "legal"
  },
  {
    id: 12,
    query: "o que diz o artigo 5?",
    expectedKeywords: ["Art", "5", "LUOS", "PDUS"],
    category: "legal"
  },
  {
    id: 13,
    query: "resuma a parte I do plano diretor",
    expectedKeywords: ["Parte I", "título", "capítulo"],
    category: "hierarquia"
  },
  {
    id: 14,
    query: "resuma o conteúdo do título 1 do pdus",
    expectedKeywords: ["Título", "1", "princípios", "diretrizes"],
    category: "hierarquia"
  },
  {
    id: 15,
    query: "o que diz o artigo 1 do pdus",
    expectedKeywords: ["Art", "1", "PDUS", "Plano Diretor"],
    category: "legal"
  }
];

async function testQuery(question) {
  try {
    const startTime = Date.now();
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify({
        query: question.query,
        sessionId: `test-15-critical-${Date.now()}`,
        bypassCache: true
      })
    });

    const responseTime = Date.now() - startTime;
    const data = await response.json();
    
    if (data.error) {
      return {
        ...question,
        success: false,
        error: data.error,
        responseTime
      };
    }
    
    const responseText = data.response || '';
    
    // Check for generic responses
    const isGeneric = responseText.includes('não encontrei') || 
                     responseText.includes('não há informações') ||
                     responseText.includes('consulte diretamente') ||
                     responseText.includes('não foram encontradas');
    
    // Check for expected keywords
    const foundKeywords = question.expectedKeywords.filter(keyword => 
      responseText.toLowerCase().includes(keyword.toLowerCase())
    );
    
    const keywordCoverage = (foundKeywords.length / question.expectedKeywords.length) * 100;
    
    return {
      ...question,
      success: !isGeneric && keywordCoverage >= 50,
      isGeneric,
      responseText: responseText.substring(0, 200),
      foundKeywords,
      keywordCoverage,
      responseTime,
      sources: data.sources
    };
    
  } catch (error) {
    return {
      ...question,
      success: false,
      fatal: true,
      error: error.message
    };
  }
}

async function runCriticalTests() {
  console.log(chalk.red.bold('\n🚨 TESTE CRÍTICO - 15 PERGUNTAS ESSENCIAIS\n'));
  console.log(chalk.yellow('Testando apenas com base de conhecimento no Supabase...\n'));
  
  const results = [];
  
  for (const question of criticalQuestions) {
    console.log(chalk.blue(`\n${question.id}. ${question.query}`));
    console.log(chalk.gray('─'.repeat(80)));
    
    const result = await testQuery(question);
    results.push(result);
    
    if (result.fatal) {
      console.log(chalk.red(`❌ ERRO FATAL: ${result.error}`));
    } else if (result.error) {
      console.log(chalk.red(`❌ ERRO: ${result.error}`));
    } else if (result.isGeneric) {
      console.log(chalk.red('❌ RESPOSTA GENÉRICA (não encontrou dados)'));
      console.log(chalk.gray(result.responseText));
    } else if (result.success) {
      console.log(chalk.green(`✅ SUCESSO (${result.keywordCoverage.toFixed(0)}% keywords)`));
      console.log(chalk.gray(result.responseText));
      if (result.foundKeywords.length > 0) {
        console.log(chalk.gray(`Keywords encontradas: ${result.foundKeywords.join(', ')}`));
      }
    } else {
      console.log(chalk.yellow(`⚠️ RESPOSTA PARCIAL (${result.keywordCoverage.toFixed(0)}% keywords)`));
      console.log(chalk.gray(result.responseText));
    }
    
    if (result.sources) {
      const sourceInfo = [];
      if (result.sources.legal_articles > 0) sourceInfo.push(`legal:${result.sources.legal_articles}`);
      if (result.sources.regime_urbanistico > 0) sourceInfo.push(`regime:${result.sources.regime_urbanistico}`);
      if (result.sources.hierarchy_elements > 0) sourceInfo.push(`hierarchy:${result.sources.hierarchy_elements}`);
      if (sourceInfo.length > 0) {
        console.log(chalk.gray(`Fontes: ${sourceInfo.join(', ')}`));
      }
    }
    
    console.log(chalk.gray(`Tempo: ${result.responseTime}ms`));
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Analysis Summary
  console.log(chalk.blue('\n' + '═'.repeat(80)));
  console.log(chalk.cyan.bold('📊 ANÁLISE DOS RESULTADOS'));
  console.log(chalk.blue('═'.repeat(80)));
  
  const successful = results.filter(r => r.success).length;
  const generic = results.filter(r => r.isGeneric).length;
  const partial = results.filter(r => !r.success && !r.isGeneric && !r.fatal).length;
  const fatal = results.filter(r => r.fatal).length;
  
  console.log(chalk.green(`\n✅ Respostas bem-sucedidas: ${successful}/15 (${(successful/15*100).toFixed(1)}%)`));
  console.log(chalk.red(`❌ Respostas genéricas: ${generic}/15 (${(generic/15*100).toFixed(1)}%)`));
  console.log(chalk.yellow(`⚠️ Respostas parciais: ${partial}/15 (${(partial/15*100).toFixed(1)}%)`));
  if (fatal > 0) {
    console.log(chalk.red(`💀 Erros fatais: ${fatal}/15`));
  }
  
  // Category Analysis
  console.log(chalk.cyan('\n📋 ANÁLISE POR CATEGORIA:'));
  
  const categories = ['legal', 'regime', 'hierarquia', 'geral', 'risco'];
  for (const cat of categories) {
    const catResults = results.filter(r => r.category === cat);
    const catSuccess = catResults.filter(r => r.success).length;
    const catTotal = catResults.length;
    if (catTotal > 0) {
      const percentage = (catSuccess / catTotal * 100).toFixed(0);
      const icon = percentage >= 80 ? '✅' : percentage >= 50 ? '⚠️' : '❌';
      console.log(`${icon} ${cat}: ${catSuccess}/${catTotal} (${percentage}%)`);
    }
  }
  
  // Detailed Breakdown
  console.log(chalk.cyan('\n📝 DETALHAMENTO POR PERGUNTA:'));
  results.forEach(r => {
    const icon = r.success ? '✅' : r.isGeneric ? '🔸' : r.fatal ? '💀' : '⚠️';
    const coverage = r.keywordCoverage ? ` [${r.keywordCoverage.toFixed(0)}%]` : '';
    console.log(`${icon} ${r.id}. ${r.query.substring(0, 50)}...${coverage}`);
  });
  
  // Final Verdict
  const successRate = (successful / 15 * 100);
  console.log(chalk.blue('\n' + '═'.repeat(80)));
  
  if (successRate >= 90) {
    console.log(chalk.green.bold(`✅ SISTEMA APROVADO! Taxa de sucesso: ${successRate.toFixed(1)}%`));
  } else if (successRate >= 70) {
    console.log(chalk.yellow.bold(`⚠️ SISTEMA PARCIALMENTE FUNCIONAL. Taxa: ${successRate.toFixed(1)}%`));
    console.log(chalk.yellow('Necessita melhorias na base de conhecimento'));
  } else if (successRate >= 50) {
    console.log(chalk.red.bold(`❌ SISTEMA COM PROBLEMAS SÉRIOS. Taxa: ${successRate.toFixed(1)}%`));
    console.log(chalk.red('Base de conhecimento incompleta'));
  } else {
    console.log(chalk.red.bold(`💀 SISTEMA CRÍTICO! Taxa: ${successRate.toFixed(1)}%`));
    console.log(chalk.red('URGENTE: Base de conhecimento não está funcionando'));
  }
  
  // Recommendations
  if (generic > 0) {
    console.log(chalk.yellow('\n⚠️ RECOMENDAÇÕES:'));
    if (results.filter(r => r.category === 'legal' && r.isGeneric).length > 0) {
      console.log(chalk.yellow('• Carregar artigos da LUOS e PDUS na tabela legal_articles'));
    }
    if (results.filter(r => r.category === 'hierarquia' && r.isGeneric).length > 0) {
      console.log(chalk.yellow('• Adicionar estrutura hierárquica (Partes, Títulos, Capítulos)'));
    }
    if (results.filter(r => r.category === 'risco' && r.isGeneric).length > 0) {
      console.log(chalk.yellow('• Importar dados de proteção contra enchentes'));
    }
  }
  
  // Average response time
  const avgTime = results.reduce((sum, r) => sum + (r.responseTime || 0), 0) / results.length;
  console.log(chalk.gray(`\n⏱️ Tempo médio de resposta: ${avgTime.toFixed(0)}ms`));
}

runCriticalTests().catch(console.error);