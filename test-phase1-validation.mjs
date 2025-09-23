#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

const supabase = createClient(supabaseUrl, anonKey);

console.log('🎯 FASE 1 - TESTE DE VALIDAÇÃO APÓS MIGRAÇÃO PARCIAL');
console.log('='.repeat(60));

const testQueries = [
  'Qual o regime urbanístico para o bairro Petrópolis?',
  'Quantas contribuições foram recebidas na audiência pública final?', 
  'Como foi o processo de revisão do Plano Diretor?',
  'O que é permitido construir segundo a LUOS?'
];

for (let i = 0; i < testQueries.length; i++) {
  const query = testQueries[i];
  
  console.log(`\n📍 TESTE ${i + 1}: "${query}"`);
  console.log('-'.repeat(50));
  
  try {
    const startTime = Date.now();
    
    const { data, error } = await supabase.functions.invoke('agentic-rag', {
      body: {
        message: query,
        userRole: 'user',
        sessionId: `phase1-test-${Date.now()}`,
        bypassCache: true
      }
    });

    const responseTime = Date.now() - startTime;
    
    if (error) {
      console.log(`❌ ERRO: ${error.message}`);
      continue;
    }

    // Verificar qualidade da resposta
    const hasResponse = data.response && data.response.length > 50;
    const hasContent = data.response && !data.response.includes('não encontrei') && !data.response.includes('não foi possível');
    
    console.log(`⏱️  Tempo: ${responseTime}ms`);
    console.log(`📊 Resposta: ${hasResponse ? '✅' : '❌'} (${data.response?.length || 0} chars)`);
    console.log(`🎯 Conteúdo: ${hasContent ? '✅' : '❌'}`);
    
    if (data.debug) {
      console.log(`🔍 Debug: ${data.debug.vectorResults || 0} resultados vetoriais`);
      console.log(`📈 Similaridade: ${data.debug.avgSimilarity || 'N/A'}`);
    }
    
    // Mostrar preview da resposta
    console.log(`📝 Preview: ${data.response?.substring(0, 150)}...`);
    
  } catch (err) {
    console.log(`❌ EXCEÇÃO: ${err.message}`);
  }
  
  // Pausa entre testes
  await new Promise(resolve => setTimeout(resolve, 1000));
}

console.log('\n📋 RESUMO FASE 1:');
console.log('- 270 embeddings migrados de 891 total');  
console.log('- Testando busca vetorial sem índice');
console.log('- Próximo: migrar restantes + criar índice');