import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Casos críticos para teste
const CRITICAL_TEST_IDS = [1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 109];

async function testCase(testCase) {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        message: testCase.question,
        bypassCache: true,
        model: 'openai/gpt-3.5-turbo'
      }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      return {
        id: testCase.id,
        passed: false,
        error: result.error || 'Request failed'
      };
    }
    
    // Verificar resposta
    const responseText = result.response || '';
    const expected = testCase.expected_answer || '';
    
    // Extrair palavras-chave importantes
    const expectedKeywords = [];
    
    // Números (alturas, coeficientes)
    const numbers = expected.match(/\d+/g);
    if (numbers) expectedKeywords.push(...numbers);
    
    // Zonas
    const zones = expected.match(/ZOT\s*\d+/gi);
    if (zones) expectedKeywords.push(...zones);
    
    // Verificar matches
    let matches = 0;
    for (const keyword of expectedKeywords) {
      if (responseText.includes(keyword)) {
        matches++;
      }
    }
    
    const passed = expectedKeywords.length === 0 || (matches / expectedKeywords.length) >= 0.6;
    
    return {
      id: testCase.id,
      question: testCase.question,
      passed,
      matches,
      total: expectedKeywords.length,
      response: responseText.substring(0, 200)
    };
    
  } catch (error) {
    return {
      id: testCase.id,
      passed: false,
      error: error.message
    };
  }
}

async function runCriticalTests() {
  console.log('🎯 TESTE DOS CASOS CRÍTICOS DO QA');
  console.log('=' .repeat(70));
  
  // Buscar casos críticos
  console.log('\n📥 Carregando casos de teste críticos...');
  const { data: testCases, error } = await supabase
    .from('qa_test_cases')
    .select('*')
    .in('id', CRITICAL_TEST_IDS)
    .order('id');
  
  if (error) {
    console.error('❌ Erro ao buscar casos:', error);
    return;
  }
  
  console.log(`✅ ${testCases.length} casos críticos carregados\n`);
  
  const results = [];
  let passed = 0;
  let failed = 0;
  
  // Testar cada caso
  for (const tc of testCases) {
    process.stdout.write(`Testando caso ${tc.id}... `);
    
    const result = await testCase(tc);
    results.push(result);
    
    if (result.passed) {
      console.log(`✅ PASSOU (${result.matches}/${result.total} matches)`);
      passed++;
    } else if (result.error) {
      console.log(`❌ ERRO: ${result.error}`);
      failed++;
    } else {
      console.log(`⚠️ FALHOU (${result.matches}/${result.total} matches)`);
      failed++;
    }
    
    // Pequeno delay entre testes
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Resumo
  console.log('\n' + '=' .repeat(70));
  console.log('📊 RESUMO DOS TESTES CRÍTICOS:');
  console.log(`  Total: ${testCases.length}`);
  console.log(`  ✅ Passou: ${passed} (${(passed/testCases.length*100).toFixed(1)}%)`);
  console.log(`  ❌ Falhou: ${failed} (${(failed/testCases.length*100).toFixed(1)}%)`);
  
  // Mostrar casos que falharam
  const failedCases = results.filter(r => !r.passed);
  if (failedCases.length > 0) {
    console.log('\n❌ CASOS QUE FALHARAM:');
    failedCases.forEach(fc => {
      const tc = testCases.find(t => t.id === fc.id);
      console.log(`  [${fc.id}] ${tc.question.substring(0, 60)}...`);
      if (fc.error) {
        console.log(`    Erro: ${fc.error}`);
      } else {
        console.log(`    Matches: ${fc.matches}/${fc.total}`);
      }
    });
  }
  
  // Casos específicos importantes
  console.log('\n🔍 VERIFICAÇÃO DE CASOS ESPECÍFICOS:');
  
  // Verificar altura máxima
  const alturaMax = testCases.find(tc => tc.question.includes('altura máxima mais alta'));
  if (alturaMax) {
    const result = results.find(r => r.id === alturaMax.id);
    console.log(`  Altura máxima (130m): ${result?.response?.includes('130') ? '✅' : '❌'}`);
  }
  
  // Verificar Três Figueiras
  const tresFigueiras = testCases.find(tc => tc.question.includes('Três Figueiras'));
  if (tresFigueiras) {
    const result = results.find(r => r.id === tresFigueiras.id);
    const has18 = result?.response?.includes('18');
    const has60 = result?.response?.includes('60');
    const has90 = result?.response?.includes('90');
    console.log(`  Três Figueiras (18/60/90m): ${has18 && has60 && has90 ? '✅' : '❌'}`);
  }
  
  console.log('\n✅ Teste crítico completo!');
}

runCriticalTests().catch(console.error);