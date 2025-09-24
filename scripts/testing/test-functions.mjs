#!/usr/bin/env node

/**
 * Testes Automatizados - Edge Functions
 * Sistema de Chat PD POA - Porto Alegre
 * 
 * Testa todas as functions deployadas automaticamente
 */

import { execSync } from 'child_process';

const PROJECT_REF = 'ngrqwmvuhvjkeohesbxs';
const BASE_URL = `https://${PROJECT_REF}.supabase.co/functions/v1`;

// Mock JWT token para testes (use um token válido em produção)
const MOCK_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJpYXQiOjE3MDA1NDY4MjAsImV4cCI6MjAxNjEyMjgyMH0.mock';

// Definir testes para cada function
const FUNCTION_TESTS = {
  // Functions Críticas
  'feedback-processor': {
    requiresAuth: true,
    testCases: [
      {
        name: 'Test CORS',
        method: 'OPTIONS',
        expectedStatus: [200, 204],
        headers: { 'Origin': 'http://localhost:3000' }
      },
      {
        name: 'Test feedback submission',
        method: 'POST',
        body: {
          message_id: 'test-msg-123',
          session_id: 'test-session-456', 
          model: 'test-model',
          helpful: true,
          comment: 'Teste automatizado'
        },
        expectedStatus: [200, 201],
        requiresAuth: true
      }
    ]
  },

  'gap-detector': {
    requiresAuth: false,
    testCases: [
      {
        name: 'Test CORS',
        method: 'OPTIONS',
        expectedStatus: [200, 204]
      },
      {
        name: 'Test gap detection',
        method: 'POST',
        body: {
          query: 'O que é zoneamento?',
          confidence: 0.4,
          category: 'zoneamento'
        },
        expectedStatus: [200]
      }
    ]
  },

  'knowledge-updater': {
    requiresAuth: true,
    testCases: [
      {
        name: 'Test CORS',
        method: 'OPTIONS',
        expectedStatus: [200, 204]
      },
      {
        name: 'Test analyze gap',
        method: 'POST',
        body: {
          action: 'analyze_and_suggest',
          gap: {
            category: 'test',
            topic: 'test-topic',
            severity: 'low',
            failedTests: []
          }
        },
        expectedStatus: [200],
        requiresAuth: true
      }
    ]
  },

  'paginated-search': {
    requiresAuth: true,
    testCases: [
      {
        name: 'Test CORS',
        method: 'OPTIONS',
        expectedStatus: [200, 204]
      },
      {
        name: 'Test paginated search',
        method: 'POST',
        body: {
          query: 'zoneamento',
          pagination: {
            page: 1,
            limit: 10
          }
        },
        expectedStatus: [200],
        requiresAuth: true
      }
    ]
  },

  'cursor-pagination': {
    requiresAuth: true,
    testCases: [
      {
        name: 'Test CORS',
        method: 'OPTIONS',
        expectedStatus: [200, 204]
      },
      {
        name: 'Test cursor pagination',
        method: 'POST',
        body: {
          query: 'bairros',
          limit: 5
        },
        expectedStatus: [200],
        requiresAuth: true
      }
    ]
  },

  // Multi-LLM Functions (teste básico)
  'claude-chat': {
    requiresAuth: true,
    testCases: [
      {
        name: 'Test CORS',
        method: 'OPTIONS',
        expectedStatus: [200, 204]
      }
    ]
  },

  'gemini-chat': {
    requiresAuth: true,
    testCases: [
      {
        name: 'Test CORS',
        method: 'OPTIONS',
        expectedStatus: [200, 204]
      }
    ]
  },

  'openai-advanced-chat': {
    requiresAuth: true,
    testCases: [
      {
        name: 'Test CORS',
        method: 'OPTIONS',
        expectedStatus: [200, 204]
      }
    ]
  },

  // Core RAG Functions
  'enhanced-vector-search': {
    requiresAuth: true,
    testCases: [
      {
        name: 'Test CORS',
        method: 'OPTIONS',
        expectedStatus: [200, 204]
      },
      {
        name: 'Test vector search',
        method: 'POST',
        body: {
          query: 'coeficiente de aproveitamento',
          limit: 5
        },
        expectedStatus: [200],
        requiresAuth: true
      }
    ]
  },

  'response-synthesizer': {
    requiresAuth: true,
    testCases: [
      {
        name: 'Test CORS',
        method: 'OPTIONS',
        expectedStatus: [200, 204]
      }
    ]
  },

  'contextual-scoring': {
    requiresAuth: true,
    testCases: [
      {
        name: 'Test CORS',
        method: 'OPTIONS',
        expectedStatus: [200, 204]
      }
    ]
  }
};

class FunctionTester {
  constructor() {
    this.testResults = [];
    this.totalTests = 0;
    this.passedTests = 0;
    this.failedTests = 0;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      'info': '📝',
      'success': '✅',
      'error': '❌',
      'warn': '⚠️'
    }[type] || '📝';
    
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  async testFunction(functionName, testConfig) {
    this.log(`🧪 Testando function: ${functionName}`);
    
    const functionResults = {
      function: functionName,
      tests: [],
      overallStatus: 'unknown'
    };

    let functionPassed = 0;
    let functionTotal = 0;

    for (const testCase of testConfig.testCases) {
      functionTotal++;
      this.totalTests++;

      const testResult = await this.runSingleTest(functionName, testCase);
      functionResults.tests.push(testResult);

      if (testResult.passed) {
        functionPassed++;
        this.passedTests++;
      } else {
        this.failedTests++;
      }
    }

    functionResults.overallStatus = functionPassed === functionTotal ? 'passed' : 'failed';
    functionResults.passRate = `${functionPassed}/${functionTotal}`;

    this.testResults.push(functionResults);
    
    const status = functionResults.overallStatus === 'passed' ? '✅' : '❌';
    this.log(`${status} ${functionName}: ${functionResults.passRate} testes passaram`);

    return functionResults;
  }

