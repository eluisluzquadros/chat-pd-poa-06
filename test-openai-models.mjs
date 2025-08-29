#!/usr/bin/env node

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fs from 'fs';

console.log('🧪 Testando diferentes modelos e configurações da OpenAI...\n');

// Carregar API key
const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const OPENAI_API_KEY = envConfig.OPENAI_API_KEY;

async function testModel(model, maxTokens = 100) {
  console.log(`\n📝 Testando modelo: ${model} (max_tokens: ${maxTokens})`);
  
  const startTime = Date.now();
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: 'Você é um assistente.' },
          { role: 'user', content: 'Responda apenas: OK' }
        ],
        temperature: 0.7,
        max_tokens: maxTokens
      })
    });
    
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Sucesso em ${responseTime}ms`);
      console.log(`   Resposta: ${data.choices[0].message.content}`);
      console.log(`   Tokens usados: ${data.usage?.total_tokens || 'N/A'}`);
    } else {
      const error = await response.json();
      console.log(`   ❌ Erro ${response.status}: ${error.error?.message}`);
      
      // Se for erro de modelo não encontrado, pode ser um nome incorreto
      if (error.error?.code === 'model_not_found') {
        console.log(`   💡 Modelo "${model}" não existe ou não está disponível`);
      }
    }
  } catch (error) {
    console.log(`   ❌ Erro de rede: ${error.message}`);
  }
}

async function testLargeRequest() {
  console.log('\n📝 Testando requisição grande (como no response-synthesizer)...');
  
  const largePrompt = `
Você é um especialista em urbanismo e regulamentações municipais de Porto Alegre.
Seu papel é sintetizar informações sobre o Plano Diretor de forma clara e acessível.

Dados encontrados:
${Array(50).fill('Exemplo de dados do regime urbanístico...').join('\n')}

Por favor, sintetize esses dados de forma clara.
  `.trim();
  
  const startTime = Date.now();
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'Você é um assistente.' },
          { role: 'user', content: largePrompt }
        ],
        temperature: 0.7,
        max_tokens: 8000
      })
    });
    
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Sucesso em ${responseTime}ms`);
      console.log(`   Tokens usados: ${data.usage?.total_tokens || 'N/A'}`);
    } else {
      const error = await response.json();
      console.log(`   ❌ Erro ${response.status}: ${error.error?.message}`);
    }
  } catch (error) {
    console.log(`   ❌ Erro: ${error.message}`);
  }
}

async function checkQuota() {
  console.log('\n💰 Verificando informações da conta...');
  
  try {
    // Tentar endpoint de modelos como proxy para verificar se a API está acessível
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      }
    });
    
    if (response.ok) {
      console.log('   ✅ API acessível');
      
      // Verificar rate limit headers
      const remaining = response.headers.get('x-ratelimit-remaining-requests');
      const limit = response.headers.get('x-ratelimit-limit-requests');
      
      if (remaining && limit) {
        console.log(`   Rate limit: ${remaining}/${limit} requisições restantes`);
      }
    }
  } catch (error) {
    console.log('   ❌ Erro:', error.message);
  }
}

async function main() {
  // Verificar quota primeiro
  await checkQuota();
  
  // Testar diferentes modelos
  await testModel('gpt-3.5-turbo');
  await testModel('gpt-4');
  await testModel('gpt-4-turbo-preview');
  await testModel('gpt-4o-mini'); // Modelo usado no response-synthesizer
  
  // Testar requisição grande
  await testLargeRequest();
  
  console.log('\n\n📊 DIAGNÓSTICO:');
  console.log('- Se gpt-4o-mini falha mas outros funcionam, use outro modelo');
  console.log('- Se requisições grandes demoram muito, reduza max_tokens');
  console.log('- Se há erros de rate limit, aguarde ou use outro provider');
}

main().catch(console.error);