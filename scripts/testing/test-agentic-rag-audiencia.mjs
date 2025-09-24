#!/usr/bin/env node
/**
 * Teste específico para pergunta sobre audiência pública
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function testAudienciaQuestion() {
  console.log('🔍 Testando pergunta específica sobre audiência pública...\n');
  
  const query = 'quantas contribuições foram recebidas na audiência pública final';
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        message: query,
        bypassCache: true,
        model: 'openai/gpt-4'
      }),
    });
    
    console.log('Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('\n✅ Resposta recebida:');
      console.log('- Confidence:', data.confidence);
      console.log('- Sources:', JSON.stringify(data.sources, null, 2));
      console.log('- Model:', data.model);
      console.log('- Execution time:', data.executionTime, 'ms');
      console.log('\n📄 Response:');
      console.log(data.response);
      
      if (data.agentTrace) {
        console.log('\n🤖 Agent trace:');
        console.log(JSON.stringify(data.agentTrace, null, 2));
      }
      
      // Verificar se a resposta contém "346"
      if (data.response.includes('346')) {
        console.log('\n🎯 SUCCESS: Resposta contém o número correto de contribuições (346)');
      } else {
        console.log('\n❌ FAIL: Resposta não contém o número correto de contribuições');
      }
    } else {
      const text = await response.text();
      console.error('❌ Erro na resposta:', text);
    }
  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
  }
}

testAudienciaQuestion().catch(console.error);