import { multiLLMService, llmMetricsService } from '../src/services/multiLLMService';
import { LLMProvider } from '../src/types/chat';

interface TestResult {
  provider: LLMProvider;
  success: boolean;
  responseTime: number;
  qualityScore: number;
  cost: number;
  error?: string;
}

class MultiLLMSystemTester {
  private testQueries = [
    "O que posso construir no bairro Moinhos de Vento?",
    "Qual é a altura máxima permitida na ZOT 8.3?",
    "Compare os coeficientes de aproveitamento entre Centro e Menino Deus",
    "Quais são as regras de recuo para construções residenciais?",
    "Como funciona o sistema de outorga onerosa no PDUS 2025?"
  ];

  private testProviders: LLMProvider[] = [
    'openai',
    'claude-3-haiku',
    'claude-3-sonnet', 
    'claude-3-opus',
    'gemini',
    'gemini-pro',
    'groq'
  ];

  async runComprehensiveTest(): Promise<void> {
    console.log('🚀 Iniciando teste abrangente do sistema Multi-LLM');
    console.log('=' .repeat(60));

    // Test 1: Individual Provider Performance
    await this.testIndividualProviders();

    // Test 2: Model Comparison
    await this.testModelComparison();

    // Test 3: Intelligent Model Selection
    await this.testIntelligentSelection();

    // Test 4: Metrics Collection
    await this.testMetricsCollection();

    // Test 5: Cost Analysis
    await this.testCostAnalysis();

    console.log('✅ Teste abrangente concluído!');
  }

