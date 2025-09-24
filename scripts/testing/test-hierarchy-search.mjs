#!/usr/bin/env node
/**
 * Teste de busca por elementos hierárquicos (Títulos, Capítulos, Seções)
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkHierarchicalElements() {
  console.log('🔍 Verificando elementos hierárquicos no banco de dados...\n');
  
  // 1. Contar elementos por nível hierárquico
  const levels = ['titulo', 'capitulo', 'secao', 'subsecao', 'artigo'];
  
  for (const level of levels) {
    const { data, count, error } = await supabase
      .from('legal_articles')
      .select('*', { count: 'exact', head: true })
      .eq('hierarchy_level', level);
    
    console.log(`📊 ${level.toUpperCase()}: ${count || 0} elementos`);
  }
  
  // 2. Buscar Título X da LUOS
  console.log('\n📖 Buscando "Título X" da LUOS...');
  
  const { data: titles } = await supabase
    .from('legal_articles')
    .select('*')
    .eq('document_type', 'LUOS')
    .eq('hierarchy_level', 'titulo')
    .or('full_content.ilike.%título x%,full_content.ilike.%título 10%,article_number.eq.10000')
    .limit(5);
  
  if (titles && titles.length > 0) {
    console.log(`✅ Encontrados ${titles.length} títulos:`);
    titles.forEach(t => {
      console.log(`  - ID: ${t.id}, Art#: ${t.article_number}`);
      console.log(`    ${t.full_content?.substring(0, 150)}...`);
    });
  } else {
    console.log('❌ Nenhum título encontrado');
  }
  
  // 3. Buscar Artigo 1 do PDUS
  console.log('\n📖 Buscando "Artigo 1" do PDUS...');
  
  const { data: pdusArt1 } = await supabase
    .from('legal_articles')
    .select('*')
    .eq('document_type', 'PDUS')
    .eq('article_number', 1);
  
  if (pdusArt1 && pdusArt1.length > 0) {
    console.log(`✅ Art. 1 do PDUS encontrado:`);
    console.log(`  ${pdusArt1[0].full_content?.substring(0, 200)}...`);
  } else {
    console.log('❌ Art. 1 do PDUS não encontrado');
  }
  
  // 4. Verificar estrutura dos dados
  console.log('\n📊 Amostra de estrutura dos dados:');
  
  const { data: sample } = await supabase
    .from('legal_articles')
    .select('id, document_type, article_number, hierarchy_level, parent_id, full_content')
    .in('hierarchy_level', ['titulo', 'capitulo', 'secao'])
    .limit(3);
  
  if (sample) {
    sample.forEach(s => {
      console.log(`\n[${s.document_type}] Level: ${s.hierarchy_level}, Art#: ${s.article_number}`);
      console.log(`  Parent: ${s.parent_id || 'none'}`);
      console.log(`  Content: ${s.full_content?.substring(0, 100)}...`);
    });
  }
}

async function testHierarchicalQueries() {
  console.log('\n\n🚀 TESTANDO QUERIES HIERÁRQUICAS NA API\n');
  
  const queries = [
    'sobre o que se trata o título X da LUOS?',
    'o que diz o título 10 da LUOS?',
    'quais são as disposições do título das disposições finais e transitórias?',
    'resuma o artigo 1 do plano diretor',
    'o que estabelece o capítulo I da LUOS?',
    'quais são as seções do título II?'
  ];
  
  for (const query of queries) {
    console.log(`\n📤 Query: "${query}"`);
    console.log('-'.repeat(60));
    
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
      
      // Verificar se encontrou informações
      const responseText = data.response.toLowerCase();
      const notFound = responseText.includes('não inclui') || 
                       responseText.includes('não encontrei') ||
                       responseText.includes('não tenho') ||
                       responseText.includes('não posso fornecer');
      
      if (notFound) {
        console.log('❌ FALHA: Sistema diz não ter a informação');
      } else {
        console.log('✅ SUCESSO: Sistema forneceu uma resposta');
      }
      
      console.log(`📊 Sources:`, data.sources);
      console.log(`💬 Resposta (200 chars): ${data.response.substring(0, 200)}...`);
    } else {
      console.error('❌ API error:', response.status);
    }
    
    // Delay entre requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

async function analyzeDataStructure() {
  console.log('\n\n📊 ANÁLISE DA ESTRUTURA DE DADOS\n');
  
  // Verificar como os títulos estão armazenados
  const { data: uniqueArticleNumbers } = await supabase
    .from('legal_articles')
    .select('article_number, hierarchy_level, document_type')
    .order('article_number', { ascending: true });
  
  if (uniqueArticleNumbers) {
    // Agrupar por ranges
    const ranges = {
      '1-999': [],
      '1000-8999': [],
      '9000-9999': [],
      '10000+': []
    };
    
    uniqueArticleNumbers.forEach(item => {
      const num = item.article_number;
      if (num < 1000) ranges['1-999'].push(item);
      else if (num < 9000) ranges['1000-8999'].push(item);
      else if (num < 10000) ranges['9000-9999'].push(item);
      else ranges['10000+'].push(item);
    });
    
    console.log('📈 Distribuição de article_number:');
    Object.entries(ranges).forEach(([range, items]) => {
      if (items.length > 0) {
        console.log(`  ${range}: ${items.length} items`);
        // Mostrar alguns exemplos
        const samples = items.slice(0, 3);
        samples.forEach(s => {
          console.log(`    - ${s.article_number}: ${s.hierarchy_level} (${s.document_type})`);
        });
      }
    });
  }
}

// Executar todos os testes
async function runAllTests() {
  await checkHierarchicalElements();
  await analyzeDataStructure();
  await testHierarchicalQueries();
  
  console.log('\n\n✅ Testes concluídos!');
}

runAllTests().catch(console.error);