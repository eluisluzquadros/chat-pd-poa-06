#!/usr/bin/env node

import fetch from 'node-fetch';

const SUPABASE_URL = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

console.log('🧪 Testando queries específicas sobre regime urbanístico...\n');

const queries = [
  'Quais são as zonas do Centro Histórico?',
  'Liste os bairros de Porto Alegre',
  'Quais zonas existem no bairro Moinhos de Vento?',
  'Qual a altura máxima permitida?',
  'O que é ZOT?'
];

async function testQuery(query) {
  console.log(`\n📝 Query: "${query}"`);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        sessionId: `test-${Date.now()}`,
        stream: false,
        options: {
          useCache: false,
          debug: true
        }
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Resposta:');
      console.log(data.response ? data.response.substring(0, 200) + '...' : 'Sem resposta');
      
      if (data.sources) {
        console.log(`📊 Fontes: Tabular=${data.sources.tabular}, Conceitual=${data.sources.conceptual}`);
      }
      
      if (data.confidence) {
        console.log(`🎯 Confiança: ${(data.confidence * 100).toFixed(0)}%`);
      }
      
      // Mostrar erros do trace se houver
      if (data.agentTrace) {
        const errors = data.agentTrace.filter(t => t.result?.error);
        if (errors.length > 0) {
          console.log('⚠️  Erros encontrados:');
          errors.forEach(e => console.log(`   - ${e.step}: ${e.result.error}`));
        }
      }
    } else {
      console.error('❌ Erro HTTP:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Detalhes:', errorText.substring(0, 200));
    }
  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
  }
}

async function testDirectSupabaseQuery() {
  console.log('\n\n🔍 Testando query direta no Supabase...');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/regime_urbanistico?bairro=eq.CENTRO%20HISTÓRICO&select=bairro,zona`, {
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Dados encontrados:', data.length, 'registros');
      if (data.length > 0) {
        console.log('Exemplo:', data.slice(0, 3));
      }
    } else {
      console.error('❌ Erro:', response.status);
    }
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

async function main() {
  // Testar queries no chat
  for (const query of queries) {
    await testQuery(query);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Pausa entre queries
  }
  
  // Testar acesso direto aos dados
  await testDirectSupabaseQuery();
  
  console.log('\n\n💡 DIAGNÓSTICO:');
  console.log('- Se todas as respostas são "versão Beta", o sistema não está encontrando dados');
  console.log('- Se há erros de "toLowerCase" ou "length", há problemas no código das Edge Functions');
  console.log('- Se a query direta funciona, os dados estão no banco mas as funções não conseguem acessá-los');
}

main().catch(console.error);