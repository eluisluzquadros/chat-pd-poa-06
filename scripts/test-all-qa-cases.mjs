import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testQACases() {
  console.log('🧪 Testando Casos de QA\n');
  console.log('=' .repeat(70));
  
  // Buscar todos os casos de teste ativos
  const { data: testCases, error } = await supabase
    .from('qa_test_cases')
    .select('*')
    .eq('is_active', true)
    .order('id', { ascending: true });
  
  if (error) {
    console.error('❌ Erro:', error);
    return;
  }
  
  console.log(`📊 Total de casos: ${testCases.length}\n`);
  
  // Testar uma amostra primeiro (10 casos de diferentes categorias)
  const categories = [...new Set(testCases.map(tc => tc.category))];
  const sample = [];
  
  // Pegar 1 caso de cada categoria
  categories.forEach(cat => {
    const casesInCat = testCases.filter(tc => tc.category === cat);
    if (casesInCat.length > 0) {
      sample.push(casesInCat[0]);
    }
  });
  
  console.log(`🔍 Testando amostra de ${sample.length} casos (1 por categoria):\n`);
  
  const results = [];
  let successCount = 0;
  let partialCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < sample.length; i++) {
    const tc = sample[i];
    console.log(`\n[${i + 1}/${sample.length}] Categoria: ${tc.category}`);
    console.log(`❓ "${tc.question}"`);
    
    try {
      const startTime = Date.now();
      
      // Testar com o agentic-rag
      const { data, error } = await supabase.functions.invoke('agentic-rag', {
        body: {
          message: tc.question,
          model: 'openai/gpt-3.5-turbo',
          bypassCache: true
        }
      });
      
      const executionTime = Date.now() - startTime;
      
      if (error) {
        console.log(`   ❌ Erro: ${error.message}`);
        results.push({
          id: tc.id,
          category: tc.category,
          question: tc.question,
          status: 'error',
          error: error.message
        });
        failCount++;
        continue;
      }
      
      if (!data || !data.response) {
        console.log(`   ❌ Sem resposta`);
        results.push({
          id: tc.id,
          category: tc.category,
          question: tc.question,
          status: 'no_response'
        });
        failCount++;
        continue;
      }
      
      // Comparar com a resposta esperada
      const actualResponse = data.response.toLowerCase();
      const expectedAnswer = tc.expected_answer.toLowerCase();
      
      // Extrair números e palavras-chave importantes
      const expectedNumbers = expectedAnswer.match(/\d+(\.\d+)?/g) || [];
      const expectedKeywords = ['altura', 'máxima', 'metros', 'coeficiente', 'aproveitamento', 
                                'básico', 'máximo', 'zot', 'zona', 'bairro']
        .filter(kw => expectedAnswer.includes(kw));
      
      // Verificar se a resposta contém os números esperados
      const hasNumbers = expectedNumbers.length === 0 || 
                        expectedNumbers.some(num => actualResponse.includes(num));
      
      // Verificar se a resposta contém palavras-chave
      const hasKeywords = expectedKeywords.length === 0 ||
                         expectedKeywords.filter(kw => actualResponse.includes(kw)).length >= expectedKeywords.length * 0.5;
      
      if (hasNumbers && hasKeywords) {
        console.log(`   ✅ Resposta correta (${executionTime}ms)`);
        successCount++;
        results.push({
          id: tc.id,
          category: tc.category,
          question: tc.question,
          status: 'success',
          executionTime
        });
      } else if (hasKeywords) {
        console.log(`   ⚠️ Resposta parcialmente correta (${executionTime}ms)`);
        console.log(`      Faltam números: ${expectedNumbers.filter(n => !actualResponse.includes(n))}`);
        partialCount++;
        results.push({
          id: tc.id,
          category: tc.category,
          question: tc.question,
          status: 'partial',
          missingNumbers: expectedNumbers.filter(n => !actualResponse.includes(n))
        });
      } else {
        console.log(`   ❌ Resposta incorreta (${executionTime}ms)`);
        console.log(`      Esperado: "${tc.expected_answer.substring(0, 100)}..."`);
        console.log(`      Recebido: "${data.response.substring(0, 100)}..."`);
        failCount++;
        results.push({
          id: tc.id,
          category: tc.category,
          question: tc.question,
          status: 'incorrect',
          expected: tc.expected_answer.substring(0, 200),
          actual: data.response.substring(0, 200)
        });
      }
      
      // Log trace para debug
      if (data.agentTrace) {
        console.log(`   📊 Trace: ${data.agentTrace.map(s => s.step).join(' → ')}`);
      }
      
    } catch (err) {
      console.error(`   ❌ Erro inesperado: ${err.message}`);
      results.push({
        id: tc.id,
        category: tc.category,
        question: tc.question,
        status: 'exception',
        error: err.message
      });
      failCount++;
    }
    
    // Delay entre testes
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Resumo
  console.log('\n' + '=' .repeat(70));
  console.log('📊 RESUMO DOS TESTES:\n');
  console.log(`Total testado: ${sample.length}`);
  console.log(`✅ Corretos: ${successCount} (${(successCount/sample.length*100).toFixed(1)}%)`);
  console.log(`⚠️ Parciais: ${partialCount} (${(partialCount/sample.length*100).toFixed(1)}%)`);
  console.log(`❌ Incorretos: ${failCount} (${(failCount/sample.length*100).toFixed(1)}%)`);
  
  // Análise por categoria
  console.log('\n📂 Por Categoria:');
  categories.forEach(cat => {
    const catResults = results.filter(r => r.category === cat);
    const catSuccess = catResults.filter(r => r.status === 'success').length;
    console.log(`  ${cat}: ${catSuccess}/${catResults.length} corretos`);
  });
  
  // Salvar relatório
  const report = {
    timestamp: new Date().toISOString(),
    totalCases: testCases.length,
    testedCases: sample.length,
    results: {
      success: successCount,
      partial: partialCount,
      fail: failCount
    },
    details: results
  };
  
  fs.writeFileSync('qa-test-results.json', JSON.stringify(report, null, 2));
  console.log('\n📄 Relatório salvo em: qa-test-results.json');
  
  // Identificar padrões de falha
  console.log('\n🔍 PADRÕES DE FALHA:');
  const failures = results.filter(r => r.status === 'incorrect' || r.status === 'partial');
  if (failures.length > 0) {
    console.log('Principais problemas identificados:');
    
    // Verificar se está falhando em queries numéricas
    const numericFailures = failures.filter(f => 
      f.question.toLowerCase().includes('altura') ||
      f.question.toLowerCase().includes('índice') ||
      f.question.toLowerCase().includes('coeficiente')
    );
    
    if (numericFailures.length > 0) {
      console.log(`  • Falha em queries numéricas: ${numericFailures.length} casos`);
    }
    
    // Verificar se está falhando em queries de bairros
    const bairroFailures = failures.filter(f => 
      f.question.toLowerCase().includes('bairro') ||
      f.question.toLowerCase().includes('zona')
    );
    
    if (bairroFailures.length > 0) {
      console.log(`  • Falha em queries de bairros/zonas: ${bairroFailures.length} casos`);
    }
  }
  
  return report;
}

testQACases().catch(console.error);