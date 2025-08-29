#!/usr/bin/env node

/**
 * Suite de testes com as 15 perguntas específicas fornecidas
 * Valida o sistema agentic-rag atual via endpoint /chat
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 15 perguntas específicas fornecidas para validação
const TEST_QUESTIONS = [
  {
    id: 1,
    question: "escreva um resumo de até 25 palavras sobre a lei do plano diretor de porto alegre",
    category: "resumo_legal",
    expected_keywords: ["PDUS", "plano diretor", "porto alegre", "desenvolvimento urbano"],
    validation_criteria: {
      max_words: 30,
      must_mention: ["plano diretor", "porto alegre"]
    }
  },
  {
    id: 2,
    question: "qual é a altura máxima e coef. básico e máx do aberta dos morros para cada zot",
    category: "regime_urbanistico_detalhado",
    expected_keywords: ["ABERTA_DOS_MORROS", "altura", "coeficiente", "ZOT"],
    validation_criteria: {
      must_include_zones: true,
      must_include_parameters: ["altura", "coeficiente"]
    }
  },
  {
    id: 3,
    question: "artigo 1º da luos",
    category: "artigo_literal",
    expected_keywords: ["LUOS", "artigo 1", "artigo 1º"],
    validation_criteria: {
      must_mention: ["artigo", "LUOS"],
      should_include_full_text: true
    }
  },
  {
    id: 4,
    question: "quais são os títulos da luos",
    category: "estrutura_hierarquica",
    expected_keywords: ["LUOS", "títulos", "capítulos"],
    validation_criteria: {
      must_list_titles: true,
      expected_count: ">5"
    }
  },
  {
    id: 5,
    question: "artigo 5 da luos",
    category: "artigo_literal",
    expected_keywords: ["LUOS", "artigo 5"],
    validation_criteria: {
      must_mention: ["artigo", "LUOS"],
      should_include_full_text: true
    }
  },
  {
    id: 6,
    question: "artigo 5 do pdus",
    category: "artigo_literal_contextualizacao",
    expected_keywords: ["PDUS", "artigo 5"],
    validation_criteria: {
      must_mention: ["artigo", "PDUS"],
      should_include_full_text: true
    }
  },
  {
    id: 7,
    question: "conte-me sobre petrópolis",
    category: "bairro_geral",
    expected_keywords: ["PETRÓPOLIS", "bairro", "zona"],
    validation_criteria: {
      must_mention: ["petrópolis", "bairro"],
      should_include_zones: true
    }
  },
  {
    id: 8,
    question: "qual a altura máxima em petrópolis",
    category: "regime_urbanistico_bairro",
    expected_keywords: ["PETRÓPOLIS", "altura máxima"],
    validation_criteria: {
      must_mention: ["altura", "petrópolis"],
      should_include_numbers: true
    }
  },
  {
    id: 9,
    question: "o que pode ser construído em petrópolis",
    category: "uso_solo_bairro",
    expected_keywords: ["PETRÓPOLIS", "construção", "uso", "permitido"],
    validation_criteria: {
      must_mention: ["construção", "petrópolis"],
      should_include_uses: true
    }
  },
  {
    id: 10,
    question: "onde posso abrir um restaurante em porto alegre",
    category: "uso_comercial",
    expected_keywords: ["restaurante", "comercial", "zonas"],
    validation_criteria: {
      must_mention: ["restaurante"],
      should_include_zones: true
    }
  },
  {
    id: 11,
    question: "capítulo 1 da luos",
    category: "estrutura_hierarquica",
    expected_keywords: ["LUOS", "capítulo 1", "capítulo I"],
    validation_criteria: {
      must_mention: ["capítulo", "LUOS"],
      should_include_articles: true
    }
  },
  {
    id: 12,
    question: "artigo sobre estacionamento",
    category: "busca_tematica",
    expected_keywords: ["estacionamento", "vaga"],
    validation_criteria: {
      must_mention: ["estacionamento"],
      should_include_requirements: true
    }
  },
  {
    id: 13,
    question: "normas sobre área de preservação",
    category: "meio_ambiente",
    expected_keywords: ["preservação", "ambiental", "APP"],
    validation_criteria: {
      must_mention: ["preservação"],
      should_include_restrictions: true
    }
  },
  {
    id: 14,
    question: "coeficiente de aproveitamento máximo no centro histórico",
    category: "regime_especifico",
    expected_keywords: ["centro histórico", "coeficiente", "aproveitamento"],
    validation_criteria: {
      must_mention: ["coeficiente", "centro histórico"],
      should_include_numbers: true
    }
  },
  {
    id: 15,
    question: "quais os instrumentos do plano diretor",
    category: "instrumentos_urbanisticos",
    expected_keywords: ["instrumentos", "plano diretor", "PDUS"],
    validation_criteria: {
      must_mention: ["instrumentos", "plano diretor"],
      should_list_instruments: true
    }
  }
];

/**
 * Valida resposta baseada nos critérios específicos
 */
