#!/usr/bin/env node
/**
 * Teste do RAG Completo com toda hierarquia legal
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config({ path: '.env' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testQuery(query, description = '') {
  console.log('\n' + '='.repeat(60));
  console.log(`🔍 ${description || 'Teste'}`);
  console.log(`📝 Query: "${query}"`);
  console.log('='.repeat(60));
  
  try {
    const startTime = Date.now();
    
    // Chamar a Edge Function agentic-rag (que agora usa legal_articles completa)
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        message: query,
        model: 'gpt-4-turbo-preview',
        bypassCache: true
      }),
    });
    
    const data = await response.json();
    const executionTime = Date.now() - startTime;
    
    if (!response.ok) {
      console.error('❌ Erro HTTP:', response.status, data.error);
      return;
    }
    
    if (data) {
      console.log('\n✅ Resposta recebida em', (executionTime / 1000).toFixed(2), 'segundos');
      
      // Mostrar fontes usadas
      if (data.sources) {
        console.log('\n📚 Fontes utilizadas:');
        if (typeof data.sources === 'object') {
          Object.entries(data.sources).forEach(([key, value]) => {
            console.log(`  - ${key}: ${value}`);
          });
        }
      }
      
      // Mostrar resposta
      console.log('\n💬 Resposta:');
      console.log('-'.repeat(60));
      console.log(data.response);
      console.log('-'.repeat(60));
      
      if (data.confidence) {
        console.log(`\n🎯 Confiança: ${(data.confidence * 100).toFixed(1)}%`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
  }
}

async function checkKnowledgeBase() {
  console.log('\n📊 Verificando base de conhecimento...');
  
  // Verificar legal_articles
  const { count: totalCount } = await supabase
    .from('legal_articles')
    .select('*', { count: 'exact', head: true });
  
  const { count: articlesCount } = await supabase
    .from('legal_articles')
    .select('*', { count: 'exact', head: true })
    .lt('article_number', 9000);
  
  const { count: hierarchyCount } = await supabase
    .from('legal_articles')
    .select('*', { count: 'exact', head: true })
    .gte('article_number', 9000);
  
  console.log(`\n✅ Base de conhecimento:`);
  console.log(`  - Total: ${totalCount} elementos`);
  console.log(`  - Artigos (1-340): ${articlesCount}`);
  console.log(`  - Hierarquia (9000+): ${hierarchyCount}`);
  console.log(`    • Partes, Títulos, Capítulos, Seções`);
  console.log(`    • Parágrafos, Incisos, Alíneas`);
}

async function runTests() {
  console.log('🚀 TESTE DO RAG COM BASE DE CONHECIMENTO COMPLETA');
  console.log('=' .repeat(60));
  
  // Verificar base primeiro
  await checkKnowledgeBase();
  
  // Teste 1: Pergunta sobre altura máxima
  await testQuery(
    'Qual a altura máxima permitida para construções em Porto Alegre?',
    'Teste 1: Altura máxima (artigos)'
  );
  
  // Teste 2: Pergunta sobre estrutura hierárquica
  await testQuery(
    'O que estabelece a Parte I do Plano Diretor?',
    'Teste 2: Elemento hierárquico - Parte'
  );
  
  // Teste 3: Pergunta sobre parágrafos
  await testQuery(
    'Quais são os parágrafos do artigo 1º do PDUS sobre o Plano Diretor?',
    'Teste 3: Parágrafos específicos'
  );
  
  // Teste 4: Pergunta sobre LUOS
  await testQuery(
    'O que a LUOS define sobre o zoneamento do município?',
    'Teste 4: LUOS - Zoneamento'
  );
  
  // Teste 5: Pergunta sobre títulos
  await testQuery(
    'Quais são os títulos principais do PDUS?',
    'Teste 5: Estrutura de Títulos'
  );
  
  // Teste 6: Pergunta complexa
  await testQuery(
    'Explique a hierarquia completa do Plano Diretor: partes, títulos, capítulos e seções',
    'Teste 6: Hierarquia completa'
  );
  
  // Teste 7: Busca por seção específica
  await testQuery(
    'O que diz a Seção sobre mobilidade urbana?',
    'Teste 7: Seção específica'
  );
  
  // Teste 8: Busca por capítulo
  await testQuery(
    'Quais são os capítulos sobre instrumentos urbanísticos?',
    'Teste 8: Capítulos temáticos'
  );
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ TESTES CONCLUÍDOS');
  console.log('Sistema RAG usando base completa com 654 elementos:');
  console.log('- 340 artigos (217 PDUS + 123 LUOS)');
  console.log('- 314 elementos hierárquicos');
  console.log('='.repeat(60));
}

// Executar testes
runTests().catch(console.error);