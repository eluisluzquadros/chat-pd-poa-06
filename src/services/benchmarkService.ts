import { supabase } from '@/lib/supabase';

export interface ModelConfig {
  provider: 'openai' | 'anthropic' | 'google' | 'deepseek' | 'zhipuai';
  model: string;
  costPerInputToken: number;
  costPerOutputToken: number;
  maxTokens: number;
  averageLatency?: number;
}

export interface TestCase {
  id: string;
  query: string;
  expectedKeywords: string[];
  category: string;
  complexity: 'simple' | 'medium' | 'high';
  minResponseLength?: number;
}

export interface BenchmarkResult {
  testCaseId: string;
  modelConfig: ModelConfig;
  success: boolean;
  responseTime: number;
  response?: string;
  confidence?: number;
  qualityScore: number;
  inputTokens?: number;
  outputTokens?: number;
  totalCost?: number;
  error?: string;
}

export interface BenchmarkSummary {
  model: string;
  provider: string;
  avgResponseTime: number;
  avgQualityScore: number;
  successRate: number;
  avgCostPerQuery: number;
  totalCost: number;
  recommendation: string;
}

// Configurações dos modelos disponíveis
export const MODEL_CONFIGS: ModelConfig[] = [
  // OpenAI
  {
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    costPerInputToken: 0.0015 / 1000,
    costPerOutputToken: 0.002 / 1000,
    maxTokens: 4096,
    averageLatency: 1500
  },
  {
    provider: 'openai',
    model: 'gpt-3.5-turbo-16k',
    costPerInputToken: 0.003 / 1000,
    costPerOutputToken: 0.004 / 1000,
    maxTokens: 16384,
    averageLatency: 2000
  },
  {
    provider: 'openai',
    model: 'gpt-4',
    costPerInputToken: 0.03 / 1000,
    costPerOutputToken: 0.06 / 1000,
    maxTokens: 8192,
    averageLatency: 5000
  },
  // Anthropic
  {
    provider: 'anthropic',
    model: 'claude-3-haiku-20240307',
    costPerInputToken: 0.00025 / 1000,
    costPerOutputToken: 0.00125 / 1000,
    maxTokens: 4096,
    averageLatency: 1000
  },
  {
    provider: 'anthropic',
    model: 'claude-3-sonnet-20240229',
    costPerInputToken: 0.003 / 1000,
    costPerOutputToken: 0.015 / 1000,
    maxTokens: 4096,
    averageLatency: 2500
  },
  // Google
  {
    provider: 'google',
    model: 'gemini-pro',
    costPerInputToken: 0.00025 / 1000,
    costPerOutputToken: 0.00125 / 1000,
    maxTokens: 30720,
    averageLatency: 2000
  },
  // DeepSeek
  {
    provider: 'deepseek',
    model: 'deepseek-chat',
    costPerInputToken: 0.0001 / 1000,
    costPerOutputToken: 0.0002 / 1000,
    maxTokens: 4096,
    averageLatency: 1500
  }
];

// Casos de teste padrão
export const DEFAULT_TEST_CASES: TestCase[] = [
  {
    id: 'greeting_simple',
    query: 'oi',
    expectedKeywords: ['olá', 'assistente', 'plano diretor'],
    category: 'greeting',
    complexity: 'simple',
    minResponseLength: 50
  },
  {
    id: 'zones_specific',
    query: 'Quais são as zonas do Centro Histórico?',
    expectedKeywords: ['ZOT', '08.1', 'Centro Histórico', 'zona'],
    category: 'zone_query',
    complexity: 'medium',
    minResponseLength: 200
  },
  {
    id: 'construction_height',
    query: 'Qual a altura máxima permitida no bairro Petrópolis?',
    expectedKeywords: ['altura', 'metros', 'Petrópolis', 'máxima'],
    category: 'construction_rules',
    complexity: 'medium',
    minResponseLength: 150
  },
  {
    id: 'list_comprehensive',
    query: 'Liste todos os bairros de Porto Alegre',
    expectedKeywords: ['bairros', 'Porto Alegre', 'lista'],
    category: 'comprehensive_list',
    complexity: 'high',
    minResponseLength: 1000
  },
  {
    id: 'conceptual_plano',
    query: 'O que é o Plano Diretor?',
    expectedKeywords: ['plano', 'diretor', 'desenvolvimento', 'urbano', 'município'],
    category: 'conceptual',
    complexity: 'medium',
    minResponseLength: 300
  }
];

