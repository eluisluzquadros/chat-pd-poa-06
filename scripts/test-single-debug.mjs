#!/usr/bin/env node

/**
 * TESTE DEBUG - Teste único para identificar problema
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 DEBUG TEST - Single Query\n');
console.log('URL:', SUPABASE_URL);
console.log('Key exists:', !!SUPABASE_ANON_KEY);

async function testSingleQuery() {
  const query = "Qual a altura máxima no Centro Histórico?";
  
  console.log('\n📝 Query:', query);
  console.log('\n1️⃣ Testing agentic-rag (v1)...');
  
  try {
    const requestBody = {
      message: query,
      userRole: 'citizen',
      sessionId: 'test-debug-' + Date.now(),
      bypassCache: true,
      model: 'gpt-3.5-turbo'
    };
    
    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(30000)
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers.raw());
    
    const text = await response.text();
    console.log('Raw response:', text.substring(0, 500));
    
    try {
      const result = JSON.parse(text);
      console.log('\n✅ Parsed response:');
      console.log('- Has response:', !!result.response);
      console.log('- Response length:', result.response?.length || 0);
      console.log('- Confidence:', result.confidence);
      console.log('- Sources:', result.sources);
      
      if (result.response) {
        console.log('\n📄 Response preview:');
        console.log(result.response.substring(0, 200) + '...');
      }
    } catch (parseError) {
      console.log('❌ Failed to parse as JSON:', parseError.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('\n2️⃣ Testing agentic-rag-v2...');
  
  try {
    const requestBodyV2 = {
      query: query, // v2 pode usar 'query'
      message: query, // mas também enviar 'message' por compatibilidade
      sessionId: 'test-debug-v2-' + Date.now(),
      bypassCache: true,
      model: 'gpt-3.5-turbo',
      options: {
        useAgenticRAG: true
      }
    };
    
    console.log('Request body:', JSON.stringify(requestBodyV2, null, 2));
    
    const responseV2 = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag-v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(requestBodyV2),
      signal: AbortSignal.timeout(30000)
    });
    
    console.log('Response status:', responseV2.status);
    
    const textV2 = await responseV2.text();
    console.log('Raw response:', textV2.substring(0, 500));
    
    try {
      const resultV2 = JSON.parse(textV2);
      console.log('\n✅ Parsed response:');
      console.log('- Has response:', !!resultV2.response);
      console.log('- Response length:', resultV2.response?.length || 0);
      console.log('- Confidence:', resultV2.confidence);
      console.log('- Pipeline:', resultV2.metadata?.pipeline);
      
      if (resultV2.response) {
        console.log('\n📄 Response preview:');
        console.log(resultV2.response.substring(0, 200) + '...');
      }
    } catch (parseError) {
      console.log('❌ Failed to parse as JSON:', parseError.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  console.log('\n✅ Debug test completed');
}

testSingleQuery().catch(console.error);