#!/usr/bin/env node

/**
 * TESTE COMPLETO DOS 94 BAIRROS DE PORTO ALEGRE
 * Valida se o sistema consegue buscar dados de regime urbanístico para TODOS os bairros
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Lista oficial dos 94 bairros de Porto Alegre
 */
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
 * Buscar dados reais de cada bairro no banco
 */
async function getGroundTruthForBairro(bairro) {
  const { data } = await supabase
    .from('regime_urbanistico_consolidado')
    .select('*')
    .ilike('"Bairro"', `%${bairro}%`)
    .limit(10);
  
  return data || [];
}

/**
 * Buscar dados fallback nos chunks REGIME_FALLBACK
 */
async function getFallbackDataForBairro(bairro) {
  const normalizedBairro = bairro.replace(/\s+/g, '_').toUpperCase();
  
  const { data } = await supabase
    .from('legal_articles')
    .select('keywords, full_content')
    .eq('document_type', 'REGIME_FALLBACK')
    .contains('keywords', [`BAIRRO_${normalizedBairro}`])
    .limit(5);
  
  return data || [];
}

/**
 * Testar um bairro específico via agentic-rag
 */
async function testBairro(bairro, index) {
  const pergunta = `qual a altura máxima e coeficiente de aproveitamento em ${bairro}`;
  
  try {
    // Buscar ground truth
    const groundTruth = await getGroundTruthForBairro(bairro);
    const fallbackData = await getFallbackDataForBairro(bairro);
    
    // Chamar agentic-rag
    const { data, error } = await supabase.functions.invoke('agentic-rag', {
      body: {
        message: pergunta,
        conversation_id: `test_bairro_${index}`,
        user_id: 'validation_user'
      }
    });
    
    if (error) {
      return {
        bairro,
        success: false,
        error: error.message,
        groundTruthCount: groundTruth.length,
        fallbackCount: fallbackData.length
      };
    }
    
    const response = data?.response || '';
    const r = response.toLowerCase();
    
    // Validar resposta
    const mencionaBairro = r.includes(bairro.toLowerCase());
    const temNumeros = /\d+/.test(response);
    const mencionaAltura = r.includes('altura') || r.includes('metro');
    const mencionaCoef = r.includes('coeficiente') || r.includes('ca ');
    const erroOuNaoEncontrado = r.includes('não encontr') || r.includes('desculp') || r.includes('erro');
    
    // Se tem dados no banco estruturado
    let temDadosReais = false;
    if (groundTruth.length > 0) {
      const altura = groundTruth[0].Altura_Maxima___Edificacao_Isolada;
      const ca_basico = groundTruth[0].Coeficiente_de_Aproveitamento___Basico;
      
      if (altura && response.includes(altura.toString())) {
        temDadosReais = true;
      }
    }
    
    const success = !erroOuNaoEncontrado && mencionaBairro && (temNumeros || temDadosReais);
    
    return {
      bairro,
      success,
      groundTruthCount: groundTruth.length,
      fallbackCount: fallbackData.length,
      response: response.substring(0, 100),
      validation: {
        mencionaBairro,
        temNumeros,
        mencionaAltura,
        mencionaCoef,
        temDadosReais,
        erroOuNaoEncontrado
      }
    };
    
  } catch (error) {
    return {
      bairro,
      success: false,
      error: error.message,
      groundTruthCount: 0,
      fallbackCount: 0
    };
  }
}

/**
 * Executar teste completo
 */
