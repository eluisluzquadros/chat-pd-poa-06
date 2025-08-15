#!/usr/bin/env node

/**
 * PASSO 3: TESTAR VECTOR SEARCH
 * Verifica se a busca vetorial está funcionando corretamente
 */

import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';
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
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

async function testRPCFunction() {
  console.log(chalk.cyan.bold('\n🔍 TESTANDO FUNÇÃO RPC match_document_sections\n'));
  
  try {
    // Gerar embedding de teste
    const testQuery = "Estudo de Impacto de Vizinhança EIV artigo LUOS";
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: testQuery,
    });
    
    const queryEmbedding = response.data[0].embedding;
    console.log(`✅ Embedding gerado: ${queryEmbedding.length} dimensões`);
    
    // Testar função RPC
    const { data, error } = await supabase.rpc('match_document_sections', {
      query_embedding: queryEmbedding,
      match_threshold: 0.5,
      match_count: 5
    });
    
    if (error) {
      console.log(chalk.red('❌ Erro na função RPC:'), error.message);
      return false;
    }
    
    if (data && data.length > 0) {
      console.log(chalk.green(`✅ Função RPC funcionando! ${data.length} resultados`));
      console.log('\nTop 3 resultados:');
      data.slice(0, 3).forEach((result, idx) => {
        console.log(`\n${idx + 1}. Similaridade: ${result.similarity.toFixed(3)}`);
        console.log(`   ${result.content.substring(0, 150)}...`);
      });
      return true;
    } else {
      console.log(chalk.yellow('⚠️ Função RPC retornou 0 resultados'));
      return false;
    }
  } catch (error) {
    console.log(chalk.red('❌ Erro ao testar RPC:'), error.message);
    return false;
  }
}

async function testEnhancedVectorSearch() {
  console.log(chalk.cyan.bold('\n🔍 TESTANDO ENHANCED-VECTOR-SEARCH EDGE FUNCTION\n'));
  
  const testQueries = [
    {
      query: 'Qual artigo define o Estudo de Impacto de Vizinhança EIV',
      expectedKeywords: ['Art. 90', 'EIV', 'estudo', 'impacto']
    },
    {
      query: 'Certificação em Sustentabilidade Ambiental LUOS',
      expectedKeywords: ['certificação', 'sustentabilidade', 'ambiental']
    },
    {
      query: 'ZEIS Zonas Especiais de Interesse Social',
      expectedKeywords: ['ZEIS', 'zonas', 'interesse', 'social']
    }
  ];
  
  let successCount = 0;
  
  for (const test of testQueries) {
    console.log(`\nTestando: "${test.query}"`);
    
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/enhanced-vector-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          query: test.query,
          limit: 5,
          threshold: 0.5
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log(chalk.red(`❌ Erro HTTP ${response.status}:`), errorText.substring(0, 200));
        continue;
      }
      
      const result = await response.json();
      
      if (result.results && result.results.length > 0) {
        console.log(chalk.green(`✅ ${result.results.length} resultados encontrados`));
        
        // Verificar se contém keywords esperadas
        const topResult = result.results[0].content.toLowerCase();
        const hasKeywords = test.expectedKeywords.some(keyword => 
          topResult.includes(keyword.toLowerCase())
        );
        
        if (hasKeywords) {
          console.log(chalk.green('   ✅ Conteúdo relevante encontrado'));
          successCount++;
        } else {
          console.log(chalk.yellow('   ⚠️ Conteúdo pode não ser relevante'));
        }
        
        console.log(`   Preview: ${result.results[0].content.substring(0, 150)}...`);
      } else {
        console.log(chalk.red('❌ Nenhum resultado retornado'));
      }
    } catch (error) {
      console.log(chalk.red('❌ Erro:'), error.message);
    }
  }
  
  return successCount > 0;
}

