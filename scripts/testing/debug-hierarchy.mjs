#!/usr/bin/env node
/**
 * Debug da estrutura hierárquica dos documentos
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugHierarchy() {
  console.log('🔍 ANÁLISE DETALHADA DA ESTRUTURA DOS DADOS\n');
  
  // 1. Buscar todos os títulos
  console.log('📚 Buscando TODOS os documentos com "título" no conteúdo...');
  const { data: titleDocs, error: titleError } = await supabase
    .from('legal_articles')
    .select('id, document_type, article_number, hierarchy_level, full_content')
    .ilike('full_content', '%título%')
    .limit(20);
  
  if (titleDocs && titleDocs.length > 0) {
    console.log(`\nEncontrados ${titleDocs.length} documentos com "título":`);
    titleDocs.forEach(doc => {
      const preview = doc.full_content?.substring(0, 200);
      console.log(`\n[${doc.document_type}] ID: ${doc.id}, Art#: ${doc.article_number}`);
      console.log(`  Hierarchy: ${doc.hierarchy_level || 'NULL'}`);
      console.log(`  Content: ${preview}...`);
    });
  }
  
  // 2. Buscar especificamente por "Título X"
  console.log('\n\n📖 Buscando especificamente "Título X" ou variações...');
  const variations = [
    'Título X',
    'TÍTULO X', 
    'Título 10',
    'TÍTULO 10',
    'título x',
    'título 10'
  ];
  
  for (const variation of variations) {
    const { data, count } = await supabase
      .from('legal_articles')
      .select('*', { count: 'exact', head: true })
      .ilike('full_content', `%${variation}%`);
    
    if (count > 0) {
      console.log(`  ✅ "${variation}": ${count} resultados`);
      
      // Pegar um exemplo
      const { data: example } = await supabase
        .from('legal_articles')
        .select('id, document_type, article_number, full_content')
        .ilike('full_content', `%${variation}%`)
        .limit(1)
        .single();
      
      if (example) {
        console.log(`     Exemplo: [${example.document_type}] Art#${example.article_number}`);
        console.log(`     ${example.full_content?.substring(0, 150)}...`);
      }
    } else {
      console.log(`  ❌ "${variation}": 0 resultados`);
    }
  }
  
  // 3. Analisar article_numbers altos (possíveis hierarquias)
  console.log('\n\n📊 Analisando article_numbers > 9000 (possíveis elementos hierárquicos):');
  const { data: highNumbers } = await supabase
    .from('legal_articles')
    .select('article_number, document_type, full_content')
    .gte('article_number', 9000)
    .order('article_number')
    .limit(10);
  
  if (highNumbers && highNumbers.length > 0) {
    highNumbers.forEach(item => {
      const content = item.full_content?.substring(0, 100);
      console.log(`\n  Art#${item.article_number} [${item.document_type}]: ${content}...`);
    });
  } else {
    console.log('  Nenhum article_number > 9000 encontrado');
  }
  
  // 4. Buscar disposições finais
  console.log('\n\n📜 Buscando "Disposições Finais e Transitórias":');
  const { data: disposicoes } = await supabase
    .from('legal_articles')
    .select('id, document_type, article_number, full_content')
    .or('full_content.ilike.%disposições finais%,full_content.ilike.%disposições transitórias%')
    .limit(5);
  
  if (disposicoes && disposicoes.length > 0) {
    console.log(`Encontrados ${disposicoes.length} resultados:`);
    disposicoes.forEach(d => {
      console.log(`\n[${d.document_type}] Art#${d.article_number}: ${d.full_content?.substring(0, 150)}...`);
    });
  }
  
  // 5. Verificar se existe campo de metadados
  console.log('\n\n🔍 Verificando estrutura de uma linha completa:');
  const { data: sampleRow } = await supabase
    .from('legal_articles')
    .select('*')
    .eq('document_type', 'LUOS')
    .limit(1)
    .single();
  
  if (sampleRow) {
    console.log('Campos disponíveis:');
    Object.keys(sampleRow).forEach(key => {
      if (key !== 'embedding' && key !== 'full_content') {
        const value = sampleRow[key];
        console.log(`  - ${key}: ${typeof value === 'string' ? value.substring(0, 50) : value}`);
      }
    });
  }
}

debugHierarchy().catch(console.error);