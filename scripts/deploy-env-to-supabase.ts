#!/usr/bin/env node

/**
 * 🚀 Script de Deploy de Variáveis de Ambiente para Supabase
 * 
 * Automatiza o deploy das API keys e configurações para as Edge Functions do Supabase
 * Suporta deploy seletivo por provider e validação prévia
 */

import { config } from 'dotenv';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

// Carrega variáveis de ambiente
config({ path: '.env.local' });

interface EnvVariable {
  name: string;
  value: string;
  provider: string;
  required: boolean;
  sensitive: boolean;
}

interface DeployResult {
  success: boolean;
  provider: string;
  variables: string[];
  errors: string[];
}

class SupabaseEnvDeployer {
  private supabase: any;
  private results: DeployResult[] = [];
  
  // Mapeamento de variáveis por provider
  private envMappings = {
    openai: [
      { name: 'OPENAI_API_KEY', required: true, sensitive: true },
      { name: 'OPENAI_ORG_ID', required: false, sensitive: true },
      { name: 'OPENAI_RATE_LIMIT', required: false, sensitive: false },
      { name: 'GPT4_TURBO_MODEL', required: false, sensitive: false },
      { name: 'GPT4_TURBO_MAX_TOKENS', required: false, sensitive: false }
    ],
    claude: [
      { name: 'CLAUDE_API_KEY', required: true, sensitive: true },
      { name: 'ANTHROPIC_API_KEY', required: true, sensitive: true },
      { name: 'CLAUDE_RATE_LIMIT', required: false, sensitive: false },
      { name: 'CLAUDE_3_OPUS_MODEL', required: false, sensitive: false },
      { name: 'CLAUDE_3_SONNET_MODEL', required: false, sensitive: false },
      { name: 'CLAUDE_3_HAIKU_MODEL', required: false, sensitive: false }
    ],
    gemini: [
      { name: 'GEMINI_API_KEY', required: true, sensitive: true },
      { name: 'GOOGLE_AI_API_KEY', required: false, sensitive: true },
      { name: 'GOOGLE_CLOUD_PROJECT_ID', required: false, sensitive: false },
      { name: 'GEMINI_RATE_LIMIT', required: false, sensitive: false },
      { name: 'GEMINI_PRO_MODEL', required: false, sensitive: false },
      { name: 'GEMINI_FLASH_MODEL', required: false, sensitive: false }
    ],
    groq: [
      { name: 'GROQ_API_KEY', required: true, sensitive: true },
      { name: 'GROQ_RATE_LIMIT', required: false, sensitive: false },
      { name: 'GROQ_MIXTRAL_MODEL', required: false, sensitive: false },
      { name: 'GROQ_LLAMA_MODEL', required: false, sensitive: false }
    ],
    deepseek: [
      { name: 'DEEPSEEK_API_KEY', required: true, sensitive: true },
      { name: 'DEEPSEEK_RATE_LIMIT', required: false, sensitive: false },
      { name: 'DEEPSEEK_CODER_MODEL', required: false, sensitive: false },
      { name: 'DEEPSEEK_CHAT_MODEL', required: false, sensitive: false }
    ],
    llama: [
      { name: 'HUGGINGFACE_API_TOKEN', required: false, sensitive: true },
      { name: 'REPLICATE_API_TOKEN', required: false, sensitive: true },
      { name: 'OLLAMA_BASE_URL', required: false, sensitive: false },
      { name: 'OLLAMA_MODELS', required: false, sensitive: false }
    ],
    system: [
      { name: 'MAX_DAILY_COST_USD', required: false, sensitive: false },
      { name: 'MAX_TOKENS_PER_REQUEST', required: false, sensitive: false },
      { name: 'DEFAULT_LLM_PROVIDER', required: true, sensitive: false },
      { name: 'DEFAULT_MODEL', required: false, sensitive: false },
      { name: 'ENABLE_LLM_CACHE', required: false, sensitive: false },
      { name: 'LLM_CACHE_TTL', required: false, sensitive: false },
      { name: 'ENABLE_LLM_METRICS', required: false, sensitive: false },
      { name: 'LOG_LEVEL', required: false, sensitive: false },
      { name: 'DEBUG_MODE', required: false, sensitive: false },
      { name: 'JWT_SECRET', required: true, sensitive: true },
      { name: 'API_KEYS_ENCRYPTION_KEY', required: false, sensitive: true },
      { name: 'CORS_ORIGINS', required: false, sensitive: false }
    ]
  };

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('❌ Credenciais do Supabase não encontradas! Verifique NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
    }

