import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Configurações otimizadas
const CONFIG = {
  BATCH_SIZE: 3, // Processar 3 testes por vez (reduzido para estabilidade)
  TIMEOUT_MS: 45000, // 45 segundos por teste (aumentado)
  RETRY_ATTEMPTS: 1, // Tentar 1 vez em caso de erro (reduzido)
  DELAY_BETWEEN_BATCHES: 3000, // 3 segundos entre lotes
  SAVE_PARTIAL_RESULTS: true, // Salvar resultados parciais
  MAX_CONCURRENT_TESTS: 2 // Máximo de testes simultâneos (reduzido)
};

// Análise de padrões de falha melhorada
class FailureAnalyzer {
  constructor() {
    this.patterns = {
      missingIndicators: [],
      wrongValues: [],
      genericResponses: [],
      templateIssues: [],
      sqlErrors: [],
      timeouts: [],
      cacheIssues: []
    };
    this.stats = {
      totalTests: 0,
      passed: 0,
      failed: 0,
      errors: 0,
      timeouts: 0
    };
  }

  analyze(testCase, result) {
    this.stats.totalTests++;
    
    if (!result.response) {
      this.stats.errors++;
      if (result.error?.includes('timeout')) {
        this.stats.timeouts++;
        this.patterns.timeouts.push({
          question: testCase.question,
          category: testCase.category
        });
      }
      return;
    }
    
    const response = result.response || '';
    const expected = testCase.expected_answer || '';
    
    // Verificar se passou ou falhou
    const passed = this.checkTestPassed(response, expected, testCase);
    if (passed) {
      this.stats.passed++;
    } else {
      this.stats.failed++;
      this.categorizeFailure(testCase, result, response, expected);
    }
    
    return passed;
  }
  
  checkTestPassed(response, expected, testCase) {
    // Verificar palavras-chave críticas
    const criticalKeywords = this.extractCriticalKeywords(expected);
    let matchCount = 0;
    
    for (const keyword of criticalKeywords) {
      if (response.toLowerCase().includes(keyword.toLowerCase())) {
        matchCount++;
      }
    }
    
    // Passar se 70% das palavras-chave críticas estão presentes
    const passThreshold = Math.ceil(criticalKeywords.length * 0.7);
    return matchCount >= passThreshold;
  }
  
  extractCriticalKeywords(expected) {
    if (!expected || typeof expected !== 'string') {
      return [];
    }
    
    const keywords = [];
    
    // Extrair números (alturas, coeficientes)
    const numbers = expected.match(/\d+(?:\.\d+)?/g);
    if (numbers) keywords.push(...numbers);
    
    // Extrair zonas
    const zones = expected.match(/ZOT\s*\d+(?:\.\d+)?(?:\s*-\s*[ABC])?/gi);
    if (zones) keywords.push(...zones);
    
    // Extrair bairros importantes
    const neighborhoods = [
      'TRÊS FIGUEIRAS', 'PETRÓPOLIS', 'CENTRO HISTÓRICO', 
      'AZENHA', 'CIDADE BAIXA', 'CRISTAL', 'MOINHOS DE VENTO',
      'AUXILIADORA', 'MONT SERRAT', 'FLORESTA', 'INDEPENDÊNCIA',
      'BOM FIM', 'SANTANA', 'FARROUPILHA', 'MENINO DEUS'
    ];
    for (const n of neighborhoods) {
      if (expected && expected.toUpperCase().includes(n)) keywords.push(n);
    }
    
    // Adicionar valores críticos de coeficientes
    if (expected && expected.includes('coeficiente')) {
      const coefValues = ['2.0', '2,0', '4.0', '4,0', '1.0', '1,0', '3.0', '3,0'];
      coefValues.forEach(val => {
        if (expected.includes(val)) keywords.push(val);
      });
    }
    
    return keywords.filter(k => k && k.length > 0);
  }
  
  categorizeFailure(testCase, result, response, expected) {
    // Verificar indicadores obrigatórios
    const hasAltura = /altura.*\d+/i.test(response);
    const hasCABasico = /CA básico|Coeficiente.*básico/i.test(response);
    const hasCAMaximo = /CA máximo|Coeficiente.*máximo/i.test(response);
    
    if (!hasAltura || !hasCABasico || !hasCAMaximo) {
      this.patterns.missingIndicators.push({
        question: testCase.question,
        missing: [
          !hasAltura && 'altura máxima',
          !hasCABasico && 'CA básico',
          !hasCAMaximo && 'CA máximo'
        ].filter(Boolean)
      });
    }
    
    // Verificar valores incorretos
    const expectedNumbers = expected.match(/\d+/g) || [];
    const responseNumbers = response.match(/\d+/g) || [];
    
    for (const expNum of expectedNumbers) {
      if (!responseNumbers.includes(expNum)) {
        this.patterns.wrongValues.push({
          question: testCase.question,
          expected: expNum,
          found: responseNumbers.join(', ') || 'nenhum'
        });
        break;
      }
    }
    
    // Verificar respostas genéricas
    if (/Entendo que você|não tenho informações|Desculpe/i.test(response)) {
      this.patterns.genericResponses.push({
        question: testCase.question,
        category: testCase.category
      });
    }
    
    // Verificar template
    if (!response.includes('📍 **Explore mais:**')) {
      this.patterns.templateIssues.push({
        question: testCase.question
      });
    }
  }
  
