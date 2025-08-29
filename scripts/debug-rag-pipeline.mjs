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

async function debugRagPipeline() {
  console.log('🔍 DEBUG DO PIPELINE RAG\n');
  console.log('=' .repeat(70));
  
  const query = "Qual é a altura máxima permitida no bairro Três Figueiras?";
  console.log(`Query: "${query}"\n`);
  
  // 1. Testar Query Analyzer
  console.log('1️⃣ QUERY ANALYZER:');
  console.log('-'.repeat(50));
  try {
    const analyzerResponse = await fetch(`${SUPABASE_URL}/functions/v1/query-analyzer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ query }),
    });
    
    const analyzerResult = await analyzerResponse.json();
    console.log('Status:', analyzerResponse.status);
    console.log('Result:', JSON.stringify(analyzerResult, null, 2));
  } catch (error) {
    console.log('Erro:', error.message);
  }
  
  // 2. Testar SQL Generator
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
        question: query,
        hints: { useRegimeTable: true }
      }),
    });
    
    const sqlResult = await sqlResponse.json();
    console.log('Status:', sqlResponse.status);
    console.log('Result:', JSON.stringify(sqlResult, null, 2));
  } catch (error) {
    console.log('Erro:', error.message);
  }
  
  // 3. Testar Enhanced Vector Search
  console.log('\n3️⃣ ENHANCED VECTOR SEARCH:');
  console.log('-'.repeat(50));
  try {
    const vectorResponse = await fetch(`${SUPABASE_URL}/functions/v1/enhanced-vector-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ 
        query,
        matchThreshold: 0.6,
        matchCount: 5
      }),
    });
    
    const vectorResult = await vectorResponse.json();
    console.log('Status:', vectorResponse.status);
    console.log('Result (first 500 chars):', JSON.stringify(vectorResult, null, 2).substring(0, 500));
  } catch (error) {
    console.log('Erro:', error.message);
  }
  
  // 4. Testar Response Synthesizer
  console.log('\n4️⃣ RESPONSE SYNTHESIZER:');
  console.log('-'.repeat(50));
  try {
    const synthResponse = await fetch(`${SUPABASE_URL}/functions/v1/response-synthesizer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ 
        query,
        queryAnalysis: {
          intent: 'structured_query',
          entities: {
            neighborhoods: ['Três Figueiras'],
            parameters: ['altura máxima']
          },
          strategy: 'structured_only'
        },
        structuredData: {
          sql: "SELECT * FROM regime_urbanistico WHERE bairro ILIKE '%TRÊS FIGUEIRAS%'",
          results: [
            { bairro: 'TRÊS FIGUEIRAS', zona: 'ZOT 04', altura_maxima: 18, coef_aproveitamento_basico: 2, coef_aproveitamento_maximo: 4 },
            { bairro: 'TRÊS FIGUEIRAS', zona: 'ZOT 07', altura_maxima: 60, coef_aproveitamento_basico: null, coef_aproveitamento_maximo: null },
            { bairro: 'TRÊS FIGUEIRAS', zona: 'ZOT 08.3 - C', altura_maxima: 90, coef_aproveitamento_basico: null, coef_aproveitamento_maximo: null }
          ]
        },
        conceptualData: []
      }),
    });
    
    const synthResult = await synthResponse.json();
    console.log('Status:', synthResponse.status);
    console.log('Response:', synthResult.response || synthResult.error);
  } catch (error) {
    console.log('Erro:', error.message);
  }
  
  console.log('\n' + '=' .repeat(70));
  console.log('✅ Debug completo!');
}

debugRagPipeline().catch(console.error);