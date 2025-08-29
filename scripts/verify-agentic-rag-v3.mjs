#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyV3Installation() {
  console.log('🔍 VERIFICAÇÃO AGENTIC-RAG V3\n');
  console.log('=' .repeat(60));
  
  // 1. Verificar tabelas
  console.log('\n📊 TABELAS CRIADAS:');
  console.log('-'.repeat(40));
  
  const tables = ['chat_memory', 'legal_hierarchy', 'article_metadata', 'legal_articles'];
  
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log(`❌ ${table}: Erro - ${error.message}`);
    } else {
      console.log(`✅ ${table}: ${count} registros`);
    }
  }
  
  // 2. Testar funções
  console.log('\n🧪 TESTE DAS FUNÇÕES:');
  console.log('-'.repeat(40));
  
  // Teste search_articles_simple
  const { data: article119, error: error119 } = await supabase
    .rpc('search_articles_simple', {
      search_term: '119',
      doc_type: 'LUOS'
    });
  
  if (error119) {
    console.log(`❌ search_articles_simple: ${error119.message}`);
  } else {
    console.log(`✅ search_articles_simple: Encontrou ${article119?.length || 0} resultados`);
    if (article119 && article119[0]) {
      console.log(`   → Art. ${article119[0].article_number}: ${article119[0].hierarchy}`);
    }
  }
  
  // Teste search_zots
  const { data: zot8, error: errorZot } = await supabase
    .rpc('search_zots', {
      zot_query: '8',
      bairro_query: null
    });
  
  if (errorZot) {
    console.log(`❌ search_zots: ${errorZot.message}`);
  } else {
    console.log(`✅ search_zots: Encontrou ${zot8?.length || 0} resultados`);
    if (zot8 && zot8[0]) {
      console.log(`   → ${zot8[0].zot} - ${zot8[0].bairro}: Altura ${zot8[0].altura_max}m`);
    }
  }
  
  // Teste hybrid_search
  const { data: hybridResults, error: hybridError } = await supabase
    .rpc('hybrid_search', {
      search_query: 'disposições transitórias',
      embedding_vector: null,
      doc_type: 'LUOS',
      limit_results: 5
    });
  
  if (hybridError) {
    console.log(`❌ hybrid_search: ${hybridError.message}`);
  } else {
    console.log(`✅ hybrid_search: Encontrou ${hybridResults?.length || 0} resultados`);
  }
  
  // 3. Verificar memória do chat
  console.log('\n💾 CHAT MEMORY:');
  console.log('-'.repeat(40));
  
  const { data: memoryData, count: memoryCount } = await supabase
    .from('chat_memory')
    .select('*', { count: 'exact' })
    .order('timestamp', { ascending: false })
    .limit(5);
  
  console.log(`Total de conversas salvas: ${memoryCount || 0}`);
  
  if (memoryData && memoryData.length > 0) {
    console.log('Últimas interações:');
    memoryData.forEach(m => {
      console.log(`  → [${m.session_id}] ${m.user_message.substring(0, 50)}...`);
    });
  }
  
  // 4. Status geral
  console.log('\n' + '=' .repeat(60));
  console.log('📈 STATUS GERAL:');
  console.log('=' .repeat(60));
  
  const checkmarks = {
    tables: (await supabase.from('chat_memory').select('id', { head: true })).error === null,
    functions: article119 !== null && !error119,
    hierarchy: (await supabase.from('legal_hierarchy').select('*', { count: 'exact', head: true })).count > 0,
    zots: zot8 !== null && !errorZot
  };
  
  console.log(`Tabelas instaladas: ${checkmarks.tables ? '✅' : '❌'}`);
  console.log(`Funções funcionando: ${checkmarks.functions ? '✅' : '❌'}`);
  console.log(`Hierarquia disponível: ${checkmarks.hierarchy ? '✅' : '❌'}`);
  console.log(`Busca ZOT funcional: ${checkmarks.zots ? '✅' : '❌'}`);
  
  const allGood = Object.values(checkmarks).every(v => v === true);
  
  if (allGood) {
    console.log('\n✅ AGENTIC-RAG V3 PRONTO PARA USO!');
    console.log('\nPróximo passo: Deploy da Edge Function');
    console.log('npx supabase functions deploy agentic-rag-v3 --project-ref ngrqwmvuhvjkeohesbxs');
  } else {
    console.log('\n⚠️  Alguns componentes precisam atenção');
  }
}

verifyV3Installation().catch(console.error);