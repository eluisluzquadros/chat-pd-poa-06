import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CHAT_EDGE_FUNCTION_URL = `${process.env.SUPABASE_URL}/functions/v1/chat`;

async function runSampleBenchmark() {
  console.log('\n🚀 Teste Rápido de Benchmark (5 casos)\n');
  console.log('=' .repeat(50));

  // Buscar apenas 5 casos de teste
  const { data: testCases, error: fetchError } = await supabase
    .from('qa_test_cases')
    .select('*')
    .eq('is_active', true)
    .limit(5);

  if (fetchError) {
    console.error('❌ Erro:', fetchError.message);
    return;
  }

  console.log(`📊 Testando ${testCases.length} casos...\n`);

  for (const testCase of testCases) {
    console.log(`\n🔍 Pergunta: ${testCase.query}`);
    
    try {
      const response = await fetch(CHAT_EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          message: testCase.query,
          userId: 'benchmark-test',
          sessionId: `test-${Date.now()}`
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log(`✅ Resposta recebida (${result.response.length} caracteres)`);
        console.log(`   Preview: ${result.response.substring(0, 100)}...`);
        
        // Verificar palavras-chave
        if (testCase.expected_keywords && testCase.expected_keywords.length > 0) {
          const found = testCase.expected_keywords.filter(kw => 
            result.response.toLowerCase().includes(kw.toLowerCase())
          );
          console.log(`   Palavras-chave: ${found.length}/${testCase.expected_keywords.length} encontradas`);
        }
      } else {
        console.log(`❌ Erro: ${result.error || 'Resposta inválida'}`);
      }
    } catch (error) {
      console.log(`❌ Erro na requisição: ${error.message}`);
    }
  }

  console.log('\n' + '=' .repeat(50));
  console.log('✅ Teste concluído!\n');
}

// Executar
runSampleBenchmark().catch(console.error);