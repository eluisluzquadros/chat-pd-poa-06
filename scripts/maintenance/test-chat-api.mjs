#!/usr/bin/env node
/**
 * Teste direto da API do chat
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function testChat() {
  console.log('🔍 Testando endpoint agentic-rag...\n');
  console.log('URL:', `${SUPABASE_URL}/functions/v1/agentic-rag`);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        message: 'Qual a altura máxima permitida em Porto Alegre?',
        bypassCache: true,
        model: 'openai/gpt-4-turbo-preview'
      }),
    });
    
    console.log('Status:', response.status);
    console.log('Headers:', response.headers.raw());
    
    const text = await response.text();
    console.log('\nResposta (raw):', text.substring(0, 500));
    
    if (response.ok) {
      const data = JSON.parse(text);
      console.log('\n✅ Resposta parseada:');
      console.log('- Confidence:', data.confidence);
      console.log('- Sources:', data.sources);
      console.log('- Model:', data.model);
      console.log('- Provider:', data.provider);
      console.log('- Response preview:', data.response?.substring(0, 200) + '...');
    } else {
      console.error('❌ Erro na resposta');
    }
  } catch (error) {
    console.error('❌ Erro na requisição:', error);
  }
}

testChat().catch(console.error);