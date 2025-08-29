#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

const supabase = createClient(supabaseUrl, supabaseKey);

// Cores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

class QATestRunner {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      partial: 0,
      byCategory: {},
      errors: [],
      startTime: Date.now()
    };
  }

  async loadTestCases(limit = null) {
    console.log(`${colors.cyan}📚 Carregando casos de teste...${colors.reset}`);
    
    let query = supabase
      .from('qa_test_cases')
      .select('*')
      .order('id');
    
    if (limit) {
      query = query.limit(limit);
    }
    
    const { data: testCases, error } = await query;
    
    if (error) {
      console.error(`${colors.red}❌ Erro ao carregar casos: ${error.message}${colors.reset}`);
      return [];
    }
    
    console.log(`${colors.green}✅ ${testCases.length} casos carregados${colors.reset}\n`);
    return testCases;
  }

  async testCase(testCase) {
    const { id, test_id, question, expected_answer, category, difficulty, validation_criteria } = testCase;
    
    try {
      // Invocar agentic-rag
      const { data, error } = await supabase.functions.invoke('agentic-rag', {
        body: { 
          query: question,
          conversationHistory: []
        }
      });

      if (error) {
        return {
          id,
          test_id,
          status: 'error',
          error: error.message,
          category,
          difficulty
        };
      }

      const response = data?.response || '';
      const confidence = data?.confidence || 0;
      
      // Avaliar resposta
      const evaluation = this.evaluateResponse(response, expected_answer, validation_criteria);
      
      return {
        id,
        test_id,
        status: evaluation.status,
        score: evaluation.score,
        confidence,
        category,
        difficulty,
        missingKeywords: evaluation.missingKeywords,
        responseLength: response.length
      };
      
    } catch (err) {
      return {
        id,
        test_id,
        status: 'error',
        error: err.message,
        category,
        difficulty
      };
    }
  }

  evaluateResponse(response, expectedAnswer, validationCriteria) {
    if (!response) {
      return { status: 'failed', score: 0, missingKeywords: ['resposta vazia'] };
    }
    
    const responseLower = response.toLowerCase();
    const expectedLower = expectedAnswer.toLowerCase();
    
    // Extrair palavras-chave do expected_answer
    const keywords = this.extractKeywords(expectedLower);
    const foundKeywords = keywords.filter(kw => responseLower.includes(kw));
    const missingKeywords = keywords.filter(kw => !responseLower.includes(kw));
    
    const score = (foundKeywords.length / keywords.length) * 100;
    
    let status;
    if (score >= 80) {
      status = 'passed';
    } else if (score >= 50) {
      status = 'partial';
    } else {
      status = 'failed';
    }
    
    // Aplicar critérios de validação específicos se existirem
    if (validationCriteria) {
      try {
        const criteria = JSON.parse(validationCriteria);
        if (criteria.required) {
          const hasRequired = criteria.required.every(req => 
            responseLower.includes(req.toLowerCase())
          );
          if (!hasRequired) {
            status = 'failed';
          }
        }
      } catch (e) {
        // Ignorar erro de parse
      }
    }
    
    return { status, score, missingKeywords };
  }

  extractKeywords(text) {
    // Remover pontuação e palavras comuns
    const stopWords = ['o', 'a', 'de', 'da', 'do', 'em', 'para', 'com', 'é', 'e', 'ou', 'que', 'no', 'na', 'os', 'as', 'um', 'uma'];
    
    return text
      .replace(/[.,!?;]/g, '')
      .split(' ')
      .filter(word => word.length > 3 && !stopWords.includes(word))
      .slice(0, 5); // Pegar até 5 palavras-chave
  }

  async runTests(testCases, batchSize = 5) {
    console.log(`${colors.cyan}🚀 Iniciando testes com ${testCases.length} casos...${colors.reset}\n`);
    
    const batches = [];
    for (let i = 0; i < testCases.length; i += batchSize) {
      batches.push(testCases.slice(i, i + batchSize));
    }
    
    let currentCase = 0;
    
    for (const batch of batches) {
      const promises = batch.map(async (testCase) => {
        currentCase++;
        process.stdout.write(`\r${colors.cyan}Testando: ${currentCase}/${testCases.length}${colors.reset}`);
        
        const result = await this.testCase(testCase);
        
        // Atualizar estatísticas
        this.results.total++;
        
        if (result.status === 'passed') {
          this.results.passed++;
        } else if (result.status === 'partial') {
          this.results.partial++;
        } else if (result.status === 'failed') {
          this.results.failed++;
        } else if (result.status === 'error') {
          this.results.failed++;
          this.results.errors.push(result);
        }
        
        // Estatísticas por categoria
        const category = result.category || 'uncategorized';
        if (!this.results.byCategory[category]) {
          this.results.byCategory[category] = { total: 0, passed: 0, failed: 0, partial: 0 };
        }
        this.results.byCategory[category].total++;
        
        if (result.status === 'passed') {
          this.results.byCategory[category].passed++;
        } else if (result.status === 'partial') {
          this.results.byCategory[category].partial++;
        } else {
          this.results.byCategory[category].failed++;
        }
        
        return result;
      });
      
      await Promise.all(promises);
      
      // Pequena pausa entre batches
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n');
    this.results.executionTime = Date.now() - this.results.startTime;
  }

  generateReport() {
    const accuracy = ((this.results.passed / this.results.total) * 100).toFixed(2);
    const partialAccuracy = (((this.results.passed + this.results.partial) / this.results.total) * 100).toFixed(2);
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.total,
        passed: this.results.passed,
        partial: this.results.partial,
        failed: this.results.failed,
        accuracy: parseFloat(accuracy),
        accuracyWithPartial: parseFloat(partialAccuracy),
        executionTimeMs: this.results.executionTime,
        avgTimePerTest: Math.round(this.results.executionTime / this.results.total)
      },
      byCategory: this.results.byCategory,
      errors: this.results.errors.slice(0, 10) // Limitar a 10 erros no relatório
    };
    
    return report;
  }

  displayResults() {
    const accuracy = ((this.results.passed / this.results.total) * 100).toFixed(2);
    const partialAccuracy = (((this.results.passed + this.results.partial) / this.results.total) * 100).toFixed(2);
    
    console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.cyan}📊 RESULTADOS DOS TESTES QA${colors.reset}`);
    console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
    
    console.log(`${colors.blue}📈 RESUMO GERAL:${colors.reset}`);
    console.log(`  Total de testes: ${this.results.total}`);
    console.log(`  ${colors.green}✅ Aprovados: ${this.results.passed}${colors.reset}`);
    console.log(`  ${colors.yellow}⚠️ Parciais: ${this.results.partial}${colors.reset}`);
    console.log(`  ${colors.red}❌ Reprovados: ${this.results.failed}${colors.reset}`);
    console.log(`  ${colors.magenta}📊 Acurácia: ${accuracy}%${colors.reset}`);
    console.log(`  ${colors.magenta}📊 Acurácia (com parciais): ${partialAccuracy}%${colors.reset}`);
    
    console.log(`\n${colors.blue}📚 RESULTADOS POR CATEGORIA:${colors.reset}`);
    Object.entries(this.results.byCategory).forEach(([category, stats]) => {
      const catAccuracy = ((stats.passed / stats.total) * 100).toFixed(1);
      console.log(`\n  ${category}:`);
      console.log(`    Total: ${stats.total}`);
      console.log(`    ✅ Passou: ${stats.passed} (${catAccuracy}%)`);
      console.log(`    ⚠️ Parcial: ${stats.partial}`);
      console.log(`    ❌ Falhou: ${stats.failed}`);
    });
    
    if (this.results.errors.length > 0) {
      console.log(`\n${colors.red}❌ ERROS ENCONTRADOS:${colors.reset}`);
      this.results.errors.slice(0, 5).forEach(err => {
        console.log(`  - Teste ${err.test_id}: ${err.error}`);
      });
    }
    
    const executionTime = (this.results.executionTime / 1000).toFixed(1);
    console.log(`\n${colors.cyan}⏱️ Tempo total: ${executionTime}s${colors.reset}`);
    console.log(`${colors.cyan}⚡ Média por teste: ${Math.round(this.results.executionTime / this.results.total)}ms${colors.reset}`);
    
    // Análise de resultado
    console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
    if (accuracy >= 95) {
      console.log(`${colors.green}🎉 EXCELENTE! Sistema atingiu a meta de >95% de acurácia!${colors.reset}`);
    } else if (accuracy >= 90) {
      console.log(`${colors.green}✅ BOM! Sistema está com boa acurácia, mas pode melhorar.${colors.reset}`);
    } else if (accuracy >= 85) {
      console.log(`${colors.yellow}⚠️ REGULAR! Sistema precisa de otimizações.${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ CRÍTICO! Sistema precisa de correções urgentes.${colors.reset}`);
    }
    console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  }

  async saveReport(report) {
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const filename = `qa-test-report-${timestamp}.json`;
    const filepath = path.join(process.cwd(), 'reports', filename);
    
    // Criar diretório se não existir
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Relatório salvo em: ${filepath}`);
    
    // Salvar no banco de dados
    try {
      const { error } = await supabase
        .from('qa_runs')
        .insert({
          total_tests: report.summary.total,
          passed_tests: report.summary.passed,
          failed_tests: report.summary.failed,
          accuracy_rate: report.summary.accuracy,
          execution_time: report.summary.executionTimeMs,
          metadata: report
        });
      
      if (!error) {
        console.log(`✅ Resultado salvo no banco de dados`);
      }
    } catch (e) {
      console.error(`⚠️ Não foi possível salvar no banco:`, e.message);
    }
    
    return filepath;
  }
}

