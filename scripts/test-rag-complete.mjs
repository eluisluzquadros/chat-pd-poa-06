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

async function testRAGPipeline() {
  console.log('🧪 TESTE COMPLETO DO SISTEMA RAG\n');
  console.log('=' .repeat(70));
  
  const testQueries = [
    {
      query: "Qual é a altura máxima permitida no bairro Petrópolis?",
      expectedInfo: "60m (ZOT 07) ou 90m (ZOT 08.3)"
    },
    {
      query: "Qual é a altura máxima mais alta permitida no novo Plano Diretor?",
      expectedInfo: "Deveria retornar as maiores alturas da cidade"
    },
    {
      query: "Quais são os principais índices urbanísticos do bairro Petrópolis?",
      expectedInfo: "Altura, CA, permeabilidade, recuos"
    },
    {
      query: "Quais bairros têm risco de inundação?",
      expectedInfo: "Bairros com risco de desastre"
    },
    {
      query: "Qual a altura máxima no Centro Histórico?",
      expectedInfo: "Parâmetros do Centro Histórico"
    }
  ];
  
  for (const test of testQueries) {
    console.log(`\n📝 Testando: "${test.query}"`);
    console.log(`   Esperado: ${test.expectedInfo}`);
    console.log('-'.repeat(50));
    
    try {
      const startTime = Date.now();
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          query: test.query,
          bypassCache: true,
          model: 'openai/gpt-3.5-turbo'
        }),
      });
      
      const result = await response.json();
      const duration = Date.now() - startTime;
      
      if (response.ok && result.response) {
        console.log(`✅ SUCESSO (${duration}ms)`);
        console.log(`   Confiança: ${(result.confidence * 100).toFixed(1)}%`);
        console.log(`   Resposta: ${result.response.substring(0, 200)}...`);
        
        // Verificar se tem dados estruturados
        if (result.agentTrace) {
          const sqlStep = result.agentTrace.find(s => s.step === 'sql_generation_complete');
          if (sqlStep && sqlStep.hasResults) {
            console.log(`   📊 Dados estruturados encontrados!`);
          }
        }
      } else {
        console.log(`❌ ERRO: ${result.error || 'Resposta inválida'}`);
        if (result.agentTrace) {
          const errorStep = result.agentTrace.find(s => s.error);
          if (errorStep) {
            console.log(`   Detalhes: ${errorStep.error}`);
          }
        }
      }
    } catch (error) {
      console.log(`❌ ERRO DE REDE: ${error.message}`);
    }
  }
  
  console.log('\n' + '=' .repeat(70));
  console.log('✅ Teste completo finalizado!');
  
  // Teste direto do SQL Generator
  console.log('\n🔧 TESTE DIRETO DO SQL GENERATOR\n');
  console.log('=' .repeat(70));
  
  try {
    const sqlResponse = await fetch(`${SUPABASE_URL}/functions/v1/sql-generator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        query: "Altura máxima em Petrópolis",
        analysisResult: {
          strategy: 'structured_only',
          entities: {
            bairros: ['Petrópolis'],
            parameters: ['altura_maxima']
          }
        },
        hints: {
          needsMax: true,
          useRegimeTable: true
        }
      }),
    });
    
    const sqlResult = await sqlResponse.json();
    
    if (sqlResponse.ok && sqlResult.executionResults) {
      console.log('✅ SQL Generator funcionando!');
      console.log(`   Queries geradas: ${sqlResult.sqlQueries?.length || 0}`);
      
      for (const result of sqlResult.executionResults || []) {
        if (result.data && result.data.length > 0) {
          console.log(`   📊 Dados encontrados: ${result.data.length} registros`);
          console.log(`      Amostra:`, JSON.stringify(result.data[0], null, 2));
        } else if (result.error) {
          console.log(`   ⚠️ Erro na query: ${result.error}`);
        }
      }
    } else {
      console.log('❌ SQL Generator com problema:', sqlResult.error);
    }
  } catch (error) {
    console.log('❌ Erro ao testar SQL Generator:', error.message);
  }
}

testRAGPipeline().catch(console.error);