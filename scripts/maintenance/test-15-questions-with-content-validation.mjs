#!/usr/bin/env node

/**
 * Teste das 15 perguntas COM VALIDAÇÃO DE CONTEÚDO
 * Verifica se as respostas realmente respondem às perguntas
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TEST_CASES = [
  {
    id: 1,
    question: "escreva um resumo de até 25 palavras sobre a lei do plano diretor de porto alegre",
    validate: (response) => {
      const r = response.toLowerCase();
      const wordCount = response.split(' ').filter(w => w.length > 0).length;
      return {
        success: r.includes('plano diretor') && r.includes('porto alegre') && wordCount <= 35,
        reason: wordCount > 35 ? `Muito longo: ${wordCount} palavras` : 
                !r.includes('plano diretor') ? 'Não menciona plano diretor' : 
                !r.includes('porto alegre') ? 'Não menciona Porto Alegre' : 'OK'
      };
    }
  },
  {
    id: 2,
    question: "qual é a altura máxima e coef. básico e máx do aberta dos morros para cada zot",
    validate: (response) => {
      const r = response.toLowerCase();
      const hasNumbers = /\d+/.test(response);
      const hasHeight = r.includes('altura') || r.includes('metro') || r.includes('m');
      const hasCoef = r.includes('coeficiente') || r.includes('coef');
      const hasZones = r.includes('zot') || r.includes('zona');
      
      return {
        success: hasNumbers && hasHeight && hasCoef && hasZones,
        reason: !hasNumbers ? 'Não fornece valores numéricos' :
                !hasHeight ? 'Não menciona altura' :
                !hasCoef ? 'Não menciona coeficientes' :
                !hasZones ? 'Não menciona zonas' : 'OK'
      };
    }
  },
  {
    id: 3,
    question: "artigo 1º da luos",
    validate: (response) => {
      const r = response.toLowerCase();
      const hasArticle = r.includes('art. 1') || r.includes('artigo 1');
      const hasLuos = r.includes('luos') || r.includes('lei de uso e ocupação');
      const hasContent = r.includes('fica instituída') || r.includes('regulamenta');
      
      return {
        success: hasArticle && hasLuos && hasContent,
        reason: !hasArticle ? 'Não cita o artigo 1' :
                !hasLuos ? 'Não menciona LUOS' :
                !hasContent ? 'Não apresenta conteúdo do artigo' : 'OK'
      };
    }
  },
  {
    id: 4,
    question: "quais são os títulos da luos",
    validate: (response) => {
      const r = response.toLowerCase();
      const hasList = r.includes('título') && (r.includes('i') || r.includes('1'));
      const notFound = r.includes('não inclui') || r.includes('não encontr') || r.includes('não dispon');
      
      return {
        success: hasList && !notFound,
        reason: notFound ? 'Resposta indica que não encontrou os títulos' :
                !hasList ? 'Não lista os títulos' : 'OK'
      };
    }
  },
  {
    id: 5,
    question: "artigo 5 da luos",
    validate: (response) => {
      const r = response.toLowerCase();
      const hasArticle = r.includes('art. 5') || r.includes('artigo 5');
      const hasLuos = r.includes('luos');
      const hasContent = response.length > 100;
      
      return {
        success: hasArticle && hasLuos && hasContent,
        reason: !hasArticle ? 'Não cita o artigo 5' :
                !hasLuos ? 'Não menciona LUOS' :
                !hasContent ? 'Conteúdo muito curto' : 'OK'
      };
    }
  },
  {
    id: 6,
    question: "artigo 5 do pdus",
    validate: (response) => {
      const r = response.toLowerCase();
      const hasArticle = r.includes('art. 5') || r.includes('artigo 5');
      const hasPdus = r.includes('pdus') || r.includes('plano diretor');
      const hasContent = response.length > 100;
      
      return {
        success: hasArticle && hasPdus && hasContent,
        reason: !hasArticle ? 'Não cita o artigo 5' :
                !hasPdus ? 'Não menciona PDUS' :
                !hasContent ? 'Conteúdo muito curto' : 'OK'
      };
    }
  },
  {
    id: 7,
    question: "conte-me sobre petrópolis",
    validate: (response) => {
      const r = response.toLowerCase();
      const hasPetropolis = r.includes('petrópolis');
      const hasBairro = r.includes('bairro');
      const hasInfo = r.includes('zona') || r.includes('zot') || r.includes('altura') || r.includes('coeficiente');
      
      return {
        success: hasPetropolis && hasBairro && hasInfo,
        reason: !hasPetropolis ? 'Não menciona Petrópolis' :
                !hasBairro ? 'Não identifica como bairro' :
                !hasInfo ? 'Não fornece informações urbanísticas' : 'OK'
      };
    }
  },
  {
    id: 8,
    question: "qual a altura máxima em petrópolis",
    validate: (response) => {
      const r = response.toLowerCase();
      const hasPetropolis = r.includes('petrópolis');
      const hasHeight = r.includes('altura') || r.includes('metro') || r.includes('m');
      const hasNumber = /\d+/.test(response);
      const notFound = r.includes('não encontr') || r.includes('não dispon');
      
      return {
        success: hasPetropolis && hasHeight && hasNumber && !notFound,
        reason: notFound ? 'Não encontrou informação' :
                !hasPetropolis ? 'Não menciona Petrópolis' :
                !hasHeight ? 'Não menciona altura' :
                !hasNumber ? 'Não fornece valor numérico' : 'OK'
      };
    }
  },
  {
    id: 9,
    question: "o que pode ser construído em petrópolis",
    validate: (response) => {
      const r = response.toLowerCase();
      const hasPetropolis = r.includes('petrópolis');
      const hasUses = r.includes('residencial') || r.includes('comercial') || r.includes('uso') || 
                      r.includes('permitido') || r.includes('construção');
      
      return {
        success: hasPetropolis && hasUses,
        reason: !hasPetropolis ? 'Não menciona Petrópolis' :
                !hasUses ? 'Não especifica usos permitidos' : 'OK'
      };
    }
  },
  {
    id: 10,
    question: "onde posso abrir um restaurante em porto alegre",
    validate: (response) => {
      const r = response.toLowerCase();
      const hasRestaurant = r.includes('restaurante');
      const hasZones = r.includes('zona') || r.includes('zot') || r.includes('comercial');
      const hasLocation = r.includes('bairro') || r.includes('centro') || r.includes('área');
      
      return {
        success: hasRestaurant && (hasZones || hasLocation),
        reason: !hasRestaurant ? 'Não menciona restaurante' :
                !(hasZones || hasLocation) ? 'Não indica onde pode ser aberto' : 'OK'
      };
    }
  },
  {
    id: 11,
    question: "capítulo 1 da luos",
    validate: (response) => {
      const r = response.toLowerCase();
      const hasChapter = r.includes('capítulo') || r.includes('cap');
      const hasLuos = r.includes('luos');
      const hasContent = response.length > 100;
      
      return {
        success: hasChapter && hasLuos && hasContent,
        reason: !hasChapter ? 'Não menciona capítulo' :
                !hasLuos ? 'Não menciona LUOS' :
                !hasContent ? 'Conteúdo muito curto' : 'OK'
      };
    }
  },
  {
    id: 12,
    question: "artigo sobre estacionamento",
    validate: (response) => {
      const r = response.toLowerCase();
      const hasParking = r.includes('estacionamento') || r.includes('vaga') || r.includes('garagem');
      const hasArticle = r.includes('art') || r.includes('artigo');
      const hasRequirements = r.includes('exig') || r.includes('mínimo') || r.includes('obrigatório') || /\d+/.test(response);
      
      return {
        success: hasParking && (hasArticle || hasRequirements),
        reason: !hasParking ? 'Não menciona estacionamento' :
                !(hasArticle || hasRequirements) ? 'Não cita artigos ou requisitos' : 'OK'
      };
    }
  },
  {
    id: 13,
    question: "normas sobre área de preservação",
    validate: (response) => {
      const r = response.toLowerCase();
      const hasPreservation = r.includes('preservação') || r.includes('ambiental') || r.includes('app') || 
                              r.includes('proteção');
      const hasNorms = r.includes('norma') || r.includes('restrição') || r.includes('proibido') || 
                       r.includes('permitido') || r.includes('artigo');
      
      return {
        success: hasPreservation && hasNorms,
        reason: !hasPreservation ? 'Não menciona preservação' :
                !hasNorms ? 'Não apresenta normas ou restrições' : 'OK'
      };
    }
  },
  {
    id: 14,
    question: "coeficiente de aproveitamento máximo no centro histórico",
    validate: (response) => {
      const r = response.toLowerCase();
      const hasCenter = r.includes('centro histórico') || r.includes('centro historico');
      const hasCoef = r.includes('coeficiente') || r.includes('ca') || r.includes('aproveitamento');
      const hasNumber = /\d+/.test(response) || /\d+[,\.]\d+/.test(response);
      
      return {
        success: hasCenter && hasCoef && hasNumber,
        reason: !hasCenter ? 'Não menciona centro histórico' :
                !hasCoef ? 'Não menciona coeficiente' :
                !hasNumber ? 'Não fornece valor numérico' : 'OK'
      };
    }
  },
  {
    id: 15,
    question: "quais os instrumentos do plano diretor",
    validate: (response) => {
      const r = response.toLowerCase();
      const hasInstruments = r.includes('instrumento');
      const hasPlan = r.includes('plano diretor') || r.includes('pdus');
      const hasList = r.includes('outorga') || r.includes('transferência') || r.includes('operação') || 
                      r.includes('estudo') || r.includes('parcelamento') || r.includes('zoneamento');
      
      return {
        success: hasInstruments && hasPlan && hasList,
        reason: !hasInstruments ? 'Não menciona instrumentos' :
                !hasPlan ? 'Não menciona plano diretor' :
                !hasList ? 'Não lista instrumentos específicos' : 'OK'
      };
    }
  }
];

async function testQuestion(testCase) {
  console.log(chalk.bold.blue(`\n📝 Teste ${testCase.id}/15:`));
  console.log(chalk.cyan(`Pergunta: "${testCase.question}"`));
  
  const startTime = Date.now();
  
  try {
    const { data, error } = await supabase.functions.invoke('agentic-rag', {
      body: {
        message: testCase.question,
        conversation_id: `test_${Date.now()}_${testCase.id}`,
        user_id: 'validation_user'
      }
    });

    const responseTime = Date.now() - startTime;

    if (error) {
      console.log(chalk.red(`❌ ERRO NA API: ${error.message}`));
      return {
        id: testCase.id,
        question: testCase.question,
        success: false,
        error: error.message,
        response: null,
        responseTime
      };
    }

    const response = data?.response || 'Resposta vazia';
    const validation = testCase.validate(response);
    
    if (validation.success) {
      console.log(chalk.green(`✅ PASSOU: ${validation.reason}`));
    } else {
      console.log(chalk.red(`❌ FALHOU: ${validation.reason}`));
    }
    
    console.log(chalk.gray(`⏱️  Tempo: ${responseTime}ms`));
    console.log(chalk.gray(`📄 Resposta: ${response.substring(0, 150)}...`));
    
    return {
      id: testCase.id,
      question: testCase.question,
      success: validation.success,
      reason: validation.reason,
      response: response,
      responseTime
    };
    
  } catch (error) {
    console.log(chalk.red(`❌ ERRO DE CONEXÃO: ${error.message}`));
    return {
      id: testCase.id,
      question: testCase.question,
      success: false,
      error: error.message,
      response: null,
      responseTime: Date.now() - startTime
    };
  }
}

async function runValidation() {
  console.log(chalk.bold.cyan('\n🧪 VALIDAÇÃO COM ANÁLISE DE CONTEÚDO - 15 PERGUNTAS\n'));
  console.log(chalk.gray('=' .repeat(70)));

  const results = [];
  let successCount = 0;
  let totalResponseTime = 0;

  for (const testCase of TEST_CASES) {
    const result = await testQuestion(testCase);
    results.push(result);
    
    if (result.success) successCount++;
    totalResponseTime += result.responseTime;
    
    // Pausa entre testes
    if (testCase.id < TEST_CASES.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Relatório final
  const successRate = (successCount / TEST_CASES.length) * 100;
  const avgResponseTime = totalResponseTime / TEST_CASES.length;
  
  console.log(chalk.bold.cyan('\n' + '=' .repeat(70)));
  console.log(chalk.bold.cyan('📊 RELATÓRIO FINAL DE VALIDAÇÃO'));
  console.log(chalk.bold.cyan('=' .repeat(70)));
  
  console.log(chalk.bold.white(`\n📈 ESTATÍSTICAS:`));
  console.log(`  ✅ Testes aprovados: ${successCount}/${TEST_CASES.length}`);
  console.log(`  ❌ Testes reprovados: ${TEST_CASES.length - successCount}/${TEST_CASES.length}`);
  console.log(`  📊 Taxa de sucesso: ${successRate.toFixed(1)}%`);
  console.log(`  ⏱️  Tempo médio de resposta: ${avgResponseTime.toFixed(0)}ms`);
  
  // Análise por categoria
  const categories = {
    artigos_literais: [3, 5, 6, 11],
    regime_urbanistico: [2, 7, 8, 9, 14],
    estrutura_hierarquica: [4, 11],
    busca_tematica: [10, 12, 13, 15],
    resumo: [1]
  };
  
  console.log(chalk.bold.white(`\n📊 ANÁLISE POR CATEGORIA:`));
  for (const [category, ids] of Object.entries(categories)) {
    const categoryResults = results.filter(r => ids.includes(r.id));
    const categorySuccess = categoryResults.filter(r => r.success).length;
    const categoryRate = (categorySuccess / categoryResults.length) * 100;
    const status = categoryRate >= 80 ? '✅' : categoryRate >= 50 ? '⚠️' : '❌';
    console.log(`  ${status} ${category}: ${categoryRate.toFixed(0)}% (${categorySuccess}/${categoryResults.length})`);
  }
  
  // Listar falhas
  const failures = results.filter(r => !r.success);
  if (failures.length > 0) {
    console.log(chalk.bold.yellow(`\n⚠️ TESTES QUE FALHARAM:`));
    failures.forEach(f => {
      console.log(chalk.red(`  ${f.id}. "${f.question}"`));
      console.log(chalk.yellow(`     Motivo: ${f.reason || f.error}`));
    });
  }
  
  // Avaliação final
  console.log(chalk.bold.white(`\n🎯 AVALIAÇÃO FINAL:`));
  if (successRate >= 90) {
    console.log(chalk.bold.green(`  🏆 EXCELENTE! Sistema está funcionando muito bem.`));
  } else if (successRate >= 70) {
    console.log(chalk.bold.green(`  ✅ BOM! Sistema funcional, mas pode melhorar.`));
  } else if (successRate >= 50) {
    console.log(chalk.bold.yellow(`  ⚠️ REGULAR! Sistema precisa de ajustes importantes.`));
  } else {
    console.log(chalk.bold.red(`  ❌ CRÍTICO! Sistema não está atendendo aos requisitos.`));
  }
  
  // Problemas específicos identificados
  console.log(chalk.bold.white(`\n💡 PROBLEMAS IDENTIFICADOS:`));
  const problemPatterns = {
    'Não encontra títulos/estrutura': failures.filter(f => f.id === 4).length > 0,
    'Falha em valores numéricos': failures.filter(f => [2, 8, 14].includes(f.id)).length > 0,
    'Não recupera artigos específicos': failures.filter(f => [3, 5, 6].includes(f.id)).length > 0,
    'Problemas com bairros': failures.filter(f => [7, 8, 9].includes(f.id)).length > 0
  };
  
  Object.entries(problemPatterns).forEach(([problem, hasIssue]) => {
    if (hasIssue) {
      console.log(chalk.yellow(`  ⚠️ ${problem}`));
    }
  });
  
  console.log(chalk.bold.cyan(`\n✅ VALIDAÇÃO CONCLUÍDA!\n`));
  
  // Salvar resultado no banco
  try {
    const { error } = await supabase
      .from('qa_validation_reports')
      .insert([{
        test_type: 'content_validation_15_questions',
        total_tests: TEST_CASES.length,
        successful_tests: successCount,
        success_rate: successRate,
        average_response_time: avgResponseTime,
        detailed_results: results,
        created_at: new Date().toISOString()
      }]);
    
    if (!error) {
      console.log(chalk.gray(`💾 Relatório salvo no banco de dados`));
    }
  } catch (error) {
    // Ignore save errors
  }
  
  return {
    success_rate: successRate,
    successful_tests: successCount,
    total_tests: TEST_CASES.length,
    results: results
  };
}

// Executar
runValidation().catch(error => {
  console.error(chalk.red('❌ Erro fatal:', error));
  process.exit(1);
});