async function testFullPipeline() {
  console.log(chalk.cyan.bold('\n🔄 TESTANDO PIPELINE COMPLETO (agentic-rag)\n'));
  
  const criticalTests = [
    {
      query: 'Qual artigo define o Estudo de Impacto de Vizinhança?',
      expectedInResponse: ['Art. 90', 'EIV'],
      shouldNotContain: ['Art. 89'] // Era o erro anterior
    },
    {
      query: 'O que são ZEIS segundo o PDUS?',
      expectedInResponse: ['Art. 92', 'ZEIS', 'PDUS'],
      shouldNotContain: []
    },
    {
      query: 'Qual a altura máxima em Boa Vista?',
      expectedInResponse: ['Boa Vista', 'altura', 'metros'],
      shouldNotContain: ['Boa Vista do Sul']
    }
  ];
  
  let successCount = 0;
  
  for (const test of criticalTests) {
    console.log(`\nTestando: "${test.query}"`);
    
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          query: test.query,
          sessionId: 'test-vector-search',
          bypassCache: true
        })
      });
      
      if (!response.ok) {
        console.log(chalk.red(`❌ Erro HTTP ${response.status}`));
        continue;
      }
      
      const result = await response.json();
      
      // Verificar se contém o esperado
      const hasExpected = test.expectedInResponse.every(keyword => 
        result.response && result.response.includes(keyword)
      );
      
      // Verificar se NÃO contém o que não deveria
      const hasUnwanted = test.shouldNotContain.some(keyword => 
        result.response && result.response.includes(keyword)
      );
      
      if (hasExpected && !hasUnwanted) {
        console.log(chalk.green('✅ Resposta correta!'));
        successCount++;
      } else {
        if (!hasExpected) {
          const missing = test.expectedInResponse.filter(k => 
            !result.response.includes(k)
          );
          console.log(chalk.red(`❌ Faltando: ${missing.join(', ')}`));
        }
        if (hasUnwanted) {
          console.log(chalk.red(`❌ Contém erro: ${test.shouldNotContain.join(', ')}`));
        }
      }
      
      console.log(`   Preview: ${result.response.substring(0, 200)}...`);
      
    } catch (error) {
      console.log(chalk.red('❌ Erro:'), error.message);
    }
  }
  
  return successCount === criticalTests.length;
}

async function checkStats() {
  console.log(chalk.cyan.bold('\n📊 ESTATÍSTICAS DO SISTEMA\n'));
  
  const { data: stats } = await supabase
    .from('document_sections')
    .select('embedding', { count: 'exact' });
  
  const total = stats?.length || 0;
  const withEmbedding = stats?.filter(s => s.embedding !== null).length || 0;
  const withoutEmbedding = total - withEmbedding;
  
  console.log(`Total de documentos: ${total}`);
  console.log(`Com embedding: ${withEmbedding} (${((withEmbedding/total)*100).toFixed(1)}%)`);
  console.log(`Sem embedding: ${withoutEmbedding} (${((withoutEmbedding/total)*100).toFixed(1)}%)`);
  
  // Verificar dimensões
  if (withEmbedding > 0) {
    const dimensions = new Set();
    stats.filter(s => s.embedding).forEach(s => {
      dimensions.add(s.embedding.length);
    });
    console.log(`Dimensões dos embeddings: ${Array.from(dimensions).join(', ')}`);
  }
}

async function main() {
  console.log(chalk.cyan.bold('=' .repeat(60)));
  console.log(chalk.cyan.bold('   🧪 TESTE DO VECTOR SEARCH - PLANO DIRETOR POA'));
  console.log(chalk.cyan.bold('=' .repeat(60)));
  
  await checkStats();
  
  const rpcWorks = await testRPCFunction();
  const vectorSearchWorks = await testEnhancedVectorSearch();
  const pipelineWorks = await testFullPipeline();
  
  console.log(chalk.cyan.bold('\n' + '=' .repeat(60)));
  console.log(chalk.cyan.bold('   📊 RESULTADO DOS TESTES'));
  console.log(chalk.cyan.bold('=' .repeat(60) + '\n'));
  
  console.log(`Função RPC (match_document_sections): ${rpcWorks ? '✅' : '❌'}`);
  console.log(`Enhanced Vector Search: ${vectorSearchWorks ? '✅' : '❌'}`);
  console.log(`Pipeline Completo (agentic-rag): ${pipelineWorks ? '✅' : '❌'}`);
  
  if (rpcWorks && vectorSearchWorks && pipelineWorks) {
    console.log(chalk.green.bold('\n🎉 VECTOR SEARCH FUNCIONANDO PERFEITAMENTE!'));
    console.log('\nPróximos passos:');
    console.log('1. Remover response-synthesizer-simple (hardcoded)');
    console.log('2. Testar com queries mais complexas');
    console.log('3. Monitorar performance em produção');
  } else {
    console.log(chalk.yellow.bold('\n⚠️ AINDA HÁ PROBLEMAS A RESOLVER'));
    
    if (!rpcWorks) {
      console.log('\n❌ Função RPC não funciona:');
      console.log('   - Execute o SQL em scripts/01-create-vector-search-function.sql');
      console.log('   - Verifique se pgvector está instalado');
    }
    
    if (!vectorSearchWorks) {
      console.log('\n❌ Enhanced Vector Search não funciona:');
      console.log('   - Verifique a edge function');
      console.log('   - Confirme que está usando a função RPC correta');
    }
    
    if (!pipelineWorks) {
      console.log('\n❌ Pipeline completo não funciona:');
      console.log('   - Verifique response-synthesizer');
      console.log('   - Confirme integração entre componentes');
    }
  }
}

main().catch(error => {
  console.error(chalk.red('\n❌ ERRO FATAL:'), error);
  process.exit(1);
});