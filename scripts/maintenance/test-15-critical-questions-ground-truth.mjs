#!/usr/bin/env node

/**
 * TESTE DAS 15 PERGUNTAS CRÍTICAS COM GROUND TRUTH
 * Valida o conteúdo real das respostas contra dados do banco
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// 15 Critical Questions with Ground Truth
const CRITICAL_QUESTIONS = [
  {
    id: 1,
    question: "escreva um resumo de até 25 palavras sobre a lei do plano diretor de porto alegre",
    category: 'summary',
    getGroundTruth: async () => {
      const { data } = await supabase
        .from('legal_articles')
        .select('full_content')
        .eq('document_type', 'PDUS')
        .eq('article_number', '1')
        .single();
      return { exists: !!data, content: data?.full_content };
    },
    validate: (response, groundTruth) => {
      const words = response.split(/\s+/).length;
      return words <= 30 && response.toLowerCase().includes('plano diretor');
    }
  },
  {
    id: 2,
    question: "qual é a altura máxima e coef. básico e máx do aberta dos morros para cada zot",
    category: 'regime_urbanistico',
    getGroundTruth: async () => {
      const { data } = await supabase
        .from('regime_urbanistico_consolidado')
        .select('*')
        .ilike('"Bairro"', '%ABERTA DOS MORROS%');
      return { 
        exists: !!data && data.length > 0, 
        content: data 
      };
    },
    validate: (response) => {
      return response.toUpperCase().includes('ABERTA DOS MORROS') &&
             (response.includes('altura') || response.includes('coeficiente'));
    }
  },
  {
    id: 3,
    question: 'Quantos bairros estão "Protegidos pelo Sistema Atual" para proteção contra enchentes?',
    category: 'risk_management',
    getGroundTruth: async () => {
      const { data, count } = await supabase
        .from('regime_urbanistico_consolidado')
        .select('*', { count: 'exact' })
        .ilike('categoria_risco', '%Protegido%Sistema%Atual%');
      return { 
        exists: count > 0, 
        content: `${count} bairros protegidos`
      };
    },
    validate: (response) => {
      return /\d+/.test(response) && response.toLowerCase().includes('bairro');
    }
  },
  {
    id: 4,
    question: "Qual artigo da LUOS trata da Certificação em Sustentabilidade Ambiental?",
    category: 'article_search',
    getGroundTruth: async () => {
      const { data } = await supabase
        .from('legal_articles')
        .select('article_number, full_content')
        .eq('document_type', 'LUOS')
        .or('full_content.ilike.%certificação%sustentabilidade%,full_content.ilike.%certificação%ambiental%')
        .limit(1);
      return { 
        exists: !!data && data.length > 0,
        content: data?.[0]
      };
    },
    validate: (response, groundTruth) => {
      if (!groundTruth.exists) {
        return response.includes('não encontr') || response.includes('não há');
      }
      return /art.*\d+/i.test(response);
    }
  },
  {
    id: 5,
    question: "Como o Regime Volumétrico é tratado na LUOS?",
    category: 'concept',
    getGroundTruth: async () => {
      const { data } = await supabase
        .from('legal_articles')
        .select('full_content')
        .eq('document_type', 'LUOS')
        .ilike('full_content', '%regime volumétrico%')
        .limit(3);
      return { 
        exists: !!data && data.length > 0,
        content: data
      };
    },
    validate: (response) => {
      return response.length > 100 && 
             (response.toLowerCase().includes('volumétric') || 
              response.toLowerCase().includes('altura') ||
              response.toLowerCase().includes('aproveitamento'));
    }
  },
  {
    id: 6,
    question: "o que afirma literalmente o Art 1º da LUOS?",
    category: 'article_literal',
    getGroundTruth: async () => {
      const { data } = await supabase
        .from('legal_articles')
        .select('full_content')
        .eq('document_type', 'LUOS')
        .eq('article_number', '1')
        .single();
      return { 
        exists: !!data,
        content: data?.full_content
      };
    },
    validate: (response, groundTruth) => {
      if (!groundTruth.exists) return false;
      return response.includes('Fica instituída') || 
             response.includes('Lei de Uso e Ocupação');
    }
  },
  {
    id: 7,
    question: "do que se trata o Art. 119 da LUOS?",
    category: 'article_content',
    getGroundTruth: async () => {
      const { data } = await supabase
        .from('legal_articles')
        .select('full_content')
        .eq('document_type', 'LUOS')
        .eq('article_number', '119')
        .single();
      return { 
        exists: !!data,
        content: data?.full_content
      };
    },
    validate: (response, groundTruth) => {
      if (!groundTruth.exists) {
        return response.includes('não encontr');
      }
      return response.includes('119') && response.length > 50;
    }
  },
  {
    id: 8,
    question: "o Art. 3º O Plano Diretor Urbano Sustentável de Porto Alegre será regido por princípios fundamentais. quais são eles?",
    category: 'principles',
    getGroundTruth: async () => {
      const { data } = await supabase
        .from('legal_articles')
        .select('full_content')
        .eq('document_type', 'PDUS')
        .eq('article_number', '3')
        .single();
      return { 
        exists: !!data,
        content: data?.full_content
      };
    },
    validate: (response, groundTruth) => {
      if (!groundTruth.exists) return false;
      // Should list principles
      return (response.includes('I -') || response.includes('•') || response.includes('1.')) &&
             response.includes('princíp');
    }
  },
  {
    id: 9,
    question: "o que posso construir no bairro Petrópolis",
    category: 'regime_urbanistico',
    getGroundTruth: async () => {
      const { data } = await supabase
        .from('regime_urbanistico_consolidado')
        .select('*')
        .ilike('"Bairro"', '%PETRÓPOLIS%');
      return { 
        exists: !!data && data.length > 0,
        content: data
      };
    },
    validate: (response) => {
      return response.toUpperCase().includes('PETRÓPOLIS') &&
             (response.includes('altura') || response.includes('ZOT') || response.includes('coeficiente'));
    }
  },
  {
    id: 10,
    question: "qual a altura máxima da construção dos prédios em Porto Alegre?",
    category: 'height_limits',
    getGroundTruth: async () => {
      const { data } = await supabase
        .from('regime_urbanistico_consolidado')
        .select('Altura_Maxima___Edificacao_Isolada')
        .order('Altura_Maxima___Edificacao_Isolada', { ascending: false })
        .limit(1);
      return { 
        exists: !!data && data.length > 0,
        content: data?.[0]?.Altura_Maxima___Edificacao_Isolada
      };
    },
    validate: (response, groundTruth) => {
      return response.includes('varia') || response.includes('depende') || /\d+\s*m/i.test(response);
    }
  },
  {
    id: 11,
    question: "o que diz o artigo 38 da luos?",
    category: 'article_content',
    getGroundTruth: async () => {
      const { data } = await supabase
        .from('legal_articles')
        .select('full_content')
        .eq('document_type', 'LUOS')
        .eq('article_number', '38')
        .single();
      return { 
        exists: !!data,
        content: data?.full_content
      };
    },
    validate: (response, groundTruth) => {
      if (!groundTruth.exists) {
        return response.includes('não encontr');
      }
      return response.includes('38') && response.length > 50;
    }
  },
  {
    id: 12,
    question: "o que diz o artigo 5?",
    category: 'multiple_laws',
    getGroundTruth: async () => {
      const { data: pdus } = await supabase
        .from('legal_articles')
        .select('full_content')
        .eq('document_type', 'PDUS')
        .eq('article_number', '5')
        .single();
      
      const { data: luos } = await supabase
        .from('legal_articles')
        .select('full_content')
        .eq('document_type', 'LUOS')
        .eq('article_number', '5')
        .single();
      
      return { 
        exists: !!pdus || !!luos,
        pdus: pdus?.full_content,
        luos: luos?.full_content
      };
    },
    validate: (response, groundTruth) => {
      // Should mention multiple laws or context
      return (response.includes('PDUS') && response.includes('LUOS')) ||
             response.includes('diferentes leis') ||
             response.includes('múltiplas leis');
    }
  },
  {
    id: 13,
    question: "resuma a parte I do plano diretor",
    category: 'hierarchy',
    getGroundTruth: async () => {
      const { data } = await supabase
        .from('legal_articles')
        .select('full_content')
        .eq('document_type', 'PDUS')
        .ilike('full_content', '%PARTE I%')
        .limit(5);
      return { 
        exists: !!data && data.length > 0,
        content: data
      };
    },
    validate: (response) => {
      return response.length > 200 || response.includes('não encontr');
    }
  },
  {
    id: 14,
    question: "resuma o conteúdo do título 1 do pdus",
    category: 'title_summary',
    getGroundTruth: async () => {
      const { data } = await supabase
        .from('legal_articles')
        .select('full_content')
        .eq('document_type', 'PDUS')
        .ilike('full_content', '%TÍTULO I%')
        .limit(5);
      return { 
        exists: !!data && data.length > 0,
        content: data
      };
    },
    validate: (response) => {
      return response.length > 150 || response.includes('não');
    }
  },
  {
    id: 15,
    question: "o que diz o artigo 1 do pdus",
    category: 'article_content',
    getGroundTruth: async () => {
      const { data } = await supabase
        .from('legal_articles')
        .select('full_content')
        .eq('document_type', 'PDUS')
        .eq('article_number', '1')
        .single();
      return { 
        exists: !!data,
        content: data?.full_content
      };
    },
    validate: (response, groundTruth) => {
      if (!groundTruth.exists) {
        return response.includes('não encontr');
      }
      return response.includes('PDUS') && response.includes('1') && response.length > 50;
    }
  }
];

/**
 * Call RAG endpoint
 */
