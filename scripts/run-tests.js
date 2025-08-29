#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configurações
const TEST_CONFIG = {
  timeout: 30000,
  maxConcurrency: 3,
  reportDir: 'tests/reports'
};

// Cores para output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function createReportsDir() {
  const reportsDir = path.join(process.cwd(), TEST_CONFIG.reportDir);
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
}

function checkEnvironment() {
  log('\n🔍 Verificando ambiente de testes...', 'cyan');
  
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    log(`❌ Variáveis de ambiente ausentes: ${missingVars.join(', ')}`, 'red');
    log('💡 Certifique-se de que o arquivo .env.local existe com as configurações do Supabase', 'yellow');
    process.exit(1);
  }

  log('✅ Ambiente configurado corretamente', 'green');
}

function runCommand(command, description) {
  log(`\n${description}`, 'bright');
  log(`Executando: ${command}`, 'blue');
  
  try {
    const output = execSync(command, { 
      stdio: 'inherit',
      cwd: process.cwd(),
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });
    log(`✅ ${description} concluído`, 'green');
    return true;
  } catch (error) {
    log(`❌ Erro em ${description}:`, 'red');
    log(error.message, 'red');
    return false;
  }
}

function runTestSuite(suiteName, pattern, description) {
  log(`\n${'='.repeat(60)}`, 'magenta');
  log(`📋 ${description}`, 'bright');
  log(`${'='.repeat(60)}`, 'magenta');
  
  const command = `npm test -- ${pattern} --verbose --testTimeout=${TEST_CONFIG.timeout}`;
  return runCommand(command, `Executando ${suiteName}`);
}

function runDebugTests() {
  log(`\n${'='.repeat(60)}`, 'magenta');
  log('🔍 Testes de Debug e Logging', 'bright');
  log(`${'='.repeat(60)}`, 'magenta');
  
  try {
    // Executar script de debug
    require('./tests/debug-tests.ts');
    log('✅ Testes de debug concluídos', 'green');
    return true;
  } catch (error) {
    log(`❌ Erro nos testes de debug: ${error.message}`, 'red');
    return false;
  }
}

function runFullTestRunner() {
  log(`\n${'='.repeat(60)}`, 'magenta');
  log('🚀 Bateria Completa de Testes RAG', 'bright');
  log(`${'='.repeat(60)}`, 'magenta');
  
  try {
    // Executar test runner
    require('./tests/test-runner.ts');
    log('✅ Bateria completa de testes concluída', 'green');
    return true;
  } catch (error) {
    log(`❌ Erro na bateria de testes: ${error.message}`, 'red');
    return false;
  }
}

function generateSummaryReport(results) {
  const timestamp = new Date().toISOString();
  const totalTests = results.length;
  const passedTests = results.filter(r => r.passed).length;
  const successRate = (passedTests / totalTests) * 100;

  const summary = {
    timestamp,
    totalTests,
    passedTests,
    failedTests: totalTests - passedTests,
    successRate: successRate.toFixed(1),
    testSuites: results.map(r => ({
      name: r.name,
      passed: r.passed,
      description: r.description
    }))
  };

  // Salvar resumo
  const summaryPath = path.join(TEST_CONFIG.reportDir, `test-summary-${Date.now()}.json`);
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  // Exibir resumo
  log(`\n${'='.repeat(60)}`, 'cyan');
  log('📊 RESUMO FINAL DOS TESTES', 'bright');
  log(`${'='.repeat(60)}`, 'cyan');
  log(`Total de suites: ${totalTests}`, 'blue');
  log(`Suites aprovadas: ${passedTests}`, passedTests === totalTests ? 'green' : 'yellow');
  log(`Suites falharam: ${totalTests - passedTests}`, totalTests - passedTests === 0 ? 'green' : 'red');
  log(`Taxa de sucesso: ${successRate.toFixed(1)}%`, successRate >= 80 ? 'green' : successRate >= 60 ? 'yellow' : 'red');

  log('\n📋 Detalhes por Suite:', 'blue');
  results.forEach(result => {
    const emoji = result.passed ? '✅' : '❌';
    log(`   ${emoji} ${result.name}: ${result.description}`);
  });

  if (successRate < 80) {
    log('\n⚠️  RECOMENDAÇÕES:', 'yellow');
    log('   • Revisar falhas nos testes individuais', 'yellow');
    log('   • Verificar conectividade com Supabase', 'yellow');
    log('   • Validar configurações de ambiente', 'yellow');
  }

  log(`\n📄 Relatório detalhado salvo em: ${summaryPath}`, 'cyan');
  
  return summary;
}

