#!/usr/bin/env node
/**
 * Buscar especificamente o Título X (que pode ser o artigo 9010 ou outro)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findTituloX() {
  console.log('🔍 Procurando TÍTULO X nos documentos...\n');
  
  // Buscar todos os títulos (article_number >= 9000)
  const { data: titles } = await supabase
    .from('legal_articles')
    .select('article_number, document_type, full_content')
    .gte('article_number', 9000)
    .lte('article_number', 9100)
    .ilike('full_content', '%TÍTULO%')
    .order('article_number');
  
  if (titles && titles.length > 0) {
    console.log(`📚 Encontrados ${titles.length} títulos:\n`);
    
    titles.forEach((t, index) => {
      const titleMatch = t.full_content?.match(/TÍTULO\s+([IVX]+|[0-9]+)/);
      if (titleMatch) {
        console.log(`Art#${t.article_number} [${t.document_type}]: ${titleMatch[0]}`);
        console.log(`  ${t.full_content?.substring(0, 150)}...\n`);
      }
    });
    
    // Procurar especificamente por TÍTULO X
    const tituloX = titles.find(t => {
      const content = t.full_content || '';
      return content.includes('TÍTULO X') || 
             content.includes('Título X') || 
             content.includes('TÍTULO 10') ||
             content.includes('Título 10');
    });
    
    if (tituloX) {
      console.log('\n✅ TÍTULO X ENCONTRADO!');
      console.log('=' .repeat(60));
      console.log(`Article Number: ${tituloX.article_number}`);
      console.log(`Document: ${tituloX.document_type}`);
      console.log(`\nConteúdo completo:`);
      console.log(tituloX.full_content);
      console.log('=' .repeat(60));
    } else {
      console.log('\n⚠️ TÍTULO X não encontrado diretamente.');
      
      // Tentar contar os títulos
      const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
      titles.forEach((t, index) => {
        const content = t.full_content || '';
        romanNumerals.forEach((roman, i) => {
          if (content.includes(`TÍTULO ${roman}`) && i === 9) {  // X é o índice 9
            console.log(`\n✅ Possível TÍTULO X (${roman}) encontrado!`);
            console.log(`Article Number: ${t.article_number}`);
            console.log(`Content: ${t.full_content?.substring(0, 200)}...`);
          }
        });
      });
    }
  }
  
  // Buscar também na LUOS
  console.log('\n\n📖 Procurando títulos da LUOS especificamente...');
  const { data: luosTitles } = await supabase
    .from('legal_articles')
    .select('article_number, full_content')
    .eq('document_type', 'LUOS')
    .gte('article_number', 9000)
    .ilike('full_content', '%TÍTULO%')
    .order('article_number');
  
  if (luosTitles && luosTitles.length > 0) {
    console.log(`Encontrados ${luosTitles.length} títulos na LUOS:`);
    luosTitles.forEach(t => {
      const titleMatch = t.full_content?.match(/TÍTULO\s+([IVX]+|[0-9]+)/);
      if (titleMatch) {
        console.log(`\nArt#${t.article_number}: ${titleMatch[0]}`);
        console.log(`  ${t.full_content?.substring(0, 150)}...`);
      }
    });
  }
}

findTituloX().catch(console.error);