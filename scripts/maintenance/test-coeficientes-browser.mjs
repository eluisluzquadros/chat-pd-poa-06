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

async function testCoeficientes() {
  console.log('🔍 TESTE DE COEFICIENTES DE APROVEITAMENTO\n');
  console.log('=' .repeat(70));
  
  const queries = [
    "Qual o coeficiente de aproveitamento do bairro Três Figueiras na ZOT 04?",
    "Coeficiente de aproveitamento básico e máximo da ZOT 04",
    "CA básico e CA máximo do bairro Três Figueiras",
    "Três Figueiras ZOT 04"
  ];
  
  for (const query of queries) {
    console.log(`\n📝 Query: "${query}"`);
    console.log('-'.repeat(50));
    
    try {
      // 1. Testar diretamente o agentic-rag (como o navegador faz)
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
      
      if (result.response) {
        console.log('Resposta recebida:');
        
        // Procurar por menções de coeficientes
        const hasCABasico2 = result.response.includes('2');
        const hasCAMaximo4 = result.response.includes('4');
        const hasNaoDisponivel = result.response.includes('Não disponível');
        
        // Extrair trecho relevante
        const lines = result.response.split('\n');
        const relevantLines = lines.filter(line => 
          line.toLowerCase().includes('coeficiente') || 
          line.toLowerCase().includes('ca ') ||
          line.toLowerCase().includes('básico') ||
          line.toLowerCase().includes('máximo')
        );
        
        if (relevantLines.length > 0) {
          console.log('\nLinhas com coeficientes:');
          relevantLines.forEach(line => console.log('  ' + line));
        }
        
        console.log('\n🔍 Verificação:');
        console.log(`  CA básico = 2: ${hasCABasico2 ? '✅' : '❌'}`);
        console.log(`  CA máximo = 4: ${hasCAMaximo4 ? '✅' : '❌'}`);
        console.log(`  "Não disponível": ${hasNaoDisponivel ? '❌ PROBLEMA!' : '✅ Não tem'}`);
        
        // Mostrar o SQL executado (se disponível no trace)
        if (result.agentTrace) {
          const sqlTrace = result.agentTrace.find(t => t.step === 'sql_generation_complete');
          if (sqlTrace) {
            console.log('\n📊 SQL executado teve resultados:', sqlTrace.hasResults);
          }
        }
      } else {
        console.log('❌ Erro:', result.error);
      }
      
    } catch (error) {
      console.log('❌ Erro na requisição:', error.message);
    }
    
    // Pequeno delay entre testes
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Agora vamos testar diretamente o SQL generator
  console.log('\n\n' + '=' .repeat(70));
  console.log('🔧 TESTE DIRETO DO SQL GENERATOR\n');
  
  const sqlResponse = await fetch(`${SUPABASE_URL}/functions/v1/sql-generator`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      query: "Coeficiente de aproveitamento do bairro Três Figueiras na ZOT 04",
      analysisResult: {
        intent: 'tabular',
        entities: {
          bairros: ['TRÊS FIGUEIRAS'],
          zots: ['ZOT 04'],
          parametros: ['coeficiente de aproveitamento']
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
    
    if (sqlResult.executionResults && sqlResult.executionResults.length > 0) {
      console.log('\nDados retornados:');
      sqlResult.executionResults.forEach(er => {
        if (er.data && er.data.length > 0) {
          console.log(JSON.stringify(er.data, null, 2));
        }
      });
    }
  }
  
  console.log('\n' + '=' .repeat(70));
  console.log('✅ Teste completo!');
}

testCoeficientes().catch(console.error);