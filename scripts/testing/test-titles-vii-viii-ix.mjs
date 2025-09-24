#!/usr/bin/env node
/**
 * Testar especificamente os títulos VII, VIII e IX
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function testNewTitles() {
  console.log('🔍 TESTANDO TÍTULOS VII, VIII e IX ADICIONADOS\n');
  console.log('=' .repeat(60));
  
  const queries = [
    {
      query: 'o que trata o título VII da LUOS?',
      expected: 'penalidades'
    },
    {
      query: 'sobre o que é o título VIII da LUOS?',
      expected: 'licenciamento'
    },
    {
      query: 'qual o conteúdo do título IX da LUOS?',
      expected: 'disposições gerais e complementares'
    },
    {
      query: 'quais são todos os títulos da LUOS?',
      expected: 'dez títulos'
    }
  ];
  
  let successCount = 0;
  let failCount = 0;
  
  for (const test of queries) {
    console.log(`\n📤 Query: "${test.query}"`);
    console.log('-'.repeat(60));
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        message: test.query,
        bypassCache: true,
        model: 'openai/gpt-4-turbo-preview'
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      const responseText = data.response.toLowerCase();
      
      // Check if response contains expected content
      const hasExpected = responseText.includes(test.expected.toLowerCase());
      
      // Check for negative responses
      const notFound = responseText.includes('não inclui') || 
                       responseText.includes('não encontrei') ||
                       responseText.includes('não tenho') ||
                       responseText.includes('não posso fornecer');
      
      if (hasExpected && !notFound) {
        console.log('✅ SUCESSO: Resposta contém informação esperada');
        successCount++;
      } else if (notFound) {
        console.log('❌ FALHA: Sistema diz não ter a informação');
        failCount++;
      } else {
        console.log('⚠️ PARCIAL: Resposta não contém termo esperado');
        failCount++;
      }
      
      console.log(`📝 Resposta: ${data.response.substring(0, 200)}...`);
      console.log(`🔎 Esperado: "${test.expected}"`);
    } else {
      console.error('❌ Erro na API:', response.status);
      failCount++;
    }
    
    // Delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 RESUMO DOS TESTES:');
  console.log(`  ✅ Sucessos: ${successCount}/${queries.length}`);
  console.log(`  ❌ Falhas: ${failCount}/${queries.length}`);
  
  if (successCount === queries.length) {
    console.log('\n🎉 TODOS OS TÍTULOS ESTÃO FUNCIONANDO CORRETAMENTE!');
  } else {
    console.log('\n⚠️ ALGUNS TÍTULOS NÃO ESTÃO SENDO ENCONTRADOS CORRETAMENTE');
  }
}

testNewTitles().catch(console.error);