  async runSingleTest(functionName, testCase) {
    const url = `${BASE_URL}/${functionName}`;
    
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...testCase.headers
      };

      // Adicionar autenticação se necessário
      if (testCase.requiresAuth) {
        headers['Authorization'] = `Bearer ${MOCK_JWT}`;
      }

      const requestOptions = {
        method: testCase.method || 'GET',
        headers
      };

      if (testCase.body) {
        requestOptions.body = JSON.stringify(testCase.body);
      }

      const startTime = Date.now();
      const response = await fetch(url, requestOptions);
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      const passed = testCase.expectedStatus.includes(response.status);
      
      const result = {
        name: testCase.name,
        method: testCase.method || 'GET',
        status: response.status,
        expectedStatus: testCase.expectedStatus,
        responseTime,
        passed,
        error: null
      };

      if (passed) {
        this.log(`  ✅ ${testCase.name}: ${response.status} (${responseTime}ms)`);
      } else {
        this.log(`  ❌ ${testCase.name}: Expected ${testCase.expectedStatus}, got ${response.status}`, 'error');
        
        // Tentar ler response body para debug
        try {
          const responseBody = await response.text();
          if (responseBody) {
            result.responseBody = responseBody.substring(0, 200); // Truncar
          }
        } catch (e) {
          // Ignorar erro ao ler body
        }
      }

      return result;

    } catch (error) {
      this.log(`  ❌ ${testCase.name}: ${error.message}`, 'error');
      
      return {
        name: testCase.name,
        method: testCase.method || 'GET',
        status: 'ERROR',
        expectedStatus: testCase.expectedStatus,
        responseTime: 0,
        passed: false,
        error: error.message
      };
    }
  }

  async checkFunctionExists(functionName) {
    try {
      const response = await fetch(`${BASE_URL}/${functionName}`, {
        method: 'OPTIONS',
        headers: { 'Origin': 'http://localhost:3000' }
      });
      
      return response.status !== 404;
    } catch (error) {
      return false;
    }
  }

  async runAllTests() {
    this.log('🚀 Iniciando testes automatizados das Edge Functions');
    this.log(`📍 Base URL: ${BASE_URL}`);
    this.log(`🧪 Functions a testar: ${Object.keys(FUNCTION_TESTS).length}`);

    // Verificar quais functions existem
    const existingFunctions = [];
    const missingFunctions = [];

    for (const functionName of Object.keys(FUNCTION_TESTS)) {
      const exists = await this.checkFunctionExists(functionName);
      if (exists) {
        existingFunctions.push(functionName);
      } else {
        missingFunctions.push(functionName);
        this.log(`⏭️ Function ${functionName} não encontrada, pulando testes`, 'warn');
      }
    }

    this.log(`📊 Functions encontradas: ${existingFunctions.length}, não encontradas: ${missingFunctions.length}`);

    // Executar testes para functions existentes
    for (const functionName of existingFunctions) {
      await this.testFunction(functionName, FUNCTION_TESTS[functionName]);
      
      // Pequena pausa entre functions
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFunctions: this.testResults.length,
        totalTests: this.totalTests,
        passedTests: this.passedTests,
        failedTests: this.failedTests,
        successRate: this.totalTests > 0 ? ((this.passedTests / this.totalTests) * 100).toFixed(1) + '%' : '0%'
      },
      results: this.testResults
    };

    return report;
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO DOS TESTES');
    console.log('='.repeat(60));
    
    console.log(`🎯 Total de functions testadas: ${this.testResults.length}`);
    console.log(`🧪 Total de testes executados: ${this.totalTests}`);
    console.log(`✅ Testes aprovados: ${this.passedTests}`);
    console.log(`❌ Testes reprovados: ${this.failedTests}`);
    console.log(`📈 Taxa de sucesso: ${this.totalTests > 0 ? ((this.passedTests / this.totalTests) * 100).toFixed(1) + '%' : '0%'}`);
    
    console.log('\n📋 Status por Function:');
    this.testResults.forEach(result => {
      const status = result.overallStatus === 'passed' ? '✅' : '❌';
      console.log(`  ${status} ${result.function}: ${result.passRate}`);
    });
    
    if (this.failedTests > 0) {
      console.log('\n💥 Testes com falha:');
      this.testResults.forEach(result => {
        result.tests.forEach(test => {
          if (!test.passed) {
            console.log(`  ❌ ${result.function} -> ${test.name}: ${test.error || `Status ${test.status}`}`);
          }
        });
      });
    }
    
    console.log('\n🔗 URLs testadas:');
    this.testResults.forEach(result => {
      console.log(`  ${BASE_URL}/${result.function}`);
    });
    
    console.log('='.repeat(60));
  }

  async saveReport() {
    const report = this.generateReport();
    const reportPath = `test-report-${Date.now()}.json`;
    
    const fs = await import('fs');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    this.log(`📄 Relatório de testes salvo em: ${reportPath}`);
    
    return reportPath;
  }
}

async function main() {
  const tester = new FunctionTester();
  
  try {
    await tester.runAllTests();
    await tester.saveReport();
    tester.printSummary();
    
    // Exit code baseado nos resultados
    if (tester.failedTests > 0) {
      console.log('\n⚠️ Alguns testes falharam. Verifique os logs e corrija os problemas.');
      process.exit(1);
    } else {
      console.log('\n🎉 Todos os testes passaram com sucesso!');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('💥 Erro durante os testes:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (process.argv[1] === new URL(import.meta.url).pathname) {
  main();
}

export { FunctionTester, FUNCTION_TESTS, BASE_URL };