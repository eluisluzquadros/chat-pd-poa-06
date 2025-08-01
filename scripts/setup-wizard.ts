#!/usr/bin/env node

/**
 * 🧙‍♂️ Setup Wizard - Configuração Interativa do Sistema RAG Multi-LLM
 * 
 * Assistente interativo para configurar todas as API keys e definições do sistema
 * Guia o usuário passo a passo através de toda a configuração necessária
 */

import { config } from 'dotenv';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createInterface } from 'readline';

// Carrega variáveis de ambiente existentes
config({ path: '.env.local' });

interface WizardStep {
  id: string;
  title: string;
  description: string;
  required: boolean;
  questions: Question[];
}

interface Question {
  key: string;
  prompt: string;
  type: 'text' | 'password' | 'boolean' | 'select' | 'number';
  required: boolean;
  default?: string;
  options?: string[];
  validation?: (value: string) => boolean | string;
  help?: string;
}

class SetupWizard {
  private rl: any;
  private envVars: Record<string, string> = {};
  
  private steps: WizardStep[] = [
    {
      id: 'welcome',
      title: '🎉 Bem-vindo ao Setup Wizard',
      description: 'Este assistente irá configurar todas as API keys para o sistema RAG Multi-LLM.',
      required: true,
      questions: [
        {
          key: 'continue',
          prompt: 'Deseja continuar com a configuração? (s/n)',
          type: 'boolean',
          required: true,
          default: 's'
        }
      ]
    },
    {
      id: 'supabase',
      title: '🗄️ Configuração Supabase',
      description: 'Configure as credenciais do Supabase (obrigatório)',
      required: true,
      questions: [
        {
          key: 'NEXT_PUBLIC_SUPABASE_URL',
          prompt: 'URL do projeto Supabase',
          type: 'text',
          required: true,
          validation: (val) => val.includes('supabase.co') || 'URL deve conter "supabase.co"',
          help: 'Encontre em: https://app.supabase.com/project/SEU_PROJECT/settings/api'
        },
        {
          key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
          prompt: 'Supabase Anon Key (público)',
          type: 'text',
          required: true,
          validation: (val) => val.startsWith('eyJ') || 'Key deve começar com "eyJ"'
        },
        {
          key: 'SUPABASE_SERVICE_ROLE_KEY',
          prompt: 'Supabase Service Role Key (privado)',
          type: 'password',
          required: true,
          validation: (val) => val.startsWith('eyJ') || 'Key deve começar com "eyJ"'
        }
      ]
    },
    {
      id: 'openai',
      title: '🤖 OpenAI Configuration',
      description: 'Configure OpenAI para GPT-4, GPT-4.5 e embeddings',
      required: false,
      questions: [
        {
          key: 'enable_openai',
          prompt: 'Deseja configurar OpenAI? (s/n)',
          type: 'boolean',
          required: false,
          default: 's'
        },
        {
          key: 'OPENAI_API_KEY',
          prompt: 'OpenAI API Key',
          type: 'password',
          required: true,
          validation: (val) => val.startsWith('sk-') || 'Key deve começar com "sk-"',
          help: 'Obtenha em: https://platform.openai.com/api-keys'
        },
        {
          key: 'OPENAI_ORG_ID',
          prompt: 'OpenAI Organization ID (opcional)',
          type: 'text',
          required: false,
          validation: (val) => !val || val.startsWith('org-') || 'Org ID deve começar com "org-"'
        }
      ]
    },
    {
      id: 'claude',
      title: '🧠 Anthropic Claude Configuration',
      description: 'Configure Claude para Opus, Sonnet e Haiku',
      required: false,
      questions: [
        {
          key: 'enable_claude',
          prompt: 'Deseja configurar Claude? (s/n)',
          type: 'boolean',
          required: false,
          default: 's'
        },
        {
          key: 'CLAUDE_API_KEY',
          prompt: 'Claude API Key',
          type: 'password',
          required: true,
          validation: (val) => val.startsWith('sk-ant-') || 'Key deve começar com "sk-ant-"',
          help: 'Obtenha em: https://console.anthropic.com/settings/keys'
        }
      ]
    },
    {
      id: 'gemini',
      title: '🌟 Google Gemini Configuration',
      description: 'Configure Gemini Pro, Flash e Vision',
      required: false,
      questions: [
        {
          key: 'enable_gemini',
          prompt: 'Deseja configurar Gemini? (s/n)',
          type: 'boolean',
          required: false,
          default: 's'
        },
        {
          key: 'gemini_option',
          prompt: 'Escolha a opção de configuração',
          type: 'select',
          required: true,
          options: ['ai-studio', 'gcp'],
          help: 'ai-studio: Mais simples (recomendado para desenvolvimento)\ngcp: Google Cloud Platform (produção)'
        },
        {
          key: 'GEMINI_API_KEY',
          prompt: 'Gemini API Key (Google AI Studio)',
          type: 'password',
          required: true,
          help: 'Obtenha em: https://makersuite.google.com/app/apikey'
        }
      ]
    },
    {
      id: 'optional_llms',
      title: '⚡ LLMs Opcionais',
      description: 'Configure LLMs adicionais (Groq, DeepSeek, Llama)',
      required: false,
      questions: [
        {
          key: 'enable_groq',
          prompt: 'Configurar Groq (ultra-rápido)? (s/n)',
          type: 'boolean',
          required: false,
          default: 'n'
        },
        {
          key: 'GROQ_API_KEY',
          prompt: 'Groq API Key',
          type: 'password',
          required: false,
          validation: (val) => !val || val.startsWith('gsk_') || 'Key deve começar com "gsk_"',
          help: 'Obtenha em: https://console.groq.com/keys'
        },
        {
          key: 'enable_deepseek',
          prompt: 'Configurar DeepSeek (especialista em código)? (s/n)',
          type: 'boolean',
          required: false,
          default: 'n'
        },
        {
          key: 'DEEPSEEK_API_KEY',
          prompt: 'DeepSeek API Key',
          type: 'password',
          required: false,
          validation: (val) => !val || val.startsWith('sk-') || 'Key deve começar com "sk-"',
          help: 'Obtenha em: https://platform.deepseek.com/api_keys'
        }
      ]
    },
    {
      id: 'system_config',
      title: '⚙️ Configurações do Sistema',
      description: 'Configure limites, custos e comportamento do sistema',
      required: false,
      questions: [
        {
          key: 'MAX_DAILY_COST_USD',
          prompt: 'Limite de custo diário em USD',
          type: 'number',
          required: false,
          default: '50.00',
          validation: (val) => !val || parseFloat(val) > 0 || 'Deve ser um número positivo'
        },
        {
          key: 'DEFAULT_LLM_PROVIDER',
          prompt: 'Provider padrão',
          type: 'select',
          required: true,
          options: ['openai', 'claude', 'gemini', 'groq'],
          default: 'openai'
        },
        {
          key: 'ENABLE_LLM_CACHE',
          prompt: 'Habilitar cache de respostas? (s/n)',
          type: 'boolean',
          required: false,
          default: 's'
        },
        {
          key: 'LOG_LEVEL',
          prompt: 'Nível de log',
          type: 'select',
          required: false,
          options: ['debug', 'info', 'warn', 'error'],
          default: 'info'
        }
      ]
    }
  ];