function validateResponse(question, response) {
  const validation = {
    passed: true,
    score: 0,
    issues: [],
    details: {}
  };

  const responseText = response.toLowerCase();
  const criteria = question.validation_criteria;

  // Verificar palavras obrigatórias
  if (criteria.must_mention) {
    criteria.must_mention.forEach(keyword => {
      if (responseText.includes(keyword.toLowerCase())) {
        validation.score += 20;
      } else {
        validation.issues.push(`Não menciona "${keyword}"`);
        validation.passed = false;
      }
    });
  }

  // Verificar limite de palavras (se aplicável)
  if (criteria.max_words) {
    const wordCount = response.split(' ').length;
    validation.details.word_count = wordCount;
    if (wordCount <= criteria.max_words) {
      validation.score += 10;
    } else {
      validation.issues.push(`Excede limite de palavras: ${wordCount}/${criteria.max_words}`);
    }
  }

  // Verificações específicas por tipo
  if (criteria.should_include_numbers && /\d+/.test(response)) {
    validation.score += 15;
  } else if (criteria.should_include_numbers) {
    validation.issues.push("Deveria incluir números/valores");
  }

  if (criteria.should_include_zones && /zot|zona/i.test(response)) {
    validation.score += 15;
  } else if (criteria.should_include_zones) {
    validation.issues.push("Deveria mencionar zonas");
  }

  // Verificar se resposta não está vazia
  if (response.trim().length < 20) {
    validation.issues.push("Resposta muito curta");
    validation.passed = false;
  }

  // Verificar se não há mensagens de erro
  if (/erro|error|não encontr|desculp/i.test(response)) {
    validation.issues.push("Contém indicação de erro");
    validation.passed = false;
  }

  // Score final (0-100)
  validation.score = Math.min(Math.max(validation.score, 0), 100);
  
  return validation;
}

/**
 * Chamar endpoint /chat via Supabase Edge Function
 */
async function callChatEndpoint(message) {
  try {
    console.log(chalk.gray(`🔄 Enviando: "${message.substring(0, 50)}..."`));
    
    const { data, error } = await supabase.functions.invoke('agentic-rag', {
      body: {
        message: message,
        conversation_id: `test_${Date.now()}`,
        user_id: 'validation_user'
      }
    });

    if (error) {
      console.error(chalk.red('❌ Erro na Edge Function:', error));
      return {
        success: false,
        response: `Erro: ${error.message}`,
        error: error
      };
    }

    return {
      success: true,
      response: data?.response || 'Resposta vazia',
      context: data?.context,
      processing_time: data?.processing_time
    };

  } catch (error) {
    console.error(chalk.red('❌ Erro na chamada:', error.message));
    return {
      success: false,
      response: `Erro de conexão: ${error.message}`,
      error: error
    };
  }
}

/**
 * Executar suite de testes completa
 */