  private async testIndividualProviders(): Promise<void> {
    console.log('\n📊 Teste 1: Performance Individual dos Provedores');
    console.log('-'.repeat(50));

    const results: TestResult[] = [];

    for (const provider of this.testProviders) {
      console.log(`\nTestando ${provider}...`);
      
      const testQuery = this.testQueries[0]; // Use first query for consistency
      const startTime = Date.now();

      try {
        const response = await multiLLMService.processMessage(
          testQuery,
          provider,
          'citizen'
        );

        const result: TestResult = {
          provider,
          success: !!response.response,
          responseTime: response.executionTime,
          qualityScore: response.qualityScore || 0,
          cost: response.costEstimate || 0
        };

        results.push(result);
        
        console.log(`  ✅ Sucesso: ${result.responseTime}ms, Score: ${result.qualityScore}/100`);
      } catch (error) {
        const result: TestResult = {
          provider,
          success: false,
          responseTime: Date.now() - startTime,
          qualityScore: 0,
          cost: 0,
          error: error.message
        };

        results.push(result);
        console.log(`  ❌ Erro: ${error.message}`);
      }
    }

    // Summary
    console.log('\n📋 Resumo dos Resultados:');
    results.sort((a, b) => b.qualityScore - a.qualityScore);
    
    results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      console.log(`  ${index + 1}. ${status} ${result.provider} - ${result.qualityScore}/100 (${result.responseTime}ms)`);
    });
  }

  private async testModelComparison(): Promise<void> {
    console.log('\n🏆 Teste 2: Comparação de Modelos');
    console.log('-'.repeat(50));

    try {
      const testQuery = "Qual é a altura máxima no bairro Cidade Baixa?";
      const comparisons = await multiLLMService.compareModels(testQuery, 'citizen');

      console.log(`Comparando ${comparisons.length} modelos:`);
      
      comparisons.forEach((comp, index) => {
        console.log(`  ${index + 1}. ${comp.provider}`);
        console.log(`     Qualidade: ${comp.qualityScore}/100`);
        console.log(`     Tempo: ${comp.executionTime}ms`);
        console.log(`     Custo: $${comp.costEstimate?.toFixed(4) || '0.0000'}`);
        console.log(`     Confiança: ${(comp.confidence * 100).toFixed(1)}%`);
        console.log('');
      });

      // Find best performers
      const fastest = comparisons.reduce((prev, curr) => 
        prev.executionTime < curr.executionTime ? prev : curr
      );
      const highestQuality = comparisons.reduce((prev, curr) => 
        (prev.qualityScore || 0) > (curr.qualityScore || 0) ? prev : curr
      );
      const cheapest = comparisons.reduce((prev, curr) => 
        (prev.costEstimate || 0) < (curr.costEstimate || 0) ? prev : curr
      );

      console.log('🥇 Destaques:');
      console.log(`  Mais rápido: ${fastest.provider} (${fastest.executionTime}ms)`);
      console.log(`  Melhor qualidade: ${highestQuality.provider} (${highestQuality.qualityScore}/100)`);
      console.log(`  Mais econômico: ${cheapest.provider} ($${cheapest.costEstimate?.toFixed(4)})`);

    } catch (error) {
      console.log(`❌ Erro na comparação: ${error.message}`);
    }
  }

  private async testIntelligentSelection(): Promise<void> {
    console.log('\n🧠 Teste 3: Seleção Inteligente de Modelo');
    console.log('-'.repeat(50));

    const testCases = [
      { query: "Resposta rápida: qual a ZOT do Centro?", criteria: 'speed' as const },
      { query: "Análise detalhada das regras de aproveitamento na ZOT 8.3 com comparação histórica e implicações urbanísticas", criteria: 'quality' as const },
      { query: "Informação básica sobre altura", criteria: 'cost' as const }
    ];

    for (const testCase of testCases) {
      console.log(`\nTestando para ${testCase.criteria}:`);
      console.log(`Query: "${testCase.query}"`);

      try {
        const bestModel = await multiLLMService.getBestModel(testCase.query, testCase.criteria);
        console.log(`  🎯 Modelo recomendado: ${bestModel}`);

        // Test the recommendation
        const response = await multiLLMService.processMessage(
          testCase.query,
          bestModel,
          'citizen'
        );

        console.log(`  📊 Resultado: ${response.qualityScore}/100 em ${response.executionTime}ms`);
      } catch (error) {
        console.log(`  ❌ Erro: ${error.message}`);
      }
    }
  }

  private async testMetricsCollection(): Promise<void> {
    console.log('\n📈 Teste 4: Coleta de Métricas');
    console.log('-'.repeat(50));

    try {
      // Simulate some usage data
      console.log('Simulando dados de uso...');
      
      const providers: LLMProvider[] = ['openai', 'claude', 'gemini'];
      
      for (const provider of providers) {
        const performance = await llmMetricsService.getModelPerformance(provider, 1);
        
        if (performance.length > 0) {
          const perf = performance[0];
          console.log(`\n${provider}:`);
          console.log(`  Tempo médio: ${perf.averageResponseTime.toFixed(0)}ms`);
          console.log(`  Qualidade média: ${perf.averageQualityScore.toFixed(1)}/100`);
          console.log(`  Custo médio: $${perf.averageCost.toFixed(4)}`);
          console.log(`  Taxa de sucesso: ${perf.successRate.toFixed(1)}%`);
          console.log(`  Total de requests: ${perf.totalRequests}`);
        } else {
          console.log(`\n${provider}: Sem dados disponíveis`);
        }
      }

      // Overall comparison
      console.log('\n🏁 Comparação Geral:');
      const comparison = await llmMetricsService.compareModels(7);
      
      console.log(`  🚀 Mais rápido: ${comparison.bestForSpeed.provider} (${comparison.bestForSpeed.averageResponseTime.toFixed(0)}ms)`);
      console.log(`  🏆 Melhor qualidade: ${comparison.bestForQuality.provider} (${comparison.bestForQuality.averageQualityScore.toFixed(1)}/100)`);
      console.log(`  💰 Mais econômico: ${comparison.bestForCost.provider} ($${comparison.bestForCost.averageCost.toFixed(4)})`);
      console.log(`  ⭐ Recomendado: ${comparison.recommendedModel.provider}`);

    } catch (error) {
      console.log(`❌ Erro na coleta de métricas: ${error.message}`);
    }
  }

  private async testCostAnalysis(): Promise<void> {
    console.log('\n💰 Teste 5: Análise de Custos');
    console.log('-'.repeat(50));

    const testQuery = "Análise completa dos parâmetros urbanísticos do bairro Moinhos de Vento, incluindo todas as ZOTs, coeficientes de aproveitamento, alturas máximas, recuos obrigatórios e comparação com bairros adjacentes.";
    
    console.log('Testando query longa para análise de custos...');
    console.log(`Comprimento: ${testQuery.length} caracteres`);

    const costProviders: LLMProvider[] = ['claude-3-haiku', 'claude-3-sonnet', 'claude-3-opus'];
    const results: Array<{provider: LLMProvider; cost: number; quality: number; time: number}> = [];

    for (const provider of costProviders) {
      try {
        const startTime = Date.now();
        const response = await multiLLMService.processMessage(testQuery, provider, 'analyst');
        const endTime = Date.now();

        results.push({
          provider,
          cost: response.costEstimate || 0,
          quality: response.qualityScore || 0,
          time: endTime - startTime
        });

        console.log(`\n${provider}:`);
        console.log(`  Custo estimado: $${(response.costEstimate || 0).toFixed(4)}`);
        console.log(`  Qualidade: ${response.qualityScore}/100`);
        console.log(`  Tempo: ${endTime - startTime}ms`);
        
      } catch (error) {
        console.log(`\n${provider}: ❌ ${error.message}`);
      }
    }

    // Cost-benefit analysis
    if (results.length > 0) {
      console.log('\n📊 Análise Custo-Benefício:');
      
      results.forEach(result => {
        const costBenefit = result.quality / (result.cost * 1000); // Quality per cent
        console.log(`  ${result.provider}: ${costBenefit.toFixed(1)} pontos de qualidade por centavo`);
      });
      
      const bestValue = results.reduce((prev, curr) => {
        const prevRatio = prev.quality / (prev.cost * 1000);
        const currRatio = curr.quality / (curr.cost * 1000);
        return currRatio > prevRatio ? curr : prev;
      });
      
      console.log(`\n🏆 Melhor custo-benefício: ${bestValue.provider}`);
    }
  }

  async runQuickTest(): Promise<void> {
    console.log('⚡ Teste Rápido do Sistema Multi-LLM');
    console.log('=' .repeat(40));

    const testQuery = "Qual é a altura máxima no Centro de Porto Alegre?";
    const testProvider: LLMProvider = 'openai';

    try {
      console.log(`Testando: "${testQuery}"`);
      console.log(`Provedor: ${testProvider}`);
      
      const startTime = Date.now();
      const response = await multiLLMService.processMessage(testQuery, testProvider, 'citizen');
      const endTime = Date.now();

      console.log('\n✅ Resposta recebida:');
      console.log(`  Tempo: ${endTime - startTime}ms`);
      console.log(`  Qualidade: ${response.qualityScore}/100`);
      console.log(`  Confiança: ${(response.confidence * 100).toFixed(1)}%`);
      console.log(`  Custo: $${(response.costEstimate || 0).toFixed(4)}`);
      console.log(`  Comprimento: ${response.response.length} caracteres`);
      
      if (response.metrics) {
        console.log('\n📊 Métricas detalhadas:');
        console.log(`  Tokens de entrada: ${response.metrics.inputTokens}`);
        console.log(`  Tokens de saída: ${response.metrics.outputTokens}`);
        console.log(`  Tokens/segundo: ${response.metrics.tokensPerSecond.toFixed(1)}`);
      }

    } catch (error) {
      console.log(`❌ Erro: ${error.message}`);
    }
  }

  async benchmarkLatency(): Promise<void> {
    console.log('⚡ Benchmark de Latência');
    console.log('=' .repeat(30));

    try {
      const results = await llmMetricsService.benchmarkAllModels();
      
      console.log('Resultados do benchmark:');
      Object.entries(results)
        .sort(([,a], [,b]) => a - b)
        .forEach(([model, latency]) => {
          const status = latency < 1000 ? '🟢' : latency < 2000 ? '🟡' : '🔴';
          console.log(`  ${status} ${model}: ${latency.toFixed(0)}ms`);
        });

    } catch (error) {
      console.log(`❌ Erro no benchmark: ${error.message}`);
    }
  }
}

// Main execution
async function main() {
  const tester = new MultiLLMSystemTester();
  
  const args = process.argv.slice(2);
  const testType = args[0] || 'quick';

  switch (testType) {
    case 'full':
      await tester.runComprehensiveTest();
      break;
    case 'benchmark':
      await tester.benchmarkLatency();
      break;
    case 'quick':
    default:
      await tester.runQuickTest();
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { MultiLLMSystemTester };