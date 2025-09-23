#!/usr/bin/env node
/**
 * Inserir Título X - Das Disposições Finais e Transitórias
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function insertTituloX() {
  console.log('📝 INSERINDO TÍTULO X - DAS DISPOSIÇÕES FINAIS E TRANSITÓRIAS\n');
  
  // 1. Verificar se já existe
  const { data: existing } = await supabase
    .from('legal_articles')
    .select('*')
    .eq('document_type', 'LUOS')
    .eq('article_number', 9350)
    .single();
  
  if (existing) {
    console.log('⚠️ Título X já existe. Atualizando...');
    
    const { error } = await supabase
      .from('legal_articles')
      .update({
        article_text: 'Das Disposições Finais e Transitórias',
        full_content: 'TÍTULO X - Das Disposições Finais e Transitórias\n\nEste título estabelece as disposições finais e transitórias da Lei de Uso e Ocupação do Solo de Porto Alegre (LUOS), tratando das regras de transição e aplicação da lei.\n\nO Título X compreende os artigos 119 a 121:\n\n- Art. 119º: Trata dos projetos protocolados antes da entrada em vigor da Lei\n- Art. 120º: Trata das edificações existentes há mais de 15 anos\n- Art. 121º: Trata dos processos de modificação de projetos aprovados',
        keywords: ['LUOS', 'Título X', 'TÍTULO X', 'Disposições Finais', 'Disposições Transitórias', 'Art. 119', 'Art. 120', 'Art. 121', 'transição', 'vigência']
      })
      .eq('article_number', 9350)
      .eq('document_type', 'LUOS');
    
    if (!error) {
      console.log('✅ Título X atualizado com sucesso!');
    } else {
      console.error('❌ Erro ao atualizar:', error);
    }
  } else {
    console.log('💾 Inserindo novo registro do Título X...');
    
    const tituloX = {
      document_type: 'LUOS',
      article_number: 9350,  // Número especial para Título X (após Título VI que é 9302)
      article_text: 'Das Disposições Finais e Transitórias',
      full_content: 'TÍTULO X - Das Disposições Finais e Transitórias\n\nEste título estabelece as disposições finais e transitórias da Lei de Uso e Ocupação do Solo de Porto Alegre (LUOS), tratando das regras de transição e aplicação da lei.\n\nO Título X compreende os artigos 119 a 121:\n\n- Art. 119º: Trata dos projetos protocolados antes da entrada em vigor da Lei\n- Art. 120º: Trata das edificações existentes há mais de 15 anos\n- Art. 121º: Trata dos processos de modificação de projetos aprovados',
      keywords: ['LUOS', 'Título X', 'TÍTULO X', 'Disposições Finais', 'Disposições Transitórias', 'Art. 119', 'Art. 120', 'Art. 121', 'transição', 'vigência']
    };
    
    const { error } = await supabase
      .from('legal_articles')
      .insert(tituloX);
    
    if (error) {
      console.error('❌ Erro ao inserir:', error);
    } else {
      console.log('✅ Título X inserido com sucesso!');
    }
  }
  
  // 2. Gerar embedding
  console.log('\n🔮 Gerando embedding para o Título X...');
  
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    console.error('❌ OPENAI_API_KEY não configurada');
    return;
  }
  
  const embeddingText = 'TÍTULO X Das Disposições Finais e Transitórias LUOS Porto Alegre Lei de Uso e Ocupação do Solo artigos 119 120 121 projetos protocolados vigência transição edificações existentes modificação processos administrativos';
  
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
    
    // Atualizar com embedding
    const { error } = await supabase
      .from('legal_articles')
      .update({ embedding })
      .eq('article_number', 9350)
      .eq('document_type', 'LUOS');
    
    if (!error) {
      console.log('✅ Embedding gerado e salvo!');
    } else {
      console.error('❌ Erro ao salvar embedding:', error);
    }
  } else {
    console.error('❌ Erro ao gerar embedding:', embeddingResponse.status);
  }
  
  // 3. Verificar resultado
  console.log('\n📊 Verificando inserção...');
  
  const { data: verification } = await supabase
    .from('legal_articles')
    .select('article_number, document_type, article_text, keywords')
    .eq('document_type', 'LUOS')
    .eq('article_number', 9350)
    .single();
  
  if (verification) {
    console.log('✅ Título X verificado na base:');
    console.log(`   Article Number: ${verification.article_number}`);
    console.log(`   Document Type: ${verification.document_type}`);
    console.log(`   Article Text: ${verification.article_text}`);
    console.log(`   Keywords: ${verification.keywords?.join(', ')}`);
  }
  
  // 4. Verificar artigos relacionados
  console.log('\n📖 Artigos do Título X (119-121):');
  
  const { data: relatedArticles } = await supabase
    .from('legal_articles')
    .select('article_number, article_text')
    .eq('document_type', 'LUOS')
    .in('article_number', [119, 120, 121])
    .order('article_number');
  
  if (relatedArticles) {
    relatedArticles.forEach(a => {
      console.log(`   Art. ${a.article_number}º: ${a.article_text?.substring(0, 80)}...`);
    });
  }
  
  console.log('\n✅ PROCESSO CONCLUÍDO!');
  console.log('   O Título X agora está disponível na base de conhecimento.');
}

insertTituloX().catch(console.error);