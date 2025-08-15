#!/usr/bin/env node

/**
 * Analisa o histórico de execuções QA e mensagens do admin
 * para identificar divergências nos resultados
 */

import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY);

async function analyzeQAHistory() {
  console.log(chalk.cyan.bold('🔍 ANÁLISE DO HISTÓRICO DE EXECUÇÕES QA\n'));
  
  // 1. Buscar execuções QA recentes
  console.log(chalk.yellow('1. Buscando execuções QA recentes...'));
  const { data: qaRuns, error: qaError } = await supabase
    .from('qa_validation_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(5);
  
  if (qaError) {
    console.error(chalk.red('Erro ao buscar execuções QA:'), qaError);
    return;
  }
  
  if (qaRuns && qaRuns.length > 0) {
    console.log(`✅ ${qaRuns.length} execuções encontradas\n`);
    
    qaRuns.forEach((run, idx) => {
      console.log(chalk.cyan(`Execução ${idx + 1}:`));
      console.log(`  ID: ${run.id}`);
      console.log(`  Data: ${new Date(run.started_at).toLocaleString('pt-BR')}`);
      console.log(`  Modelo: ${run.model || 'Não especificado'}`);
      console.log(`  Acurácia: ${run.overall_accuracy ? (run.overall_accuracy * 100).toFixed(1) + '%' : 'N/A'}`);
      console.log(`  Total de Casos: ${run.total_test_cases || 'N/A'}`);
      console.log(`  Casos Bem-sucedidos: ${run.successful_cases || 'N/A'}`);
      console.log(`  Tempo Médio: ${run.avg_response_time_ms ? run.avg_response_time_ms + 'ms' : 'N/A'}`);
      console.log('');
    });
  }
  
  // 2. Buscar resultados detalhados da execução mais recente
  if (qaRuns && qaRuns.length > 0) {
    const latestRunId = qaRuns[0].id;
    console.log(chalk.yellow(`2. Analisando resultados detalhados da execução mais recente (${latestRunId})...`));
    
    const { data: qaResults, error: resultsError } = await supabase
      .from('qa_validation_results')
      .select('*')
      .eq('validation_run_id', latestRunId)
      .eq('is_correct', false)
      .limit(20);
    
    if (resultsError) {
      console.error(chalk.red('Erro ao buscar resultados:'), resultsError);
    } else if (qaResults && qaResults.length > 0) {
      console.log(chalk.red(`\n❌ ${qaResults.length} casos falharam na última execução:\n`));
      
      qaResults.forEach((result, idx) => {
        console.log(chalk.red(`Falha ${idx + 1}:`));
        console.log(`  Pergunta: ${result.question || 'N/A'}`);
        console.log(`  Resposta Esperada: ${result.expected_answer || 'N/A'}`);
        console.log(`  Resposta Obtida: ${result.actual_answer ? result.actual_answer.substring(0, 100) + '...' : 'N/A'}`);
        console.log(`  Tempo: ${result.response_time_ms}ms`);
        console.log('');
      });
    }
  }
  
  // 3. Buscar mensagens recentes do admin
  console.log(chalk.yellow('3. Buscando mensagens recentes do usuário Admin...'));
  
  // Primeiro, buscar o ID do usuário admin
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email')
    .or('email.ilike.%admin%,role.eq.admin')
    .limit(5);
  
  if (profiles && profiles.length > 0) {
    console.log(`✅ ${profiles.length} usuários admin encontrados\n`);
    
    for (const profile of profiles) {
      console.log(`Analisando mensagens de: ${profile.email || profile.id}`);
      
      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (messages && messages.length > 0) {
        console.log(`  📝 ${messages.length} mensagens recentes:\n`);
        
        messages.slice(0, 5).forEach(msg => {
          console.log(`  [${new Date(msg.created_at).toLocaleString('pt-BR')}]`);
          console.log(`  Pergunta: ${msg.content ? msg.content.substring(0, 80) + '...' : 'N/A'}`);
          if (msg.response) {
            console.log(`  Resposta: ${msg.response.substring(0, 100) + '...'}`);
          }
          console.log('');
        });
      }
    }
  }
  
  // 4. Análise de padrões de falha
  console.log(chalk.yellow('\n4. Analisando padrões de falha comuns...'));
  
  const { data: failurePatterns } = await supabase
    .from('qa_validation_results')
    .select('question, expected_answer, actual_answer, test_case_id')
    .eq('is_correct', false)
    .limit(50);
  
  if (failurePatterns && failurePatterns.length > 0) {
    const patterns = {
      'citacao_incorreta': 0,
      'dados_bairro_errado': 0,
      'sem_informacao': 0,
      'formato_errado': 0,
      'outro': 0
    };
    
    failurePatterns.forEach(failure => {
      const question = failure.question || '';
      const expected = failure.expected_answer || '';
      const actual = failure.actual_answer || '';
      
      if (question.toLowerCase().includes('artigo') && !actual.includes(expected.match(/Art\.\s*\d+/)?.[0] || '')) {
        patterns.citacao_incorreta++;
      } else if (question.toLowerCase().includes('bairro') || question.toLowerCase().includes('jardim')) {
        patterns.dados_bairro_errado++;
      } else if (actual.includes('não encontrei') || actual.includes('Desculpe')) {
        patterns.sem_informacao++;
      } else if (actual.includes('-') && !expected.includes('-')) {
        patterns.formato_errado++;
      } else {
        patterns.outro++;
      }
    });
    
    console.log('\n📊 Padrões de Falha Identificados:');
    console.log(`  ❌ Citação de artigo incorreta: ${patterns.citacao_incorreta} casos`);
    console.log(`  ❌ Dados de bairro errado: ${patterns.dados_bairro_errado} casos`);
    console.log(`  ❌ Sem informação encontrada: ${patterns.sem_informacao} casos`);
    console.log(`  ❌ Formato de resposta errado: ${patterns.formato_errado} casos`);
    console.log(`  ❌ Outros erros: ${patterns.outro} casos`);
  }
  
  // 5. Casos específicos mencionados
  console.log(chalk.yellow('\n5. Verificando casos específicos mencionados...'));
  
  const specificCases = [
    'Qual artigo define o Estudo de Impacto de Vizinhança?',
    'Qual é a taxa de permeabilidade mínima para terrenos acima de 1.500 m²?',
    'Qual a altura máxima em Boa Vista?',
    'Quais são os parâmetros construtivos do Jardim São Pedro?'
  ];
  
  for (const testCase of specificCases) {
    console.log(chalk.cyan(`\nCaso: "${testCase}"`));
    
    // Buscar no qa_test_cases
    const { data: qaCase } = await supabase
      .from('qa_test_cases')
      .select('*')
      .ilike('question', `%${testCase}%`)
      .single();
    
    if (qaCase) {
      console.log(`  ✅ Encontrado no banco de casos de teste`);
      console.log(`  Categoria: ${qaCase.category}`);
      console.log(`  Resposta Esperada: ${qaCase.expected_keywords || qaCase.expected_answer || 'N/A'}`);
    }
    
    // Buscar resultados recentes
    const { data: results } = await supabase
      .from('qa_validation_results')
      .select('*')
      .ilike('question', `%${testCase}%`)
      .order('executed_at', { ascending: false })
      .limit(3);
    
    if (results && results.length > 0) {
      console.log(`  📊 ${results.length} execuções recentes:`);
      results.forEach((r, idx) => {
        console.log(`    ${idx + 1}. ${r.is_correct ? '✅' : '❌'} - ${r.response_time_ms}ms`);
        if (!r.is_correct) {
          console.log(`       Resposta: ${r.actual_answer ? r.actual_answer.substring(0, 100) + '...' : 'N/A'}`);
        }
      });
    }
  }
}

async function analyzeResponseSynthesizer() {
  console.log(chalk.cyan.bold('\n\n🔧 ANÁLISE DO RESPONSE SYNTHESIZER\n'));
  
  // Verificar qual versão está sendo usada
  console.log('Verificando configuração das Edge Functions...');
  
  // Testar diretamente as queries problemáticas
  const problemQueries = [
    {
      query: 'Qual artigo define o Estudo de Impacto de Vizinhança?',
      expected: 'Art. 89',
      actual: 'Art. 89' // Está retornando 89 mas deveria ser 90?
    },
    {
      query: 'Qual a altura máxima em Boa Vista?',
      expected: 'Bairro Boa Vista (não Boa Vista do Sul)',
      issue: 'Confundindo com Boa Vista do Sul'
    },
    {
      query: 'Jardim São Pedro',
      expected: 'Dados do bairro',
      issue: 'Retorna dados irreais ou incorretos'
    }
  ];
  
  console.log('\n📝 Problemas Identificados:');
  problemQueries.forEach((p, idx) => {
    console.log(chalk.red(`\n${idx + 1}. ${p.query}`));
    console.log(`   Esperado: ${p.expected}`);
    if (p.actual) console.log(`   Retornado: ${p.actual}`);
    if (p.issue) console.log(`   Problema: ${p.issue}`);
  });
}

async function main() {
  console.log(chalk.cyan.bold('=' .repeat(60)));
  console.log(chalk.cyan.bold('   ANÁLISE DE DIVERGÊNCIAS NO SISTEMA QA'));
  console.log(chalk.cyan.bold('=' .repeat(60)));
  
  await analyzeQAHistory();
  await analyzeResponseSynthesizer();
  
  console.log(chalk.cyan.bold('\n' + '=' .repeat(60)));
  console.log(chalk.yellow.bold('\n🎯 DIAGNÓSTICO PRELIMINAR:\n'));
  
  console.log('1. ❌ Response Synthesizer com mapeamento incorreto:');
  console.log('   - EIV deveria ser Art. 90, não 89');
  console.log('   - Citações legais hardcoded podem estar erradas\n');
  
  console.log('2. ❌ Problema de diferenciação de bairros:');
  console.log('   - Sistema confunde "Boa Vista" com "Boa Vista do Sul"');
  console.log('   - Busca parcial de nomes causa matches incorretos\n');
  
  console.log('3. ❌ Sensibilidade a formato de query:');
  console.log('   - "Jardim São Pedro" falha');
  console.log('   - "bairro jardim sao pedro" funciona');
  console.log('   - Problema de normalização de texto\n');
  
  console.log('4. ❌ Dados incompletos ou "-":');
  console.log('   - Taxa de permeabilidade retorna "não encontrei"');
  console.log('   - Coeficientes retornam "-" em vez de valores\n');
  
  console.log(chalk.green.bold('📋 AÇÕES RECOMENDADAS:\n'));
  console.log('1. Corrigir mapeamento de artigos no response-synthesizer-simple');
  console.log('2. Implementar busca exata de bairros (não parcial)');
  console.log('3. Normalizar queries antes do processamento');
  console.log('4. Verificar dados no banco para valores faltantes');
  console.log('5. Adicionar validação de respostas antes de retornar');
}

main().catch(error => {
  console.error(chalk.red('Erro:', error));
  process.exit(1);
});