#!/usr/bin/env node
/**
 * Inserir os Títulos VII, VIII e IX que estão FALTANDO na base
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MISSING_TITLES = [
  {
    article_number: 9290,  // Entre Título VI (9302) e X (9350)
    title_number: 'VII',
    title_name: 'TÍTULO VII',
    full_name: 'TÍTULO VII - Das Penalidades',
    keywords: ['LUOS', 'Título VII', 'TÍTULO VII', 'Penalidades', 'Sanções', 'Multas', 'Infrações', 'Fiscalização']
  },
  {
    article_number: 9295,
    title_number: 'VIII',
    title_name: 'TÍTULO VIII',
    full_name: 'TÍTULO VIII - Do Licenciamento',
    keywords: ['LUOS', 'Título VIII', 'TÍTULO VIII', 'Licenciamento', 'Licença', 'Aprovação', 'Autorização', 'Alvarás']
  },
  {
    article_number: 9300,
    title_number: 'IX',
    title_name: 'TÍTULO IX',
    full_name: 'TÍTULO IX - Das Disposições Gerais e Complementares',
    keywords: ['LUOS', 'Título IX', 'TÍTULO IX', 'Disposições Gerais', 'Disposições Complementares', 'Normas Complementares']
  }
];

async function insertMissingTitles() {
  console.log('📝 INSERINDO TÍTULOS VII, VIII e IX FALTANTES\n');
  console.log('=' .repeat(60));
  
  for (const title of MISSING_TITLES) {
    console.log(`\n🔍 Processando ${title.full_name}...`);
    
    // 1. Verificar se já existe
    const { data: existing } = await supabase
      .from('legal_articles')
      .select('*')
      .eq('document_type', 'LUOS')
      .eq('article_number', title.article_number)
      .single();
    
    if (existing) {
      console.log(`  ⚠️ ${title.title_name} já existe. Atualizando...`);
      
      const { error } = await supabase
        .from('legal_articles')
        .update({
          article_text: title.full_name.replace('TÍTULO ', '').replace(title.title_number + ' - ', ''),
          full_content: `${title.full_name}\n\nEste título trata das disposições relacionadas a ${title.full_name.toLowerCase().replace('título ', '').replace(title.title_number.toLowerCase() + ' - ', '')} na Lei de Uso e Ocupação do Solo de Porto Alegre.`,
          keywords: title.keywords
        })
        .eq('article_number', title.article_number)
        .eq('document_type', 'LUOS');
      
      if (!error) {
        console.log(`  ✅ ${title.title_name} atualizado!`);
      } else {
        console.error(`  ❌ Erro ao atualizar:`, error);
      }
    } else {
      console.log(`  💾 Inserindo ${title.title_name}...`);
      
      const newTitle = {
        document_type: 'LUOS',
        article_number: title.article_number,
        article_text: title.full_name.replace('TÍTULO ', '').replace(title.title_number + ' - ', ''),
        full_content: `${title.full_name}\n\nEste título trata das disposições relacionadas a ${title.full_name.toLowerCase().replace('título ', '').replace(title.title_number.toLowerCase() + ' - ', '')} na Lei de Uso e Ocupação do Solo de Porto Alegre.`,
        keywords: title.keywords
      };
      
      const { error } = await supabase
        .from('legal_articles')
        .insert(newTitle);
      
      if (error) {
        console.error(`  ❌ Erro ao inserir:`, error);
      } else {
        console.log(`  ✅ ${title.title_name} inserido com sucesso!`);
      }
    }
    
    // 2. Gerar embedding
    console.log(`  🔮 Gerando embedding para ${title.title_name}...`);
    
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.error('  ❌ OPENAI_API_KEY não configurada');
      continue;
    }
    
    const embeddingText = `${title.full_name} LUOS Porto Alegre Lei de Uso e Ocupação do Solo ${title.keywords.join(' ')}`;
    
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: embeddingText,
      }),
    });
    
    if (embeddingResponse.ok) {
      const embData = await embeddingResponse.json();
      const embedding = embData.data[0].embedding;
      
      const { error } = await supabase
        .from('legal_articles')
        .update({ embedding })
        .eq('article_number', title.article_number)
        .eq('document_type', 'LUOS');
      
      if (!error) {
        console.log(`  ✅ Embedding gerado e salvo!`);
      } else {
        console.error(`  ❌ Erro ao salvar embedding:`, error);
      }
    } else {
      console.error(`  ❌ Erro ao gerar embedding:`, embeddingResponse.status);
    }
  }
  
  // 3. Verificar resultado final
  console.log('\n' + '=' .repeat(60));
  console.log('📊 VERIFICAÇÃO FINAL:\n');
  
  const { data: allTitles } = await supabase
    .from('legal_articles')
    .select('article_number, full_content')
    .eq('document_type', 'LUOS')
    .gte('article_number', 9200)
    .lte('article_number', 9400)
    .order('article_number');
  
  const foundTitles = [];
  allTitles?.forEach(t => {
    const match = t.full_content?.match(/TÍTULO\s+([IVX]+)/);
    if (match && !foundTitles.some(f => f.title === match[0])) {
      foundTitles.push({
        title: match[0],
        article_number: t.article_number
      });
    }
  });
  
  console.log('Títulos encontrados na base:');
  foundTitles.forEach(t => {
    console.log(`  - ${t.title} (Art#${t.article_number})`);
  });
  
  // Verificar se todos os 10 títulos estão presentes
  const expectedTitles = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  const missingTitles = expectedTitles.filter(num => 
    !foundTitles.some(f => f.title.includes(num))
  );
  
  if (missingTitles.length === 0) {
    console.log('\n✅ TODOS OS 10 TÍTULOS ESTÃO PRESENTES NA BASE!');
  } else {
    console.log(`\n⚠️ Ainda faltam os títulos: ${missingTitles.join(', ')}`);
  }
  
  console.log('\n✅ PROCESSO CONCLUÍDO!');
}

insertMissingTitles().catch(console.error);