async function testAll94Bairros() {
  console.log(chalk.bold.cyan('\n🏙️ TESTE COMPLETO DOS 94 BAIRROS DE PORTO ALEGRE\n'));
  console.log(chalk.gray('=' .repeat(70)));
  
  const results = [];
  let successCount = 0;
  let withGroundTruth = 0;
  let withFallback = 0;
  let noData = 0;
  
  // Testar amostra ou todos (use --all para testar todos)
  const testAll = process.argv.includes('--all');
  const bairrosToTest = testAll ? BAIRROS_PORTO_ALEGRE : BAIRROS_PORTO_ALEGRE.slice(0, 10);
  
  console.log(chalk.yellow(`\n⚠️ Testando ${bairrosToTest.length} bairros ${testAll ? '(TODOS)' : '(AMOSTRA - use --all para testar todos)'}\n`));
  
  for (let i = 0; i < bairrosToTest.length; i++) {
    const bairro = bairrosToTest[i];
    console.log(chalk.blue(`📍 ${i + 1}/${bairrosToTest.length}: ${bairro}`));
    
    const result = await testBairro(bairro, i);
    results.push(result);
    
    if (result.success) {
      console.log(chalk.green(`  ✅ SUCESSO`));
      successCount++;
    } else {
      console.log(chalk.red(`  ❌ FALHOU${result.error ? `: ${result.error}` : ''}`));
    }
    
    console.log(chalk.gray(`  📊 Dados: ${result.groundTruthCount} estruturados, ${result.fallbackCount} fallback`));
    
    if (result.groundTruthCount > 0) withGroundTruth++;
    if (result.fallbackCount > 0) withFallback++;
    if (result.groundTruthCount === 0 && result.fallbackCount === 0) noData++;
    
    // Pausa entre testes
    if (i < bairrosToTest.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Relatório final
  const successRate = (successCount / bairrosToTest.length) * 100;
  
  console.log(chalk.bold.cyan('\n' + '=' .repeat(70)));
  console.log(chalk.bold.cyan('📊 RELATÓRIO FINAL'));
  console.log(chalk.bold.cyan('=' .repeat(70)));
  
  console.log(chalk.bold.white(`\n📈 ESTATÍSTICAS:`));
  console.log(`  ✅ Bairros com sucesso: ${successCount}/${bairrosToTest.length} (${successRate.toFixed(1)}%)`);
  console.log(`  ❌ Bairros com falha: ${bairrosToTest.length - successCount}/${bairrosToTest.length}`);
  
  console.log(chalk.bold.white(`\n📊 COBERTURA DE DADOS:`));
  console.log(`  📋 Com dados estruturados: ${withGroundTruth} bairros`);
  console.log(`  📄 Com dados fallback: ${withFallback} bairros`);
  console.log(`  ❓ Sem dados: ${noData} bairros`);
  
  // Listar falhas
  const failures = results.filter(r => !r.success);
  if (failures.length > 0 && failures.length <= 20) {
    console.log(chalk.bold.yellow(`\n⚠️ BAIRROS QUE FALHARAM:`));
    failures.forEach(f => {
      console.log(chalk.red(`  ❌ ${f.bairro}`));
      if (f.validation) {
        const issues = [];
        if (!f.validation.mencionaBairro) issues.push('não menciona bairro');
        if (!f.validation.temNumeros) issues.push('sem valores numéricos');
        if (f.validation.erroOuNaoEncontrado) issues.push('erro/não encontrado');
        if (issues.length > 0) {
          console.log(chalk.yellow(`     Problemas: ${issues.join(', ')}`));
        }
      }
    });
  }
  
  // Avaliação final
  console.log(chalk.bold.white(`\n🎯 AVALIAÇÃO:`));
  if (successRate >= 90) {
    console.log(chalk.bold.green(`  🏆 EXCELENTE! Sistema funciona para a grande maioria dos bairros.`));
  } else if (successRate >= 70) {
    console.log(chalk.bold.green(`  ✅ BOM! Sistema funcional para maioria dos bairros.`));
  } else if (successRate >= 50) {
    console.log(chalk.bold.yellow(`  ⚠️ REGULAR! Sistema precisa melhorar cobertura.`));
  } else {
    console.log(chalk.bold.red(`  ❌ CRÍTICO! Sistema não está funcionando para maioria dos bairros.`));
  }
  
  // Problemas identificados
  if (noData > 0) {
    console.log(chalk.yellow(`\n  ⚠️ ${noData} bairros sem dados no banco (nem estruturado nem fallback)`));
  }
  
  if (!testAll) {
    console.log(chalk.cyan(`\n💡 Use 'node ${process.argv[1]} --all' para testar todos os 94 bairros`));
  }
  
  console.log(chalk.bold.cyan(`\n✅ TESTE CONCLUÍDO!\n`));
  
  return {
    success_rate: successRate,
    successful: successCount,
    total: bairrosToTest.length,
    results
  };
}

// Executar
testAll94Bairros().catch(error => {
  console.error(chalk.red('❌ Erro fatal:', error));
  process.exit(1);
});