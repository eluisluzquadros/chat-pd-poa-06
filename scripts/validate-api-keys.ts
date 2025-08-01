#!/usr/bin/env node

/**
 * 🔑 Script de Validação de API Keys
 * 
 * Valida todas as API keys necessárias para o sistema RAG Multi-LLM
 * Testa conectividade, permissões e modelos disponíveis
 */

import { config } from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';

// Carrega variáveis de ambiente
config({ path: '.env.local' });

interface ValidationResult {
  provider: string;
  status: 'success' | 'error' | 'warning' | 'missing';
  message: string;
  details?: any;
  models?: string[];
  cost?: number;
  rateLimit?: number;
}

interface ApiKeyConfig {
  name: string;
  envVar: string;
  required: boolean;
  testEndpoint?: string;
  headers?: (key: string) => Record<string, string>;
  testPayload?: any;
  validateResponse?: (response: any) => boolean;
  models?: string[];
}

class ApiKeyValidator {
  private results: ValidationResult[] = [];
  private providers: ApiKeyConfig[] = [
    {
      name: 'OpenAI',
      envVar: 'OPENAI_API_KEY',
      required: true,
      testEndpoint: 'https://api.openai.com/v1/models',
      headers: (key) => ({ 'Authorization': `Bearer ${key}` }),
      validateResponse: (res) => res.data && Array.isArray(res.data),
      models: ['gpt-4o-mini', 'gpt-4-turbo-preview', 'text-embedding-3-large']
    },
    {
      name: 'Anthropic Claude',
      envVar: 'CLAUDE_API_KEY',
      required: true,
      testEndpoint: 'https://api.anthropic.com/v1/messages',
      headers: (key) => ({
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      }),
      testPayload: {
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hello' }]
      },
      validateResponse: (res) => res.content && Array.isArray(res.content),
      models: ['claude-3-opus-20240229', 'claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307']
    },
    {
      name: 'Google Gemini',
      envVar: 'GEMINI_API_KEY',
      required: true,
      testEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
      headers: () => ({}),
      validateResponse: (res) => res.models && Array.isArray(res.models),
      models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.5-pro-vision']
    },
    {
      name: 'Groq',
      envVar: 'GROQ_API_KEY',
      required: false,
      testEndpoint: 'https://api.groq.com/openai/v1/models',
      headers: (key) => ({ 'Authorization': `Bearer ${key}` }),
      validateResponse: (res) => res.data && Array.isArray(res.data),
      models: ['mixtral-8x7b-32768', 'llama3.1-70b-versatile', 'llama3.1-8b-instant']
    },
    {
      name: 'DeepSeek',
      envVar: 'DEEPSEEK_API_KEY',
      required: false,
      testEndpoint: 'https://api.deepseek.com/v1/models',
      headers: (key) => ({ 'Authorization': `Bearer ${key}` }),
      validateResponse: (res) => res.data && Array.isArray(res.data),
      models: ['deepseek-coder', 'deepseek-chat']
    },
    {
      name: 'Hugging Face',
      envVar: 'HUGGINGFACE_API_TOKEN',
      required: false,
      testEndpoint: 'https://huggingface.co/api/whoami',
      headers: (key) => ({ 'Authorization': `Bearer ${key}` }),
      validateResponse: (res) => res.name || res.id,
      models: ['llama-3.1-8b', 'codellama-13b']
    }
  ];

  async validateAll(): Promise<void> {
    console.log('🔑 Iniciando validação de API Keys...\n');

    // Verificar se arquivo .env.local existe
    if (!existsSync('.env.local')) {
      console.log('❌ Arquivo .env.local não encontrado!');
      console.log('💡 Execute: cp .env.example .env.local\n');
      return;
    }

    for (const provider of this.providers) {
      await this.validateProvider(provider);
    }

    this.printSummary();
    this.checkCriticalIssues();
  }

  async validateProvider(provider: ApiKeyConfig): Promise<void> {
    const key = process.env[provider.envVar];
    
    if (!key) {
      this.results.push({
        provider: provider.name,
        status: provider.required ? 'error' : 'warning',
        message: provider.required ? 'API key obrigatória não encontrada' : 'API key opcional não configurada'
      });
      return;
    }

    console.log(`🔍 Validando ${provider.name}...`);

    try {
      if (provider.testEndpoint) {
        const isValid = await this.testApiConnection(provider, key);
        if (isValid) {
          this.results.push({
            provider: provider.name,
            status: 'success',
            message: 'API key válida e funcional',
            models: provider.models,
            rateLimit: this.getRateLimit(provider.name)
          });
        }
      } else {
        // Validação básica sem teste de conexão
        this.results.push({
          provider: provider.name,
          status: 'success',
          message: 'API key configurada (não testada)',
          models: provider.models
        });
      }
    } catch (error: any) {
      this.results.push({
        provider: provider.name,
        status: 'error',
        message: `Erro na validação: ${error.message}`,
        details: error.response?.data || error.message
      });
    }
  }

  async testApiConnection(provider: ApiKeyConfig, key: string): Promise<boolean> {
    if (!provider.testEndpoint || !provider.headers) return false;

    try {
      const headers = provider.headers(key);
      const url = provider.name === 'Google Gemini' 
        ? `${provider.testEndpoint}?key=${key}`
        : provider.testEndpoint;

      const options: RequestInit = {
        method: provider.testPayload ? 'POST' : 'GET',
        headers,
        ...(provider.testPayload && { body: JSON.stringify(provider.testPayload) })
      };

      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (provider.validateResponse) {
        return provider.validateResponse(data);
      }
      
      return true;
    } catch (error: any) {
      throw new Error(`Falha na conexão: ${error.message}`);
    }
  }

