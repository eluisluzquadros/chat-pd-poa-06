#!/usr/bin/env node

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function testDeployment() {
  console.log('\n🚀 TESTE RÁPIDO PÓS-DEPLOY\n');
  
  const testCases = [
    {
      name: 'Teste Citação Legal',
      query: 'Qual artigo da LUOS trata da Certificação em Sustentabilidade?'
    },
    {
      name: 'Teste Bairro',
      query: 'Qual a altura máxima em Boa Vista?'
    },
    {
      name: 'Teste PDUS',
      query: 'O que são ZEIS segundo o PDUS?'
    }
  ];

  for (const test of testCases) {
    console.log(`\n📝 ${test.name}`);
    console.log(`   Query: "${test.query}"`);
    
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          query: test.query,
          bypassCache: true,
          model: 'anthropic/claude-3-5-sonnet-20241022'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`   ❌ HTTP ${response.status}`);
        console.log(`   Erro: ${errorText.substring(0, 200)}`);
      } else {
        const result = await response.json();
        const responseText = result.response || '';
        
        // Check for key indicators
        const hasLUOS = responseText.includes('LUOS');
        const hasPDUS = responseText.includes('PDUS');
        const hasArticle = responseText.match(/Art\.\s*\d+/);
        
        console.log(`   ✅ Resposta recebida (${responseText.length} chars)`);
        console.log(`   Indicadores:`);
        console.log(`     - Cita LUOS: ${hasLUOS ? '✅' : '❌'}`);
        console.log(`     - Cita PDUS: ${hasPDUS ? '✅' : '❌'}`);
        console.log(`     - Cita Artigo: ${hasArticle ? '✅' : '❌'}`);
        
        // Show snippet
        console.log(`   Preview: "${responseText.substring(0, 150)}..."`);
      }
    } catch (error) {
      console.log(`   ❌ Erro: ${error.message}`);
    }
    
    // Delay between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n✅ Teste concluído!\n');
}

testDeployment().catch(console.error);