  constructor() {
    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async run(): Promise<void> {
    console.log('\n' + '='.repeat(60));
    console.log('🧙‍♂️ SETUP WIZARD - Sistema RAG Multi-LLM');
    console.log('='.repeat(60));
    console.log();

    // Carregar configurações existentes
    this.loadExistingConfig();

    // Executar steps
    for (const step of this.steps) {
      await this.executeStep(step);
    }

    // Salvar configuração
    await this.saveConfiguration();

    // Executar validação
    await this.runValidation();

    console.log('\n🎉 Configuração concluída com sucesso!');
    console.log('💡 Próximos passos:');
    console.log('   1. Execute: npm run validate-keys');
    console.log('   2. Execute: npm run deploy-env');
    console.log('   3. Execute: npm run test-llm-connections');

    this.rl.close();
  }

  loadExistingConfig(): void {
    if (existsSync('.env.local')) {
      const content = readFileSync('.env.local', 'utf8');
      const lines = content.split('\n');
      
      lines.forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          this.envVars[key] = valueParts.join('=');
        }
      });
      
      console.log('📄 Configurações existentes carregadas do .env.local');
    }
  }

  async executeStep(step: WizardStep): Promise<void> {
    console.log(`\n${step.title}`);
    console.log('-'.repeat(step.title.length));
    console.log(step.description);
    console.log();

    // Processar perguntas condicionais
    const answers: Record<string, string> = {};
    
    for (const question of step.questions) {
      // Skip conditional questions
      if (this.shouldSkipQuestion(question, answers)) {
        continue;
      }

      const answer = await this.askQuestion(question);
      if (answer !== null) {
        answers[question.key] = answer;
        
        // Store in env vars if not a control question
        if (!question.key.startsWith('enable_') && !question.key.includes('_option')) {
          this.envVars[question.key] = answer;
        }
      }
    }

    // Special handling for step completion
    if (step.id === 'welcome' && answers.continue === 'n') {
      console.log('\n👋 Setup cancelado. Execute novamente quando estiver pronto!');
      process.exit(0);
    }
  }

  shouldSkipQuestion(question: Question, answers: Record<string, string>): boolean {
    // Skip API key questions if user said no to enabling the service
    if (question.key === 'OPENAI_API_KEY' && answers.enable_openai === 'n') return true;
    if (question.key === 'OPENAI_ORG_ID' && answers.enable_openai === 'n') return true;
    if (question.key === 'CLAUDE_API_KEY' && answers.enable_claude === 'n') return true;
    if (question.key === 'GEMINI_API_KEY' && answers.enable_gemini === 'n') return true;
    if (question.key === 'GROQ_API_KEY' && answers.enable_groq === 'n') return true;
    if (question.key === 'DEEPSEEK_API_KEY' && answers.enable_deepseek === 'n') return true;
    
    return false;
  }

  async askQuestion(question: Question): Promise<string | null> {
    const existingValue = this.envVars[question.key] || process.env[question.key];
    const defaultValue = question.default || '';
    
    let prompt = question.prompt;
    
    if (existingValue) {
      const masked = question.type === 'password' ? this.maskValue(existingValue) : existingValue;
      prompt += ` [atual: ${masked}]`;
    } else if (defaultValue) {
      prompt += ` [padrão: ${defaultValue}]`;
    }
    
    if (question.help) {
      console.log(`💡 ${question.help}`);
    }
    
    prompt += ': ';

    const answer = await this.readline(prompt);
    
    // Use existing value if user just presses enter
    if (!answer) {
      if (existingValue) return existingValue;
      if (defaultValue) return defaultValue;
      if (question.required) {
        console.log('❌ Este campo é obrigatório!');
        return await this.askQuestion(question);
      }
      return null;
    }

    // Handle boolean questions
    if (question.type === 'boolean') {
      const normalized = answer.toLowerCase();
      if (['s', 'sim', 'y', 'yes', 'true'].includes(normalized)) return 's';
      if (['n', 'não', 'no', 'false'].includes(normalized)) return 'n';
      console.log('❌ Responda com s/n (sim/não)');
      return await this.askQuestion(question);
    }

    // Handle select questions
    if (question.type === 'select' && question.options) {
      if (!question.options.includes(answer)) {
        console.log(`❌ Opções válidas: ${question.options.join(', ')}`);
        return await this.askQuestion(question);
      }
    }

    // Validate answer
    if (question.validation) {
      const validation = question.validation(answer);
      if (validation !== true) {
        console.log(`❌ ${validation}`);
        return await this.askQuestion(question);
      }
    }

    return answer;
  }

  readline(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(prompt, resolve);
    });
  }

  maskValue(value: string): string {
    if (value.length <= 8) return '*'.repeat(value.length);
    return value.substring(0, 4) + '*'.repeat(value.length - 8) + value.substring(value.length - 4);
  }

  async saveConfiguration(): Promise<void> {
    console.log('\n💾 Salvando configuração...');

    // Load template
    let template = '';
    if (existsSync('.env.example')) {
      template = readFileSync('.env.example', 'utf8');
    }

    // Generate .env.local content
    let envContent = '# Generated by Setup Wizard\n';
    envContent += `# Generated at: ${new Date().toISOString()}\n\n`;

    // Add configured variables
    Object.entries(this.envVars).forEach(([key, value]) => {
      envContent += `${key}=${value}\n`;
    });

    // Add default values from template for unconfigured vars
    if (template) {
      const templateLines = template.split('\n');
      templateLines.forEach(line => {
        if (line.includes('=') && !line.startsWith('#')) {
          const [key] = line.split('=');
          if (!this.envVars[key] && !process.env[key]) {
            envContent += `# ${line}\n`;
          }
        }
      });
    }

    writeFileSync('.env.local', envContent);
    console.log('✅ Configuração salva em .env.local');
  }

  async runValidation(): Promise<void> {
    console.log('\n🔍 Executando validação básica...');
    
    const requiredVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];

    const missing = requiredVars.filter(key => !this.envVars[key]);
    
    if (missing.length > 0) {
      console.log('❌ Variáveis obrigatórias não configuradas:');
      missing.forEach(key => console.log(`   - ${key}`));
      return;
    }

    const hasAtLeastOneLLM = [
      'OPENAI_API_KEY',
      'CLAUDE_API_KEY', 
      'GEMINI_API_KEY',
      'GROQ_API_KEY',
      'DEEPSEEK_API_KEY'
    ].some(key => this.envVars[key]);

    if (!hasAtLeastOneLLM) {
      console.log('⚠️  Nenhum LLM configurado. Configure pelo menos um para usar o sistema.');
    } else {
      console.log('✅ Configuração básica válida!');
    }
  }

  async interactiveMode(): Promise<void> {
    console.log('\n🎮 MODO INTERATIVO');
    console.log('Comandos disponíveis:');
    console.log('  help - Mostrar ajuda');
    console.log('  status - Mostrar configurações atuais');
    console.log('  test <provider> - Testar provider específico');
    console.log('  reset - Reiniciar configuração');
    console.log('  exit - Sair');
    console.log();

    while (true) {
      const command = await this.readline('wizard> ');
      
      if (command === 'exit') break;
      
      await this.handleCommand(command);
    }
  }

  async handleCommand(command: string): Promise<void> {
    const [cmd, ...args] = command.split(' ');
    
    switch (cmd) {
      case 'help':
        console.log('📚 Documentação completa: docs/API_KEYS_GUIDE.md');
        break;
        
      case 'status':
        console.log('📊 Configurações atuais:');
        Object.entries(this.envVars).forEach(([key, value]) => {
          const masked = key.includes('KEY') || key.includes('SECRET') ? this.maskValue(value) : value;
          console.log(`  ${key}: ${masked}`);
        });
        break;
        
      case 'test':
        if (args[0]) {
          console.log(`🧪 Testando ${args[0]}... (execute: npm run test-llm-connections -- --provider ${args[0]})`);
        } else {
          console.log('❌ Especifique um provider: test openai');
        }
        break;
        
      case 'reset':
        const confirm = await this.readline('❓ Confirma reset da configuração? (s/n): ');
        if (confirm.toLowerCase().startsWith('s')) {
          this.envVars = {};
          console.log('🔄 Configuração resetada. Execute o wizard novamente.');
        }
        break;
        
      default:
        console.log(`❌ Comando desconhecido: ${cmd}`);
    }
  }
}

// Executar wizard
async function main() {
  try {
    const wizard = new SetupWizard();
    const args = process.argv.slice(2);
    
    if (args.includes('--interactive')) {
      await wizard.interactiveMode();
    } else {
      await wizard.run();
    }
    
  } catch (error: any) {
    console.error('❌ Erro no setup wizard:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { SetupWizard };