async function callRAG(endpoint, query) {
  try {
    const response = await fetch(`${supabaseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        bypassCache: true,
        model: 'openai/gpt-4-turbo-preview'
      }),
      timeout: 30000
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    return { 
      success: true, 
      response: data.response || '',
      confidence: data.confidence || 0,
      executionTime: data.executionTime || 0
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.message
    };
  }
}

/**
 * Test all 15 questions
 */
async function test15CriticalQuestions() {
  console.log(chalk.bold.cyan('\n' + '=' .repeat(80)));
  console.log(chalk.bold.cyan('🎯 TESTE DAS 15 PERGUNTAS CRÍTICAS COM GROUND TRUTH'));
  console.log(chalk.bold.cyan('=' .repeat(80)));
  
  const versions = [
    { name: 'v1', endpoint: '/functions/v1/agentic-rag', color: chalk.green },
    { name: 'v2', endpoint: '/functions/v1/agentic-rag-v2', color: chalk.blue },
    { name: 'v3', endpoint: '/functions/v1/agentic-rag-v3', color: chalk.magenta }
  ];
  
  const results = {};
  
  // Initialize results
  for (const version of versions) {
    results[version.name] = {
      correct: 0,
      incorrect: 0,
      errors: 0,
      totalTime: 0,
      byCategory: {}
    };
  }
  
  // Test each question
  for (const test of CRITICAL_QUESTIONS) {
    console.log(chalk.bold.white(`\n${test.id}. [${test.category}] ${test.question.substring(0, 60)}...`));
    
    // Get ground truth
    const groundTruth = await test.getGroundTruth();
    console.log(groundTruth.exists ? 
      chalk.green('   ✓ Ground truth found') : 
      chalk.yellow('   ⚠ No ground truth in DB'));
    
    // Test each version
    for (const version of versions) {
      const startTime = Date.now();
      const result = await callRAG(version.endpoint, test.question);
      const elapsed = Date.now() - startTime;
      
      if (!result.success) {
        console.log(version.color(`   ${version.name}: `) + chalk.red(`ERROR - ${result.error}`));
        results[version.name].errors++;
      } else {
        const isValid = test.validate(result.response, groundTruth);
        
        if (isValid) {
          console.log(version.color(`   ${version.name}: `) + chalk.green(`CORRECT (${elapsed}ms)`));
          results[version.name].correct++;
          results[version.name].totalTime += elapsed;
          
          // Track by category
          if (!results[version.name].byCategory[test.category]) {
            results[version.name].byCategory[test.category] = { correct: 0, total: 0 };
          }
          results[version.name].byCategory[test.category].correct++;
          results[version.name].byCategory[test.category].total++;
        } else {
          console.log(version.color(`   ${version.name}: `) + chalk.red(`INCORRECT`));
          results[version.name].incorrect++;
          
          // Track by category
          if (!results[version.name].byCategory[test.category]) {
            results[version.name].byCategory[test.category] = { correct: 0, total: 0 };
          }
          results[version.name].byCategory[test.category].total++;
          
          // Show why it failed
          if (result.response.length < 30) {
            console.log(chalk.gray(`      Response too short: ${result.response.length} chars`));
          } else if (result.response.includes('não foi possível')) {
            console.log(chalk.gray(`      Generic error response`));
          } else {
            const preview = result.response.substring(0, 60).replace(/\n/g, ' ');
            console.log(chalk.gray(`      "${preview}..."`));
          }
        }
      }
    }
  }
  
  // Final Report
  console.log(chalk.bold.cyan('\n' + '=' .repeat(80)));
  console.log(chalk.bold.cyan('📊 RELATÓRIO FINAL - 15 PERGUNTAS CRÍTICAS'));
  console.log(chalk.bold.cyan('=' .repeat(80)));
  
  // Summary table
  console.log(chalk.bold.white('\n📈 RESUMO GERAL:\n'));
  console.log(chalk.bold('Versão  Corretas  Incorretas  Erros  Precisão  Tempo Médio'));
  console.log('-'.repeat(60));
  
  for (const version of versions) {
    const stats = results[version.name];
    const total = CRITICAL_QUESTIONS.length;
    const precision = (stats.correct / total * 100).toFixed(1);
    const avgTime = stats.correct > 0 ? Math.round(stats.totalTime / stats.correct) : 0;
    
    const precisionColor = precision >= 80 ? chalk.green : precision >= 50 ? chalk.yellow : chalk.red;
    
    console.log(
      version.name.padEnd(8) +
      chalk.green(stats.correct.toString().padEnd(10)) +
      chalk.red(stats.incorrect.toString().padEnd(12)) +
      chalk.red(stats.errors.toString().padEnd(7)) +
      precisionColor(`${precision}%`.padEnd(10)) +
      `${avgTime}ms`
    );
  }
  
  // Category breakdown for best version
  const bestVersion = Object.entries(results)
    .sort((a, b) => b[1].correct - a[1].correct)[0];
  
  console.log(chalk.bold.white(`\n📊 DESEMPENHO POR CATEGORIA (${bestVersion[0]}):\n`));
  
  const categories = [...new Set(CRITICAL_QUESTIONS.map(q => q.category))];
  for (const category of categories) {
    const stats = bestVersion[1].byCategory[category];
    if (stats) {
      const rate = (stats.correct / stats.total * 100).toFixed(0);
      const color = rate === '100' ? chalk.green : rate >= '50' ? chalk.yellow : chalk.red;
      console.log(`${category.padEnd(20)} ${color(rate + '%')} (${stats.correct}/${stats.total})`);
    }
  }
  
  // Final verdict
  console.log(chalk.bold.cyan('\n' + '=' .repeat(80)));
  console.log(chalk.bold.cyan('🏆 VEREDITO FINAL'));
  console.log(chalk.bold.cyan('=' .repeat(80)));
  
  const v1Stats = results.v1;
  const v1Precision = (v1Stats.correct / CRITICAL_QUESTIONS.length * 100);
  
  if (v1Precision >= 80) {
    console.log(chalk.bold.green(`\n✅ agentic-rag (v1) está APROVADO com ${v1Precision.toFixed(1)}% de precisão!`));
    console.log(chalk.green('Recomendação: Manter v1 como versão principal'));
    
    if (results.v2.correct < v1Stats.correct && results.v3.correct < v1Stats.correct) {
      console.log(chalk.yellow('\n⚠️ v2 e v3 têm performance inferior - podem ser deletadas'));
      console.log(chalk.gray('\nComandos:'));
      console.log(chalk.white('npx supabase functions delete agentic-rag-v2 --project-ref ngrqwmvuhvjkeohesbxs'));
      console.log(chalk.white('npx supabase functions delete agentic-rag-v3 --project-ref ngrqwmvuhvjkeohesbxs'));
    }
  } else if (v1Precision >= 50) {
    console.log(chalk.yellow(`\n⚠️ agentic-rag (v1) tem ${v1Precision.toFixed(1)}% de precisão - PRECISA MELHORIAS`));
  } else {
    console.log(chalk.red(`\n❌ agentic-rag (v1) FALHOU com apenas ${v1Precision.toFixed(1)}% de precisão`));
  }
  
  return results;
}

// Execute
test15CriticalQuestions().catch(error => {
  console.error(chalk.red('❌ Erro fatal:', error));
  process.exit(1);
});