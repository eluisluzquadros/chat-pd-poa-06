#!/usr/bin/env node

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function testEdgeFunction() {
  console.log('🧪 TESTE DIRETO DA EDGE FUNCTION\n');
  console.log('URL:', `${SUPABASE_URL}/functions/v1/agentic-rag`);
  console.log('Key:', SUPABASE_ANON_KEY ? '✅ Configurada' : '❌ Faltando');
  console.log('\n' + '='.repeat(60) + '\n');
  
  try {
    console.log('📤 Enviando requisição de teste...');
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        query: 'O que é o PDPOA?',
        sessionId: 'test-' + Date.now(),
        modelPreference: 'gpt-4o-mini'
      })
    });
    
    console.log('📥 Status HTTP:', response.status, response.statusText);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('\n📄 Resposta Raw:');
    console.log('-'.repeat(40));
    console.log(responseText.substring(0, 500));
    
    if (response.ok) {
      try {
        const data = JSON.parse(responseText);
        console.log('\n✅ Resposta JSON válida:');
        console.log('-'.repeat(40));
        console.log('answer:', data.answer ? data.answer.substring(0, 200) + '...' : 'undefined');
        console.log('response:', data.response ? data.response.substring(0, 200) + '...' : 'undefined');
        console.log('confidence:', data.confidence);
        console.log('model:', data.model);
        console.log('tokensUsed:', data.tokensUsed);
        
        if (!data.answer && !data.response) {
          console.log('\n⚠️  PROBLEMA: Resposta sem conteúdo (answer/response undefined)');
        }
      } catch (parseError) {
        console.log('\n❌ Erro ao fazer parse do JSON:', parseError.message);
      }
    } else {
      console.log('\n❌ Resposta com erro HTTP');
      
      try {
        const errorData = JSON.parse(responseText);
        console.log('Erro estruturado:', errorData);
      } catch {
        console.log('Erro em texto:', responseText);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Erro na requisição:', error.message);
    console.error('Stack:', error.stack);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🔍 DIAGNÓSTICO:');
  console.log('='.repeat(60));
  
  console.log(`
Possíveis problemas:
1. Edge Function não está retornando 'answer' no JSON
2. Edge Function está com erro de runtime não tratado
3. Problema no processamento da resposta
4. Timeout ou erro na comunicação com sub-funções

Ações recomendadas:
1. Verificar logs no Supabase Dashboard
2. Verificar se o deploy foi feito corretamente
3. Testar com query mais simples
4. Verificar se as sub-funções estão funcionando
  `);
}

testEdgeFunction().catch(console.error);