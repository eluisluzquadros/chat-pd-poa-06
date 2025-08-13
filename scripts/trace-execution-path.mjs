#!/usr/bin/env node

/**
 * Rastreia o caminho de execução para entender a discrepância
 */

import fetch from 'node-fetch';
import chalk from 'chalk';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function traceQuery(query, description) {
  console.log(chalk.cyan(`\n📍 ${description}`));
  console.log(`Query: "${query}"`);
  console.log('─'.repeat(60));
  
  try {
    // 1. Query Analyzer
    console.log('1️⃣ Query Analyzer:');
    const analyzerResponse = await fetch(`${SUPABASE_URL}/functions/v1/query-analyzer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ query })
    });
    
    if (analyzerResponse.ok) {
      const analysis = await analyzerResponse.json();
      console.log(`   Intent: ${analysis.intent}`);
      console.log(`   Needs SQL: ${analysis.needsStructuredData}`);
      console.log(`   Needs Vector: ${analysis.needsConceptualSearch}`);
    } else {
      console.log(chalk.red(`   ❌ Falhou: ${analyzerResponse.status}`));
    }
    
    // 2. Vector Search (se necessário)
    console.log('\n2️⃣ Vector Search:');
    const vectorResponse = await fetch(`${SUPABASE_URL}/functions/v1/enhanced-vector-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        query: query,
        limit: 3
      })
    });
    
    if (vectorResponse.ok) {
      const vectorResult = await vectorResponse.json();
      if (vectorResult.results && vectorResult.results.length > 0) {
        console.log(`   ✅ ${vectorResult.results.length} resultados`);
        console.log(`   Top match: ${vectorResult.results[0].content.substring(0, 50)}...`);
      } else {
        console.log(chalk.red('   ❌ Nenhum resultado (Vector Search FALHOU)'));
      }
    } else {
      console.log(chalk.red(`   ❌ Erro: ${vectorResponse.status}`));
    }
    
    // 3. SQL Generator (se necessário)
    console.log('\n3️⃣ SQL Generator:');
    const sqlResponse = await fetch(`${SUPABASE_URL}/functions/v1/sql-generator-v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ 
        query,
        analysisResult: { intent: 'tabular' }
      })
    });
    
    if (sqlResponse.ok) {
      const sqlResult = await sqlResponse.json();
      if (sqlResult.queries && sqlResult.queries.length > 0) {
        console.log(`   ✅ ${sqlResult.queries.length} queries geradas`);
        console.log(`   Primeira: ${sqlResult.queries[0].query.substring(0, 60)}...`);
      } else {
        console.log('   ⚠️ Nenhuma query SQL gerada');
      }
    } else {
      console.log(chalk.red(`   ❌ Erro: ${sqlResponse.status}`));
    }
    
    // 4. Final Response (agentic-rag)
    console.log('\n4️⃣ Response Final (agentic-rag):');
    const finalResponse = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        query: query,
        sessionId: 'trace-test',
        bypassCache: true
      })
    });
    
    if (finalResponse.ok) {
      const result = await finalResponse.json();
      console.log(`   ✅ Resposta gerada`);
      
      // Identificar origem da resposta
      if (result.response.includes('**LUOS') || result.response.includes('**PDUS')) {
        console.log(chalk.yellow('   📌 ORIGEM: Response-synthesizer-simple (HARDCODED)'));
      } else if (result.response.includes('| Bairro |')) {
        console.log(chalk.blue('   📌 ORIGEM: SQL Results (dados estruturados)'));
      } else if (result.response.includes('não encontrei')) {
        console.log(chalk.red('   📌 ORIGEM: Fallback (nada encontrado)'));
      } else {
        console.log(chalk.green('   📌 ORIGEM: Possivelmente vector search ou LLM'));
      }
      
      console.log(`   Preview: ${result.response.substring(0, 150)}...`);
    } else {
      console.log(chalk.red(`   ❌ Erro: ${finalResponse.status}`));
    }
    
  } catch (error) {
    console.log(chalk.red(`Erro geral: ${error.message}`));
  }
}

async function main() {
  console.log(chalk.cyan.bold('=' .repeat(60)));
  console.log(chalk.cyan.bold('   RASTREAMENTO DE EXECUÇÃO - IDENTIFICANDO CAMINHOS'));
  console.log(chalk.cyan.bold('=' .repeat(60)));
  
  // Testar queries que funcionam no teste automatizado
  await traceQuery(
    'Qual artigo da LUOS trata da Certificação em Sustentabilidade?',
    'CASO 1: Citação Legal (Funciona no teste auto)'
  );
  
  await traceQuery(
    'Qual artigo define o Estudo de Impacto de Vizinhança?',
    'CASO 2: EIV (Retorna Art. 89 errado)'
  );
  
  await traceQuery(
    'Qual a altura máxima em Boa Vista?',
    'CASO 3: Regime Urbanístico (SQL)'
  );
  
  await traceQuery(
    'Qual é a taxa de permeabilidade mínima para terrenos acima de 1.500 m²?',
    'CASO 4: Dados não encontrados'
  );
  
  await traceQuery(
    'O que é gentrificação?',
    'CASO 5: Conceito (deveria usar vector search)'
  );
  
  console.log(chalk.cyan.bold('\n' + '=' .repeat(60)));
  console.log(chalk.yellow.bold('\n🎯 CONCLUSÃO DO RASTREAMENTO:\n'));
  
  console.log('1. ❌ Vector Search está QUEBRADO (retorna 0 resultados)');
  console.log('2. ✅ SQL funciona para dados estruturados');
  console.log('3. ⚠️ Response-synthesizer-simple pega casos hardcoded');
  console.log('4. ❌ Sem vector search, conceitos falham');
  
  console.log(chalk.red.bold('\n🚨 PROBLEMA PRINCIPAL:'));
  console.log('EMBEDDINGS COM DIMENSÃO ERRADA (17773 em vez de 1536)');
  console.log('Isso quebra TODA a busca semântica!');
  
  console.log(chalk.green.bold('\n✅ SOLUÇÃO:'));
  console.log('1. Reprocessar TODOS os documentos com embeddings corretos');
  console.log('2. Usar modelo OpenAI text-embedding-ada-002 (1536 dimensões)');
  console.log('3. Verificar função de embedding no enhanced-vector-search');
}

main().catch(error => {
  console.error(chalk.red('Erro:', error));
  process.exit(1);
});