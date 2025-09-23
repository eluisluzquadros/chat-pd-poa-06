#!/usr/bin/env node

/**
 * TESTE COMPLETO DOS 94 BAIRROS
 * Valida que a correção funciona para TODOS os bairros de Porto Alegre
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import chalk from 'chalk';
import { extractBairroFromQuery, extractZOTFromQuery, buildSearchConditions } from './regime-query-helper.mjs';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Lista oficial dos 94 bairros de Porto Alegre
const BAIRROS_PORTO_ALEGRE = [
  'ABERTA DOS MORROS', 'AGRONOMIA', 'ANCHIETA', 'ARQUIPÉLAGO', 'AUXILIADORA',
  'AZENHA', 'BELA VISTA', 'BELÉM NOVO', 'BELÉM VELHO', 'BOA VISTA',
  'BOA VISTA DO SUL', 'BOM FIM', 'BOM JESUS', 'CAMAQUÃ', 'CAMPO NOVO',
  'CASCATA', 'CAVALHADA', 'CEL. APARICIO BORGES', 'CENTRO HISTÓRICO', 'CHAPÉU DO SOL',
  'CHÁCARA DAS PEDRAS', 'CIDADE BAIXA', 'COSTA E SILVA', 'CRISTAL', 'CRISTO REDENTOR',
  'ESPÍRITO SANTO', 'EXTREMA', 'FARRAPOS', 'FARROUPILHA', 'FLORESTA',
  'GLÓRIA', 'GUARUJÁ', 'HIGIENÓPOLIS', 'HÍPICA', 'HUMAITÁ',
  'INDEPENDÊNCIA', 'IPANEMA', 'JARDIM BOTÂNICO', 'JARDIM CARVALHO', 'JARDIM DO SALSO',
  'JARDIM EUROPA', 'JARDIM FLORESTA', 'JARDIM ITU', 'JARDIM LEOPOLDINA', 'JARDIM LINDÓIA',
  'JARDIM SABARÁ', 'JARDIM SÃO PEDRO', 'JARDIM VILA NOVA', 'LAGEADO', 'LAMI',
  'LOMBA DO PINHEIRO', 'MÁRIO QUINTANA', 'MEDIANEIRA', 'MENINO DEUS', 'MOINHOS DE VENTO',
  'MONT SERRAT', 'NAVEGANTES', 'NONOAI', 'PARQUE SANTA FÉ', 'PARTENON',
  'PASSO D\'AREIA', 'PASSO DAS PEDRAS', 'PEDRA REDONDA', 'PETRÓPOLIS', 'PONTA GROSSA',
  'PRAIA DE BELAS', 'RESTINGA', 'RIO BRANCO', 'RUBEM BERTA', 'SANTA CECÍLIA',
  'SANTA MARIA GORETTI', 'SANTA TEREZA', 'SANTANA', 'SANTO ANTÔNIO', 'SÃO GERALDO',
  'SÃO JOÃO', 'SÃO JOSÉ', 'SÃO SEBASTIÃO', 'SARANDI', 'SERRARIA',
  'TERESÓPOLIS', 'TRÊS FIGUEIRAS', 'TRISTEZA', 'VILA ASSUNÇÃO', 'VILA CONCEIÇÃO',
  'VILA IPIRANGA', 'VILA JARDIM', 'VILA JOÃO PESSOA', 'VILA NOVA', 'VILA SÃO JOSÉ'
];

/**
 * Test variations of queries for a single neighborhood
 */
async function testBairroQueries(bairro) {
  const queries = [
    `qual a altura máxima em ${bairro.toLowerCase()}`,
    `coeficiente de aproveitamento no ${bairro}`,
    `o que pode ser construído em ${bairro.toLowerCase()}`,
    `regime urbanístico do ${bairro}`,
    `parâmetros de construção para ${bairro.toLowerCase()}`
  ];
  
  let successCount = 0;
  let failureCount = 0;
  const results = [];
  
  for (const query of queries) {
    // Extract neighborhood from query
    const extractedBairro = extractBairroFromQuery(query);
    
    if (extractedBairro === bairro) {
      // Query with extracted neighborhood
      const { data, error } = await supabase
        .from('regime_urbanistico_consolidado')
        .select('*')
        .ilike('"Bairro"', `%${extractedBairro}%`)
        .limit(3);
      
      if (data && data.length > 0) {
        successCount++;
        results.push({
          query: query.substring(0, 50),
          status: 'success',
          records: data.length,
          sample: data[0]?.Zona
        });
      } else {
        failureCount++;
        results.push({
          query: query.substring(0, 50),
          status: 'failed',
          error: error?.message || 'No data found'
        });
      }
    } else {
      failureCount++;
      results.push({
        query: query.substring(0, 50),
        status: 'failed',
        error: `Extraction failed: got "${extractedBairro}" expected "${bairro}"`
      });
    }
  }
  
  return {
    bairro,
    total: queries.length,
    success: successCount,
    failed: failureCount,
    successRate: (successCount / queries.length) * 100,
    results
  };
}

