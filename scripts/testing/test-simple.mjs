#!/usr/bin/env node

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🚀 Teste de Citação de Artigos\n');

const query = 'O que são ZEIS segundo o PDUS?';
console.log(`Query: "${query}"\n`);

try {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      query: query,
      bypassCache: true,
      model: 'anthropic/claude-3-5-sonnet-20241022'
    })
  });

  if (!response.ok) {
    console.log(`❌ HTTP ${response.status}`);
    const error = await response.text();
    console.log('Erro:', error.substring(0, 300));
  } else {
    const result = await response.json();
    const text = result.response || '';
    
    // Verificações
    const hasArticle = text.includes('Art.');
    const hasPDUS = text.includes('PDUS');
    const hasArt92 = text.includes('92');
    
    console.log('✅ Resposta recebida!\n');
    console.log('Verificações:');
    console.log(`  Cita Artigo: ${hasArticle ? '✅' : '❌'}`);
    console.log(`  Cita PDUS: ${hasPDUS ? '✅' : '❌'}`);
    console.log(`  Cita Art. 92: ${hasArt92 ? '✅' : '❌'}`);
    console.log(`\nPreview da resposta:\n"${text.substring(0, 300)}..."`);
    
    // Score final
    const score = (hasArticle ? 33 : 0) + (hasPDUS ? 33 : 0) + (hasArt92 ? 34 : 0);
    console.log(`\n📊 Score: ${score}%`);
    
    if (score === 100) {
      console.log('🎉 SUCESSO TOTAL! Sistema está citando corretamente!');
    } else if (score >= 66) {
      console.log('⚠️ Parcialmente funcionando. Falta melhorar.');
    } else {
      console.log('❌ Sistema não está citando artigos adequadamente.');
    }
  }
} catch (err) {
  console.error('❌ Erro:', err.message);
}

process.exit(0);