#!/usr/bin/env node

/**
 * Script de Deploy Completo - Edge Functions Supabase
 * Sistema de Chat PD POA - Porto Alegre
 * 
 * Deploy automatizado de todas as edge functions com verificações completas
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const PROJECT_REF = 'ngrqwmvuhvjkeohesbxs';
const FUNCTIONS_DIR = './supabase/functions';

// Configuração das functions por categoria
const FUNCTION_CATEGORIES = {
  // Functions novas/críticas (prioridade alta)
  critical: [
    'feedback-processor',
    'gap-detector', 
    'knowledge-updater',
    'paginated-search',
    'cursor-pagination'
  ],
  
  // Multi-LLM Functions
  multiLLM: [
    'claude-chat',
    'claude-haiku-chat',
    'claude-opus-chat', 
    'claude-sonnet-chat',
    'gemini-chat',
    'gemini-pro-chat',
    'gemini-vision-chat',
    'openai-advanced-chat',
    'deepseek-chat',
    'groq-chat',
    'llama-chat'
  ],
  
  // Core RAG System
  rag_core: [
    'enhanced-vector-search',
    'response-synthesizer',
    'contextual-scoring',
    'agent-rag',
    'agentic-rag',
    'query-analyzer',
    'sql-generator'
  ],
  
  // Support Functions
  support: [
    'process-document',
    'generate-embedding',
    'generate-text-embedding',
    'match-documents',
    'predefined-responses',
    'check-processing-status'
  ],
  
  // Admin Functions
  admin: [
    'create-admin-user',
    'create-admin-account',
    'create-user-from-interest',
    'set-user-role',
    'setup-demo-user'
  ],
  
  // QA & Testing
  qa: [
    'qa-validator',
    'qa-validator-simple',
    'qa-validator-direct',
    'qa-validator-test',
    'test-qa-cases'
  ]
};

// Variáveis de ambiente necessárias
const REQUIRED_ENV_VARS = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ANON_KEY',
  'OPENAI_API_KEY'
];

// Configurações específicas por function
const FUNCTION_CONFIGS = {
  'feedback-processor': { 
    verify_jwt: true,
    timeout: 60,
    memory: 512 
  },
  'gap-detector': { 
    verify_jwt: false,
    timeout: 120,
    memory: 512 
  },
  'knowledge-updater': { 
    verify_jwt: true,
    timeout: 300,
    memory: 1024 
  },
  'paginated-search': { 
    verify_jwt: true,
    timeout: 30,
    memory: 256 
  },
  'cursor-pagination': { 
    verify_jwt: true,
    timeout: 30,
    memory: 256 
  },
  'enhanced-vector-search': { 
    verify_jwt: true,
    timeout: 60,
    memory: 512 
  },
  'response-synthesizer': { 
    verify_jwt: true,
    timeout: 120,
    memory: 512 
  }
};

class FunctionDeployer {
  constructor() {
    this.deployedFunctions = [];
    this.failedFunctions = [];
    this.skippedFunctions = [];
    this.deploymentLog = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
    console.log(logEntry);
    this.deploymentLog.push(logEntry);
  }

  async checkPrerequisites() {
    this.log('🔍 Verificando pré-requisitos...');
    
    // Verificar se Supabase CLI está disponível
    try {
      execSync('npx supabase --version', { stdio: 'pipe' });
      this.log('✅ Supabase CLI disponível');
    } catch (error) {
      throw new Error('❌ Supabase CLI não encontrado. Execute: npm install -g supabase');
    }

    // Verificar se está logado no Supabase
    try {
      execSync('npx supabase status', { stdio: 'pipe' });
      this.log('✅ Supabase CLI configurado');
    } catch (error) {
      this.log('⚠️ Tentando fazer login no Supabase...');
      // Não forçar login automático - deixar para manual
    }

    // Verificar variáveis de ambiente
    const missingVars = REQUIRED_ENV_VARS.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      this.log(`❌ Variáveis de ambiente faltando: ${missingVars.join(', ')}`, 'error');
      throw new Error('Configure as variáveis de ambiente necessárias');
    }
    this.log('✅ Variáveis de ambiente configuradas');

    // Verificar se o diretório de functions existe
    if (!fs.existsSync(FUNCTIONS_DIR)) {
      throw new Error(`❌ Diretório de functions não encontrado: ${FUNCTIONS_DIR}`);
    }
    this.log('✅ Diretório de functions encontrado');
  }

  getFunctionsList() {
    const allFunctions = [];
    Object.values(FUNCTION_CATEGORIES).forEach(category => {
      allFunctions.push(...category);
    });
    
    // Verificar se as functions existem fisicamente
    const existingFunctions = allFunctions.filter(funcName => {
      const funcPath = path.join(FUNCTIONS_DIR, funcName);
      return fs.existsSync(funcPath);
    });

    const missingFunctions = allFunctions.filter(funcName => {
      const funcPath = path.join(FUNCTIONS_DIR, funcName);
      return !fs.existsSync(funcPath);
    });

    if (missingFunctions.length > 0) {
      this.log(`⚠️ Functions não encontradas: ${missingFunctions.join(', ')}`, 'warn');
    }

    return { existing: existingFunctions, missing: missingFunctions };
  }

  async validateFunction(functionName) {
    const funcPath = path.join(FUNCTIONS_DIR, functionName);
    
    // Verificar se index.ts ou index.py existe
    const hasTypeScript = fs.existsSync(path.join(funcPath, 'index.ts'));
    const hasPython = fs.existsSync(path.join(funcPath, 'index.py'));
    
    if (!hasTypeScript && !hasPython) {
      this.log(`❌ ${functionName}: Arquivo index não encontrado`, 'error');
      return false;
    }

    // Verificar dependências específicas
    if (hasPython) {
      const requirementsPath = path.join(funcPath, 'requirements.txt');
      if (!fs.existsSync(requirementsPath)) {
        this.log(`⚠️ ${functionName}: requirements.txt não encontrado para function Python`, 'warn');
      }
    }

    // Verificar sintaxe básica (TypeScript)
    if (hasTypeScript) {
      try {
        const content = fs.readFileSync(path.join(funcPath, 'index.ts'), 'utf8');
        if (!content.includes('serve(')) {
          this.log(`⚠️ ${functionName}: Não parece ser uma edge function válida`, 'warn');
        }
      } catch (error) {
        this.log(`❌ ${functionName}: Erro ao ler arquivo: ${error.message}`, 'error');
        return false;
      }
    }

    return true;
  }

  async deployFunction(functionName, category = 'unknown') {
    this.log(`🚀 Deployando ${functionName} (categoria: ${category})`);
    
    try {
      // Validar function antes do deploy
      const isValid = await this.validateFunction(functionName);
      if (!isValid) {
        this.failedFunctions.push({ name: functionName, reason: 'Validação falhou' });
        return false;
      }

      // Comando de deploy
      const deployCommand = `npx supabase functions deploy ${functionName} --project-ref ${PROJECT_REF}`;
      
      this.log(`Executando: ${deployCommand}`);
      
      const output = execSync(deployCommand, { 
        stdio: 'pipe',
        encoding: 'utf8',
        timeout: 120000 // 2 minutos timeout
      });

      this.log(`✅ ${functionName} deployada com sucesso`);
      this.deployedFunctions.push({ 
        name: functionName, 
        category,
        deployedAt: new Date().toISOString(),
        output: output.substring(0, 200) // Truncar output longo
      });

      return true;

    } catch (error) {
      this.log(`❌ Erro ao deployar ${functionName}: ${error.message}`, 'error');
      this.failedFunctions.push({ 
        name: functionName, 
        category,
        reason: error.message,
        failedAt: new Date().toISOString()
      });
      return false;
    }
  }

  async deployByCategory(categoryName, functions, options = {}) {
    this.log(`\n📦 Deployando categoria: ${categoryName} (${functions.length} functions)`);
    
    const { parallel = false, stopOnError = false } = options;
    const results = [];

    if (parallel) {
      // Deploy paralelo (mais rápido, mas pode sobrecarregar)
      this.log('⚡ Deploy paralelo habilitado');
      const promises = functions.map(funcName => 
        this.deployFunction(funcName, categoryName).catch(error => {
          this.log(`❌ Erro no deploy paralelo de ${funcName}: ${error.message}`, 'error');
          return false;
        })
      );
      
      const parallelResults = await Promise.allSettled(promises);
      parallelResults.forEach((result, index) => {
        results.push({
          function: functions[index],
          success: result.status === 'fulfilled' && result.value
        });
      });
    } else {
      // Deploy sequencial (mais seguro)
      for (const funcName of functions) {
        const success = await this.deployFunction(funcName, categoryName);
        results.push({ function: funcName, success });
        
        if (!success && stopOnError) {
          this.log(`🛑 Parando deploy da categoria ${categoryName} devido a erro`, 'error');
          break;
        }
        
        // Pequena pausa entre deploys para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;
    
    this.log(`📊 Categoria ${categoryName}: ${successCount} sucesso, ${failureCount} falhas`);
    
    return results;
  }

  async updateFunctionConfigs() {
    this.log('\n⚙️ Atualizando configurações das functions...');
    
    for (const [funcName, config] of Object.entries(FUNCTION_CONFIGS)) {
      if (this.deployedFunctions.some(f => f.name === funcName)) {
        try {
          // Atualizar config.toml se necessário
          this.log(`Configurando ${funcName}: JWT=${config.verify_jwt}, Timeout=${config.timeout}s`);
          // TODO: Implementar atualização automática do config.toml
        } catch (error) {
          this.log(`⚠️ Erro ao configurar ${funcName}: ${error.message}`, 'warn');
        }
      }
    }
  }

  async testDeployedFunctions() {
    this.log('\n🧪 Testando functions deployadas...');
    
    const testResults = [];
    
    for (const func of this.deployedFunctions) {
      try {
        // Teste básico: verificar se a function responde
        const testUrl = `https://${PROJECT_REF}.supabase.co/functions/v1/${func.name}`;
        
        this.log(`Testando ${func.name}...`);
        
        // Test OPTIONS (CORS)
        const optionsResponse = await fetch(testUrl, { 
          method: 'OPTIONS',
          headers: { 'Origin': 'http://localhost:3000' }
        });
        
        const corsWorking = optionsResponse.status === 200 || optionsResponse.status === 204;
        
        testResults.push({
          function: func.name,
          category: func.category,
          corsTest: corsWorking,
          url: testUrl,
          testedAt: new Date().toISOString()
        });
        
        this.log(`${corsWorking ? '✅' : '❌'} ${func.name}: CORS ${corsWorking ? 'OK' : 'FAIL'}`);
        
      } catch (error) {
        this.log(`❌ Erro ao testar ${func.name}: ${error.message}`, 'error');
        testResults.push({
          function: func.name,
          error: error.message,
          testedAt: new Date().toISOString()
        });
      }
      
      // Pausa entre testes
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return testResults;
  }

  generateReport() {
    const report = {
      deployment: {
        timestamp: new Date().toISOString(),
        projectRef: PROJECT_REF,
        totalFunctions: this.deployedFunctions.length + this.failedFunctions.length,
        successful: this.deployedFunctions.length,
        failed: this.failedFunctions.length,
        successRate: `${((this.deployedFunctions.length / (this.deployedFunctions.length + this.failedFunctions.length)) * 100).toFixed(1)}%`
      },
      deployed: this.deployedFunctions,
      failed: this.failedFunctions,
      skipped: this.skippedFunctions,
      log: this.deploymentLog
    };
    
    return report;
  }

  async saveReport() {
    const report = this.generateReport();
    const reportPath = `deployment-report-${Date.now()}.json`;
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    this.log(`📄 Relatório salvo em: ${reportPath}`);
    
    return reportPath;
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 RESUMO DO DEPLOYMENT');
    console.log('='.repeat(60));
    console.log(`🎯 Total de functions: ${this.deployedFunctions.length + this.failedFunctions.length}`);
    console.log(`✅ Deployadas com sucesso: ${this.deployedFunctions.length}`);
    console.log(`❌ Falhas: ${this.failedFunctions.length}`);
    console.log(`⏭️ Ignoradas: ${this.skippedFunctions.length}`);
    
    if (this.deployedFunctions.length > 0) {
      console.log('\n🎉 Functions deployadas:');
      this.deployedFunctions.forEach(func => {
        console.log(`  ✅ ${func.name} (${func.category})`);
      });
    }
    
    if (this.failedFunctions.length > 0) {
      console.log('\n💥 Functions com falha:');
      this.failedFunctions.forEach(func => {
        console.log(`  ❌ ${func.name}: ${func.reason}`);
      });
    }
    
    console.log('\n🔗 URLs das functions:');
    this.deployedFunctions.forEach(func => {
      console.log(`  https://${PROJECT_REF}.supabase.co/functions/v1/${func.name}`);
    });
    
    console.log('='.repeat(60));
  }
}

async function main() {
  console.log('🚀 Iniciando Deploy Completo das Edge Functions');
  console.log(`📍 Projeto: ${PROJECT_REF}`);
  console.log(`📂 Diretório: ${FUNCTIONS_DIR}\n`);

  const deployer = new FunctionDeployer();
  
  try {
    // 1. Verificar pré-requisitos
    await deployer.checkPrerequisites();
    
    // 2. Listar functions disponíveis
    const { existing, missing } = deployer.getFunctionsList();
    deployer.log(`📊 Functions encontradas: ${existing.length}, não encontradas: ${missing.length}`);
    
    // 3. Deploy por categoria (prioridade)
    
    // 3.1 Functions críticas primeiro
    await deployer.deployByCategory('critical', 
      FUNCTION_CATEGORIES.critical.filter(f => existing.includes(f)), 
      { stopOnError: true }
    );
    
    // 3.2 Core RAG System
    await deployer.deployByCategory('rag_core', 
      FUNCTION_CATEGORIES.rag_core.filter(f => existing.includes(f))
    );
    
    // 3.3 Multi-LLM Functions (paralelo devido ao número)
    await deployer.deployByCategory('multiLLM', 
      FUNCTION_CATEGORIES.multiLLM.filter(f => existing.includes(f)), 
      { parallel: false } // Sequencial para evitar rate limits
    );
    
    // 3.4 Support Functions
    await deployer.deployByCategory('support', 
      FUNCTION_CATEGORIES.support.filter(f => existing.includes(f))
    );
    
    // 3.5 Admin Functions
    await deployer.deployByCategory('admin', 
      FUNCTION_CATEGORIES.admin.filter(f => existing.includes(f))
    );
    
    // 3.6 QA Functions
    await deployer.deployByCategory('qa', 
      FUNCTION_CATEGORIES.qa.filter(f => existing.includes(f))
    );
    
    // 4. Atualizar configurações
    await deployer.updateFunctionConfigs();
    
    // 5. Testar functions deployadas
    const testResults = await deployer.testDeployedFunctions();
    
    // 6. Gerar relatório
    await deployer.saveReport();
    
    // 7. Mostrar resumo
    deployer.printSummary();
    
  } catch (error) {
    deployer.log(`💥 Erro crítico no deployment: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch(error => {
    console.error('💥 Erro não tratado:', error);
    process.exit(1);
  });
}

export { FunctionDeployer, FUNCTION_CATEGORIES, PROJECT_REF };