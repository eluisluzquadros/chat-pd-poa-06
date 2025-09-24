#!/usr/bin/env node

/**
 * TESTE DO VECTOR SEARCH - VERSÃO CORRIGIDA
 * Verifica se a busca vetorial está funcionando após conversão
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

async function checkEmbeddingStatus() {
  console.log(chalk.cyan.bold('\n📊 VERIFICANDO STATUS DOS EMBEDDINGS\n'));
  
  try {
    // Verificar tipo da coluna diretamente no PostgreSQL
    const { data: columnInfo, error: colError } = await supabase.rpc('get_column_type', {
      table_name: 'document_sections',
      column_name: 'embedding'
    }).single();
    
    if (!colError && columnInfo) {
      console.log(`✅ Tipo da coluna embedding: ${chalk.green(columnInfo)}`);
    }
    
    // Contar documentos
    const { count: totalCount } = await supabase
      .from('document_sections')
      .select('*', { count: 'exact', head: true });
    
    const { count: withEmbedding } = await supabase
      .from('document_sections')
      .select('*', { count: 'exact', head: true })
      .not('embedding', 'is', null);
    
    console.log(`Total de documentos: ${totalCount}`);
    console.log(`Com embedding: ${withEmbedding} (${((withEmbedding/totalCount)*100).toFixed(1)}%)`);
    console.log(`Sem embedding: ${totalCount - withEmbedding} (${(((totalCount - withEmbedding)/totalCount)*100).toFixed(1)}%)`);
    
    // Pegar uma amostra para verificar formato
    const { data: sample } = await supabase
      .from('document_sections')
      .select('id, embedding')
      .not('embedding', 'is', null)
      .limit(1);
    
    if (sample && sample[0]) {
      const emb = sample[0].embedding;
      if (typeof emb === 'string' && emb.startsWith('[')) {
        // É um vector PostgreSQL (string formatada)
        const values = emb.slice(1, -1).split(',').map(v => parseFloat(v));
        console.log(`✅ Formato: Vector PostgreSQL com ${chalk.green(values.length)} dimensões`);
        console.log(`   Primeiros valores: [${values.slice(0, 3).map(v => v.toFixed(4)).join(', ')}...]`);
      } else if (Array.isArray(emb)) {
        console.log(`✅ Formato: Array com ${chalk.green(emb.length)} dimensões`);
      } else {
        console.log(chalk.yellow(`⚠️ Formato desconhecido: ${typeof emb}`));
      }
    }
    
    return true;
  } catch (error) {
    console.log(chalk.red('❌ Erro ao verificar status:'), error.message);
    return false;
  }
}

async function testRPCFunction() {
  console.log(chalk.cyan.bold('\n🔍 TESTANDO FUNÇÃO RPC match_document_sections\n'));
  
  try {
    // Gerar embedding de teste
    const testQuery = "Estudo de Impacto de Vizinhança EIV artigo LUOS PDUS";
    console.log(`Gerando embedding para: "${testQuery}"`);
    
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: testQuery,
    });
    
    const queryEmbedding = response.data[0].embedding;
    console.log(`✅ Embedding gerado: ${queryEmbedding.length} dimensões`);
    
    // Testar função RPC
    console.log('Chamando função RPC...');
    const { data, error } = await supabase.rpc('match_document_sections', {
      query_embedding: queryEmbedding,
      match_threshold: 0.5,
      match_count: 10
    });
    
    if (error) {
      console.log(chalk.red('❌ Erro na função RPC:'), error);
      return false;
    }
    
    if (data && data.length > 0) {
      console.log(chalk.green(`✅ Função RPC funcionando! ${data.length} resultados retornados`));
      console.log('\nTop 5 resultados com similaridade:');
      data.slice(0, 5).forEach((result, idx) => {
        console.log(`\n${idx + 1}. ${chalk.yellow(`Similaridade: ${result.similarity.toFixed(4)}`)} | ID: ${result.id}`);
        console.log(`   ${result.content.substring(0, 200).replace(/\n/g, ' ')}...`);
        if (result.metadata) {
          console.log(`   Metadata: ${JSON.stringify(result.metadata).substring(0, 100)}`);
        }
      });
      return true;
    } else {
      console.log(chalk.yellow('⚠️ Função RPC retornou 0 resultados'));
      console.log('Isso pode indicar que:');
      console.log('- Os embeddings não estão corretos');
      console.log('- O threshold está muito alto');
      console.log('- A função não está configurada corretamente');
      return false;
    }
  } catch (error) {
    console.log(chalk.red('❌ Erro ao testar RPC:'), error);
    return false;
  }
}

async function testEnhancedVectorSearch() {
  console.log(chalk.cyan.bold('\n🔍 TESTANDO ENHANCED-VECTOR-SEARCH EDGE FUNCTION\n'));
  
  const testQueries = [
    'Qual artigo define o Estudo de Impacto de Vizinhança EIV na LUOS',
    'O que são ZEIS Zonas Especiais de Interesse Social no PDUS',
    'Certificação em Sustentabilidade Ambiental Porto Alegre'
  ];
  
  let successCount = 0;
  
  for (const query of testQueries) {
    console.log(`\n📝 Testando: "${query}"`);
    
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/enhanced-vector-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          query: query,
          limit: 5,
          threshold: 0.5
        })
      });
      
      const responseText = await response.text();
      
      if (!response.ok) {
        console.log(chalk.red(`❌ Erro HTTP ${response.status}:`));
        console.log(responseText.substring(0, 300));
        continue;
      }
      
      const result = JSON.parse(responseText);
      
      if (result.results && result.results.length > 0) {
        console.log(chalk.green(`✅ ${result.results.length} resultados encontrados`));
        console.log(`   Top resultado (similaridade ${result.results[0].similarity?.toFixed(3) || 'N/A'}):`);
        console.log(`   ${result.results[0].content.substring(0, 150).replace(/\n/g, ' ')}...`);
        successCount++;
      } else if (result.error) {
        console.log(chalk.red('❌ Erro retornado:'), result.error);
      } else {
        console.log(chalk.yellow('⚠️ Nenhum resultado retornado'));
        console.log('Response:', responseText.substring(0, 200));
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
      query: 'Qual artigo da LUOS define o Estudo de Impacto de Vizinhança?',
      expectedKeywords: ['Art. 90', 'EIV', 'LUOS'],
      description: 'Verificar artigo correto do EIV'
    },
    {
      query: 'O que são ZEIS segundo o PDUS?',
      expectedKeywords: ['ZEIS', 'Art. 92', 'Interesse Social'],
      description: 'Definição de ZEIS no PDUS'
    },
    {
      query: 'Qual a altura máxima permitida no bairro Boa Vista?',
      expectedKeywords: ['Boa Vista', 'metros', 'altura'],
      description: 'Parâmetros urbanísticos de Boa Vista'
    }
  ];
  
  let successCount = 0;
  
  for (const test of criticalTests) {
    console.log(`\n📝 ${test.description}`);
    console.log(`   Query: "${test.query}"`);
    
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          query: test.query,
          sessionId: 'test-vector-' + Date.now(),
          bypassCache: true,
          model: 'gpt-3.5-turbo'
        })
      });
      
      const responseText = await response.text();
      
      if (!response.ok) {
        console.log(chalk.red(`❌ Erro HTTP ${response.status}`));
        console.log(responseText.substring(0, 300));
        continue;
      }
      
      const result = JSON.parse(responseText);
      
      if (result.response) {
        // Verificar keywords esperadas
        const foundKeywords = test.expectedKeywords.filter(keyword => 
          result.response.toLowerCase().includes(keyword.toLowerCase())
        );
        
        if (foundKeywords.length === test.expectedKeywords.length) {
          console.log(chalk.green('✅ Resposta contém todas as keywords esperadas'));
          successCount++;
        } else {
          const missing = test.expectedKeywords.filter(k => 
            !result.response.toLowerCase().includes(k.toLowerCase())
          );
          console.log(chalk.yellow(`⚠️ Faltando keywords: ${missing.join(', ')}`));
        }
        
        console.log(`\n   Resposta: ${result.response.substring(0, 250)}...`);
        
        if (result.debug) {
          console.log(chalk.gray(`   Debug: Contextos usados: ${result.debug.contextsUsed || 0}`));
        }
      } else {
        console.log(chalk.red('❌ Sem resposta do pipeline'));
        console.log('Result:', JSON.stringify(result).substring(0, 200));
      }
      
    } catch (error) {
      console.log(chalk.red('❌ Erro:'), error.message);
    }
  }
  
  return successCount === criticalTests.length;
}

// Criar função RPC auxiliar se não existir
async function ensureRPCFunction() {
  const createFunction = `
    CREATE OR REPLACE FUNCTION get_column_type(table_name text, column_name text)
    RETURNS text
    LANGUAGE plpgsql
    AS $$
    DECLARE
      col_type text;
    BEGIN
      SELECT udt_name INTO col_type
      FROM information_schema.columns
      WHERE table_name = $1 AND column_name = $2;
      RETURN col_type;
    END;
    $$;
  `;
  
  try {
    await supabase.rpc('query', { query: createFunction });
  } catch (e) {
    // Ignorar se já existe
  }
}

async function main() {
  console.log(chalk.cyan.bold('=' .repeat(70)));
  console.log(chalk.cyan.bold('   🧪 TESTE DO VECTOR SEARCH - PLANO DIRETOR POA (CORRIGIDO)'));
  console.log(chalk.cyan.bold('=' .repeat(70)));
  
  await ensureRPCFunction();
  
  const statusOk = await checkEmbeddingStatus();
  const rpcWorks = await testRPCFunction();
  const vectorSearchWorks = await testEnhancedVectorSearch();
  const pipelineWorks = await testFullPipeline();
  
  console.log(chalk.cyan.bold('\n' + '=' .repeat(70)));
  console.log(chalk.cyan.bold('   📊 RESULTADO FINAL DOS TESTES'));
  console.log(chalk.cyan.bold('=' .repeat(70) + '\n'));
  
  console.log(`Status dos Embeddings: ${statusOk ? '✅' : '❌'}`);
  console.log(`Função RPC (match_document_sections): ${rpcWorks ? '✅' : '❌'}`);
  console.log(`Enhanced Vector Search: ${vectorSearchWorks ? '✅' : '❌'}`);
  console.log(`Pipeline Completo (agentic-rag): ${pipelineWorks ? '✅' : '❌'}`);
  
  if (statusOk && rpcWorks && vectorSearchWorks && pipelineWorks) {
    console.log(chalk.green.bold('\n🎉 SISTEMA RAG FUNCIONANDO PERFEITAMENTE!'));
    console.log('\n✅ Próximos passos:');
    console.log('1. Executar teste completo com 121 casos: npm run test:qa');
    console.log('2. Verificar accuracy no admin panel: /admin/quality');
    console.log('3. Remover response-synthesizer-simple se ainda existir');
  } else {
    console.log(chalk.yellow.bold('\n⚠️ AINDA HÁ PROBLEMAS A RESOLVER'));
    
    if (!statusOk) {
      console.log('\n❌ Status dos embeddings com problema');
    }
    
    if (!rpcWorks) {
      console.log('\n❌ Função RPC não está funcionando corretamente');
      console.log('   Verifique se os embeddings estão como vector(1536)');
    }
    
    if (!vectorSearchWorks) {
      console.log('\n❌ Enhanced Vector Search Edge Function com problema');
      console.log('   Deploy novamente: npx supabase functions deploy enhanced-vector-search');
    }
    
    if (!pipelineWorks) {
      console.log('\n❌ Pipeline completo não está integrado');
      console.log('   Verifique agentic-rag e response-synthesizer');
    }
  }
}

main().catch(error => {
  console.error(chalk.red('\n❌ ERRO FATAL:'), error);
  process.exit(1);
});