  getRateLimit(providerName: string): number {
    const rateLimits: Record<string, number> = {
      'OpenAI': parseInt(process.env.OPENAI_RATE_LIMIT || '3500'),
      'Anthropic Claude': parseInt(process.env.CLAUDE_RATE_LIMIT || '1000'),
      'Google Gemini': parseInt(process.env.GEMINI_RATE_LIMIT || '1500'),
      'Groq': parseInt(process.env.GROQ_RATE_LIMIT || '30000'),
      'DeepSeek': parseInt(process.env.DEEPSEEK_RATE_LIMIT || '1000'),
      'Hugging Face': parseInt(process.env.HUGGINGFACE_RATE_LIMIT || '1000')
    };
    return rateLimits[providerName] || 1000;
  }

  printSummary(): void {
    console.log('\n📊 RESUMO DA VALIDAÇÃO\n');
    console.log('='.repeat(60));

    const successful = this.results.filter(r => r.status === 'success');
    const errors = this.results.filter(r => r.status === 'error');
    const warnings = this.results.filter(r => r.status === 'warning');
    const missing = this.results.filter(r => r.status === 'missing');

    console.log(`✅ Funcionando: ${successful.length}`);
    console.log(`❌ Com erro: ${errors.length}`);
    console.log(`⚠️  Avisos: ${warnings.length}`);
    console.log(`❓ Não configurado: ${missing.length}`);
    console.log('='.repeat(60));

    this.results.forEach(result => {
      const icon = this.getStatusIcon(result.status);
      console.log(`${icon} ${result.provider}: ${result.message}`);
      
      if (result.models && result.models.length > 0) {
        console.log(`   📚 Modelos: ${result.models.slice(0, 3).join(', ')}${result.models.length > 3 ? '...' : ''}`);
      }
      
      if (result.rateLimit) {
        console.log(`   ⚡ Rate limit: ${result.rateLimit}/min`);
      }
      
      if (result.details && result.status === 'error') {
        console.log(`   🔍 Detalhes: ${JSON.stringify(result.details, null, 2)}`);
      }
      console.log();
    });
  }

  getStatusIcon(status: string): string {
    const icons = {
      'success': '✅',
      'error': '❌',
      'warning': '⚠️',
      'missing': '❓'
    };
    return icons[status] || '❓';
  }

  checkCriticalIssues(): void {
    const criticalErrors = this.results.filter(r => 
      r.status === 'error' && 
      ['OpenAI', 'Anthropic Claude', 'Google Gemini'].includes(r.provider)
    );

    if (criticalErrors.length > 0) {
      console.log('🚨 PROBLEMAS CRÍTICOS ENCONTRADOS:\n');
      criticalErrors.forEach(error => {
        console.log(`❌ ${error.provider}: ${error.message}`);
      });
      console.log('\n💡 Configure pelo menos um LLM principal para o sistema funcionar.');
      process.exit(1);
    }

    // Verificar configurações importantes
    this.checkEnvironmentConfig();
    
    console.log('🎉 Validação concluída com sucesso!');
    console.log('💡 Execute "npm run test-llm-connections" para testar as conexões.');
  }

  checkEnvironmentConfig(): void {
    console.log('\n🔧 VERIFICANDO CONFIGURAÇÕES ADICIONAIS:\n');

    const configs = [
      { key: 'SUPABASE_SERVICE_ROLE_KEY', name: 'Supabase Service Role', required: true },
      { key: 'MAX_DAILY_COST_USD', name: 'Limite de custo diário', required: false },
      { key: 'DEFAULT_LLM_PROVIDER', name: 'Provider padrão', required: true },
      { key: 'ENABLE_LLM_CACHE', name: 'Cache habilitado', required: false },
      { key: 'LOG_LEVEL', name: 'Nível de log', required: false }
    ];

    configs.forEach(config => {
      const value = process.env[config.key];
      if (value) {
        console.log(`✅ ${config.name}: ${value}`);
      } else if (config.required) {
        console.log(`❌ ${config.name}: Não configurado (obrigatório)`);
      } else {
        console.log(`⚠️  ${config.name}: Usando padrão`);
      }
    });
  }

  async validateSpecificProvider(providerName: string): Promise<void> {
    const provider = this.providers.find(p => 
      p.name.toLowerCase().includes(providerName.toLowerCase())
    );

    if (!provider) {
      console.log(`❌ Provider "${providerName}" não encontrado.`);
      console.log('📚 Providers disponíveis:', this.providers.map(p => p.name).join(', '));
      return;
    }

    console.log(`🔍 Validando apenas ${provider.name}...\n`);
    await this.validateProvider(provider);
    
    const result = this.results[0];
    const icon = this.getStatusIcon(result.status);
    console.log(`${icon} ${result.provider}: ${result.message}`);
    
    if (result.details) {
      console.log('🔍 Detalhes:', JSON.stringify(result.details, null, 2));
    }
  }
}

// Executar validação
async function main() {
  const validator = new ApiKeyValidator();
  const args = process.argv.slice(2);
  
  if (args.includes('--provider') && args[args.indexOf('--provider') + 1]) {
    const providerName = args[args.indexOf('--provider') + 1];
    await validator.validateSpecificProvider(providerName);
  } else {
    await validator.validateAll();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { ApiKeyValidator };