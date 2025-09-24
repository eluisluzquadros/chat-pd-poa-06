import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface DebugLog {
  timestamp: string;
  step: string;
  component: 'query-analyzer' | 'sql-generator' | 'response-synthesizer' | 'agentic-rag';
  data: any;
  executionTime?: number;
}

interface DebugTestResult {
  query: string;
  success: boolean;
  totalTime: number;
  logs: DebugLog[];
  chunks: any[];
  scores: any[];
  decisions: any[];
  errors: string[];
}

class DebugTestRunner {
  private debugLogs: DebugLog[] = [];

  async runDebugTests(): Promise<void> {
    console.log('🔍 Iniciando testes de debug do sistema RAG...\n');

    const testQueries = [
      'o que posso construir no Petrópolis',
      'Certificação em Sustentabilidade Ambiental',
      'altura máxima da ZOT 07',
      'quantos bairros tem Porto Alegre',
      'três figueiras'
    ];

    const results: DebugTestResult[] = [];

    for (const query of testQueries) {
      console.log(`\n🔍 Debug para: "${query}"`);
      console.log('-'.repeat(50));
      
      const result = await this.runDebugTest(query);
      results.push(result);
      
      this.printDebugSummary(result);
    }

    // Gerar relatório de debug
    await this.generateDebugReport(results);
  }

  private async runDebugTest(query: string): Promise<DebugTestResult> {
    const startTime = Date.now();
    this.debugLogs = [];
    
    const result: DebugTestResult = {
      query,
      success: false,
      totalTime: 0,
      logs: [],
      chunks: [],
      scores: [],
      decisions: [],
      errors: []
    };

    try {
      // 1. Testar Query Analyzer
      console.log('📊 1. Query Analysis...');
      const analysisStart = Date.now();
      
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke('query-analyzer', {
        body: {
          query,
          userRole: 'citizen',
          sessionId: `debug-${Date.now()}`
        }
      });

      const analysisTime = Date.now() - analysisStart;
      
      if (analysisError) {
        result.errors.push(`Query Analysis: ${analysisError.message}`);
      } else {
        this.addDebugLog('query-analyzer', 'analysis_complete', analysisData, analysisTime);
        console.log(`   ✅ Concluído em ${analysisTime}ms`);
        console.log(`   📋 Intent: ${analysisData.intent}`);
        console.log(`   🎯 Strategy: ${analysisData.strategy}`);
        console.log(`   🏗️ Construction Query: ${analysisData.isConstructionQuery}`);
        console.log(`   💯 Confidence: ${(analysisData.confidence * 100).toFixed(1)}%`);
        
        if (analysisData.entities) {
          if (analysisData.entities.bairros?.length > 0) {
            console.log(`   🏘️ Bairros: ${analysisData.entities.bairros.join(', ')}`);
          }
          if (analysisData.entities.zots?.length > 0) {
            console.log(`   🗺️ ZOTs: ${analysisData.entities.zots.join(', ')}`);
          }
          if (analysisData.entities.parametros?.length > 0) {
            console.log(`   📐 Parâmetros: ${analysisData.entities.parametros.join(', ')}`);
          }
        }
      }

      // 2. Testar SQL Generator (se necessário)
      if (analysisData && (analysisData.strategy === 'structured_only' || analysisData.strategy === 'hybrid')) {
        console.log('\n🔧 2. SQL Generation...');
        const sqlStart = Date.now();
        
        const { data: sqlData, error: sqlError } = await supabase.functions.invoke('sql-generator', {
          body: {
            query,
            analysisResult: analysisData,
            userRole: 'citizen'
          }
        });

        const sqlTime = Date.now() - sqlStart;
        
        if (sqlError) {
          result.errors.push(`SQL Generation: ${sqlError.message}`);
        } else {
          this.addDebugLog('sql-generator', 'sql_complete', sqlData, sqlTime);
          console.log(`   ✅ Concluído em ${sqlTime}ms`);
          console.log(`   📊 Queries geradas: ${sqlData.sqlQueries?.length || 0}`);
          console.log(`   💯 Confidence: ${(sqlData.confidence * 100).toFixed(1)}%`);
          
          if (sqlData.executionResults) {
            console.log(`   📈 Resultados de execução: ${sqlData.executionResults.length}`);
            sqlData.executionResults.forEach((execResult, index) => {
              if (execResult.data && execResult.data.length > 0) {
                console.log(`      Dataset ${index + 1}: ${execResult.data.length} registros`);
                console.log(`      Propósito: ${execResult.purpose}`);
                
                // Log de campos encontrados
                const sampleRow = execResult.data[0];
                const fields = Object.keys(sampleRow);
                console.log(`      Campos: ${fields.slice(0, 5).join(', ')}${fields.length > 5 ? '...' : ''}`);
                
                // Validação de dados específicos
                if (analysisData.isConstructionQuery) {
                  const hasRequiredFields = [
                    'Zona',
                    'Altura Máxima - Edificação Isolada',
                    'Coeficiente de Aproveitamento - Básico',
                    'Coeficiente de Aproveitamento - Máximo'
                  ].every(field => sampleRow.hasOwnProperty(field));
                  
                  console.log(`      ✅ Campos obrigatórios: ${hasRequiredFields ? 'Presente' : 'Ausente'}`);
                  
                  if (analysisData.entities?.bairros?.length > 0) {
                    const expectedBairro = analysisData.entities.bairros[0];
                    const correctBairro = execResult.data.every(row => 
                      !row.Bairro || row.Bairro === expectedBairro
                    );
                    console.log(`      🎯 Filtro de bairro correto: ${correctBairro ? 'Sim' : 'Não'}`);
                  }
                }
              } else if (execResult.error) {
                console.log(`      ❌ Erro: ${execResult.error}`);
              }
            });
          }
        }
      }

      // 3. Testar Response Synthesizer
      console.log('\n📝 3. Response Synthesis...');
      const synthStart = Date.now();
      
      const { data: finalData, error: finalError } = await supabase.functions.invoke('agentic-rag', {
        body: {
          message: query,
          sessionId: `debug-${Date.now()}`,
          userRole: 'citizen',
          bypassCache: true
        }
      });

      const synthTime = Date.now() - synthStart;
      
      if (finalError) {
        result.errors.push(`Final Response: ${finalError.message}`);
      } else {
        this.addDebugLog('agentic-rag', 'final_response', finalData, synthTime);
        result.success = true;
        
        console.log(`   ✅ Concluído em ${synthTime}ms`);
        console.log(`   💯 Confidence final: ${(finalData.confidence * 100).toFixed(1)}%`);
        console.log(`   📊 Sources: Tabular=${finalData.sources?.tabular || 0}, Conceptual=${finalData.sources?.conceptual || 0}`);
        console.log(`   📄 Resposta: ${finalData.response?.length || 0} caracteres`);
        
        // Análise da resposta
        const responseAnalysis = this.analyzeResponse(finalData.response, analysisData);
        console.log('\n   📋 Análise da Resposta:');
        Object.entries(responseAnalysis).forEach(([key, value]) => {
          const emoji = value ? '✅' : '❌';
          console.log(`      ${emoji} ${key}: ${value}`);
        });
        
        result.decisions.push({
          step: 'response_analysis',
          analysis: responseAnalysis,
          responseLength: finalData.response?.length || 0,
          confidence: finalData.confidence
        });
      }

    } catch (error) {
      result.errors.push(`General Error: ${error.message}`);
      console.log(`❌ Erro geral: ${error.message}`);
    }

    result.totalTime = Date.now() - startTime;
    result.logs = [...this.debugLogs];
    
    console.log(`\n⏱️ Tempo total: ${result.totalTime}ms`);
    
    return result;
  }

