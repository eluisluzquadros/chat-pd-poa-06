#!/usr/bin/env node
/**
 * Teste direto da Edge Function agentic-rag
 * Verifica se está usando a base de conhecimento legal_articles
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function testAgenticRAG() {
  console.log('🔍 Testando Edge Function agentic-rag...\n');
  
  const queries = [
    'Quais são os títulos do PDUS?',
    'O que diz o artigo 1 do Plano Diretor?',
    'Qual a estrutura da LUOS?'
  ];
  
  for (const query of queries) {
    console.log(`\n📝 Query: "${query}"`);
    console.log('=' .repeat(60));
    
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          message: query,
          bypassCache: true
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ Resposta recebida');
        
        // Verificar fontes
        if (data.sources) {
          console.log('\n📚 Fontes:');
          console.log(JSON.stringify(data.sources, null, 2));
        }
        
        // Mostrar parte da resposta
        if (data.response) {
          const preview = data.response.substring(0, 500);
          console.log('\n💬 Resposta (preview):');
          console.log(preview + '...');
        }
        
        console.log(`\n🎯 Confiança: ${(data.confidence * 100).toFixed(1)}%`);
      } else {
        console.error('❌ Erro:', data.error);
      }
    } catch (error) {
      console.error('❌ Erro na requisição:', error.message);
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('✅ Teste concluído');
}

testAgenticRAG().catch(console.error);