export class BenchmarkService {
  // Calcular score de qualidade
  static calculateQualityScore(response: string, testCase: TestCase, confidence?: number): number {
    let score = 0;
    const weights = {
      keywords: 0.3,
      length: 0.2,
      noError: 0.2,
      confidence: 0.2,
      structure: 0.1
    };

    // 1. Palavras-chave (30%)
    const foundKeywords = testCase.expectedKeywords.filter(keyword =>
      response.toLowerCase().includes(keyword.toLowerCase())
    );
    score += (foundKeywords.length / testCase.expectedKeywords.length) * weights.keywords * 100;

    // 2. Comprimento adequado (20%)
    const minLength = testCase.minResponseLength || 100;
    if (response.length >= minLength) {
      score += weights.length * 100;
    } else {
      score += (response.length / minLength) * weights.length * 100;
    }

    // 3. Ausência de erro (20%)
    const errorPhrases = ['versão beta', 'erro', 'desculpe', 'não consigo'];
    const hasError = errorPhrases.some(phrase => 
      response.toLowerCase().includes(phrase)
    );
    if (!hasError) {
      score += weights.noError * 100;
    }

    // 4. Confiança (20%)
    if (confidence) {
      score += confidence * weights.confidence * 100;
    }

    // 5. Estrutura (10%) - verifica formatação
    const hasStructure = response.includes('\n') || response.includes('•') || 
                        response.includes('-') || response.includes('|');
    if (hasStructure) {
      score += weights.structure * 100;
    }

    return Math.min(Math.round(score), 100);
  }