async function main() {
  const startTime = Date.now();
  
  log('🚀 INICIANDO SUITE COMPLETA DE TESTES RAG', 'bright');
  log('Sistema: Plano Diretor Urbano Sustentável - Porto Alegre', 'blue');
  log(`Início: ${new Date().toLocaleString('pt-BR')}`, 'blue');

  // Preparação
  createReportsDir();
  checkEnvironment();

  const testResults = [];

  // 1. Testes unitários do sistema
  const unitResult = runTestSuite(
    'unit-tests',
    'tests/rag-system.test.ts',
    'Testes do Sistema RAG Principal'
  );
  testResults.push({
    name: 'RAG System Tests',
    passed: unitResult,
    description: 'Testes principais do sistema RAG'
  });

  // 2. Testes do Query Analyzer
  const analyzerResult = runTestSuite(
    'analyzer-tests',
    'tests/query-analyzer.test.ts',
    'Testes do Analisador de Consultas'
  );
  testResults.push({
    name: 'Query Analyzer Tests',
    passed: analyzerResult,
    description: 'Testes de detecção e classificação de consultas'
  });

  // 3. Testes do SQL Generator
  const sqlResult = runTestSuite(
    'sql-tests',
    'tests/sql-generator.test.ts',
    'Testes do Gerador SQL'
  );
  testResults.push({
    name: 'SQL Generator Tests',
    passed: sqlResult,
    description: 'Testes de geração e execução de SQL'
  });

  // 4. Testes do Response Synthesizer
  const synthResult = runTestSuite(
    'synth-tests',
    'tests/response-synthesizer.test.ts',
    'Testes do Sintetizador de Respostas'
  );
  testResults.push({
    name: 'Response Synthesizer Tests',
    passed: synthResult,
    description: 'Testes de formatação e síntese de respostas'
  });

  // 5. Testes de QA existentes
  const qaResult = runTestSuite(
    'qa-tests',
    'tests/qa-validation.test.ts',
    'Testes de Validação QA'
  );
  testResults.push({
    name: 'QA Validation Tests',
    passed: qaResult,
    description: 'Testes de validação de qualidade'
  });

  // 6. Testes de debug (se disponível)
  if (fs.existsSync('tests/debug-tests.ts')) {
    log('\n🔍 Executando testes de debug...', 'cyan');
    const debugResult = runCommand(
      'npx ts-node tests/debug-tests.ts',
      'Testes de Debug e Logging'
    );
    testResults.push({
      name: 'Debug Tests',
      passed: debugResult,
      description: 'Testes de debug e logging do sistema'
    });
  }

  // 7. Bateria completa (se disponível)
  if (fs.existsSync('tests/test-runner.ts')) {
    log('\n🚀 Executando bateria completa...', 'cyan');
    const runnerResult = runCommand(
      'npx ts-node tests/test-runner.ts',
      'Bateria Completa de Testes'
    );
    testResults.push({
      name: 'Full Test Suite',
      passed: runnerResult,
      description: 'Bateria completa com casos específicos'
    });
  }

  // Gerar relatório final
  const summary = generateSummaryReport(testResults);
  
  const totalTime = Date.now() - startTime;
  log(`\n⏱️  Tempo total de execução: ${(totalTime / 1000).toFixed(1)}s`, 'blue');

  // Exit code baseado nos resultados
  const allPassed = testResults.every(r => r.passed);
  if (allPassed) {
    log('\n🎉 TODOS OS TESTES FORAM EXECUTADOS COM SUCESSO!', 'green');
    process.exit(0);
  } else {
    log('\n⚠️  ALGUMAS SUITES DE TESTE FALHARAM', 'yellow');
    log('Verifique os logs acima para detalhes específicos', 'yellow');
    process.exit(1);
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main().catch(error => {
    log(`❌ Erro fatal: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  runTestSuite,
  generateSummaryReport,
  TEST_CONFIG
};