  private addDebugLog(component: string, step: string, data: any, executionTime?: number): void {
    this.debugLogs.push({
      timestamp: new Date().toISOString(),
      step,
      component: component as any,
      data,
      executionTime
    });
  }

  private analyzeResponse(response: string, analysisResult: any): any {
    if (!response) return {};
    
    const analysis = {
      hasTable: /\|.*\|/.test(response),
      hasOfficialLinks: response.includes('bit.ly/3ILdXRA'),
      hasPortugueseContent: /\b(o|a|de|do|da|em|para|com|que|é|são)\b/.test(response.toLowerCase()),
      noBetaMessage: !response.toLowerCase().includes('versão beta'),
      hasExpectedLength: response.length > 100,
      hasMarkdownFormatting: /#+\s/.test(response) || /\*\*.*\*\*/.test(response)
    };

    // Análises específicas por tipo de consulta
    if (analysisResult?.isConstructionQuery) {
      analysis.hasZOTMention = /zot\s*\d+/i.test(response);
      analysis.hasHeightMention = response.toLowerCase().includes('altura');
      analysis.hasCoefficientMention = response.toLowerCase().includes('coeficiente');
      analysis.hasTableFormat = /\|.*ZOT.*\|/i.test(response);
    }

    if (analysisResult?.entities?.bairros?.length > 0) {
      const bairro = analysisResult.entities.bairros[0];
      analysis.mentionsBairro = response.toLowerCase().includes(bairro.toLowerCase());
    }

    return analysis;
  }

