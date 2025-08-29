#!/usr/bin/env node
/**
 * Buscar pelos títulos faltantes VII e IX
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function searchMissingTitles() {
  console.log('🔍 BUSCANDO TÍTULOS FALTANTES\n');
  
  // 1. Buscar Título VII - Penalidades
  console.log('📚 Buscando Título VII - Das Penalidades:');
  
  const searchTermsVII = [
    'TÍTULO VII',
    'Título VII',
    'penalidades',
    'sanções',
    'multas',
    'infrações'
  ];
  
  for (const term of searchTermsVII) {
    const { data, count } = await supabase
      .from('legal_articles')
      .select('article_number, full_content', { count: 'exact' })
      .eq('document_type', 'LUOS')
      .ilike('full_content', `%${term}%`)
      .limit(3);
    
    if (count > 0) {
      console.log(`  ✅ Encontrado "${term}": ${count} resultados`);
      if (data[0]) {
        console.log(`     Exemplo: Art#${data[0].article_number}`);
        console.log(`     ${data[0].full_content?.substring(0, 100)}...`);
      }
    }
  }
  
  // 2. Buscar Título IX - Disposições Gerais e Complementares
  console.log('\n📚 Buscando Título IX - Das Disposições Gerais e Complementares:');
  
  const searchTermsIX = [
    'TÍTULO IX',
    'Título IX',
    'disposições gerais',
    'disposições complementares',
    'complementares'
  ];
  
  for (const term of searchTermsIX) {
    const { data, count } = await supabase
      .from('legal_articles')
      .select('article_number, full_content', { count: 'exact' })
      .eq('document_type', 'LUOS')
      .ilike('full_content', `%${term}%`)
      .limit(3);
    
    if (count > 0) {
      console.log(`  ✅ Encontrado "${term}": ${count} resultados`);
      if (data[0]) {
        console.log(`     Exemplo: Art#${data[0].article_number}`);
        console.log(`     ${data[0].full_content?.substring(0, 100)}...`);
      }
    }
  }
  
  // 3. Listar TODOS os títulos que existem na base
  console.log('\n📋 TODOS OS TÍTULOS EXISTENTES NA BASE:');
  
  const { data: allTitles } = await supabase
    .from('legal_articles')
    .select('article_number, full_content')
    .eq('document_type', 'LUOS')
    .gte('article_number', 9000)
    .order('article_number');
  
  const foundTitles = [];
  allTitles?.forEach(t => {
    const match = t.full_content?.match(/TÍTULO\s+([IVX]+|[0-9]+)/);
    if (match && !foundTitles.includes(match[0])) {
      foundTitles.push(match[0]);
      console.log(`  - ${match[0]} (Art#${t.article_number})`);
    }
  });
  
  // 4. Verificar a estrutura real da LUOS
  console.log('\n📊 ANÁLISE DA ESTRUTURA REAL:');
  console.log('  Títulos encontrados na base:', foundTitles.length);
  console.log('  Lista:', foundTitles.join(', '));
  
  // 5. Verificar se os títulos VII e IX realmente existem na LUOS original
  console.log('\n💡 CONCLUSÃO:');
  if (!foundTitles.includes('TÍTULO VII')) {
    console.log('  ⚠️ Título VII não encontrado - pode não existir na LUOS');
  }
  if (!foundTitles.includes('TÍTULO IX')) {
    console.log('  ⚠️ Título IX não encontrado - pode não existir na LUOS');
  }
  
  console.log('\n📝 NOTA: A LUOS de Porto Alegre pode ter apenas os títulos:');
  console.log('  I, II, III, IV, V, VI, VIII e X');
  console.log('  (Títulos VII e IX podem não existir no documento original)');
}

searchMissingTitles().catch(console.error);