#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findAllLuosTitles() {
  console.log('📚 BUSCANDO TODOS OS TÍTULOS DA LUOS\n');
  
  const { data } = await supabase
    .from('legal_articles')
    .select('article_number, full_content')
    .eq('document_type', 'LUOS')
    .gte('article_number', 9200)
    .lte('article_number', 9600)
    .order('article_number');
  
  if (data) {
    const titles = [];
    data.forEach(d => {
      if (d.full_content?.includes('TÍTULO')) {
        const match = d.full_content.match(/TÍTULO\s+([IVX]+|[0-9]+)/);
        if (match) {
          titles.push({
            article_number: d.article_number,
            title: match[0],
            content: d.full_content.substring(0, 100)
          });
        }
      }
    });
    
    console.log(`Encontrados ${titles.length} títulos:\n`);
    titles.forEach(t => {
      console.log(`Art#${t.article_number}: ${t.title}`);
      console.log(`  ${t.content}...\n`);
    });
    
    // Verificar se existe Título X
    const hasX = titles.some(t => t.title.includes('X'));
    if (!hasX) {
      console.log('⚠️ TÍTULO X não encontrado na LUOS');
      console.log('Último título encontrado:', titles[titles.length - 1]?.title);
    }
  }
}

findAllLuosTitles().catch(console.error);