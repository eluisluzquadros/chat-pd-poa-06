import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Configurações de teste
interface TestConfig {
  name: string;
  timeout: number;
  categories: string[];
  priority: 'high' | 'medium' | 'low';
  expectedSuccessRate: number;
}

// Casos de teste específicos para validação do sistema RAG
const RAG_TEST_CASES = [
  // Casos específicos mencionados
  {
    id: 'sustentabilidade-art81',
    query: 'Certificação em Sustentabilidade Ambiental',
    expectedMappings: ['Art. 81', 'III', 'sustentabilidade'],
    category: 'article-mapping',
    priority: 'high'
  },
  {
    id: 'quarto-distrito-art74',
    query: '4º Distrito',
    expectedMappings: ['Art. 74', 'distrito'],
    category: 'article-mapping',
    priority: 'high'
  },
  
  // Casos de construção por bairro
  {
    id: 'petropolis-construction',
    query: 'o que posso construir no Petrópolis',
    expectedElements: ['tabela', 'ZOT', 'altura', 'coeficiente'],
    category: 'construction',
    priority: 'high'
  },
  {
    id: 'tres-figueiras-construction',
    query: 'regime urbanístico do Três Figueiras',
    expectedElements: ['ZOT 08.3', 'altura', 'coeficiente'],
    category: 'construction',
    priority: 'high'
  },
  {
    id: 'cristal-construction',
    query: 'o que pode ser construído no Cristal',
    expectedElements: ['tabela', 'ZOT', 'altura', 'coeficiente'],
    category: 'construction',
    priority: 'high'
  },
  
  // Queries genéricas
  {
    id: 'generic-height',
    query: 'altura máxima em Porto Alegre',
    expectedElements: ['varia', 'ZOT', 'bairro', 'específico'],
    category: 'generic',
    priority: 'medium'
  },
  {
    id: 'generic-coefficient',
    query: 'coeficiente de aproveitamento em Porto Alegre',
    expectedElements: ['varia', 'zona', 'bairro'],
    category: 'generic',
    priority: 'medium'
  },
  
  // Casos de detecção de keywords
  {
    id: 'keywords-ca-maximo',
    query: 'CA máximo do Centro',
    expectedElements: ['coeficiente', 'aproveitamento', 'máximo'],
    category: 'keywords',
    priority: 'medium'
  },
  {
    id: 'keywords-altura-maxima',
    query: 'gabarito máximo permitido no Boa Vista',
    expectedElements: ['altura', 'máxima', 'gabarito'],
    category: 'keywords',
    priority: 'medium'
  },
  
  // Casos de contagem
  {
    id: 'count-neighborhoods',
    query: 'quantos bairros tem Porto Alegre',
    expectedElements: ['94', 'bairros'],
    category: 'counting',
    priority: 'medium'
  },
  
  // Casos de endereços (devem pedir bairro)
  {
    id: 'street-clarification',
    query: 'o que posso construir na Rua da Praia, 123',
    expectedElements: ['bairro', 'preciso saber', 'informe'],
    category: 'clarification',
    priority: 'high'
  }
];

interface TestResult {
  id: string;
  query: string;
  success: boolean;
  response?: string;
  confidence?: number;
  executionTime: number;
  error?: string;
  validationResults: {
    hasExpectedElements: boolean;
    hasTable: boolean;
    hasOfficialLinks: boolean;
    isInPortuguese: boolean;
    noBetaMessage: boolean;
  };
  score: number;
}

class RAGTestRunner {
  private results: TestResult[] = [];
  private startTime: number = 0;

  async runAllTests(): Promise<void> {
    console.log('🚀 Iniciando bateria completa de testes do sistema RAG...\n');
    this.startTime = Date.now();

    // Executar testes por categoria
    await this.runTestsByCategory('article-mapping', 'Mapeamento de Artigos');
    await this.runTestsByCategory('construction', 'Consultas de Construção');
    await this.runTestsByCategory('generic', 'Consultas Genéricas');
    await this.runTestsByCategory('keywords', 'Sistema de Keywords');
    await this.runTestsByCategory('counting', 'Consultas de Contagem');
    await this.runTestsByCategory('clarification', 'Pedidos de Esclarecimento');

    // Gerar relatório final
    await this.generateReport();
  }

