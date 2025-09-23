#!/usr/bin/env node

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

console.log('🔍 TESTANDO AGENTIC-RAG APÓS CORREÇÃO\n');

async function testQuery(query) {
  console.log(`📝 Query: "${query}"`);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        sessionId: 'test-fix',
        bypassCache: false,
        model: 'openai/gpt-3.5-turbo'
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ Error ${response.status}:`, errorText);
      return false;
    }
    
    const result = await response.json();
    console.log('✅ Sucesso!');
    console.log('Resposta:', result.response ? result.response.substring(0, 200) + '...' : 'Sem resposta');
    console.log('Confiança:', result.confidence);
    console.log('Tempo:', result.executionTime, 'ms\n');
    
    return true;
    
  } catch (error) {
    console.error('❌ Erro na requisição:', error.message, '\n');
    return false;
  }
}

async function runTests() {
  const testQueries = [
    'Qual a altura máxima para construções em ZOT 02?',
    'O que é coeficiente de aproveitamento?',
    'Quais são as zonas de Porto Alegre?'
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const query of testQueries) {
    const success = await testQuery(query);
    if (success) passed++;
    else failed++;
    
    await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log('📊 RESULTADO FINAL:');
  console.log('─'.repeat(50));
  console.log(`✅ Passou: ${passed}/${testQueries.length}`);
  console.log(`❌ Falhou: ${failed}/${testQueries.length}`);
  
  if (failed === 0) {
    console.log('\n🎉 TODOS OS TESTES PASSARAM! Função corrigida com sucesso.');
  } else {
    console.log('\n⚠️ Ainda há problemas a resolver.');
  }
}

runTests().catch(console.error);