#!/usr/bin/env node

/**
 * 🧪 Script de Teste de Conexões LLM
 * 
 * Testa conectividade, latência e funcionalidade de todos os LLMs configurados
 * Inclui testes de performance, custo e qualidade de resposta
 */

import { config } from 'dotenv';
import { writeFileSync } from 'fs';

// Carrega variáveis de ambiente
config({ path: '.env.local' });

interface TestResult {
  provider: string;
  model: string;
  status: 'success' | 'error' | 'timeout';
  responseTime: number;
  tokenCount: number;
  costEstimate: number;
  qualityScore: number;
  errorMessage?: string;
  response?: string;
}

interface PerformanceMetrics {
  averageResponseTime: number;
  tokensPerSecond: number;
  successRate: number;
  totalCost: number;
}

class LLMConnectionTester {
  private results: TestResult[] = [];
  private testMessage = "Olá! Este é um teste de conectividade. Responda com exatamente: 'Teste bem-sucedido!'";
  
  private providers = [
    {
      name: 'OpenAI GPT-4',
      model: 'gpt-4o-mini',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      headers: () => ({
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }),
      payload: () => ({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: this.testMessage }],
        max_tokens: 50,
        temperature: 0.1
      }),
      parseResponse: (data: any) => data.choices[0].message.content,
      costPerToken: { input: 0.00015, output: 0.0006 }
    },
    {
      name: 'Claude 3.5 Sonnet',
      model: 'claude-3-5-sonnet-20241022',
      endpoint: 'https://api.anthropic.com/v1/messages',
      headers: () => ({
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      }),
      payload: () => ({
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: this.testMessage }],
        max_tokens: 50
      }),
      parseResponse: (data: any) => data.content[0].text,
      costPerToken: { input: 0.003, output: 0.015 }
    },
    {
      name: 'Google Gemini Pro',
      model: 'gemini-1.5-pro',
      endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
      headers: () => ({
        'Content-Type': 'application/json'
      }),
      payload: () => ({
        contents: [{
          parts: [{ text: this.testMessage }]
        }],
        generationConfig: {
          maxOutputTokens: 50,
          temperature: 0.1
        }
      }),
      parseResponse: (data: any) => data.candidates[0].content.parts[0].text,
      costPerToken: { input: 0.00125, output: 0.005 }
    },
    {
      name: 'Groq Mixtral',
      model: 'mixtral-8x7b-32768',
      endpoint: 'https://api.groq.com/openai/v1/chat/completions',
      headers: () => ({
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      }),
      payload: () => ({
        model: 'mixtral-8x7b-32768',
        messages: [{ role: 'user', content: this.testMessage }],
        max_tokens: 50,
        temperature: 0.1
      }),
      parseResponse: (data: any) => data.choices[0].message.content,
      costPerToken: { input: 0.00027, output: 0.00027 }
    },
    {
      name: 'DeepSeek Coder',
      model: 'deepseek-coder',
      endpoint: 'https://api.deepseek.com/v1/chat/completions',
      headers: () => ({
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      }),
      payload: () => ({
        model: 'deepseek-coder',
        messages: [{ role: 'user', content: this.testMessage }],
        max_tokens: 50,
        temperature: 0.1
      }),
      parseResponse: (data: any) => data.choices[0].message.content,
      costPerToken: { input: 0.00014, output: 0.00028 }
    }
  ];

  async testAll(): Promise<void> {
    console.log('🧪 Iniciando testes de conectividade LLM...\n');
    console.log(`📝 Mensagem de teste: "${this.testMessage}"\n`);

    const promises = this.providers.map(provider => this.testProvider(provider));
    await Promise.all(promises);

    this.printResults();
    this.generateReport();
    this.printRecommendations();
  }

  async testProvider(provider: any): Promise<void> {
    const requiredEnvVar = this.getRequiredEnvVar(provider.name);
    if (!process.env[requiredEnvVar]) {
      this.results.push({
        provider: provider.name,
        model: provider.model,
        status: 'error',
        responseTime: 0,
        tokenCount: 0,
        costEstimate: 0,
        qualityScore: 0,
        errorMessage: `API key não configurada (${requiredEnvVar})`
      });
      return;
    }

    console.log(`🔍 Testando ${provider.name}...`);

    try {
      const startTime = Date.now();
      
      const response = await Promise.race([
        fetch(provider.endpoint, {
          method: 'POST',
          headers: provider.headers(),
          body: JSON.stringify(provider.payload())
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 30000)
        )
      ]);

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const responseContent = provider.parseResponse(data);
      
      const tokenCount = this.estimateTokens(this.testMessage + responseContent);
      const costEstimate = this.calculateCost(tokenCount, provider.costPerToken);
      const qualityScore = this.calculateQualityScore(responseContent);

      this.results.push({
        provider: provider.name,
        model: provider.model,
        status: 'success',
        responseTime,
        tokenCount,
        costEstimate,
        qualityScore,
        response: responseContent
      });

      console.log(`✅ ${provider.name}: ${responseTime}ms, Score: ${qualityScore}%`);

    } catch (error: any) {
      const status = error.message === 'Timeout' ? 'timeout' : 'error';
      
      this.results.push({
        provider: provider.name,
        model: provider.model,
        status,
        responseTime: 0,
        tokenCount: 0,
        costEstimate: 0,
        qualityScore: 0,
        errorMessage: error.message
      });

      console.log(`❌ ${provider.name}: ${error.message}`);
    }
  }

  getRequiredEnvVar(providerName: string): string {
    const mapping: Record<string, string> = {
      'OpenAI GPT-4': 'OPENAI_API_KEY',
      'Claude 3.5 Sonnet': 'CLAUDE_API_KEY',
      'Google Gemini Pro': 'GEMINI_API_KEY',
      'Groq Mixtral': 'GROQ_API_KEY',
      'DeepSeek Coder': 'DEEPSEEK_API_KEY'
    };
    return mapping[providerName] || 'UNKNOWN';
  }

  estimateTokens(text: string): number {
    // Estimativa aproximada: 1 token ≈ 4 caracteres
    return Math.ceil(text.length / 4);
  }

  calculateCost(tokens: number, pricing: { input: number; output: number }): number {
    // Assume metade input, metade output
    const inputTokens = Math.ceil(tokens * 0.4);
    const outputTokens = Math.floor(tokens * 0.6);
    return (inputTokens * pricing.input + outputTokens * pricing.output) / 1000;
  }

  calculateQualityScore(response: string): number {
    let score = 50; // Base score
    
    // Check if response contains expected text
    if (response.toLowerCase().includes('teste bem-sucedido')) {
      score += 40;
    }
    
    // Check response quality indicators
    if (response.length > 5 && response.length < 200) score += 10;
    if (response.includes('!')) score += 5;
    if (!response.includes('error') && !response.includes('Error')) score += 5;
    
    return Math.min(100, score);
  }

  printResults(): void {
    console.log('\n📊 RESULTADOS DOS TESTES\n');
    console.log('='.repeat(80));

    const successful = this.results.filter(r => r.status === 'success');
    const failed = this.results.filter(r => r.status === 'error');
    const timeouts = this.results.filter(r => r.status === 'timeout');

    console.log(`✅ Sucesso: ${successful.length}`);
    console.log(`❌ Falhas: ${failed.length}`);
    console.log(`⏱️  Timeouts: ${timeouts.length}`);
    console.log('='.repeat(80));

    // Ordenar por qualidade e velocidade
    const sortedResults = [...this.results].sort((a, b) => {
      if (a.status !== 'success' && b.status === 'success') return 1;
      if (a.status === 'success' && b.status !== 'success') return -1;
      return (b.qualityScore * 0.7 + (10000 / Math.max(b.responseTime, 1)) * 0.3) - 
             (a.qualityScore * 0.7 + (10000 / Math.max(a.responseTime, 1)) * 0.3);
    });

    sortedResults.forEach((result, index) => {
      const icon = this.getStatusIcon(result.status);
      const rank = result.status === 'success' ? `#${index + 1}` : '   ';
      
      console.log(`${rank} ${icon} ${result.provider.padEnd(20)} (${result.model})`);
      
      if (result.status === 'success') {
        console.log(`    ⚡ Tempo: ${result.responseTime}ms`);
        console.log(`    📊 Qualidade: ${result.qualityScore}%`);
        console.log(`    🪙 Tokens: ${result.tokenCount}`);
        console.log(`    💰 Custo: $${result.costEstimate.toFixed(6)}`);
        console.log(`    📝 Resposta: "${result.response?.substring(0, 50)}${result.response && result.response.length > 50 ? '...' : ''}"`);
      } else {
        console.log(`    ❌ Erro: ${result.errorMessage}`);
      }
      console.log();
    });
  }

  getStatusIcon(status: string): string {
    const icons = {
      'success': '✅',
      'error': '❌',
      'timeout': '⏱️'
    };
    return icons[status] || '❓';
  }

  generateReport(): void {
    const successful = this.results.filter(r => r.status === 'success');
    
    if (successful.length === 0) {
      console.log('⚠️  Nenhum LLM funcionando. Verifique as configurações.');
      return;
    }

    const metrics = this.calculateMetrics(successful);
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalProviders: this.results.length,
        successfulProviders: successful.length,
        failedProviders: this.results.length - successful.length
      },
      metrics,
      results: this.results,
      recommendations: this.generateRecommendations(successful)
    };

    writeFileSync('./llm-test-report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Relatório detalhado salvo em: llm-test-report.json');
  }

  calculateMetrics(successful: TestResult[]): PerformanceMetrics {
    return {
      averageResponseTime: successful.reduce((sum, r) => sum + r.responseTime, 0) / successful.length,
      tokensPerSecond: successful.length > 0 ? 
        successful.reduce((sum, r) => sum + (r.tokenCount / (r.responseTime / 1000)), 0) / successful.length : 0,
      successRate: (successful.length / this.results.length) * 100,
      totalCost: successful.reduce((sum, r) => sum + r.costEstimate, 0)
    };
  }

  generateRecommendations(successful: TestResult[]): string[] {
    const recommendations: string[] = [];
    
    if (successful.length === 0) {
      recommendations.push('❌ Nenhum LLM funcionando - configure pelo menos uma API key');
      return recommendations;
    }

    // Recomendação de velocidade
    const fastest = successful.reduce((prev, curr) => 
      prev.responseTime < curr.responseTime ? prev : curr
    );
    recommendations.push(`⚡ Mais rápido: ${fastest.provider} (${fastest.responseTime}ms)`);

    // Recomendação de qualidade
    const bestQuality = successful.reduce((prev, curr) => 
      prev.qualityScore > curr.qualityScore ? prev : curr
    );
    recommendations.push(`🎯 Melhor qualidade: ${bestQuality.provider} (${bestQuality.qualityScore}%)`);

    // Recomendação de custo
    const cheapest = successful.reduce((prev, curr) => 
      prev.costEstimate < curr.costEstimate ? prev : curr
    );
    recommendations.push(`💰 Mais econômico: ${cheapest.provider} ($${cheapest.costEstimate.toFixed(6)})`);

    // Recomendação geral
    const balanced = successful.reduce((prev, curr) => {
      const prevScore = prev.qualityScore * 0.4 + (10000 / prev.responseTime) * 0.3 + (1 / prev.costEstimate) * 0.3;
      const currScore = curr.qualityScore * 0.4 + (10000 / curr.responseTime) * 0.3 + (1 / curr.costEstimate) * 0.3;
      return prevScore > currScore ? prev : curr;
    });
    recommendations.push(`🏆 Recomendado (equilibrado): ${balanced.provider}`);

    return recommendations;
  }

  printRecommendations(): void {
    const successful = this.results.filter(r => r.status === 'success');
    const recommendations = this.generateRecommendations(successful);
    
    console.log('\n🎯 RECOMENDAÇÕES\n');
    console.log('='.repeat(60));
    recommendations.forEach(rec => console.log(rec));
    
    if (successful.length > 0) {
      console.log('\n💡 PRÓXIMOS PASSOS:');
      console.log('1. Configure o modelo recomendado como padrão no .env.local');
      console.log('2. Execute "npm run deploy-env" para atualizar o Supabase');
      console.log('3. Monitore custos e performance em produção');
    } else {
      console.log('\n🚨 AÇÃO NECESSÁRIA:');
      console.log('1. Configure pelo menos uma API key no .env.local');
      console.log('2. Execute "npm run validate-keys" para verificar');
      console.log('3. Reexecute este teste');
    }
  }

  async testSpecificProvider(providerName: string): Promise<void> {
    const provider = this.providers.find(p => 
      p.name.toLowerCase().includes(providerName.toLowerCase())
    );

    if (!provider) {
      console.log(`❌ Provider "${providerName}" não encontrado.`);
      console.log('📚 Providers disponíveis:', this.providers.map(p => p.name).join(', '));
      return;
    }

    console.log(`🎯 Testando apenas ${provider.name}...\n`);
    await this.testProvider(provider);
    
    const result = this.results[0];
    const icon = this.getStatusIcon(result.status);
    console.log(`${icon} ${result.provider}: ${result.status}`);
    
    if (result.status === 'success') {
      console.log(`⚡ Tempo: ${result.responseTime}ms`);
      console.log(`📊 Qualidade: ${result.qualityScore}%`);
      console.log(`💰 Custo: $${result.costEstimate.toFixed(6)}`);
      console.log(`📝 Resposta: "${result.response}"`);
    } else {
      console.log(`❌ Erro: ${result.errorMessage}`);
    }
  }

  async benchmarkPerformance(): Promise<void> {
    console.log('🏃 Executando benchmark de performance...\n');
    
    const testCases = [
      { name: 'Resposta Curta', message: 'Diga apenas "OK"', expectedTokens: 5 },
      { name: 'Resposta Média', message: 'Explique em 50 palavras o que é inteligência artificial.', expectedTokens: 70 },
      { name: 'Resposta Longa', message: 'Escreva um parágrafo sobre os benefícios da energia renovável.', expectedTokens: 150 }
    ];

    for (const testCase of testCases) {
      console.log(`📝 Teste: ${testCase.name}`);
      this.testMessage = testCase.message;
      this.results = []; // Reset results
      
      await this.testAll();
      console.log('\n' + '='.repeat(40) + '\n');
    }
  }
}

// Executar testes
async function main() {
  try {
    const tester = new LLMConnectionTester();
    const args = process.argv.slice(2);
    
    if (args.includes('--provider') && args[args.indexOf('--provider') + 1]) {
      const providerName = args[args.indexOf('--provider') + 1];
      await tester.testSpecificProvider(providerName);
    } else if (args.includes('--benchmark')) {
      await tester.benchmarkPerformance();
    } else {
      await tester.testAll();
    }
    
  } catch (error: any) {
    console.error('❌ Erro nos testes:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { LLMConnectionTester };