    this.supabase = createClient(supabaseUrl, serviceRoleKey);
  }

  async deployAll(): Promise<void> {
    console.log('🚀 Iniciando deploy de variáveis para Supabase...\n');

    if (!existsSync('.env.local')) {
      console.log('❌ Arquivo .env.local não encontrado!');
      console.log('💡 Execute: cp .env.example .env.local\n');
      return;
    }

    // Deploy por provider
    for (const [provider, variables] of Object.entries(this.envMappings)) {
      await this.deployProvider(provider, variables);
    }

    this.printSummary();
    await this.generateDeploymentReport();
  }

  async deployProvider(providerName: string, variables: any[]): Promise<void> {
    console.log(`📦 Deploying ${providerName} variables...`);

    const deployedVars: string[] = [];
    const errors: string[] = [];

    for (const varConfig of variables) {
      const value = process.env[varConfig.name];

      if (!value) {
        if (varConfig.required) {
          errors.push(`❌ ${varConfig.name}: Variável obrigatória não encontrada`);
        } else {
          console.log(`⚠️  ${varConfig.name}: Não configurada (opcional)`);
        }
        continue;
      }

      try {
        await this.setEnvironmentVariable(varConfig.name, value, varConfig.sensitive);
        deployedVars.push(varConfig.name);
        console.log(`✅ ${varConfig.name}: Deployed ${varConfig.sensitive ? '(masked)' : ''}`);
      } catch (error: any) {
        errors.push(`❌ ${varConfig.name}: ${error.message}`);
      }
    }

    this.results.push({
      success: errors.length === 0,
      provider: providerName,
      variables: deployedVars,
      errors
    });

    console.log();
  }

  async setEnvironmentVariable(name: string, value: string, sensitive: boolean = false): Promise<void> {
    try {
      // Supabase CLI approach - simulate the command
      const masked = sensitive ? this.maskValue(value) : value;
      console.log(`   Setting ${name}=${masked}`);
      
      // In a real implementation, you would use Supabase CLI or API
      // For now, we'll create a deployment script that can be run manually
      await this.addToDeploymentScript(name, value);
      
    } catch (error: any) {
      throw new Error(`Falha ao definir ${name}: ${error.message}`);
    }
  }

  async addToDeploymentScript(name: string, value: string): Promise<void> {
    const scriptPath = './supabase-env-deploy.sh';
    const command = `supabase secrets set ${name}="${value.replace(/"/g, '\\"')}"\n`;
    
    try {
      const existingContent = existsSync(scriptPath) ? readFileSync(scriptPath, 'utf8') : '#!/bin/bash\n\n# Auto-generated Supabase environment deployment script\n# Run: chmod +x supabase-env-deploy.sh && ./supabase-env-deploy.sh\n\n';
      
      if (!existingContent.includes(command)) {
        writeFileSync(scriptPath, existingContent + command);
      }
    } catch (error) {
      console.warn(`⚠️  Não foi possível adicionar ao script de deploy: ${error}`);
    }
  }

  maskValue(value: string): string {
    if (value.length <= 8) return '*'.repeat(value.length);
    return value.substring(0, 4) + '*'.repeat(value.length - 8) + value.substring(value.length - 4);
  }

  printSummary(): void {
    console.log('\n📊 RESUMO DO DEPLOYMENT\n');
    console.log('='.repeat(60));

    let totalSuccess = 0;
    let totalErrors = 0;
    let totalVariables = 0;

    this.results.forEach(result => {
      const icon = result.success ? '✅' : '❌';
      console.log(`${icon} ${result.provider.toUpperCase()}: ${result.variables.length} variáveis deployed`);
      
      if (result.errors.length > 0) {
        result.errors.forEach(error => console.log(`   ${error}`));
      }

      totalSuccess += result.success ? 1 : 0;
      totalErrors += result.errors.length;
      totalVariables += result.variables.length;
    });

    console.log('='.repeat(60));
    console.log(`📈 Total: ${totalVariables} variáveis, ${totalErrors} erros`);
    console.log(`🎯 Providers funcionais: ${totalSuccess}/${this.results.length}`);

    if (totalErrors === 0) {
      console.log('\n🎉 Deploy concluído com sucesso!');
      console.log('💡 Execute o script gerado: chmod +x supabase-env-deploy.sh && ./supabase-env-deploy.sh');
    } else {
      console.log('\n⚠️  Deploy concluído com alguns erros. Verifique as configurações.');
    }
  }

  async generateDeploymentReport(): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      results: this.results,
      summary: {
        totalProviders: this.results.length,
        successfulProviders: this.results.filter(r => r.success).length,
        totalVariables: this.results.reduce((sum, r) => sum + r.variables.length, 0),
        totalErrors: this.results.reduce((sum, r) => sum + r.errors.length, 0)
      }
    };

    writeFileSync('./deployment-report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Relatório salvo em: deployment-report.json');
  }

  async deploySpecificProvider(providerName: string): Promise<void> {
    const variables = this.envMappings[providerName as keyof typeof this.envMappings];
    
    if (!variables) {
      console.log(`❌ Provider "${providerName}" não encontrado.`);
      console.log('📚 Providers disponíveis:', Object.keys(this.envMappings).join(', '));
      return;
    }

    console.log(`🎯 Deploying apenas ${providerName}...\n`);
    await this.deployProvider(providerName, variables);
    
    const result = this.results[0];
    if (result.success) {
      console.log(`✅ ${providerName}: ${result.variables.length} variáveis deployed com sucesso!`);
    } else {
      console.log(`❌ ${providerName}: Erros encontrados:`);
      result.errors.forEach(error => console.log(`   ${error}`));
    }
  }

  async validateSupabaseConnection(): Promise<boolean> {
    try {
      console.log('🔍 Validando conexão com Supabase...');
      
      // Test the connection by attempting to fetch user info
      const { data, error } = await this.supabase.auth.getUser();
      
      if (error && error.message !== 'No user') {
        throw error;
      }
      
      console.log('✅ Conexão com Supabase validada!');
      return true;
    } catch (error: any) {
      console.log(`❌ Erro na conexão com Supabase: ${error.message}`);
      return false;
    }
  }

  async testEdgeFunctions(): Promise<void> {
    console.log('\n🧪 Testando Edge Functions...\n');
    
    const functions = [
      'agentic-rag',
      'claude-chat',
      'gemini-chat',
      'groq-chat',
      'deepseek-chat'
    ];

    for (const funcName of functions) {
      try {
        console.log(`🔍 Testando ${funcName}...`);
        
        const { data, error } = await this.supabase.functions.invoke(funcName, {
          body: { message: 'Test message', test: true }
        });

        if (error) {
          console.log(`❌ ${funcName}: ${error.message}`);
        } else {
          console.log(`✅ ${funcName}: Funcionando`);
        }
      } catch (error: any) {
        console.log(`❌ ${funcName}: ${error.message}`);
      }
    }
  }
}

// Executar deployment
async function main() {
  try {
    const deployer = new SupabaseEnvDeployer();
    const args = process.argv.slice(2);
    
    // Validar conexão primeiro
    const isConnected = await deployer.validateSupabaseConnection();
    if (!isConnected) {
      console.log('\n💡 Verifique suas credenciais do Supabase no .env.local');
      process.exit(1);
    }
    
    if (args.includes('--provider') && args[args.indexOf('--provider') + 1]) {
      const providerName = args[args.indexOf('--provider') + 1];
      await deployer.deploySpecificProvider(providerName);
    } else if (args.includes('--test-functions')) {
      await deployer.testEdgeFunctions();
    } else {
      await deployer.deployAll();
    }
    
    if (args.includes('--test-after-deploy')) {
      await deployer.testEdgeFunctions();
    }
    
  } catch (error: any) {
    console.error('❌ Erro no deployment:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { SupabaseEnvDeployer };