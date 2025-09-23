#!/usr/bin/env node
/**
 * Verificar e inserir Título X - Disposições Finais e Transitórias
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyAndInsertTituloX() {
  console.log('🔍 Verificando Título X - Disposições Finais e Transitórias\n');
  
  // 1. Verificar se já existe
  const { data: existing } = await supabase
    .from('legal_articles')
    .select('*')
    .eq('document_type', 'LUOS')
    .or('full_content.ilike.%título x%,full_content.ilike.%disposições finais%')
    .limit(5);
  
  if (existing && existing.length > 0) {
    console.log('✅ Já existem registros sobre Disposições Finais:');
    existing.forEach(e => {
      console.log(`  - Art#${e.article_number}: ${e.full_content?.substring(0, 100)}...`);
    });
  }
  
  // 2. Verificar artigos 119-121 (Disposições Finais)
  console.log('\n📖 Artigos das Disposições Finais e Transitórias (119-121):');
  
  const { data: disposicoes } = await supabase
    .from('legal_articles')
    .select('article_number, full_content')
    .eq('document_type', 'LUOS')
    .in('article_number', [119, 120, 121])
    .order('article_number');
  
  if (disposicoes) {
    disposicoes.forEach(d => {
      console.log(`\nArt. ${d.article_number}º:`);
      console.log(d.full_content);
    });
  }
  
  // 3. Inserir registro do Título X se não existir
  console.log('\n\n💾 Inserindo Título X na base de dados...');
  
  // Check if Título X exists
  const { data: tituloXExists } = await supabase
    .from('legal_articles')
    .select('*')
    .eq('document_type', 'LUOS')
    .eq('article_number', 9350)  // Using a specific number for Título X
    .single();
  
  if (!tituloXExists) {
    const tituloX = {
      document_type: 'LUOS',
      article_number: 9350,  // Special number for Título X
      article_text: 'Das Disposições Finais e Transitórias',
      full_content: 'TÍTULO X - Das Disposições Finais e Transitórias\n\nEste título trata das disposições finais e transitórias da Lei de Uso e Ocupação do Solo de Porto Alegre (LUOS), estabelecendo regras de transição e aplicação da lei. Compreende os artigos 119 a 121.',
      keywords: ['LUOS', 'Título X', 'Disposições Finais', 'Disposições Transitórias', 'Art. 119', 'Art. 120', 'Art. 121'],
      hierarchy_level: 'titulo'
    };
    
    const { error } = await supabase
      .from('legal_articles')
      .insert(tituloX);
    
    if (error) {
      console.error('❌ Erro ao inserir:', error);
    } else {
      console.log('✅ Título X inserido com sucesso!');
    }
  } else {
    console.log('ℹ️ Título X já existe no banco');
  }
  
  // 4. Criar embedding para o Título X
  console.log('\n🔮 Criando embedding para Título X...');
  
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-ada-002',
      input: 'TÍTULO X Das Disposições Finais e Transitórias LUOS Porto Alegre artigos 119 120 121 transição aplicação lei',
    }),
  });
  
  if (embeddingResponse.ok) {
    const embData = await embeddingResponse.json();
    const embedding = embData.data[0].embedding;
    
    // Update with embedding
    const { error } = await supabase
      .from('legal_articles')
      .update({ embedding })
      .eq('article_number', 9350)
      .eq('document_type', 'LUOS');
    
    if (!error) {
      console.log('✅ Embedding criado e salvo!');
    }
  }
}

verifyAndInsertTituloX().catch(console.error);