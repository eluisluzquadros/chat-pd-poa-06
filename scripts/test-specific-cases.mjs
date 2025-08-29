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

const testCases = [
  {
    id: "altura_maxima",
    query: "Qual é a altura máxima mais alta no novo Plano Diretor?",
    expectedKeywords: ["130", "AZENHA", "ZOT 08.3"]
  },
  {
    id: "tres_figueiras",
    query: "Três Figueiras",
    expectedKeywords: ["18", "60", "90", "ZOT 04", "ZOT 07", "ZOT 08.3"]
  },
  {
    id: "centro_historico",
    query: "Centro Histórico",
    expectedKeywords: ["60", "130", "ZOT 08.3", "ZOT 09"]
  },
  {
    id: "petropolis",
    query: "Petrópolis",
    expectedKeywords: ["60", "130", "ZOT 08.3", "ZOT 09", "ZOT 10"]
  },
  {
    id: "coef_aproveitamento",
    query: "Qual o coeficiente de aproveitamento do bairro Três Figueiras na ZOT 04?",
    expectedKeywords: ["2", "4", "básico", "máximo"]
  }
];

async function testCase(testCase) {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        message: testCase.query,
        bypassCache: true,
        model: 'openai/gpt-3.5-turbo'
      }),
    });
    
    const result = await response.json();
    
    if (response.ok && result.response) {
      const matches = testCase.expectedKeywords.filter(keyword => 
        result.response.includes(keyword)
      );
      
      const success = matches.length >= testCase.expectedKeywords.length * 0.7; // 70% match
      
      return {
        id: testCase.id,
        success,
        query: testCase.query,
        matches: matches.length,
        expected: testCase.expectedKeywords.length,
        response: result.response.substring(0, 200) + '...'
      };
    } else {
      return {
        id: testCase.id,
        success: false,
        query: testCase.query,
        error: result.error || 'Unknown error'
      };
    }
  } catch (error) {
    return {
      id: testCase.id,
      success: false,
      query: testCase.query,
      error: error.message
    };
  }
}

async function runTests() {
  console.log('🧪 TESTE DOS CASOS CRÍTICOS\n');
  console.log('=' .repeat(70));
  
  const results = [];
  
  for (const tc of testCases) {
    console.log(`\nTestando: ${tc.id}...`);
    const result = await testCase(tc);
    results.push(result);
    
    console.log(`  ${result.success ? '✅' : '❌'} ${tc.query}`);
    if (result.success) {
      console.log(`  Matches: ${result.matches}/${result.expected}`);
    } else if (result.error) {
      console.log(`  Erro: ${result.error}`);
    }
  }
  
  console.log('\n' + '=' .repeat(70));
  console.log('\n📊 RESUMO FINAL:');
  
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  const percentage = ((passed / total) * 100).toFixed(1);
  
  console.log(`✅ Passou: ${passed}/${total} (${percentage}%)`);
  console.log(`❌ Falhou: ${total - passed}/${total}`);
  
  if (passed === total) {
    console.log('\n🎉 TODOS OS TESTES CRÍTICOS PASSARAM!');
  } else {
    console.log('\n⚠️ Alguns testes falharam. Detalhes:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.id}: ${r.error || 'Não passou na validação'}`);
    });
  }
}

runTests().catch(console.error);