  generateReport() {
    const report = [];
    
    report.push('\n' + '='.repeat(70));
    report.push('📊 RELATÓRIO DE ANÁLISE DE FALHAS');
    report.push('='.repeat(70));
    
    // Estatísticas gerais
    report.push('\n📈 ESTATÍSTICAS GERAIS:');
    report.push(`  Total de testes: ${this.stats.totalTests}`);
    report.push(`  ✅ Passou: ${this.stats.passed} (${(this.stats.passed/this.stats.totalTests*100).toFixed(1)}%)`);
    report.push(`  ❌ Falhou: ${this.stats.failed} (${(this.stats.failed/this.stats.totalTests*100).toFixed(1)}%)`);
    report.push(`  ⚠️ Erros: ${this.stats.errors}`);
    report.push(`  ⏱️ Timeouts: ${this.stats.timeouts}`);
    
    // Padrões de falha
    if (this.patterns.missingIndicators.length > 0) {
      report.push('\n❌ INDICADORES FALTANTES:');
      report.push(`  ${this.patterns.missingIndicators.length} casos sem indicadores obrigatórios`);
      const sample = this.patterns.missingIndicators.slice(0, 3);
      sample.forEach(p => {
        report.push(`    - "${p.question.substring(0, 50)}..."`);
        report.push(`      Faltando: ${p.missing.join(', ')}`);
      });
    }
    
    if (this.patterns.wrongValues.length > 0) {
      report.push('\n❌ VALORES INCORRETOS:');
      report.push(`  ${this.patterns.wrongValues.length} casos com valores errados`);
      const sample = this.patterns.wrongValues.slice(0, 3);
      sample.forEach(p => {
        report.push(`    - "${p.question.substring(0, 50)}..."`);
        report.push(`      Esperado: ${p.expected}, Encontrado: ${p.found}`);
      });
    }
    
    if (this.patterns.genericResponses.length > 0) {
      report.push('\n⚠️ RESPOSTAS GENÉRICAS:');
      report.push(`  ${this.patterns.genericResponses.length} casos com respostas evasivas`);
    }
    
    if (this.patterns.timeouts.length > 0) {
      report.push('\n⏱️ TIMEOUTS:');
      report.push(`  ${this.patterns.timeouts.length} casos excederam o tempo limite`);
    }
    
    // Recomendações
    report.push('\n💡 RECOMENDAÇÕES:');
    if (this.patterns.missingIndicators.length > 5) {
      report.push('  1. Revisar prompt do response-synthesizer para garantir indicadores');
    }
    if (this.patterns.wrongValues.length > 5) {
      report.push('  2. Verificar SQL generator e mapeamento de campos');
    }
    if (this.patterns.genericResponses.length > 5) {
      report.push('  3. Melhorar query-analyzer para casos específicos');
    }
    if (this.patterns.timeouts.length > 3) {
      report.push('  4. Otimizar performance ou aumentar timeout');
    }
    
    return report.join('\n');
  }
}

// Função para executar um teste com timeout e retry
async function executeTest(testCase, retryCount = 0) {
  const timeout = CONFIG.TIMEOUT_MS;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        message: testCase.question,
        userRole: 'test',
        sessionId: `qa-test-${testCase.id}`,
        bypassCache: true, // Sempre bypass cache para testes
        model: 'openai/gpt-3.5-turbo'
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    return {
      testId: testCase.id,
      question: testCase.question,
      category: testCase.category,
      response: result.response,
      success: true,
      executionTime: result.executionTime,
      confidence: result.confidence
    };
    
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log(`  ⏱️ Timeout para teste ${testCase.id}`);
      
      if (retryCount < CONFIG.RETRY_ATTEMPTS) {
        console.log(`  🔄 Tentando novamente (${retryCount + 1}/${CONFIG.RETRY_ATTEMPTS})...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return executeTest(testCase, retryCount + 1);
      }
      
      return {
        testId: testCase.id,
        question: testCase.question,
        category: testCase.category,
        error: 'timeout',
        success: false
      };
    }
    
    if (retryCount < CONFIG.RETRY_ATTEMPTS) {
      console.log(`  🔄 Erro, tentando novamente (${retryCount + 1}/${CONFIG.RETRY_ATTEMPTS})...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return executeTest(testCase, retryCount + 1);
    }
    
    return {
      testId: testCase.id,
      question: testCase.question,
      category: testCase.category,
      error: error.message,
      success: false
    };
  }
}

