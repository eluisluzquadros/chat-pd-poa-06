#!/usr/bin/env node
/**
 * Busca direta por artigo específico
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getArticle119() {
  console.log('📖 Buscando Art. 119 da LUOS...\n');
  
  const { data, error } = await supabase
    .from('legal_articles')
    .select('*')
    .eq('document_type', 'LUOS')
    .eq('article_number', 119)
    .single();
  
  if (error) {
    console.error('❌ Erro:', error);
    return;
  }
  
  console.log('✅ ARTIGO 119 DA LUOS:');
  console.log('=' .repeat(60));
  console.log('\nID:', data.id);
  console.log('Document Type:', data.document_type);
  console.log('Article Number:', data.article_number);
  console.log('\nFULL CONTENT:');
  console.log('-' .repeat(60));
  console.log(data.full_content);
  console.log('-' .repeat(60));
  console.log('\nARTICLE TEXT:');
  console.log(data.article_text);
  console.log('\nKEYWORDS:', data.keywords);
  console.log('HAS EMBEDDING?', data.embedding ? 'Yes' : 'No');
  
  // Verificar alguns artigos próximos
  console.log('\n\n📚 Artigos próximos da LUOS:');
  const { data: nearby } = await supabase
    .from('legal_articles')
    .select('article_number, full_content')
    .eq('document_type', 'LUOS')
    .in('article_number', [117, 118, 119, 120, 121])
    .order('article_number');
  
  if (nearby) {
    nearby.forEach(art => {
      console.log(`\nArt. ${art.article_number}: ${art.full_content?.substring(0, 100)}...`);
    });
  }
}

getArticle119().catch(console.error);