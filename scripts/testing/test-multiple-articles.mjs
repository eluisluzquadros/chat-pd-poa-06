#!/usr/bin/env node
/**
 * Teste abrangente de múltiplos artigos
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function testArticle(query, expectedDoc, expectedNumber) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📝 Testando: "${query}"`);
  console.log(`   Esperado: ${expectedDoc} Art. ${expectedNumber}`);
  console.log('-'.repeat(60));
  
  const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      message: query,
      bypassCache: true,
      model: 'openai/gpt-4-turbo-preview'
    }),
  });
  
  if (response.ok) {
    const data = await response.json();
    
    // Check sources
    console.log(`📊 Sources: ${JSON.stringify(data.sources)}`);
    console.log(`🎯 Confidence: ${data.confidence}`);
    
    // Check if response mentions the article
    const responseText = data.response.toLowerCase();
    const hasArticle = responseText.includes(`art. ${expectedNumber}`) || 
                       responseText.includes(`artigo ${expectedNumber}`);
    
    // Check if it says it doesn't have access
    const deniesAccess = responseText.includes('não tenho') || 
                        responseText.includes('não encontrei') ||
                        responseText.includes('não foi') ||
                        responseText.includes('não posso fornecer');
    
    if (hasArticle && !deniesAccess) {
      console.log('✅ SUCESSO: Artigo encontrado e conteúdo fornecido');
    } else if (deniesAccess) {
      console.log('❌ ERRO: Sistema diz não ter acesso ao artigo');
    } else {
      console.log('⚠️  AVISO: Resposta não menciona o artigo específico');
    }
    
    // Show response preview
    console.log(`\n💬 Resposta (primeiras 400 chars):`);
    console.log(data.response.substring(0, 400) + '...');
    
    return { success: hasArticle && !deniesAccess, deniesAccess };
  } else {
    console.error('❌ API error:', response.status);
    return { success: false, deniesAccess: false };
  }
}

async function runTests() {
  console.log('🚀 TESTE ABRANGENTE DE ARTIGOS DO SISTEMA RAG');
  console.log('=' .repeat(60));
  
  const tests = [
    // LUOS articles
    { query: 'do que se trata o Art. 119 da LUOS?', doc: 'LUOS', number: 119 },
    { query: 'o que diz o artigo 1 da LUOS?', doc: 'LUOS', number: 1 },
    { query: 'qual o conteúdo do Art. 75 da lei de uso e ocupação do solo?', doc: 'LUOS', number: 75 },
    { query: 'Art. 50 LUOS', doc: 'LUOS', number: 50 },
    
    // PDUS articles  
    { query: 'do que trata o artigo 100 do plano diretor?', doc: 'PDUS', number: 100 },
    { query: 'o que estabelece o Art. 1 do PDUS?', doc: 'PDUS', number: 1 },
    { query: 'Art. 200 plano diretor', doc: 'PDUS', number: 200 },
    
    // Mixed queries
    { query: 'quais são as disposições transitórias da LUOS?', doc: 'LUOS', number: 0 },
    { query: 'altura máxima em Porto Alegre', doc: 'MIXED', number: 0 },
  ];
  
  let successCount = 0;
  let denialCount = 0;
  
  for (const test of tests) {
    const result = await testArticle(test.query, test.doc, test.number);
    if (result.success) successCount++;
    if (result.deniesAccess) denialCount++;
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO DOS TESTES:');
  console.log(`   Total de testes: ${tests.length}`);
  console.log(`   ✅ Sucessos: ${successCount}`);
  console.log(`   ❌ Negações de acesso: ${denialCount}`);
  console.log(`   ⚠️  Outros: ${tests.length - successCount - denialCount}`);
  console.log(`   Taxa de sucesso: ${(successCount / tests.length * 100).toFixed(1)}%`);
  console.log('='.repeat(60));
}

runTests().catch(console.error);