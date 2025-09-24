#!/usr/bin/env node
/**
 * Teste específico para Art. 119 da LUOS
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testArticle119() {
  console.log('🔍 Verificando Art. 119 da LUOS no banco de dados...\n');
  
  // 1. Verificar se existe no banco
  const { data: article, error } = await supabase
    .from('legal_articles')
    .select('*')
    .eq('document_type', 'LUOS')
    .eq('article_number', 119)
    .single();
  
  if (error) {
    console.error('❌ Erro ao buscar:', error);
  } else if (article) {
    console.log('✅ Art. 119 da LUOS encontrado no banco:');
    console.log('   ID:', article.id);
    console.log('   Conteúdo:', article.full_content?.substring(0, 200) + '...');
    console.log('   Keywords:', article.keywords);
    console.log('   Tem embedding?', article.embedding ? 'Sim' : 'Não');
  }
  
  // 2. Buscar por texto direto
  console.log('\n📝 Buscando por texto "Art. 119"...');
  const { data: textSearch } = await supabase
    .from('legal_articles')
    .select('id, document_type, article_number, full_content')
    .or('full_content.ilike.%art. 119%,article_text.ilike.%art. 119%')
    .limit(3);
  
  if (textSearch && textSearch.length > 0) {
    console.log(`Encontrados ${textSearch.length} resultados com "Art. 119"`);
    textSearch.forEach(doc => {
      console.log(`  - ${doc.document_type} Art. ${doc.article_number}: ${doc.full_content?.substring(0, 100)}...`);
    });
  }
  
  // 3. Testar a API
  console.log('\n🚀 Testando API com a pergunta...\n');
  
  const queries = [
    'do que se trata o Art. 119 da LUOS?',
    'Art. 119 LUOS',
    'artigo 119 lei de uso e ocupação do solo'
  ];
  
  for (const query of queries) {
    console.log(`\n📤 Query: "${query}"`);
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        message: query,
        bypassCache: true,
        model: 'openai/gpt-4-turbo-preview'
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('📊 Sources:', data.sources);
      console.log('🎯 Confidence:', data.confidence);
      console.log('💬 Response preview:', data.response?.substring(0, 300) + '...');
    } else {
      console.error('❌ API error:', response.status);
    }
  }
  
  // 4. Verificar se a busca vetorial funciona
  console.log('\n🔍 Testando busca vetorial...');
  
  // Criar embedding para "Art. 119 LUOS"
  const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-ada-002',
      input: 'Art. 119 da LUOS',
    }),
  });
  
  if (embeddingResponse.ok) {
    const embData = await embeddingResponse.json();
    const embedding = embData.data[0].embedding;
    
    try {
      // Tentar usar a RPC
      const { data: vectorResults, error: rpcError } = await supabase.rpc('match_legal_articles', {
        query_embedding: embedding,
        match_threshold: 0.5,
        match_count: 5
      });
      
      if (rpcError) {
        console.log('⚠️ RPC error:', rpcError.message);
      } else if (vectorResults) {
        console.log(`✅ Busca vetorial retornou ${vectorResults.length} resultados:`);
        vectorResults.forEach(r => {
          console.log(`  - ${r.document_type} Art. ${r.article_number} (similarity: ${r.similarity?.toFixed(3)})`);
        });
      }
    } catch (err) {
      console.log('❌ Erro na busca vetorial:', err.message);
    }
  }
}

testArticle119().catch(console.error);