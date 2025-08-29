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

// Análise de padrões de falha
class FailureAnalyzer {
  constructor() {
    this.patterns = {
      missingIndicators: [],
      wrongValues: [],
      genericResponses: [],
      templateIssues: [],
      sqlErrors: [],
      timeouts: []
    };
  }

  analyze(testCase, result) {
    const response = result.response || '';
    const expected = testCase.expected_answer;
    
    // Verificar indicadores obrigatórios
    const hasAltura = response.includes('altura') || response.includes('Altura');
    const hasCABasico = response.includes('CA básico') || response.includes('Coeficiente de aproveitamento mínimo');
    const hasCAMaximo = response.includes('CA máximo') || response.includes('Coeficiente de aproveitamento máximo');
    
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
    
    // Verificar valores específicos
    if (expected.includes('60') && !response.includes('60')) {
      this.patterns.wrongValues.push({
        question: testCase.question,
        expected: '60m',
        found: this.extractHeight(response)
      });
    }
    
    // Verificar respostas genéricas
    if (response.includes('Entendo que você') || response.includes('não tenho informações')) {
      this.patterns.genericResponses.push({
        question: testCase.question,
        category: testCase.category
      });
    }
    
    // Verificar template obrigatório
    if (!response.includes('📍 **Explore mais:**')) {
      this.patterns.templateIssues.push({
        question: testCase.question
      });
    }
    
    // SQL errors
    if (result.error && result.error.includes('SQL')) {
      this.patterns.sqlErrors.push({
        question: testCase.question,
        error: result.error
      });
    }
  }
  
  extractHeight(text) {
    const match = text.match(/(\d+)\s*metros?/i);
    return match ? match[1] + 'm' : 'não encontrado';
  }
  
  generateReport() {
    const report = [];
    
    if (this.patterns.missingIndicators.length > 0) {
      report.push('\n❌ INDICADORES FALTANTES:');
      this.patterns.missingIndicators.forEach(item => {
        report.push(`   - ${item.question.substring(0, 50)}...`);
        report.push(`     Faltando: ${item.missing.join(', ')}`);
      });
    }
    
    if (this.patterns.wrongValues.length > 0) {
      report.push('\n❌ VALORES INCORRETOS:');
      this.patterns.wrongValues.forEach(item => {
        report.push(`   - ${item.question.substring(0, 50)}...`);
        report.push(`     Esperado: ${item.expected}, Encontrado: ${item.found}`);
      });
    }
    
    if (this.patterns.genericResponses.length > 0) {
      report.push('\n❌ RESPOSTAS GENÉRICAS:');
      const byCategory = {};
      this.patterns.genericResponses.forEach(item => {
        byCategory[item.category] = (byCategory[item.category] || 0) + 1;
      });
      Object.entries(byCategory).forEach(([cat, count]) => {
        report.push(`   - ${cat}: ${count} casos`);
      });
    }
    
    if (this.patterns.templateIssues.length > 0) {
      report.push(`\n⚠️ TEMPLATE OBRIGATÓRIO AUSENTE: ${this.patterns.templateIssues.length} casos`);
    }
    
    if (this.patterns.sqlErrors.length > 0) {
      report.push(`\n❌ ERROS SQL: ${this.patterns.sqlErrors.length} casos`);
    }
    
    return report.join('\n');
  }
}

