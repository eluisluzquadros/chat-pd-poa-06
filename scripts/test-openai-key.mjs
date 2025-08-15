#!/usr/bin/env node

/**
 * Testar se a API Key do OpenAI está funcionando
 */

import { OpenAI } from 'openai';
import chalk from 'chalk';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.join(__dirname, '..', '.env.local') });

console.log(chalk.cyan.bold('\n🔑 TESTANDO API KEY OPENAI\n'));

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.log(chalk.red('❌ OPENAI_API_KEY não configurada!'));
  process.exit(1);
}

console.log('API Key:', apiKey.substring(0, 10) + '...');

// Testar sem organization ID
console.log(chalk.yellow('\n1. Testando SEM organization ID...'));
try {
  const openai1 = new OpenAI({ 
    apiKey,
    // Sem organization
  });
  
  const response1 = await openai1.embeddings.create({
    model: 'text-embedding-ada-002',
    input: 'Teste de embedding',
  });
  
  console.log(chalk.green('✅ Funcionou SEM organization ID!'));
  console.log('   Dimensões:', response1.data[0].embedding.length);
  
} catch (error) {
  console.log(chalk.red('❌ Erro SEM organization ID:'), error.message);
}

// Testar com organization ID se existir
const orgId = process.env.OPENAI_ORG_ID;
if (orgId && orgId !== 'org-your-organization-id') {
  console.log(chalk.yellow('\n2. Testando COM organization ID:', orgId));
  try {
    const openai2 = new OpenAI({ 
      apiKey,
      organization: orgId
    });
    
    const response2 = await openai2.embeddings.create({
      model: 'text-embedding-ada-002',
      input: 'Teste de embedding',
    });
    
    console.log(chalk.green('✅ Funcionou COM organization ID!'));
    console.log('   Dimensões:', response2.data[0].embedding.length);
    
  } catch (error) {
    console.log(chalk.red('❌ Erro COM organization ID:'), error.message);
  }
}

// Verificar modelos disponíveis
console.log(chalk.yellow('\n3. Verificando modelos disponíveis...'));
try {
  const openai = new OpenAI({ apiKey });
  const models = await openai.models.list();
  
  const embeddingModels = models.data
    .filter(m => m.id.includes('embedding'))
    .map(m => m.id);
  
  console.log('Modelos de embedding disponíveis:');
  embeddingModels.forEach(m => console.log('  -', m));
  
} catch (error) {
  console.log(chalk.red('❌ Erro ao listar modelos:'), error.message);
}

console.log(chalk.cyan.bold('\n📝 RECOMENDAÇÕES:\n'));
console.log('1. Se funcionou SEM organization ID, remova OPENAI_ORG_ID do .env.local');
console.log('2. Se nenhum funcionou, verifique se a API key está correta');
console.log('3. Verifique no dashboard da OpenAI: https://platform.openai.com/api-keys');
console.log('4. Certifique-se que a key tem permissão para usar embeddings');