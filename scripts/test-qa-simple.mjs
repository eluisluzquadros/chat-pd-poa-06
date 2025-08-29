import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🚀 TESTE AUTOMÁTICO DE QA - 10 CASOS\n');

async function testCase(testCase) {
  const start = Date.now();
  try {
    const response = await fetch(SUPABASE_URL + '/functions/v1/agentic-rag', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        query: testCase.question,
        sessionId: 'test',
        bypassCache: true
      })
    });
    
    const result = await response.json();
    const time = Date.now() - start;
    const success = result.response && result.response.length > 10;
    
    return { 
      success, 
      time, 
      confidence: result.confidence || 0,
      response: result.response ? result.response.substring(0, 100) : ''
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function runTests() {
  // Buscar TODOS os casos de teste (remover limit para pegar todos os 121)
  const { data: testCases, error } = await supabase
    .from('qa_test_cases')
    .select('*')
    .order('category', { ascending: true })
    .order('id', { ascending: true });
  
  if (error || !testCases) {
    console.error('Erro ao buscar casos de teste:', error);
    return;
  }
  
  console.log('📝 Testando ' + testCases.length + ' casos...');
  console.log('⏱️ Tempo estimado: ' + Math.round(testCases.length * 3 / 60) + ' minutos\n');
  
  let passed = 0;
  let totalTime = 0;
  const results = [];
  
  // Processar por categoria
  const categories = [...new Set(testCases.map(tc => tc.category))];
  
  for (const category of categories) {
    const categoryTests = testCases.filter(tc => tc.category === category);
    console.log('\n📂 ' + category + ' (' + categoryTests.length + ' testes)');
    
    for (let i = 0; i < categoryTests.length; i++) {
      const tc = categoryTests[i];
      const question = tc.question.substring(0, 35);
      process.stdout.write('  ' + (i+1) + '/' + categoryTests.length + ' - ' + question + '... ');
      
      const result = await testCase(tc);
      totalTime += result.time || 0;
      
      // Salvar resultado para o banco
      const testResult = {
        test_case_id: tc.id,
        model: 'openai/gpt-3.5-turbo',
        response: result.response,
        passed: result.success,
        score: result.success ? 1.0 : 0.0,
        execution_time_ms: result.time || 0,
        confidence: result.confidence || 0,
        error_message: result.error || null,
        metadata: { category: tc.category }
      };
      results.push(testResult);
      
      if (result.success) {
        passed++;
        console.log('✅ ' + result.time + 'ms');
      } else {
        console.log('❌ ' + (result.error || 'Sem resposta'));
      }
      
      // Pausa pequena
      await new Promise(r => setTimeout(r, 500));
    }
  }
  
  // Salvar resultados no banco
  console.log('\n💾 Salvando resultados no banco...');
  
  // Limpar resultados anteriores
  await supabase
    .from('qa_test_results')
    .delete()
    .eq('model', 'openai/gpt-3.5-turbo');
  
  // Inserir novos resultados
  const { error: insertError } = await supabase
    .from('qa_test_results')
    .insert(results);
  
  if (insertError) {
    console.error('❌ Erro ao salvar:', insertError);
  } else {
    console.log('✅ Resultados salvos com sucesso!')
  }
  
  const percentage = (passed/testCases.length*100).toFixed(0);
  const avgTime = (totalTime/testCases.length).toFixed(0);
  
  console.log('\n📊 RESULTADO FINAL:');
  console.log('✅ Passou: ' + passed + '/' + testCases.length + ' (' + percentage + '%)');
  console.log('⏱️ Tempo médio: ' + avgTime + 'ms');
  
  if (passed >= 8) {
    console.log('\n✅ BASE DE CONHECIMENTO ESTÁ BOA!');
  } else if (passed >= 6) {
    console.log('\n🟡 BASE FUNCIONAL MAS PRECISA MELHORIAS');
  } else {
    console.log('\n❌ BASE PRECISA DE AJUSTES URGENTES');
  }
}

runTests().catch(console.error);