// Processar testes em lotes
async function processBatch(batch, batchNumber, totalBatches) {
  console.log(`\n📦 Processando lote ${batchNumber}/${totalBatches} (${batch.length} testes)...`);
  
  const promises = batch.map(testCase => executeTest(testCase));
  const results = await Promise.allSettled(promises);
  
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        testId: batch[index].id,
        question: batch[index].question,
        category: batch[index].category,
        error: result.reason?.message || 'Unknown error',
        success: false
      };
    }
  });
}

// Função principal
async function runAllTests() {
  console.log('🚀 SISTEMA DE TESTES QA OTIMIZADO v2.0');
  console.log('=' .repeat(70));
  
  // Buscar casos de teste
  console.log('\n📥 Carregando casos de teste do banco...');
  const { data: testCases, error } = await supabase
    .from('qa_test_cases')
    .select('*')
    .order('id');
  
  if (error) {
    console.error('❌ Erro ao buscar casos de teste:', error);
    return;
  }
  
  console.log(`✅ ${testCases.length} casos de teste carregados`);
  
  // Dividir em lotes
  const batches = [];
  for (let i = 0; i < testCases.length; i += CONFIG.BATCH_SIZE) {
    batches.push(testCases.slice(i, i + CONFIG.BATCH_SIZE));
  }
  
  console.log(`📊 Dividido em ${batches.length} lotes de até ${CONFIG.BATCH_SIZE} testes`);
  
  // Processar lotes
  const analyzer = new FailureAnalyzer();
  const allResults = [];
  const startTime = Date.now();
  
  for (let i = 0; i < batches.length; i++) {
    const batchResults = await processBatch(batches[i], i + 1, batches.length);
    
    // Analisar resultados do lote
    batchResults.forEach((result, index) => {
      const testCase = batches[i][index];
      const passed = analyzer.analyze(testCase, result);
      result.passed = passed;
      allResults.push(result);
      
      // Mostrar progresso
      const icon = result.success ? (passed ? '✅' : '⚠️') : '❌';
      console.log(`  ${icon} Teste ${testCase.id}: ${testCase.question.substring(0, 50)}...`);
    });
    
    // Salvar resultados parciais
    if (CONFIG.SAVE_PARTIAL_RESULTS && (i + 1) % 5 === 0) {
      const partialFile = join(__dirname, `qa-results-partial-${Date.now()}.json`);
      await fs.writeFile(partialFile, JSON.stringify(allResults, null, 2));
      console.log(`  💾 Resultados parciais salvos (${allResults.length} testes)`);
    }
    
    // Delay entre lotes
    if (i < batches.length - 1) {
      console.log(`  ⏸️ Aguardando ${CONFIG.DELAY_BETWEEN_BATCHES/1000}s antes do próximo lote...`);
      await new Promise(resolve => setTimeout(resolve, CONFIG.DELAY_BETWEEN_BATCHES));
    }
  }
  
  const endTime = Date.now();
  const totalTime = (endTime - startTime) / 1000;
  
  // Gerar relatório
  console.log(analyzer.generateReport());
  
  // Salvar resultados finais
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsFile = join(__dirname, `qa-results-${timestamp}.json`);
  
  const finalReport = {
    timestamp: new Date().toISOString(),
    totalTests: testCases.length,
    totalTime: `${totalTime.toFixed(1)}s`,
    averageTime: `${(totalTime / testCases.length).toFixed(2)}s`,
    stats: analyzer.stats,
    results: allResults,
    patterns: analyzer.patterns
  };
  
  await fs.writeFile(resultsFile, JSON.stringify(finalReport, null, 2));
  
  console.log('\n' + '='.repeat(70));
  console.log(`✅ TESTE COMPLETO!`);
  console.log(`📁 Resultados salvos em: ${resultsFile}`);
  console.log(`⏱️ Tempo total: ${totalTime.toFixed(1)} segundos`);
  console.log(`📊 Taxa de sucesso: ${(analyzer.stats.passed/analyzer.stats.totalTests*100).toFixed(1)}%`);
  
  // Atualizar banco com resultados
  console.log('\n📤 Atualizando banco de dados com resultados...');
  
  for (const result of allResults) {
    const testCase = testCases.find(tc => tc.id === result.testId);
    if (testCase) {
      await supabase
        .from('qa_test_results')
        .upsert({
          test_case_id: result.testId,
          actual_answer: result.response || result.error,
          passed: result.passed || false,
          execution_time: result.executionTime,
          confidence: result.confidence,
          tested_at: new Date().toISOString(),
          error: result.error
        });
    }
  }
  
  console.log('✅ Banco de dados atualizado!');
  
  // Mostrar casos que falharam
  const failedCases = allResults.filter(r => !r.passed);
  if (failedCases.length > 0) {
    console.log('\n❌ CASOS QUE FALHARAM:');
    failedCases.slice(0, 10).forEach(fc => {
      console.log(`  - [${fc.testId}] ${fc.question.substring(0, 60)}...`);
      if (fc.error) console.log(`    Erro: ${fc.error}`);
    });
    if (failedCases.length > 10) {
      console.log(`  ... e mais ${failedCases.length - 10} casos`);
    }
  }
}

// Executar testes
runAllTests().catch(console.error);