  private printDebugSummary(result: DebugTestResult): void {
    console.log('\n📊 Resumo do Debug:');
    console.log(`   Sucesso: ${result.success ? '✅' : '❌'}`);
    console.log(`   Tempo total: ${result.totalTime}ms`);
    console.log(`   Logs gerados: ${result.logs.length}`);
    console.log(`   Decisões: ${result.decisions.length}`);
    console.log(`   Erros: ${result.errors.length}`);
    
    if (result.errors.length > 0) {
      console.log('\n❌ Erros encontrados:');
      result.errors.forEach(error => {
        console.log(`   • ${error}`);
      });
    }
  }

  private async generateDebugReport(results: DebugTestResult[]): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: results.length,
        successfulTests: results.filter(r => r.success).length,
        averageTime: Math.round(results.reduce((sum, r) => sum + r.totalTime, 0) / results.length),
        totalLogs: results.reduce((sum, r) => sum + r.logs.length, 0),
        totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0)
      },
      detailedResults: results,
      performanceAnalysis: this.analyzePerformance(results),
      errorAnalysis: this.analyzeErrors(results),
      recommendations: this.generateDebugRecommendations(results)
    };

    // Salvar relatório
    const reportPath = `tests/reports/debug-report-${Date.now()}.json`;
    await this.ensureDirectoryExists('tests/reports');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n' + '='.repeat(60));
    console.log('📊 RELATÓRIO DE DEBUG');
    console.log('='.repeat(60));
    console.log(`Testes executados: ${report.summary.totalTests}`);
    console.log(`Taxa de sucesso: ${((report.summary.successfulTests / report.summary.totalTests) * 100).toFixed(1)}%`);
    console.log(`Tempo médio: ${report.summary.averageTime}ms`);
    console.log(`Total de logs: ${report.summary.totalLogs}`);
    console.log(`Total de erros: ${report.summary.totalErrors}`);

    if (report.recommendations.length > 0) {
      console.log('\n💡 Recomendações:');
      report.recommendations.forEach(rec => {
        console.log(`   • ${rec}`);
      });
    }

    console.log(`\n📄 Relatório detalhado salvo em: ${reportPath}`);
  }

  private analyzePerformance(results: DebugTestResult[]): any {
    const times = results.map(r => r.totalTime);
    const componentTimes = {};

    results.forEach(result => {
      result.logs.forEach(log => {
        if (log.executionTime) {
          if (!componentTimes[log.component]) {
            componentTimes[log.component] = [];
          }
          componentTimes[log.component].push(log.executionTime);
        }
      });
    });

    const componentAverages = {};
    Object.entries(componentTimes).forEach(([component, times]: [string, number[]]) => {
      componentAverages[component] = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    });

    return {
      overallAverage: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
      fastest: Math.min(...times),
      slowest: Math.max(...times),
      componentAverages
    };
  }

  private analyzeErrors(results: DebugTestResult[]): any {
    const allErrors = results.flatMap(r => r.errors);
    const errorTypes = {};

    allErrors.forEach(error => {
      const type = error.split(':')[0];
      errorTypes[type] = (errorTypes[type] || 0) + 1;
    });

    return {
      totalErrors: allErrors.length,
      uniqueErrors: [...new Set(allErrors)].length,
      errorTypes,
      mostCommonError: Object.entries(errorTypes).reduce((a, b) => 
        errorTypes[a[0]] > errorTypes[b[0]] ? a : b, ['', 0]
      )[0]
    };
  }

  private generateDebugRecommendations(results: DebugTestResult[]): string[] {
    const recommendations = [];
    const successRate = results.filter(r => r.success).length / results.length;
    const avgTime = results.reduce((sum, r) => sum + r.totalTime, 0) / results.length;

    if (successRate < 0.8) {
      recommendations.push('Taxa de sucesso baixa - revisar tratamento de erros');
    }

    if (avgTime > 8000) {
      recommendations.push('Tempo de resposta alto - otimizar consultas SQL');
    }

    const hasLongQueries = results.some(r => 
      r.logs.some(log => log.component === 'sql-generator' && log.executionTime > 3000)
    );
    if (hasLongQueries) {
      recommendations.push('Algumas consultas SQL estão lentas - adicionar índices ou otimizar queries');
    }

    const hasBetaMessages = results.some(r => 
      r.decisions.some(d => d.analysis?.noBetaMessage === false)
    );
    if (hasBetaMessages) {
      recommendations.push('Mensagens beta sendo exibidas desnecessariamente');
    }

    const missingTables = results.filter(r => 
      r.logs.some(log => 
        log.data?.isConstructionQuery && 
        log.component === 'agentic-rag'
      ) && r.decisions.some(d => d.analysis?.hasTable === false)
    );
    if (missingTables.length > 0) {
      recommendations.push('Consultas de construção sem tabelas - verificar formatação');
    }

    return recommendations;
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
}

// Executar debug tests se chamado diretamente
if (require.main === module) {
  const debugRunner = new DebugTestRunner();
  debugRunner.runDebugTests().catch(console.error);
}

export { DebugTestRunner };