  private async runTestsByCategory(category: string, title: string): Promise<void> {
    console.log(`\n📋 ${title}`);
    console.log('='.repeat(50));

    const categoryTests = RAG_TEST_CASES.filter(test => test.category === category);
    
    for (const testCase of categoryTests) {
      await this.runSingleTest(testCase);
    }
  }

  private async runSingleTest(testCase: any): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log(`\n🔍 Testando: ${testCase.query}`);
      
      const { data, error } = await supabase.functions.invoke('agentic-rag', {
        body: {
          message: testCase.query,
          sessionId: `test-rag-${Date.now()}`,
          userRole: 'citizen',
          bypassCache: true
        }
      });

      const executionTime = Date.now() - startTime;

      if (error) {
        this.recordFailure(testCase, error.message, executionTime);
        return;
      }

      // Validar resposta
      const validationResults = this.validateResponse(data.response, testCase);
      const score = this.calculateScore(validationResults, data.confidence || 0, executionTime);

      const result: TestResult = {
        id: testCase.id,
        query: testCase.query,
        success: true,
        response: data.response,
        confidence: data.confidence,
        executionTime,
        validationResults,
        score
      };

      this.results.push(result);
      this.logTestResult(result);

    } catch (error) {
      this.recordFailure(testCase, error.message, Date.now() - startTime);
    }
  }

  private validateResponse(response: string, testCase: any): any {
    const responseText = response.toLowerCase();
    
    const validations = {
      hasExpectedElements: testCase.expectedElements ? 
        testCase.expectedElements.some(element => responseText.includes(element.toLowerCase())) : true,
      hasTable: /\|.*\|/.test(response),
      hasOfficialLinks: response.includes('bit.ly/3ILdXRA') && 
                       response.includes('planodiretor@portoalegre.rs.gov.br'),
      isInPortuguese: /\b(o|a|de|do|da|em|para|com|que|é|são)\b/.test(responseText),
      noBetaMessage: !responseText.includes('versão beta') && 
                     !responseText.includes('não consigo responder')
    };

    // Validações específicas por categoria
    if (testCase.category === 'construction') {
      validations.hasTable = /\|.*\|/.test(response);
    }

    if (testCase.category === 'clarification') {
      validations.noBetaMessage = responseText.includes('bairro') && 
                                  responseText.includes('preciso saber');
    }

    return validations;
  }

  private calculateScore(validations: any, confidence: number, executionTime: number): number {
    let score = 0;
    
    // Pontuação por validações (70% do total)
    const validationCount = Object.values(validations).filter(v => v).length;
    const totalValidations = Object.keys(validations).length;
    score += (validationCount / totalValidations) * 70;
    
    // Pontuação por confiança (20% do total)
    score += confidence * 20;
    
    // Pontuação por performance (10% do total)
    const performanceScore = executionTime < 5000 ? 10 : 
                           executionTime < 10000 ? 5 : 0;
    score += performanceScore;
    
    return Math.round(score);
  }

  private recordFailure(testCase: any, error: string, executionTime: number): void {
    const result: TestResult = {
      id: testCase.id,
      query: testCase.query,
      success: false,
      error,
      executionTime,
      validationResults: {
        hasExpectedElements: false,
        hasTable: false,
        hasOfficialLinks: false,
        isInPortuguese: false,
        noBetaMessage: false
      },
      score: 0
    };

    this.results.push(result);
    console.log(`❌ FALHA: ${error}`);
  }

  private logTestResult(result: TestResult): void {
    const status = result.score >= 80 ? '✅ EXCELENTE' :
                  result.score >= 60 ? '✔️ BOM' :
                  result.score >= 40 ? '⚠️ REGULAR' : '❌ RUIM';
    
    console.log(`${status} (${result.score}/100) - ${result.executionTime}ms`);
    
    if (result.confidence) {
      console.log(`   Confiança: ${(result.confidence * 100).toFixed(1)}%`);
    }
    
    // Mostrar validações que falharam
    const failedValidations = Object.entries(result.validationResults)
      .filter(([key, value]) => !value)
      .map(([key]) => key);
    
    if (failedValidations.length > 0) {
      console.log(`   ⚠️ Falhas: ${failedValidations.join(', ')}`);
    }
  }

  private async generateReport(): Promise<void> {
    const totalTime = Date.now() - this.startTime;
    const totalTests = this.results.length;
    const successfulTests = this.results.filter(r => r.success).length;
    const averageScore = this.results.reduce((sum, r) => sum + r.score, 0) / totalTests;
    const averageTime = this.results.reduce((sum, r) => sum + r.executionTime, 0) / totalTests;

    const report = {
      summary: {
        totalTests,
        successfulTests,
        successRate: (successfulTests / totalTests) * 100,
        averageScore: Math.round(averageScore),
        averageResponseTime: Math.round(averageTime),
        totalExecutionTime: totalTime
      },
      byCategory: this.generateCategoryReport(),
      detailedResults: this.results,
      recommendations: this.generateRecommendations()
    };

    // Console output
    console.log('\n' + '='.repeat(60));
    console.log('📊 RELATÓRIO FINAL DE TESTES RAG');
    console.log('='.repeat(60));
    console.log(`Total de testes: ${totalTests}`);
    console.log(`Testes com sucesso: ${successfulTests} (${report.summary.successRate.toFixed(1)}%)`);
    console.log(`Pontuação média: ${report.summary.averageScore}/100`);
    console.log(`Tempo médio de resposta: ${report.summary.averageResponseTime}ms`);
    console.log(`Tempo total de execução: ${(totalTime / 1000).toFixed(1)}s`);

    console.log('\n📈 Por Categoria:');
    Object.entries(report.byCategory).forEach(([category, stats]: [string, any]) => {
      console.log(`   ${category}: ${stats.averageScore}/100 (${stats.count} testes)`);
    });

    if (report.recommendations.length > 0) {
      console.log('\n💡 Recomendações:');
      report.recommendations.forEach(rec => {
        console.log(`   • ${rec}`);
      });
    }

    // Salvar relatório em arquivo
    const reportPath = path.join(process.cwd(), 'tests', 'reports', `rag-test-report-${Date.now()}.json`);
    await this.ensureDirectoryExists(path.dirname(reportPath));
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Relatório salvo em: ${reportPath}`);

    // Salvar relatório HTML
    const htmlReportPath = reportPath.replace('.json', '.html');
    const htmlReport = this.generateHTMLReport(report);
    fs.writeFileSync(htmlReportPath, htmlReport);
    console.log(`📄 Relatório HTML salvo em: ${htmlReportPath}`);
  }

  private generateCategoryReport(): any {
    const categories = [...new Set(RAG_TEST_CASES.map(test => test.category))];
    const report = {};

    categories.forEach(category => {
      const categoryResults = this.results.filter(r => 
        RAG_TEST_CASES.find(test => test.id === r.id)?.category === category
      );
      
      report[category] = {
        count: categoryResults.length,
        successCount: categoryResults.filter(r => r.success).length,
        averageScore: Math.round(
          categoryResults.reduce((sum, r) => sum + r.score, 0) / categoryResults.length
        ),
        averageTime: Math.round(
          categoryResults.reduce((sum, r) => sum + r.executionTime, 0) / categoryResults.length
        )
      };
    });

    return report;
  }

  private generateRecommendations(): string[] {
    const recommendations = [];
    const averageScore = this.results.reduce((sum, r) => sum + r.score, 0) / this.results.length;

    if (averageScore < 70) {
      recommendations.push('Sistema precisa de melhorias gerais na qualidade das respostas');
    }

    const slowTests = this.results.filter(r => r.executionTime > 10000);
    if (slowTests.length > 0) {
      recommendations.push(`${slowTests.length} testes com tempo de resposta alto (>10s)`);
    }

    const betaMessageTests = this.results.filter(r => 
      r.response && r.response.toLowerCase().includes('versão beta')
    );
    if (betaMessageTests.length > 0) {
      recommendations.push(`${betaMessageTests.length} testes retornaram mensagem beta desnecessariamente`);
    }

    const noTableTests = this.results.filter(r => 
      RAG_TEST_CASES.find(test => test.id === r.id)?.category === 'construction' &&
      (!r.validationResults?.hasTable)
    );
    if (noTableTests.length > 0) {
      recommendations.push('Consultas de construção devem sempre retornar tabelas');
    }

    return recommendations;
  }

  private generateHTMLReport(report: any): string {
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório de Testes RAG - Sistema PDUS</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 6px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #007bff; }
        .metric-label { color: #666; margin-top: 5px; }
        .category-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .category-card { border: 1px solid #ddd; border-radius: 6px; padding: 20px; }
        .test-result { padding: 10px; margin: 5px 0; border-radius: 4px; }
        .test-success { background: #d4edda; border-left: 4px solid #28a745; }
        .test-failure { background: #f8d7da; border-left: 4px solid #dc3545; }
        .score { font-weight: bold; }
        .score-excellent { color: #28a745; }
        .score-good { color: #17a2b8; }
        .score-regular { color: #ffc107; }
        .score-poor { color: #dc3545; }
        .recommendations { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 20px; }
        .recommendations ul { margin: 0; padding-left: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Relatório de Testes RAG</h1>
            <h2>Sistema Plano Diretor Urbano Sustentável - Porto Alegre</h2>
            <p>Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
        </div>

        <div class="summary">
            <div class="metric">
                <div class="metric-value">${report.summary.totalTests}</div>
                <div class="metric-label">Total de Testes</div>
            </div>
            <div class="metric">
                <div class="metric-value">${report.summary.successRate.toFixed(1)}%</div>
                <div class="metric-label">Taxa de Sucesso</div>
            </div>
            <div class="metric">
                <div class="metric-value">${report.summary.averageScore}/100</div>
                <div class="metric-label">Pontuação Média</div>
            </div>
            <div class="metric">
                <div class="metric-value">${report.summary.averageResponseTime}ms</div>
                <div class="metric-label">Tempo Médio</div>
            </div>
        </div>

        <h3>📈 Resultados por Categoria</h3>
        <div class="category-grid">
            ${Object.entries(report.byCategory).map(([category, stats]: [string, any]) => `
                <div class="category-card">
                    <h4>${category}</h4>
                    <p><strong>Testes:</strong> ${stats.count}</p>
                    <p><strong>Sucessos:</strong> ${stats.successCount}</p>
                    <p><strong>Pontuação:</strong> ${stats.averageScore}/100</p>
                    <p><strong>Tempo Médio:</strong> ${stats.averageTime}ms</p>
                </div>
            `).join('')}
        </div>

        <h3>🔍 Resultados Detalhados</h3>
        ${report.detailedResults.map(result => `
            <div class="test-result ${result.success ? 'test-success' : 'test-failure'}">
                <strong>${result.query}</strong><br>
                <span class="score ${
                    result.score >= 80 ? 'score-excellent' :
                    result.score >= 60 ? 'score-good' :
                    result.score >= 40 ? 'score-regular' : 'score-poor'
                }">${result.score}/100</span>
                - ${result.executionTime}ms
                ${result.confidence ? ` - Confiança: ${(result.confidence * 100).toFixed(1)}%` : ''}
                ${result.error ? `<br><span style="color: #dc3545;">Erro: ${result.error}</span>` : ''}
            </div>
        `).join('')}

        ${report.recommendations.length > 0 ? `
            <div class="recommendations">
                <h3>💡 Recomendações</h3>
                <ul>
                    ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
        ` : ''}
    </div>
</body>
</html>
    `;
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
}

// Executar testes se chamado diretamente
if (require.main === module) {
  const runner = new RAGTestRunner();
  runner.runAllTests().catch(console.error);
}

export { RAGTestRunner, RAG_TEST_CASES };