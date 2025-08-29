#!/usr/bin/env node

import { execSync } from 'child_process';

const PROJECT_REF = 'ngrqwmvuhvjkeohesbxs';

console.log('🔧 Reconfigurando secrets nas Edge Functions...\n');

// Secrets que precisam ser configuradas
const secrets = [
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'GEMINI_API_KEY',
  'DEEPSEEK_API_KEY',
  'ZHIPUAI_API_KEY'
];

console.log('📝 Listando secrets atuais...');
try {
  execSync(`npx supabase secrets list --project-ref ${PROJECT_REF}`, { stdio: 'inherit' });
} catch (error) {
  console.log('⚠️  Não foi possível listar secrets (pode ser normal)\n');
}

console.log('\n🔐 Configurando secrets do .env.local...');

// Carregar .env.local
import dotenv from 'dotenv';
import fs from 'fs';

// Verificar se .env.local existe
if (!fs.existsSync('.env.local')) {
  console.error('❌ Arquivo .env.local não encontrado!');
  process.exit(1);
}

// Carregar variáveis
const envConfig = dotenv.parse(fs.readFileSync('.env.local'));

// Configurar cada secret
for (const secretName of secrets) {
  const value = envConfig[secretName];
  
  if (value) {
    console.log(`\n⚙️  Configurando ${secretName}...`);
    
    try {
      // Usar echo para evitar problemas com caracteres especiais
      const command = `echo ${value} | npx supabase secrets set ${secretName} --project-ref ${PROJECT_REF}`;
      execSync(command, { stdio: 'pipe' });
      console.log(`✅ ${secretName} configurada`);
    } catch (error) {
      console.error(`❌ Erro ao configurar ${secretName}:`, error.message);
    }
  } else {
    console.log(`⚠️  ${secretName} não encontrada no .env.local`);
  }
}

console.log('\n\n✅ Configuração concluída!');
console.log('\n📌 Próximos passos:');
console.log('1. Re-deploy TODAS as Edge Functions para usar as novas secrets:');
console.log(`   npx supabase functions deploy --project-ref ${PROJECT_REF}`);
console.log('\n2. Ou individualmente:');
console.log(`   npx supabase functions deploy agentic-rag --project-ref ${PROJECT_REF}`);
console.log(`   npx supabase functions deploy query-analyzer --project-ref ${PROJECT_REF}`);
console.log(`   npx supabase functions deploy sql-generator --project-ref ${PROJECT_REF}`);
console.log(`   npx supabase functions deploy response-synthesizer --project-ref ${PROJECT_REF}`);