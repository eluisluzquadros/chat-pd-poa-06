#!/usr/bin/env node

/**
 * Diagnóstico completo do pipeline RAG
 * Identifica onde está o problema real
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import chalk from 'chalk';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY);

async function checkDocumentSections() {
  console.log(chalk.cyan.bold('\n📚 1. VERIFICANDO DOCUMENT_SECTIONS\n'));
  
  // Contar documentos
  const { count: totalDocs } = await supabase
    .from('document_sections')
    .select('*', { count: 'exact', head: true });
  
  console.log(`Total de seções: ${totalDocs || 0}`);
  
  // Verificar se temos LUOS e PDUS
  const { data: sources } = await supabase
    .from('document_sections')
    .select('metadata')
    .limit(100);
  
  const sourceTypes = new Set();
  if (sources) {
    sources.forEach(doc => {
      if (doc.metadata?.source) {
        sourceTypes.add(doc.metadata.source);
      }
    });
  }
  
  console.log(`Fontes encontradas: ${Array.from(sourceTypes).join(', ')}`);
  
  // Buscar artigos específicos
  const testArticles = [
    { search: 'Art. 90', context: 'EIV' },
    { search: 'Art. 89', context: 'EIV' },
    { search: 'Art. 81', context: 'Certificação' },
    { search: 'Art. 92', context: 'ZEIS' }
  ];
  
  console.log('\n🔍 Buscando artigos específicos:');
  for (const test of testArticles) {
    const { data, count } = await supabase
      .from('document_sections')
      .select('content', { count: 'exact' })
      .ilike('content', `%${test.search}%`)
      .ilike('content', `%${test.context}%`)
      .limit(1);
    
    if (data && data.length > 0) {
      console.log(chalk.green(`✅ ${test.search} (${test.context}): Encontrado`));
      console.log(`   Trecho: ${data[0].content.substring(0, 100)}...`);
    } else {
      console.log(chalk.red(`❌ ${test.search} (${test.context}): NÃO encontrado`));
    }
  }
  
  return totalDocs > 0;
}

async function testVectorSearch() {
  console.log(chalk.cyan.bold('\n🔍 2. TESTANDO VECTOR SEARCH\n'));
  
  const testQueries = [
    'Qual artigo define o Estudo de Impacto de Vizinhança EIV',
    'Certificação em Sustentabilidade Ambiental LUOS',
    'ZEIS Zonas Especiais de Interesse Social'
  ];
  
  for (const query of testQueries) {
    console.log(`\nTestando: "${query}"`);
    
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/enhanced-vector-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          query: query,
          limit: 3,
          threshold: 0.5
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.results && result.results.length > 0) {
          console.log(chalk.green(`✅ ${result.results.length} resultados encontrados`));
          result.results.slice(0, 2).forEach((r, idx) => {
            console.log(`   ${idx + 1}. Score: ${r.similarity?.toFixed(3) || 'N/A'}`);
            console.log(`      ${r.content.substring(0, 100)}...`);
          });
        } else {
          console.log(chalk.red('❌ Nenhum resultado'));
        }
      } else {
        console.log(chalk.red(`❌ Erro HTTP ${response.status}`));
      }
    } catch (error) {
      console.log(chalk.red(`❌ Erro: ${error.message}`));
    }
  }
}

async function testQueryAnalyzer() {
  console.log(chalk.cyan.bold('\n🧠 3. TESTANDO QUERY ANALYZER\n'));
  
  const testQueries = [
    'Qual artigo define o EIV?',
    'Qual a altura máxima em Boa Vista?',
    'O que é gentrificação?'
  ];
  
  for (const query of testQueries) {
    console.log(`\nAnalisando: "${query}"`);
    
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/query-analyzer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ query })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`  Intent: ${result.intent || 'N/A'}`);
        console.log(`  Categoria: ${result.category || 'N/A'}`);
        console.log(`  Precisa SQL: ${result.needsStructuredData ? 'Sim' : 'Não'}`);
        console.log(`  Precisa Vector: ${result.needsConceptualSearch ? 'Sim' : 'Não'}`);
      } else {
        console.log(chalk.red(`❌ Erro HTTP ${response.status}`));
      }
    } catch (error) {
      console.log(chalk.red(`❌ Erro: ${error.message}`));
    }
  }
}

async function testFullPipeline() {
  console.log(chalk.cyan.bold('\n🔄 4. TESTANDO PIPELINE COMPLETO\n'));
  
  const criticalTests = [
    {
      query: 'Qual artigo define o Estudo de Impacto de Vizinhança?',
      expected: ['Art. 90', 'LUOS'],
      description: 'Citação Legal EIV'
    },
    {
      query: 'Qual a altura máxima em Boa Vista?',
      expected: ['Boa Vista', 'metros'],
      description: 'Regime Urbanístico'
    },
    {
      query: 'O que são ZEIS?',
      expected: ['Art. 92', 'PDUS'],
      description: 'Citação Legal ZEIS'
    }
  ];
  
  for (const test of criticalTests) {
    console.log(`\n${test.description}: "${test.query}"`);
    
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          query: test.query,
          sessionId: 'diagnostic-test',
          bypassCache: true
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        const hasExpected = test.expected.every(keyword => 
          result.response && result.response.includes(keyword)
        );
        
        if (hasExpected) {
          console.log(chalk.green('✅ Resposta correta'));
        } else {
          console.log(chalk.red('❌ Resposta incorreta'));
          const missing = test.expected.filter(k => !result.response.includes(k));
          console.log(`   Faltando: ${missing.join(', ')}`);
        }
        console.log(`   Preview: ${result.response.substring(0, 150)}...`);
      } else {
        console.log(chalk.red(`❌ Erro HTTP ${response.status}`));
      }
    } catch (error) {
      console.log(chalk.red(`❌ Erro: ${error.message}`));
    }
  }
}

async function checkEmbeddings() {
  console.log(chalk.cyan.bold('\n🧮 5. VERIFICANDO EMBEDDINGS\n'));
  
  // Verificar se temos embeddings
  const { data: sample } = await supabase
    .from('document_sections')
    .select('id, embedding')
    .not('embedding', 'is', null)
    .limit(5);
  
  if (sample && sample.length > 0) {
    console.log(`✅ Embeddings encontrados: ${sample.length} amostras verificadas`);
    
    // Verificar dimensão
    if (sample[0].embedding) {
      const dimension = sample[0].embedding.length;
      console.log(`   Dimensão: ${dimension}`);
      console.log(`   Modelo provável: ${dimension === 1536 ? 'OpenAI text-embedding-ada-002' : 'Outro'}`);
    }
  } else {
    console.log(chalk.red('❌ Nenhum embedding encontrado!'));
    console.log('   Documentos precisam ser reprocessados');
  }
}

async function main() {
  console.log(chalk.cyan.bold('=' .repeat(60)));
  console.log(chalk.cyan.bold('   DIAGNÓSTICO COMPLETO DO PIPELINE RAG'));
  console.log(chalk.cyan.bold('=' .repeat(60)));
  
  const hasDocuments = await checkDocumentSections();
  await testVectorSearch();
  await testQueryAnalyzer();
  await checkEmbeddings();
  await testFullPipeline();
  
  console.log(chalk.cyan.bold('\n' + '=' .repeat(60)));
  console.log(chalk.yellow.bold('\n📊 DIAGNÓSTICO FINAL:\n'));
  
  console.log('🔍 Análise dos Componentes:');
  console.log('1. Document Sections: ' + (hasDocuments ? '✅ Populado' : '❌ Vazio'));
  console.log('2. Vector Search: Verificar resultados acima');
  console.log('3. Query Analyzer: Verificar classificação');
  console.log('4. Embeddings: Verificar se existem');
  console.log('5. Pipeline Completo: Verificar taxa de acerto');
  
  console.log(chalk.green.bold('\n📋 RECOMENDAÇÕES:\n'));
  
  if (!hasDocuments) {
    console.log('1. 🚨 CRÍTICO: Reprocessar documentos');
    console.log('   npm run kb:reprocess');
  }
  
  console.log('2. Verificar logs das Edge Functions no Supabase');
  console.log('3. Testar response-synthesizer original (não o simple)');
  console.log('4. Verificar API keys para LLMs');
  console.log('5. Aumentar timeouts se necessário');
  
  console.log(chalk.cyan('\n' + '=' .repeat(60)));
}

main().catch(error => {
  console.error(chalk.red('Erro fatal:', error));
  process.exit(1);
});