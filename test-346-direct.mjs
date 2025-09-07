#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

const supabase = createClient(supabaseUrl, anonKey);

console.log('🔍 TESTE DIRETO: Buscar dados 346\n');

async function test346Direct() {
  console.log('📝 Procurando especificamente por "346" na knowledgebase...');
  
  try {
    // Busca 1: Resposta contém 346
    const { data: data1, error: error1 } = await supabase
      .from('knowledgebase')
      .select('*')
      .ilike('resposta', '%346%')
      .limit(10);
      
    console.log('\n🔍 BUSCA 1: resposta ILIKE %346%');
    console.log('Resultados:', data1?.length || 0);
    if (data1 && data1.length > 0) {
      data1.forEach((item, i) => {
        console.log(`  ${i+1}. ${item.pergunta?.substring(0, 50)}...`);
        console.log(`     Resposta: ${item.resposta?.substring(0, 100)}...`);
      });
    }
    
    // Busca 2: Texto contém 346
    const { data: data2, error: error2 } = await supabase
      .from('knowledgebase')
      .select('*')
      .ilike('texto', '%346%')
      .limit(10);
      
    console.log('\n🔍 BUSCA 2: texto ILIKE %346%');
    console.log('Resultados:', data2?.length || 0);
    if (data2 && data2.length > 0) {
      data2.forEach((item, i) => {
        console.log(`  ${i+1}. ${item.titulo?.substring(0, 50)}...`);
        console.log(`     Texto: ${item.texto?.substring(0, 100)}...`);
      });
    }
    
    // Busca 3: Pergunta sobre contribuições
    const { data: data3, error: error3 } = await supabase
      .from('knowledgebase')
      .select('*')
      .and('pergunta.ilike.%quantas%', 'pergunta.ilike.%contribu%')
      .limit(10);
      
    console.log('\n🔍 BUSCA 3: pergunta sobre quantas contribuições');
    console.log('Resultados:', data3?.length || 0);
    if (data3 && data3.length > 0) {
      data3.forEach((item, i) => {
        console.log(`  ${i+1}. ${item.pergunta}`);
        console.log(`     Resposta: ${item.resposta?.substring(0, 100)}...`);
      });
    }
    
    // Busca 4: Busca combinada
    const { data: data4, error: error4 } = await supabase
      .from('knowledgebase')
      .select('*')
      .or('resposta.ilike.%346%,texto.ilike.%346%,pergunta.ilike.%quantas%contribu%')
      .limit(10);
      
    console.log('\n🔍 BUSCA 4: busca combinada OR');
    console.log('Resultados:', data4?.length || 0);
    if (data4 && data4.length > 0) {
      data4.forEach((item, i) => {
        console.log(`  ${i+1}. Tipo: ${item.tipo_documento}`);
        console.log(`     Pergunta: ${item.pergunta?.substring(0, 80)}...`);
        console.log(`     Resposta: ${item.resposta?.substring(0, 80)}...`);
        console.log(`     Contém 346: ${(item.resposta + ' ' + item.texto).includes('346')}`);
      });
    }
    
    // Busca 5: RPC function
    console.log('\n🔍 BUSCA 5: usando RPC search_knowledgebase_by_content');
    const { data: data5, error: error5 } = await supabase.rpc('search_knowledgebase_by_content', {
      search_text: '346',
      match_count: 5
    });
    
    console.log('Resultados RPC:', data5?.length || 0);
    if (data5 && data5.length > 0) {
      data5.forEach((item, i) => {
        console.log(`  ${i+1}. Score: ${item.relevance_score}`);
        console.log(`     Pergunta: ${item.pergunta?.substring(0, 80)}...`);
        console.log(`     Resposta: ${item.resposta?.substring(0, 80)}...`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

test346Direct().catch(console.error);