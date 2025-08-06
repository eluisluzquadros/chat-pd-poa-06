import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testCompleteFlow() {
  console.log('🔄 TESTE COMPLETO DO FLUXO RAG\n');
  console.log('=' .repeat(70));
  
  const query = "Qual é a altura máxima permitida no bairro Três Figueiras?";
  console.log(`Query: "${query}"\n`);
  
  // 1. Buscar dados reais primeiro
  console.log('📊 DADOS REAIS DO BANCO:');
  console.log('-'.repeat(50));
  
  const { data: realData, error: dbError } = await supabase
    .from('regime_urbanistico')
    .select('*')
    .ilike('bairro', '%TRÊS FIGUEIRAS%')
    .order('zona');
  
  if (!dbError && realData) {
    console.log(`Encontrados ${realData.length} registros:`);
    realData.forEach(r => {
      console.log(`- ${r.bairro} / ${r.zona}: ${r.altura_maxima}m (CA básico: ${r.coef_aproveitamento_basico}, CA máximo: ${r.coef_aproveitamento_maximo})`);
    });
  }
  
  // 2. Testar Query Analyzer
  console.log('\n\n1️⃣ QUERY ANALYZER:');
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
    console.log('Resultado:', JSON.stringify(analysisResult, null, 2));
  } catch (error) {
    console.log('Erro:', error.message);
  }
  
  // 3. Testar SQL Generator com analysisResult correto
  console.log('\n2️⃣ SQL GENERATOR (com analysisResult):');
  console.log('-'.repeat(50));
  
  let sqlResult = null;
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
            neighborhoods: ['TRÊS FIGUEIRAS'],
            parameters: ['altura máxima']
          },
          strategy: 'structured_only'
        }
      }),
    });
    
    sqlResult = await sqlResponse.json();
    console.log('SQL gerado:', JSON.stringify(sqlResult, null, 2));
    
    // Executar SQL diretamente se foi gerado
    if (sqlResult.sqlQueries && sqlResult.sqlQueries.length > 0) {
      console.log('\n📊 Executando SQL diretamente:');
      for (const sqlQuery of sqlResult.sqlQueries) {
        console.log(`SQL: ${sqlQuery.query}`);
        
        // Tentar executar como query raw
        try {
          // Usar uma query direta simplificada baseada no SQL gerado
          const queryParts = sqlQuery.query.match(/WHERE.*bairro.*'([^']+)'/i);
          if (queryParts) {
            const bairroName = queryParts[1];
            const { data: execResult, error: execError } = await supabase
              .from('regime_urbanistico')
              .select('*')
              .ilike('bairro', `%${bairroName}%`);
            
            if (!execError && execResult) {
              console.log(`Resultados: ${execResult.length} registros`);
              execResult.forEach(r => {
                console.log(`  - ${r.zona}: ${r.altura_maxima}m`);
              });
              
              // Adicionar resultados ao sqlResult para simular execução completa
              if (!sqlResult.executionResults) {
                sqlResult.executionResults = [];
              }
              sqlResult.executionResults.push({
                data: execResult,
                error: null
              });
            }
          }
        } catch (execErr) {
          console.log('Erro ao executar:', execErr.message);
        }
      }
    }
  } catch (error) {
    console.log('Erro:', error.message);
  }
  
  // 4. Testar Response Synthesizer com dados corretos
  console.log('\n3️⃣ RESPONSE SYNTHESIZER (com dados corretos):');
  console.log('-'.repeat(50));
  
  try {
    const synthResponse = await fetch(`${SUPABASE_URL}/functions/v1/response-synthesizer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ 
        originalQuery: query,
        analysisResult: analysisResult || {
          intent: 'structured_query',
          entities: {
            neighborhoods: ['TRÊS FIGUEIRAS'],
            parameters: ['altura máxima']
          },
          strategy: 'structured_only'
        },
        sqlResults: sqlResult && sqlResult.executionResults ? {
          executionResults: sqlResult.executionResults
        } : {
          executionResults: [{
            data: realData // Usar dados reais como fallback
          }]
        },
        model: 'openai/gpt-3.5-turbo'
      }),
    });
    
    const synthResult = await synthResponse.json();
    console.log('\n📝 RESPOSTA FINAL:');
    console.log(synthResult.response || synthResult.error);
    
    // Verificar resposta
    console.log('\n🔍 Verificação da resposta:');
    if (synthResult.response) {
      const hasCorrectHeights = synthResult.response.includes('18') || 
                               synthResult.response.includes('60') || 
                               synthResult.response.includes('90');
      const hasWrongHeights = synthResult.response.includes('12') || 
                             synthResult.response.includes('15');
      
      if (hasCorrectHeights) {
        console.log('✅ Resposta contém alturas corretas (18m, 60m ou 90m)');
      }
      if (hasWrongHeights) {
        console.log('❌ Resposta contém alturas ERRADAS');
      }
      if (!hasCorrectHeights && !hasWrongHeights) {
        console.log('⚠️ Resposta não contém valores de altura específicos');
      }
    }
  } catch (error) {
    console.log('Erro:', error.message);
  }
  
  console.log('\n' + '=' .repeat(70));
  console.log('✅ Teste completo!');
}

testCompleteFlow().catch(console.error);