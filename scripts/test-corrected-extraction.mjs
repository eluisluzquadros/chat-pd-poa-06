#!/usr/bin/env node

/**
 * TESTE DE EXTRAÇÃO CORRIGIDA
 * Valida se a extração melhorada resolve o problema de 80% de falha
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Lista dos 5 bairros para teste
const TEST_BAIRROS = [
  { name: 'PETRÓPOLIS', query: 'qual a altura máxima em petrópolis' },
  { name: 'ABERTA DOS MORROS', query: 'qual é a altura máxima e coef. básico e máx do aberta dos morros para cada zot' },
  { name: 'CENTRO HISTÓRICO', query: 'coeficiente de aproveitamento máximo no centro histórico' },
  { name: 'BELÉM NOVO', query: 'o que pode ser construído em belém novo' },
  { name: 'AZENHA', query: 'conte-me sobre azenha' }
];

/**
 * Extrai bairro da query (versão simplificada)
 */
function extractBairro(query) {
  const queryLower = query.toLowerCase();
  
  // Mapeamento de variações
  const mappings = {
    'petrópolis': 'PETRÓPOLIS',
    'petropolis': 'PETRÓPOLIS',
    'aberta dos morros': 'ABERTA DOS MORROS',
    'centro histórico': 'CENTRO HISTÓRICO',
    'centro historico': 'CENTRO HISTÓRICO',
    'belém novo': 'BELÉM NOVO',
    'belem novo': 'BELÉM NOVO',
    'azenha': 'AZENHA'
  };
  
  for (const [pattern, bairro] of Object.entries(mappings)) {
    if (queryLower.includes(pattern)) {
      return bairro;
    }
  }
  
  return null;
}

/**
 * Testa query ANTES da correção (busca pela query inteira)
 */
async function testBeforeCorrection(query) {
  const { data, error } = await supabase
    .from('regime_urbanistico_consolidado')
    .select('*')
    .or(`"Bairro".ilike.%${query}%,"Zona".ilike.%${query}%`)
    .limit(5);
  
  return { data, error };
}

/**
 * Testa query DEPOIS da correção (extrai bairro primeiro)
 */
async function testAfterCorrection(query) {
  const bairro = extractBairro(query);
  
  if (!bairro) {
    return { data: [], error: 'Bairro não identificado na query' };
  }
  
  const { data, error } = await supabase
    .from('regime_urbanistico_consolidado')
    .select('*')
    .ilike('"Bairro"', `%${bairro}%`)
    .limit(5);
  
  return { data, error };
}

/**
 * Executa testes comparativos
 */
async function runComparativeTest() {
  console.log(chalk.bold.cyan('\n🔬 TESTE COMPARATIVO: ANTES vs DEPOIS DA CORREÇÃO\n'));
  console.log(chalk.gray('=' .repeat(70)));
  
  let beforeSuccess = 0;
  let afterSuccess = 0;
  
  for (const test of TEST_BAIRROS) {
    console.log(chalk.bold.blue(`\n📍 Testando: ${test.name}`));
    console.log(chalk.cyan(`   Query: "${test.query}"`));
    
    // ANTES da correção
    console.log(chalk.yellow('\n   ANTES (busca query inteira):'));
    const before = await testBeforeCorrection(test.query);
    
    if (before.error) {
      console.log(chalk.red(`   ❌ Erro: ${before.error}`));
    } else if (!before.data || before.data.length === 0) {
      console.log(chalk.red(`   ❌ Nenhum resultado`));
    } else {
      console.log(chalk.green(`   ✅ ${before.data.length} resultados encontrados`));
      beforeSuccess++;
      
      const sample = before.data[0];
      console.log(chalk.gray(`      Bairro: ${sample.Bairro}, Zona: ${sample.Zona}`));
    }
    
    // DEPOIS da correção
    console.log(chalk.yellow('\n   DEPOIS (extrai bairro):'));
    const bairroExtraido = extractBairro(test.query);
    console.log(chalk.gray(`   Bairro extraído: "${bairroExtraido}"`));
    
    const after = await testAfterCorrection(test.query);
    
    if (after.error) {
      console.log(chalk.red(`   ❌ Erro: ${after.error}`));
    } else if (!after.data || after.data.length === 0) {
      console.log(chalk.red(`   ❌ Nenhum resultado`));
    } else {
      console.log(chalk.green(`   ✅ ${after.data.length} resultados encontrados`));
      afterSuccess++;
      
      const sample = after.data[0];
      console.log(chalk.gray(`      Bairro: ${sample.Bairro}, Zona: ${sample.Zona}`));
      if (sample.Altura_Maxima___Edificacao_Isolada) {
        console.log(chalk.gray(`      Altura: ${sample.Altura_Maxima___Edificacao_Isolada}m`));
      }
    }
    
    console.log(chalk.gray('-'.repeat(70)));
  }
  
  // Resumo
  const beforeRate = (beforeSuccess / TEST_BAIRROS.length) * 100;
  const afterRate = (afterSuccess / TEST_BAIRROS.length) * 100;
  
  console.log(chalk.bold.cyan('\n' + '=' .repeat(70)));
  console.log(chalk.bold.cyan('📊 RESULTADO DA COMPARAÇÃO'));
  console.log(chalk.bold.cyan('=' .repeat(70)));
  
  console.log(chalk.bold.white('\n📈 TAXA DE SUCESSO:'));
  console.log(`   ${beforeRate < 50 ? chalk.red : chalk.yellow}ANTES:  ${beforeSuccess}/${TEST_BAIRROS.length} (${beforeRate.toFixed(0)}%)`);
  console.log(`   ${afterRate >= 80 ? chalk.green : chalk.yellow}DEPOIS: ${afterSuccess}/${TEST_BAIRROS.length} (${afterRate.toFixed(0)}%)`);
  
  const improvement = afterRate - beforeRate;
  if (improvement > 0) {
    console.log(chalk.bold.green(`\n🎯 MELHORIA: +${improvement.toFixed(0)}%`));
  }
  
  console.log(chalk.bold.white('\n💡 CONCLUSÃO:'));
  if (afterRate >= 80) {
    console.log(chalk.green('✅ A correção RESOLVE o problema! Taxa de sucesso acima de 80%'));
  } else if (afterRate > beforeRate) {
    console.log(chalk.yellow('⚠️ A correção melhora mas não resolve completamente'));
  } else {
    console.log(chalk.red('❌ A correção não teve efeito positivo'));
  }
  
  console.log(chalk.bold.white('\n🔧 CORREÇÃO NECESSÁRIA NA EDGE FUNCTION:'));
  console.log(chalk.cyan(`
  1. Extrair o bairro da query ANTES de fazer a busca
  2. Usar o bairro extraído na condição SQL
  3. Implementar mapeamento de variações (com/sem acento)
  4. Adicionar fallback para REGIME_FALLBACK quando necessário
  `));
}

// Executar
runComparativeTest().catch(error => {
  console.error(chalk.red('❌ Erro fatal:', error));
  process.exit(1);
});