/**
 * Test all 94 neighborhoods
 */
async function testAll94Bairros() {
  console.log(chalk.bold.cyan('\n🔬 TESTE COMPLETO DOS 94 BAIRROS DE PORTO ALEGRE\n'));
  console.log(chalk.gray('=' .repeat(70)));
  
  const startTime = Date.now();
  const allResults = [];
  let totalSuccess = 0;
  let totalFailed = 0;
  let perfectBairros = 0;
  let problematicBairros = [];
  
  // Test each neighborhood
  for (let i = 0; i < BAIRROS_PORTO_ALEGRE.length; i++) {
    const bairro = BAIRROS_PORTO_ALEGRE[i];
    
    // Progress indicator
    process.stdout.write(chalk.cyan(`\r[${i + 1}/94] Testing: ${bairro.padEnd(30)}`));
    
    const result = await testBairroQueries(bairro);
    allResults.push(result);
    
    totalSuccess += result.success;
    totalFailed += result.failed;
    
    if (result.successRate === 100) {
      perfectBairros++;
    } else if (result.successRate < 80) {
      problematicBairros.push({
        bairro: result.bairro,
        rate: result.successRate
      });
    }
  }
  
  // Clear the progress line
  process.stdout.write('\r' + ' '.repeat(60) + '\r');
  
  // Calculate statistics
  const totalQueries = totalSuccess + totalFailed;
  const overallSuccessRate = (totalSuccess / totalQueries) * 100;
  const executionTime = ((Date.now() - startTime) / 1000).toFixed(1);
  
  // Display results
  console.log(chalk.bold.cyan('\n' + '=' .repeat(70)));
  console.log(chalk.bold.cyan('📊 RESULTADOS DO TESTE COMPLETO'));
  console.log(chalk.bold.cyan('=' .repeat(70)));
  
  console.log(chalk.bold.white('\n📈 ESTATÍSTICAS GERAIS:'));
  console.log(`   Bairros testados: ${chalk.bold(BAIRROS_PORTO_ALEGRE.length)}`);
  console.log(`   Queries executadas: ${chalk.bold(totalQueries)}`);
  console.log(`   Tempo de execução: ${chalk.bold(executionTime)}s`);
  
  console.log(chalk.bold.white('\n✅ TAXA DE SUCESSO:'));
  const rateColor = overallSuccessRate >= 90 ? chalk.green : overallSuccessRate >= 70 ? chalk.yellow : chalk.red;
  console.log(`   Queries bem-sucedidas: ${chalk.green(totalSuccess)} / ${totalQueries}`);
  console.log(`   Taxa de sucesso geral: ${rateColor.bold(overallSuccessRate.toFixed(1) + '%')}`);
  
  console.log(chalk.bold.white('\n🏆 BAIRROS PERFEITOS (100% sucesso):'));
  console.log(`   ${chalk.green.bold(perfectBairros)} / ${BAIRROS_PORTO_ALEGRE.length} bairros`);
  console.log(`   Taxa: ${chalk.green.bold(((perfectBairros / BAIRROS_PORTO_ALEGRE.length) * 100).toFixed(1) + '%')}`);
  
  if (problematicBairros.length > 0) {
    console.log(chalk.bold.red('\n⚠️ BAIRROS PROBLEMÁTICOS (< 80% sucesso):'));
    problematicBairros.sort((a, b) => a.rate - b.rate);
    problematicBairros.slice(0, 10).forEach(pb => {
      console.log(`   ${chalk.red('•')} ${pb.bairro}: ${chalk.red(pb.rate.toFixed(0) + '%')}`);
    });
    if (problematicBairros.length > 10) {
      console.log(`   ${chalk.gray(`... e mais ${problematicBairros.length - 10} bairros`)}`);
    }
  }
  
  // Sample of successful queries
  console.log(chalk.bold.white('\n🎯 EXEMPLOS DE SUCESSO:'));
  const successExamples = allResults
    .filter(r => r.successRate === 100)
    .slice(0, 5);
  
  successExamples.forEach(ex => {
    const sampleResult = ex.results.find(r => r.status === 'success');
    if (sampleResult) {
      console.log(chalk.green(`   ✓ ${ex.bairro}: ${sampleResult.records} registros (${sampleResult.sample})`));
    }
  });
  
  // Detailed breakdown by success rate
  console.log(chalk.bold.white('\n📊 DISTRIBUIÇÃO POR TAXA DE SUCESSO:'));
  const distribution = {
    '100%': allResults.filter(r => r.successRate === 100).length,
    '80-99%': allResults.filter(r => r.successRate >= 80 && r.successRate < 100).length,
    '60-79%': allResults.filter(r => r.successRate >= 60 && r.successRate < 80).length,
    '40-59%': allResults.filter(r => r.successRate >= 40 && r.successRate < 60).length,
    '20-39%': allResults.filter(r => r.successRate >= 20 && r.successRate < 40).length,
    '0-19%': allResults.filter(r => r.successRate < 20).length,
  };
  
  for (const [range, count] of Object.entries(distribution)) {
    const bar = '█'.repeat(Math.floor(count / 2));
    const color = range === '100%' ? chalk.green : 
                  range === '80-99%' ? chalk.greenBright :
                  range === '60-79%' ? chalk.yellow :
                  range === '40-59%' ? chalk.yellowBright :
                  range === '20-39%' ? chalk.red :
                  chalk.redBright;
    console.log(`   ${range.padEnd(8)} ${color(bar)} ${count}`);
  }
  
  // Final verdict
  console.log(chalk.bold.cyan('\n' + '=' .repeat(70)));
  console.log(chalk.bold.cyan('🎯 VEREDITO FINAL'));
  console.log(chalk.bold.cyan('=' .repeat(70)));
  
  if (overallSuccessRate >= 95) {
    console.log(chalk.bold.green('\n✅ EXCELENTE! A correção está funcionando perfeitamente!'));
    console.log(chalk.green(`   Taxa de sucesso de ${overallSuccessRate.toFixed(1)}% supera a meta de 95%`));
    console.log(chalk.green(`   ${perfectBairros} bairros com 100% de sucesso`));
  } else if (overallSuccessRate >= 80) {
    console.log(chalk.bold.yellow('\n⚠️ BOM! A correção melhorou significativamente o sistema.'));
    console.log(chalk.yellow(`   Taxa de sucesso de ${overallSuccessRate.toFixed(1)}% (meta: 95%)`));
    console.log(chalk.yellow(`   Ainda há ${problematicBairros.length} bairros que precisam de ajustes`));
  } else {
    console.log(chalk.bold.red('\n❌ INSUFICIENTE! A correção precisa de mais trabalho.'));
    console.log(chalk.red(`   Taxa de sucesso de ${overallSuccessRate.toFixed(1)}% está abaixo do mínimo aceitável`));
    console.log(chalk.red(`   ${problematicBairros.length} bairros com problemas significativos`));
  }
  
  // Comparison with before
  console.log(chalk.bold.white('\n📈 COMPARAÇÃO COM ANTES DA CORREÇÃO:'));
  console.log(`   Antes: ${chalk.red('20%')} de sucesso (1 em 5 queries funcionavam)`);
  console.log(`   Agora: ${rateColor.bold(overallSuccessRate.toFixed(1) + '%')} de sucesso`);
  console.log(`   Melhoria: ${chalk.bold.green('+' + (overallSuccessRate - 20).toFixed(1) + '%')}`);
  
  // Save detailed report
  const reportPath = path.join(process.cwd(), 'test-results-94-bairros.json');
  await fs.writeFile(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalBairros: BAIRROS_PORTO_ALEGRE.length,
    totalQueries,
    totalSuccess,
    totalFailed,
    overallSuccessRate,
    perfectBairros,
    problematicBairros,
    executionTime,
    results: allResults
  }, null, 2));
  
  console.log(chalk.gray(`\n📁 Relatório detalhado salvo em: ${reportPath}`));
  
  return {
    success: overallSuccessRate >= 80,
    rate: overallSuccessRate,
    perfect: perfectBairros,
    problematic: problematicBairros.length
  };
}

// Execute the test
import fs from 'fs/promises';
import path from 'path';

testAll94Bairros().catch(error => {
  console.error(chalk.red('❌ Erro fatal:', error));
  process.exit(1);
});