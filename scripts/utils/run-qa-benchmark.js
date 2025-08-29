import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CHAT_EDGE_FUNCTION_URL = `${process.env.SUPABASE_URL}/functions/v1/chat`;

async function runBenchmark() {
  console.log(chalk.cyan.bold('\n🚀 Iniciando Benchmark Automático de QA\n'));
  console.log('=' .repeat(60));

  // Buscar todos os casos de teste ativos
  const { data: testCases, error: fetchError } = await supabase
    .from('qa_test_cases')
    .select('*')
    .eq('is_active', true)
    .order('id');

  if (fetchError) {
    console.error(chalk.red('❌ Erro ao buscar casos de teste:'), fetchError.message);
    return;
  }

  console.log(chalk.yellow(`📊 Total de casos de teste: ${testCases.length}\n`));

  // Estatísticas
  const results = {
    total: testCases.length,
    passed: 0,
    failed: 0,
    errors: 0,
    byCategory: {},
    failedCases: []
  };

  // Processar cada caso
  for (const [index, testCase] of testCases.entries()) {
    const progress = `[${index + 1}/${testCases.length}]`;
    
    try {
      console.log(chalk.blue(`${progress} Testando: ${testCase.query.substring(0, 50)}...`));
      
      // Fazer chamada para a Edge Function
      const response = await fetch(CHAT_EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          message: testCase.query,
          userId: 'benchmark-test',
          sessionId: `benchmark-${Date.now()}`
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const result = await response.json();
      
      // Validar resposta
      let passed = true;
      const issues = [];

      // Verificar tamanho mínimo da resposta
      if (testCase.min_response_length && result.response.length < testCase.min_response_length) {
        passed = false;
        issues.push(`Resposta muito curta (${result.response.length} < ${testCase.min_response_length})`);
      }

      // Verificar palavras-chave esperadas
      if (testCase.expected_keywords && testCase.expected_keywords.length > 0) {
        const responseLower = result.response.toLowerCase();
        const missingKeywords = testCase.expected_keywords.filter(
          keyword => !responseLower.includes(keyword.toLowerCase())
        );
        
        if (missingKeywords.length > testCase.expected_keywords.length * 0.5) {
          passed = false;
          issues.push(`Faltam palavras-chave: ${missingKeywords.join(', ')}`);
        }
      }

      // Verificar resposta esperada (se disponível)
      if (testCase.expected_response) {
        const similarity = calculateSimilarity(result.response, testCase.expected_response);
        if (similarity < 0.3) {
          passed = false;
          issues.push(`Resposta muito diferente da esperada (similaridade: ${(similarity * 100).toFixed(1)}%)`);
        }
      }

      // Atualizar estatísticas
      if (passed) {
        results.passed++;
        console.log(chalk.green(`  ✅ PASSOU`));
      } else {
        results.failed++;
        results.failedCases.push({
          id: testCase.id,
          query: testCase.query,
          category: testCase.category,
          issues: issues,
          response: result.response.substring(0, 200)
        });
        console.log(chalk.red(`  ❌ FALHOU: ${issues.join('; ')}`));
      }

      // Estatísticas por categoria
      if (!results.byCategory[testCase.category]) {
        results.byCategory[testCase.category] = { total: 0, passed: 0, failed: 0 };
      }
      results.byCategory[testCase.category].total++;
      results.byCategory[testCase.category][passed ? 'passed' : 'failed']++;

      // Salvar resultado no banco
      await supabase
        .from('benchmark_results')
        .insert({
          test_case_id: testCase.id,
          model: 'gpt-4o-mini',
          response: result.response,
          is_correct: passed,
          response_time: result.processingTime || 0,
          metadata: {
            issues: issues,
            tokens_used: result.tokensUsed || 0
          }
        });

    } catch (error) {
      results.errors++;
      console.log(chalk.red(`  ❌ ERRO: ${error.message}`));
      results.failedCases.push({
        id: testCase.id,
        query: testCase.query,
        category: testCase.category,
        error: error.message
      });
    }

    // Pequeno delay para não sobrecarregar
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Exibir relatório final
  console.log('\n' + '=' .repeat(60));
  console.log(chalk.cyan.bold('\n📊 RELATÓRIO FINAL DO BENCHMARK\n'));
  
  const successRate = (results.passed / results.total * 100).toFixed(1);
  const color = successRate >= 70 ? chalk.green : successRate >= 50 ? chalk.yellow : chalk.red;
  
  console.log(color.bold(`Taxa de Sucesso: ${successRate}%`));
  console.log(chalk.white(`✅ Passou: ${results.passed}/${results.total}`));
  console.log(chalk.white(`❌ Falhou: ${results.failed}/${results.total}`));
  console.log(chalk.white(`⚠️ Erros: ${results.errors}/${results.total}`));

  // Estatísticas por categoria
  console.log(chalk.cyan('\n📈 Resultados por Categoria:\n'));
  for (const [category, stats] of Object.entries(results.byCategory)) {
    const catSuccessRate = (stats.passed / stats.total * 100).toFixed(1);
    const catColor = catSuccessRate >= 70 ? chalk.green : catSuccessRate >= 50 ? chalk.yellow : chalk.red;
    console.log(`  ${category}: ${catColor(catSuccessRate + '%')} (${stats.passed}/${stats.total})`);
  }

  // Casos que falharam
  if (results.failedCases.length > 0) {
    console.log(chalk.red('\n❌ Casos que Falharam:\n'));
    results.failedCases.slice(0, 10).forEach(failedCase => {
      console.log(chalk.yellow(`ID ${failedCase.id}: ${failedCase.query.substring(0, 50)}...`));
      if (failedCase.issues) {
        console.log(chalk.gray(`  Problemas: ${failedCase.issues.join('; ')}`));
      }
      if (failedCase.error) {
        console.log(chalk.gray(`  Erro: ${failedCase.error}`));
      }
    });
    
    if (results.failedCases.length > 10) {
      console.log(chalk.gray(`\n  ... e mais ${results.failedCases.length - 10} casos`));
    }
  }

  // Recomendações
  console.log(chalk.cyan.bold('\n💡 RECOMENDAÇÕES:\n'));
  
  if (successRate < 50) {
    console.log(chalk.red('⚠️ Sistema crítico - Taxa de sucesso muito baixa'));
    console.log('   - Verificar se as Edge Functions estão funcionando corretamente');
    console.log('   - Revisar a implementação do RAG e SQL generator');
    console.log('   - Verificar se os dados estão corretos nas tabelas');
  } else if (successRate < 70) {
    console.log(chalk.yellow('⚠️ Sistema precisa de melhorias'));
    console.log('   - Analisar categorias com baixo desempenho');
    console.log('   - Ajustar prompts e lógica de busca');
    console.log('   - Melhorar qualidade das respostas');
  } else {
    console.log(chalk.green('✅ Sistema funcionando adequadamente'));
    console.log('   - Focar em otimizações pontuais');
    console.log('   - Melhorar casos específicos que falharam');
  }

  console.log('\n' + '=' .repeat(60));
  console.log(chalk.cyan('✅ Benchmark concluído!\n'));
}

// Função auxiliar para calcular similaridade
function calculateSimilarity(str1, str2) {
  const words1 = str1.toLowerCase().split(/\s+/);
  const words2 = str2.toLowerCase().split(/\s+/);
  
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

// Executar
runBenchmark().catch(console.error);