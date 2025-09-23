#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

const supabase = createClient(supabaseUrl, anonKey);

console.log('🎯 TESTE COMPLETO DO SISTEMA APÓS MIGRAÇÃO MANUAL');
console.log('='.repeat(60));

const criticalQueries = [
  'Qual o regime urbanístico para o bairro Petrópolis?',
  'Quantas contribuições foram recebidas na audiência pública final?', 
  'Como foi o processo de revisão do Plano Diretor?',
  'O que é permitido construir segundo a LUOS?'
];

async function testRagSystem() {
  for (let i = 0; i < criticalQueries.length; i++) {
    const query = criticalQueries[i];
    
    console.log(`\n📍 TESTE ${i + 1}: "${query}"`);
    console.log('-'.repeat(50));
    
    try {
      const startTime = Date.now();
      
      const { data, error } = await supabase.functions.invoke('agentic-rag', {
        body: {
          message: query,
          userRole: 'user',
          sessionId: `final-test-${Date.now()}`,
          bypassCache: true
        }
      });

      const responseTime = Date.now() - startTime;
      
      if (error) {
        console.log(`❌ ERRO: ${error.message}`);
        continue;
      }

      // Análise de qualidade da resposta
      const hasResponse = data.response && data.response.length > 50;
      const hasContent = data.response && 
        !data.response.includes('não encontrei') && 
        !data.response.includes('não foi possível') &&
        !data.response.includes('desculpe');
      
      const isDetailed = data.response && data.response.length > 200;
      
      console.log(`⏱️  Tempo: ${responseTime}ms`);
      console.log(`📊 Resposta: ${hasResponse ? '✅' : '❌'} (${data.response?.length || 0} chars)`);
      console.log(`🎯 Conteúdo: ${hasContent ? '✅' : '❌'}`);
      console.log(`📖 Detalhada: ${isDetailed ? '✅' : '❌'}`);
      
      if (data.debug) {
        console.log(`🔍 Debug: ${data.debug.vectorResults || 0} resultados vetoriais`);
        console.log(`📈 Similaridade: ${data.debug.avgSimilarity || 'N/A'}`);
      }
      
      // Preview da resposta
      console.log(`📝 Preview: ${data.response?.substring(0, 200)}...`);
      
      // Status final do teste
      const success = hasResponse && hasContent && responseTime < 10000;
      console.log(`🎯 STATUS: ${success ? '✅ SUCESSO' : '❌ FALHA'}`);
      
    } catch (err) {
      console.log(`❌ EXCEÇÃO: ${err.message}`);
    }
    
    // Pausa entre testes
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

async function testDatabase() {
  console.log('\n🔍 TESTE DA BASE DE CONHECIMENTO');
  console.log('='.repeat(40));
  
  try {
    // Testar se existem dados sobre audiências
    const { data: audiencias, error: audienciasError } = await supabase
      .from('knowledgebase')
      .select('id, titulo, texto')
      .ilike('texto', '%audiência%')
      .limit(3);
    
    if (audienciasError) {
      console.log(`❌ Erro audiências: ${audienciasError.message}`);
    } else {
      console.log(`✅ Audiências encontradas: ${audiencias.length}`);
      audiencias.forEach(a => {
        console.log(`  - ${a.titulo?.substring(0, 60)}...`);
      });
    }
    
    // Testar se existem dados sobre contribuições
    const { data: contribuicoes, error: contribuicoesError } = await supabase
      .from('knowledgebase')
      .select('id, titulo, texto')
      .ilike('texto', '%contribuições%')
      .limit(3);
    
    if (contribuicoesError) {
      console.log(`❌ Erro contribuições: ${contribuicoesError.message}`);
    } else {
      console.log(`✅ Contribuições encontradas: ${contribuicoes.length}`);
      contribuicoes.forEach(c => {
        console.log(`  - ${c.titulo?.substring(0, 60)}...`);
      });
    }
    
  } catch (err) {
    console.log(`❌ Erro teste DB: ${err.message}`);
  }
}

// Executar testes
console.log('Iniciando testes...\n');

await testDatabase();
await testRagSystem();

console.log('\n📋 RESUMO FINAL:');
console.log('- 891 embeddings migrados manualmente');  
console.log('- Testando sem índice vetorial (limitações de memória)');
console.log('- Sistema deve funcionar, mas pode estar mais lento');