// Função principal
async function runQATests(options = {}) {
  const runner = new QATestRunner();
  
  try {
    // Carregar casos de teste
    const limit = options.limit || null;
    const testCases = await runner.loadTestCases(limit);
    
    if (testCases.length === 0) {
      console.error(`${colors.red}❌ Nenhum caso de teste encontrado${colors.reset}`);
      return;
    }
    
    // Executar testes
    await runner.runTests(testCases, options.batchSize || 5);
    
    // Gerar relatório
    const report = runner.generateReport();
    
    // Exibir resultados
    runner.displayResults();
    
    // Salvar relatório
    if (options.save !== false) {
      await runner.saveReport(report);
    }
    
    return report;
  } catch (error) {
    console.error(`${colors.red}❌ Erro fatal: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Processar argumentos da linha de comando
const args = process.argv.slice(2);
const options = {
  limit: null,
  save: true,
  batchSize: 5
};

// Parse argumentos
args.forEach(arg => {
  if (arg.startsWith('--limit=')) {
    options.limit = parseInt(arg.split('=')[1]);
  } else if (arg.startsWith('--batch=')) {
    options.batchSize = parseInt(arg.split('=')[1]);
  } else if (arg === '--no-save') {
    options.save = false;
  } else if (arg === '--help') {
    console.log(`
Uso: node test-qa-complete.mjs [opções]

Opções:
  --limit=N     Limitar a N casos de teste
  --batch=N     Processar N testes por vez (padrão: 5)
  --no-save     Não salvar relatório
  --help        Mostrar esta ajuda

Exemplos:
  node test-qa-complete.mjs                 # Testar todos os casos
  node test-qa-complete.mjs --limit=10      # Testar apenas 10 casos
  node test-qa-complete.mjs --batch=10      # Processar 10 testes por vez
    `);
    process.exit(0);
  }
});

// Executar testes
console.log(`${colors.cyan}🧪 SISTEMA DE TESTES QA - AGENTIC-RAG${colors.reset}`);
console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);

if (options.limit) {
  console.log(`${colors.yellow}⚠️ Modo limitado: testando apenas ${options.limit} casos${colors.reset}\n`);
}

runQATests(options).then(() => {
  console.log(`\n${colors.green}✅ Testes concluídos!${colors.reset}`);
});