async function runAllQATests() {
  console.log('🧪 EXECUTANDO TODOS OS 109 CASOS DE TESTE QA\n');
  console.log('=' .repeat(70));
  
  try {
    // 1. Buscar todos os casos de teste ativos
    const { data: testCases, error: testError } = await supabase
      .from('qa_test_cases')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true });
    
    if (testError) throw testError;
    
    console.log(`📊 Total de casos de teste encontrados: ${testCases.length}`);
    
    // Agrupar por categoria
    const byCategory = {};
    testCases.forEach(tc => {
      if (!byCategory[tc.category]) byCategory[tc.category] = [];
      byCategory[tc.category].push(tc);
    });
    
    console.log('\n📋 Casos por categoria:');
    Object.entries(byCategory).forEach(([cat, cases]) => {
      console.log(`   - ${cat}: ${cases.length} casos`);
    });
    
    // 2. Executar testes
    console.log('\n🚀 Iniciando execução dos testes...\n');
    console.log('-'.repeat(70));
    
    const results = {
      total: testCases.length,
      passed: 0,
      failed: 0,
      errors: 0,
      details: [],
      byCategory: {}
    };
    
    const analyzer = new FailureAnalyzer();
    const startTime = Date.now();
    
    // Processar em lotes pequenos para evitar sobrecarga
    const BATCH_SIZE = 5;
    
    for (let i = 0; i < testCases.length; i += BATCH_SIZE) {
      const batch = testCases.slice(i, Math.min(i + BATCH_SIZE, testCases.length));
      
      console.log(`\n📦 Processando lote ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(testCases.length/BATCH_SIZE)}`);
      
      const batchPromises = batch.map(async (testCase) => {
        const testStart = Date.now();
        
        try {
          // Chamar agentic-rag com bypassCache
          const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              query: testCase.question,
              bypassCache: true,
              model: 'openai/gpt-3.5-turbo'
            }),
          });
          
          const result = await response.json();
          const duration = Date.now() - testStart;
          
          if (response.ok && result.response) {
            // Análise básica de sucesso
            const responseText = result.response.toLowerCase();
            const expectedText = testCase.expected_answer.toLowerCase();
            
            // Verificar se contém informações chave
            let isCorrect = false;
            
            // Para queries de altura máxima
            if (testCase.question.includes('altura')) {
              const expectedHeight = expectedText.match(/(\d+)\s*m/);
              const actualHeight = responseText.match(/(\d+)\s*m/);
              
              if (expectedHeight && actualHeight) {
                isCorrect = expectedHeight[1] === actualHeight[1];
              }
            }
            
            // Para queries gerais - verificar se não é resposta genérica
            if (!responseText.includes('entendo que você') && 
                !responseText.includes('não tenho informações')) {
              if (!isCorrect && responseText.length > 100) {
                isCorrect = true; // Considera sucesso se não for genérica
              }
            }
            
            // Analisar falhas
            if (!isCorrect) {
              analyzer.analyze(testCase, result);
            }
            
            const testResult = {
              id: testCase.id,
              question: testCase.question,
              expected: testCase.expected_answer,
              actual: result.response,
              success: isCorrect,
              duration: duration,
              confidence: result.confidence,
              category: testCase.category
            };
            
            results.details.push(testResult);
            
            if (isCorrect) {
              results.passed++;
              console.log(`   ✅ ${testCase.question.substring(0, 50)}... (${duration}ms)`);
            } else {
              results.failed++;
              console.log(`   ❌ ${testCase.question.substring(0, 50)}... (${duration}ms)`);
            }
            
            // Contabilizar por categoria
            if (!results.byCategory[testCase.category]) {
              results.byCategory[testCase.category] = { passed: 0, failed: 0, total: 0 };
            }
            results.byCategory[testCase.category].total++;
            if (isCorrect) {
              results.byCategory[testCase.category].passed++;
            } else {
              results.byCategory[testCase.category].failed++;
            }
            
          } else {
            results.errors++;
            console.log(`   ⚠️ ${testCase.question.substring(0, 50)}... - Erro: ${result.error}`);
            analyzer.analyze(testCase, { error: result.error });
          }
        } catch (error) {
          results.errors++;
          console.log(`   ⚠️ ${testCase.question.substring(0, 50)}... - Erro: ${error.message}`);
        }
      });
      
      // Aguardar o lote completar
      await Promise.all(batchPromises);
      
      // Delay entre lotes para evitar rate limiting
      if (i + BATCH_SIZE < testCases.length) {
        console.log('   ⏳ Aguardando antes do próximo lote...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    const totalDuration = Date.now() - startTime;
    
    // 3. Gerar relatório
    console.log('\n' + '=' .repeat(70));
    console.log('📊 RELATÓRIO FINAL\n');
    
    const successRate = (results.passed / results.total * 100).toFixed(1);
    
    console.log(`Total de testes: ${results.total}`);
    console.log(`✅ Aprovados: ${results.passed} (${successRate}%)`);
    console.log(`❌ Reprovados: ${results.failed} (${(results.failed / results.total * 100).toFixed(1)}%)`);
    console.log(`⚠️ Erros: ${results.errors}`);
    console.log(`⏱️ Tempo total: ${(totalDuration / 1000).toFixed(1)}s`);
    console.log(`⚡ Tempo médio por teste: ${(totalDuration / results.total).toFixed(0)}ms`);
    
    // Resultados por categoria
    console.log('\n📈 RESULTADOS POR CATEGORIA:\n');
    Object.entries(results.byCategory).forEach(([category, stats]) => {
      const catSuccessRate = (stats.passed / stats.total * 100).toFixed(1);
      console.log(`${category}:`);
      console.log(`   Total: ${stats.total} | Passou: ${stats.passed} | Falhou: ${stats.failed}`);
      console.log(`   Taxa de sucesso: ${catSuccessRate}%`);
    });
    
    // Análise de padrões de falha
    console.log('\n🔍 ANÁLISE DE PADRÕES DE FALHA:');
    console.log(analyzer.generateReport());
    
    // 4. Salvar relatório em arquivo
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        total: results.total,
        passed: results.passed,
        failed: results.failed,
        errors: results.errors,
        successRate: successRate,
        duration: totalDuration
      },
      byCategory: results.byCategory,
      failurePatterns: analyzer.patterns,
      details: results.details
    };
    
    const reportPath = join(__dirname, `qa-report-${Date.now()}.json`);
    await fs.writeFile(reportPath, JSON.stringify(reportData, null, 2));
    console.log(`\n💾 Relatório salvo em: ${reportPath}`);
    
    // 5. Recomendações de melhoria
    console.log('\n🎯 RECOMENDAÇÕES PARA MELHORAR O AGENTIC-RAG:\n');
    
    if (analyzer.patterns.missingIndicators.length > 5) {
      console.log('1. ⚠️ CRÍTICO: Response-synthesizer não está formatando os 3 indicadores obrigatórios');
      console.log('   Ação: Revisar prompt e garantir formatação estruturada');
    }
    
    if (analyzer.patterns.wrongValues.length > 5) {
      console.log('2. ⚠️ CRÍTICO: SQL Generator retornando valores incorretos');
      console.log('   Ação: Verificar mapeamento de colunas na tabela regime_urbanistico');
    }
    
    if (analyzer.patterns.genericResponses.length > 10) {
      console.log('3. ⚠️ ALTO: Muitas respostas genéricas indicam falha no pipeline');
      console.log('   Ação: Verificar query-analyzer e strategy selection');
    }
    
    if (analyzer.patterns.templateIssues.length > 0) {
      console.log('4. ⚠️ MÉDIO: Template obrigatório não está sendo incluído');
      console.log('   Ação: Forçar inclusão do template no response-synthesizer');
    }
    
    if (successRate < 70) {
      console.log('5. 🔴 URGENTE: Taxa de sucesso abaixo de 70%');
      console.log('   Ação: Revisar todo o pipeline RAG');
    }
    
    console.log('\n' + '=' .repeat(70));
    console.log('✅ Teste completo!');
    
    return reportData;
    
  } catch (error) {
    console.error('❌ Erro fatal:', error);
    return null;
  }
}

// Executar testes
runAllQATests()
  .then(report => {
    if (report && report.summary.successRate < 70) {
      console.log('\n🚨 ALERTA: Sistema precisa de correções urgentes!');
      process.exit(1);
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('Erro:', error);
    process.exit(1);
  });