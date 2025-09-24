#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkLegalArticles() {
  console.log('📊 Verificando tabela legal_articles...\n');
  
  // Count total
  const { count, error: countError } = await supabase
    .from('legal_articles')
    .select('*', { count: 'exact', head: true });
  
  if (countError) {
    console.error('❌ Erro:', countError.message);
    return;
  }
  
  console.log(`✅ Total de artigos: ${count}`);
  
  // Get sample
  const { data, error } = await supabase
    .from('legal_articles')
    .select('id, document_type, article_number, created_at')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error('❌ Erro:', error.message);
    return;
  }
  
  if (data && data.length > 0) {
    console.log('\n📋 Últimos artigos adicionados:');
    data.forEach(article => {
      console.log(`  - ${article.document_type} Art. ${article.article_number} (${new Date(article.created_at).toLocaleString('pt-BR')})`);
    });
  }
  
  // Count by document type
  const { count: pdusCount } = await supabase
    .from('legal_articles')
    .select('*', { count: 'exact', head: true })
    .eq('document_type', 'PDUS');
    
  const { count: luosCount } = await supabase
    .from('legal_articles')
    .select('*', { count: 'exact', head: true })
    .eq('document_type', 'LUOS');
  
  console.log('\n📊 Por documento:');
  console.log(`  - PDUS: ${pdusCount || 0} artigos`);
  console.log(`  - LUOS: ${luosCount || 0} artigos`);
  
  // Check if embeddings exist
  const { data: withEmbeddings } = await supabase
    .from('legal_articles')
    .select('article_number')
    .not('embedding', 'is', null)
    .limit(1);
  
  console.log('\n🔍 Embeddings:');
  console.log(`  - ${withEmbeddings?.length > 0 ? '✅ Presentes' : '❌ Ausentes'}`);
}

checkLegalArticles().catch(console.error);