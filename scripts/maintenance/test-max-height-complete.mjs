import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function testMaxHeightComplete() {
  console.log('🏢 TESTE COMPLETO: ALTURA MÁXIMA MAIS ALTA\n');
  console.log('=' .repeat(70));
  
  const query = "Qual é a altura máxima mais alta no novo Plano Diretor?";
  console.log(`Query: "${query}"\n`);
  
  // 1. Query Analyzer
  console.log('1️⃣ QUERY ANALYZER:');
  console.log('-'.repeat(50));
  
  let analysisResult = null;
  try {
    const analyzerResponse = await fetch(`${SUPABASE_URL}/functions/v1/query-analyzer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ query }),
    });
    
    analysisResult = await analyzerResponse.json();
    console.log('Intent:', analysisResult.intent);
    console.log('Strategy:', analysisResult.strategy);
    console.log('Entities:', JSON.stringify(analysisResult.entities));
  } catch (error) {
    console.log('Erro:', error.message);
  }
  
  // 2. SQL Generator
  console.log('\n2️⃣ SQL GENERATOR:');
  console.log('-'.repeat(50));
  
  try {
    const sqlResponse = await fetch(`${SUPABASE_URL}/functions/v1/sql-generator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ 
        query,
        analysisResult: analysisResult || {
          intent: 'structured_query',
          entities: {
            parameters: ['altura máxima']
          },
          strategy: 'structured_only'
        }
      }),
    });
    
    const sqlResult = await sqlResponse.json();
    
    if (sqlResult.sqlQueries && sqlResult.sqlQueries.length > 0) {
      console.log('SQL gerado:');
      sqlResult.sqlQueries.forEach(sq => {
        console.log(`  ${sq.query}`);
      });
      
      if (sqlResult.executionResults) {
        console.log('\nResultados da execução:');
        sqlResult.executionResults.forEach(er => {
          if (er.data && er.data.length > 0) {
            console.log(`  Encontrados ${er.data.length} registros`);
            if (er.data[0]) {
              console.log(`  Primeiro resultado: ${er.data[0].bairro} / ${er.data[0].zona}: ${er.data[0].altura_maxima}m`);
            }
          } else {
            console.log('  Nenhum resultado');
          }
        });
      }
    } else {
      console.log('Nenhum SQL gerado');
    }
  } catch (error) {
    console.log('Erro:', error.message);
  }
  
  // 3. Chamada completa ao agentic-rag
  console.log('\n3️⃣ AGENTIC-RAG COMPLETO:');
  console.log('-'.repeat(50));
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        message: query,
        bypassCache: true,
        model: 'openai/gpt-3.5-turbo'
      }),
    });
    
    const result = await response.json();
    
    if (response.ok && result.response) {
      console.log('Resposta:');
      console.log(result.response);
      
      // Verificar se tem 130m
      if (result.response.includes('130')) {
        console.log('\n✅ CORRETO: Resposta contém 130m');
      } else if (result.response.includes('40')) {
        console.log('\n❌ ERRO: Resposta contém 40m (incorreto)');
      } else {
        console.log('\n⚠️ Resposta não contém valor específico');
      }
    }
  } catch (error) {
    console.log('Erro:', error.message);
  }
  
  console.log('\n' + '=' .repeat(70));
}

testMaxHeightComplete().catch(console.error);