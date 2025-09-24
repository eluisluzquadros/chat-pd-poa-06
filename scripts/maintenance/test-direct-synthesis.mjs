import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function testDirectSynthesis() {
  console.log('🧪 TESTE DIRETO DO RESPONSE-SYNTHESIZER\n');
  console.log('=' .repeat(70));
  
  // Teste 1: Três Figueiras com dados completos
  console.log('\n1️⃣ TESTE TRÊS FIGUEIRAS:');
  console.log('-'.repeat(50));
  
  const tresFigueirasData = {
    originalQuery: "Qual é a altura máxima permitida no bairro Três Figueiras?",
    analysisResult: {
      intent: 'structured_query',
      entities: {
        neighborhoods: ['TRÊS FIGUEIRAS'],
        parameters: ['altura máxima']
      },
      strategy: 'structured_only'
    },
    sqlResults: {
      executionResults: [{
        data: [
          { bairro: 'TRÊS FIGUEIRAS', zona: 'ZOT 04', altura_maxima: 18, coef_aproveitamento_basico: 2, coef_aproveitamento_maximo: 4 },
          { bairro: 'TRÊS FIGUEIRAS', zona: 'ZOT 07', altura_maxima: 60, coef_aproveitamento_basico: null, coef_aproveitamento_maximo: null },
          { bairro: 'TRÊS FIGUEIRAS', zona: 'ZOT 08.3 - C', altura_maxima: 90, coef_aproveitamento_basico: null, coef_aproveitamento_maximo: null }
        ]
      }]
    },
    model: 'openai/gpt-3.5-turbo'
  };
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/response-synthesizer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(tresFigueirasData),
    });
    
    const result = await response.json();
    console.log('Resposta:');
    console.log(result.response || result.error);
    
    // Verificar coeficientes
    if (result.response) {
      const hasCA2 = result.response.includes('2');
      const hasCA4 = result.response.includes('4');
      console.log('\n🔍 Verificação:');
      console.log(`CA básico 2: ${hasCA2 ? '✅' : '❌'}`);
      console.log(`CA máximo 4: ${hasCA4 ? '✅' : '❌'}`);
    }
  } catch (error) {
    console.log('Erro:', error.message);
  }
  
  // Teste 2: Altura máxima mais alta
  console.log('\n\n2️⃣ TESTE ALTURA MÁXIMA MAIS ALTA:');
  console.log('-'.repeat(50));
  
  const alturaMaxData = {
    originalQuery: "Qual é a altura máxima mais alta no novo Plano Diretor?",
    analysisResult: {
      intent: 'conceptual',
      strategy: 'structured_only'
    },
    sqlResults: {
      executionResults: [{
        data: [
          { bairro: 'AZENHA', zona: 'ZOT 08.3 - A', altura_maxima: 130 }
        ]
      }]
    },
    model: 'openai/gpt-3.5-turbo'
  };
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/response-synthesizer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(alturaMaxData),
    });
    
    const result = await response.json();
    console.log('Resposta:');
    console.log(result.response || result.error);
    
    // Verificar 130m
    if (result.response) {
      const has130 = result.response.includes('130');
      const has40 = result.response.includes('40');
      console.log('\n🔍 Verificação:');
      console.log(`130m: ${has130 ? '✅' : '❌'}`);
      console.log(`40m (errado): ${has40 ? '❌ ERRO!' : '✅ Não tem'}`);
    }
  } catch (error) {
    console.log('Erro:', error.message);
  }
  
  console.log('\n' + '=' .repeat(70));
  console.log('✅ Teste completo!');
}

testDirectSynthesis().catch(console.error);