async function runValidationSuite() {
  console.log(chalk.bold.cyan('\n🧪 SUITE DE VALIDAÇÃO - 15 PERGUNTAS ESPECÍFICAS\n'));
  console.log(chalk.gray('Testando sistema agentic-rag via endpoint /chat...'));
  console.log(chalk.gray('=' .repeat(70) + '\n'));

  const results = [];
  let totalScore = 0;
  let successfulTests = 0;
  let failedTests = 0;

  for (let i = 0; i < TEST_QUESTIONS.length; i++) {
    const question = TEST_QUESTIONS[i];
    console.log(chalk.bold.blue(`\n📝 Teste ${question.id}/15: ${question.category.toUpperCase()}`));
    console.log(chalk.cyan(`Pergunta: "${question.question}"`));

    const startTime = Date.now();
    
    // Chamar endpoint
    const chatResult = await callChatEndpoint(question.question);
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // Validar resposta
    const validation = validateResponse(question, chatResult.response);
    
    const result = {
      id: question.id,
      question: question.question,
      category: question.category,
      response: chatResult.response,
      success: chatResult.success,
      validation: validation,
      response_time: responseTime,
      timestamp: new Date().toISOString()
    };

    results.push(result);

    // Exibir resultado
    if (chatResult.success && validation.passed) {
      console.log(chalk.green(`✅ PASSOU (Score: ${validation.score}/100)`));
      successfulTests++;
    } else {
      console.log(chalk.red(`❌ FALHOU (Score: ${validation.score}/100)`));
      failedTests++;
    }

    if (validation.issues.length > 0) {
      console.log(chalk.yellow(`⚠️ Problemas encontrados:`));
      validation.issues.forEach(issue => console.log(chalk.yellow(`   - ${issue}`)));
    }

    console.log(chalk.gray(`⏱️ Tempo de resposta: ${responseTime}ms`));
    
    // Mostra prévia da resposta (primeiras 150 caracteres)
    console.log(chalk.gray(`📄 Resposta: ${chatResult.response.substring(0, 150)}${chatResult.response.length > 150 ? '...' : ''}`));

    totalScore += validation.score;

    // Aguardar entre testes para evitar rate limiting
    if (i < TEST_QUESTIONS.length - 1) {
      console.log(chalk.gray('Aguardando 2 segundos...\n'));
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Calcular estatísticas finais
  const averageScore = totalScore / TEST_QUESTIONS.length;
  const successRate = (successfulTests / TEST_QUESTIONS.length) * 100;
  
  // Relatório final
  console.log(chalk.bold.cyan('\n' + '=' .repeat(70)));
  console.log(chalk.bold.cyan('📊 RELATÓRIO FINAL DE VALIDAÇÃO'));
  console.log(chalk.bold.cyan('=' .repeat(70)));
  
  console.log(chalk.bold.white(`\n📈 ESTATÍSTICAS GERAIS:`));
  console.log(`  ✅ Testes bem-sucedidos: ${successfulTests}/${TEST_QUESTIONS.length}`);
  console.log(`  ❌ Testes falhou: ${failedTests}/${TEST_QUESTIONS.length}`);
  console.log(`  📊 Taxa de sucesso: ${successRate.toFixed(1)}%`);
  console.log(`  🎯 Score médio: ${averageScore.toFixed(1)}/100`);

  // Análise por categoria
  const categoryStats = {};
  results.forEach(r => {
    if (!categoryStats[r.category]) {
      categoryStats[r.category] = { total: 0, passed: 0, totalScore: 0 };
    }
    categoryStats[r.category].total++;
    categoryStats[r.category].totalScore += r.validation.score;
    if (r.success && r.validation.passed) {
      categoryStats[r.category].passed++;
    }
  });

  console.log(chalk.bold.white(`\n📊 ANÁLISE POR CATEGORIA:`));
  Object.entries(categoryStats).forEach(([category, stats]) => {
    const categorySuccessRate = (stats.passed / stats.total) * 100;
    const categoryAvgScore = stats.totalScore / stats.total;
    const status = categorySuccessRate >= 80 ? '✅' : categorySuccessRate >= 50 ? '⚠️' : '❌';
    console.log(`  ${status} ${category}: ${categorySuccessRate.toFixed(1)}% (Score: ${categoryAvgScore.toFixed(1)})`);
  });

  // Top falhas
  const failedResults = results.filter(r => !r.success || !r.validation.passed);
  if (failedResults.length > 0) {
    console.log(chalk.bold.yellow(`\n⚠️ TESTES QUE FALHARAM:`));
    failedResults.forEach(r => {
      console.log(chalk.red(`  ❌ ${r.id}: "${r.question}"`));
      if (r.validation.issues.length > 0) {
        r.validation.issues.forEach(issue => console.log(chalk.yellow(`     - ${issue}`)));
      }
    });
  }

  // Recomendações
  console.log(chalk.bold.white(`\n💡 RECOMENDAÇÕES:`));
  if (successRate >= 90) {
    console.log(chalk.green(`  🎉 Excelente! Sistema funcionando muito bem.`));
  } else if (successRate >= 70) {
    console.log(chalk.yellow(`  📈 Bom desempenho, mas há espaço para melhorias.`));
  } else {
    console.log(chalk.red(`  🔧 Sistema precisa de ajustes significativos.`));
  }

  if (averageScore < 70) {
    console.log(chalk.red(`  - Score médio baixo indica problemas na qualidade das respostas`));
  }

  if (failedResults.some(r => r.category.includes('regime_urbanistico'))) {
    console.log(chalk.yellow(`  - Problemas com buscas de regime urbanístico`));
  }

  if (failedResults.some(r => r.category.includes('artigo_literal'))) {
    console.log(chalk.yellow(`  - Problemas com recuperação de artigos específicos`));
  }

  // Salvar resultados detalhados
  const reportData = {
    timestamp: new Date().toISOString(),
    summary: {
      total_tests: TEST_QUESTIONS.length,
      successful_tests: successfulTests,
      failed_tests: failedTests,
      success_rate: successRate,
      average_score: averageScore
    },
    category_stats: categoryStats,
    detailed_results: results
  };

  console.log(chalk.gray(`\n💾 Salvando relatório detalhado...`));
  
  // Salvar no banco para histórico
  try {
    const { error } = await supabase
      .from('qa_validation_reports')
      .insert([{
        test_type: 'validation_15_questions',
        total_tests: TEST_QUESTIONS.length,
        successful_tests: successfulTests,
        success_rate: successRate,
        average_score: averageScore,
        detailed_results: reportData,
        created_at: new Date().toISOString()
      }]);

    if (!error) {
      console.log(chalk.green(`✅ Relatório salvo no banco de dados`));
    }
  } catch (error) {
    console.log(chalk.yellow(`⚠️ Não foi possível salvar no banco: ${error.message}`));
  }

  console.log(chalk.bold.cyan('\n🎯 VALIDAÇÃO CONCLUÍDA!\n'));
  
  return {
    success_rate: successRate,
    average_score: averageScore,
    results: results,
    passed: successRate >= 70 // Considera aprovado se >= 70%
  };
}

// Executar suite de validação
if (import.meta.url === `file://${process.argv[1]}`) {
  runValidationSuite().catch(error => {
    console.error(chalk.red('❌ Erro na execução dos testes:', error));
    process.exit(1);
  });
}

export { runValidationSuite, TEST_QUESTIONS, validateResponse };