  // Executar teste com um modelo específico
  static async runTestWithModel(
    testCase: TestCase, 
    modelConfig: ModelConfig
  ): Promise<BenchmarkResult> {
    const startTime = Date.now();
    
    try {
      // Aqui seria feita a chamada para a API específica do modelo
      // Por enquanto, vamos simular ou usar o endpoint atual
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: testCase.query,
          model: modelConfig.model,
          provider: modelConfig.provider,
          bypassCache: true
        })
      });

      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        const data = await response.json();
        const qualityScore = this.calculateQualityScore(
          data.response, 
          testCase, 
          data.confidence
        );

        // Estimar tokens (aproximado)
        const inputTokens = Math.ceil(testCase.query.length / 4);
        const outputTokens = Math.ceil(data.response.length / 4);
        const totalCost = (inputTokens * modelConfig.costPerInputToken) + 
                         (outputTokens * modelConfig.costPerOutputToken);

        return {
          testCaseId: testCase.id,
          modelConfig,
          success: true,
          responseTime,
          response: data.response,
          confidence: data.confidence,
          qualityScore,
          inputTokens,
          outputTokens,
          totalCost
        };
      } else {
        return {
          testCaseId: testCase.id,
          modelConfig,
          success: false,
          responseTime,
          qualityScore: 0,
          error: `HTTP ${response.status}`
        };
      }
    } catch (error) {
      return {
        testCaseId: testCase.id,
        modelConfig,
        success: false,
        responseTime: Date.now() - startTime,
        qualityScore: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Executar benchmark completo
  static async runFullBenchmark(
    testCases: TestCase[] = DEFAULT_TEST_CASES,
    models: ModelConfig[] = MODEL_CONFIGS
  ): Promise<{
    results: BenchmarkResult[];
    summaries: BenchmarkSummary[];
  }> {
    const results: BenchmarkResult[] = [];
    
    // Executar cada teste com cada modelo
    for (const model of models) {
      console.log(`Testing model: ${model.provider}/${model.model}`);
      
      for (const testCase of testCases) {
        const result = await this.runTestWithModel(testCase, model);
        results.push(result);
        
        // Pequena pausa para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Gerar sumários por modelo
    const summaries = this.generateSummaries(results, testCases);
    
    // Salvar resultados no banco
    await this.saveResults(results, summaries);
    
    return { results, summaries };
  }

  // Gerar sumários dos resultados
  static generateSummaries(
    results: BenchmarkResult[], 
    testCases: TestCase[]
  ): BenchmarkSummary[] {
    const modelGroups = new Map<string, BenchmarkResult[]>();
    
    // Agrupar por modelo
    results.forEach(result => {
      const key = `${result.modelConfig.provider}/${result.modelConfig.model}`;
      if (!modelGroups.has(key)) {
        modelGroups.set(key, []);
      }
      modelGroups.get(key)!.push(result);
    });

    // Calcular sumários
    const summaries: BenchmarkSummary[] = [];
    
    modelGroups.forEach((modelResults, modelKey) => {
      const [provider, model] = modelKey.split('/');
      const successfulResults = modelResults.filter(r => r.success);
      
      const avgResponseTime = successfulResults.length > 0
        ? successfulResults.reduce((sum, r) => sum + r.responseTime, 0) / successfulResults.length
        : 0;
      
      const avgQualityScore = successfulResults.length > 0
        ? successfulResults.reduce((sum, r) => sum + r.qualityScore, 0) / successfulResults.length
        : 0;
      
      const avgCostPerQuery = successfulResults.length > 0
        ? successfulResults.reduce((sum, r) => sum + (r.totalCost || 0), 0) / successfulResults.length
        : 0;
      
      const totalCost = successfulResults.reduce((sum, r) => sum + (r.totalCost || 0), 0);
      
      const successRate = (successfulResults.length / modelResults.length) * 100;

      // Gerar recomendação
      let recommendation = '';
      if (avgQualityScore >= 80 && avgResponseTime < 3000 && avgCostPerQuery < 0.01) {
        recommendation = 'Excelente para uso geral';
      } else if (avgQualityScore >= 70 && avgCostPerQuery < 0.005) {
        recommendation = 'Bom custo-benefício';
      } else if (avgQualityScore >= 85) {
        recommendation = 'Alta qualidade, considere para queries complexas';
      } else if (avgResponseTime < 2000) {
        recommendation = 'Resposta rápida, bom para queries simples';
      } else {
        recommendation = 'Considere outros modelos';
      }

      summaries.push({
        model,
        provider,
        avgResponseTime,
        avgQualityScore,
        successRate,
        avgCostPerQuery,
        totalCost,
        recommendation
      });
    });

    // Ordenar por score composto (qualidade vs custo)
    summaries.sort((a, b) => {
      const scoreA = (a.avgQualityScore / 100) / (a.avgCostPerQuery + 0.001);
      const scoreB = (b.avgQualityScore / 100) / (b.avgCostPerQuery + 0.001);
      return scoreB - scoreA;
    });

    return summaries;
  }

  // Salvar resultados no banco
  static async saveResults(
    results: BenchmarkResult[],
    summaries: BenchmarkSummary[]
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    
    // Salvar no Supabase
    const { error } = await supabase
      .from('qa_benchmarks')
      .insert({
        timestamp,
        results: JSON.stringify(results),
        summaries: JSON.stringify(summaries),
        metadata: {
          totalTests: results.length,
          modelsEsted: summaries.length,
          testCaseCategories: [...new Set(results.map(r => r.testCaseId))]
        }
      });

    if (error) {
      console.error('Error saving benchmark results:', error);
    }
  }

  // Obter recomendação de modelo baseado no tipo de query
  static getModelRecommendation(
    queryType: string,
    summaries: BenchmarkSummary[]
  ): ModelConfig | null {
    // Lógica de seleção baseada no tipo de query
    let targetModel: BenchmarkSummary | null = null;

    switch (queryType) {
      case 'greeting':
      case 'simple':
        // Para queries simples, priorizar velocidade e custo
        targetModel = summaries.find(s => 
          s.avgResponseTime < 2000 && s.avgCostPerQuery < 0.002
        ) || summaries[0];
        break;
        
      case 'comprehensive_list':
      case 'complex':
        // Para queries complexas, priorizar qualidade
        targetModel = summaries.find(s => 
          s.avgQualityScore > 85
        ) || summaries[0];
        break;
        
      default:
        // Padrão: melhor custo-benefício
        targetModel = summaries[0];
    }

    if (targetModel) {
      return MODEL_CONFIGS.find(m => 
        m.provider === targetModel.provider && m.model === targetModel.model
      ) || null;
    }

    return null;
  }
}