import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 4 CASOS CRÍTICOS DE TESTE
const CRITICAL_TESTS = [
  {
    name: "Quantos bairros afetados por enchentes 2024",
    query: "Quantos bairros foram afetados pelas enchentes de 2024?",
    expectedCount: 13,
    expectedKeywords: ["13", "bairros", "enchentes", "2024"]
  },
  {
    name: "Art. 81 Inciso III - Certificação",
    query: "Me diga sobre o Art. 81, Inciso III sobre certificação em sustentabilidade ambiental",
    expectedKeywords: ["Art. 81", "Inciso III", "certificação", "sustentabilidade", "ambiental"]
  },
  {
    name: "Dados Três Figueiras",
    query: "Quais são os dados do bairro Três Figueiras por ZOT?",
    expectedKeywords: ["Três Figueiras", "ZOT", "altura", "coeficiente"]
  },
  {
    name: "Dados Petrópolis",
    query: "Quais são os dados do bairro Petrópolis por ZOT?", 
    expectedKeywords: ["Petrópolis", "ZOT", "altura", "coeficiente"]
  }
];

async function testFunction(functionName, testCase) {
  try {
    console.log(`\n🧪 TESTANDO ${functionName}: ${testCase.name}`);
    
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: {
        message: testCase.query,
        user: { role: 'user' },
        sessionId: 'test-session',
        userId: 'test-user',
        model: 'openai',
        agentic_rag: true
      }
    });

    if (error) {
      console.error(`❌ ERRO ${functionName}:`, error);
      return { success: false, error: error.message };
    }

    const response = data?.response || data?.answer || '';
    
    // Verificar palavras-chave esperadas
    const foundKeywords = testCase.expectedKeywords.filter(keyword => 
      response.toLowerCase().includes(keyword.toLowerCase())
    );
    
    const keywordScore = foundKeywords.length / testCase.expectedKeywords.length;
    
    // Para teste de contagem, verificar número específico
    if (testCase.expectedCount) {
      const hasCorrectCount = response.includes(testCase.expectedCount.toString());
      console.log(`📊 Contagem correta (${testCase.expectedCount}): ${hasCorrectCount ? '✅' : '❌'}`);
    }
    
    console.log(`📝 Palavras-chave encontradas: ${foundKeywords.length}/${testCase.expectedKeywords.length} (${(keywordScore * 100).toFixed(1)}%)`);
    console.log(`🎯 Palavras encontradas: ${foundKeywords.join(', ')}`);
    
    const success = keywordScore >= 0.6 && (!testCase.expectedCount || response.includes(testCase.expectedCount.toString()));
    
    return { 
      success, 
      keywordScore, 
      foundKeywords,
      responseLength: response.length,
      preview: response.substring(0, 200) + '...'
    };
    
  } catch (error) {
    console.error(`💥 EXCEPTION ${functionName}:`, error);
    return { success: false, error: error.message };
  }
}

async function runCriticalTests() {
  console.log('🚀 INICIANDO TESTES CRÍTICOS DAS EDGE FUNCTIONS');
  console.log('=' * 60);
  
  const functions = ['agentic-rag-v2', 'agentic-rag', 'sql-generator-v2'];
  const results = {};
  
  for (const functionName of functions) {
    console.log(`\n📡 TESTANDO FUNÇÃO: ${functionName.toUpperCase()}`);
    console.log('-' * 50);
    
    results[functionName] = [];
    
    for (const testCase of CRITICAL_TESTS) {
      const result = await testFunction(functionName, testCase);
      results[functionName].push({
        testName: testCase.name,
        ...result
      });
      
      // Pequena pausa entre testes
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // RELATÓRIO FINAL
  console.log('\n📋 RELATÓRIO FINAL DE TESTES');
  console.log('=' * 60);
  
  for (const functionName of functions) {
    const functionResults = results[functionName];
    const successCount = functionResults.filter(r => r.success).length;
    const successRate = (successCount / functionResults.length * 100).toFixed(1);
    
    console.log(`\n🔧 ${functionName.toUpperCase()}: ${successCount}/${functionResults.length} testes passaram (${successRate}%)`);
    
    functionResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`  ${status} ${result.testName}`);
      if (result.keywordScore !== undefined) {
        console.log(`      Palavras-chave: ${(result.keywordScore * 100).toFixed(1)}%`);
      }
      if (result.error) {
        console.log(`      Erro: ${result.error}`);
      }
    });
  }
  
  // VEREDICTO FINAL
  const overallResults = Object.values(results).flat();
  const totalSuccess = overallResults.filter(r => r.success).length;
  const totalTests = overallResults.length;
  const overallRate = (totalSuccess / totalTests * 100).toFixed(1);
  
  console.log(`\n🎯 RESULTADO GERAL: ${totalSuccess}/${totalTests} testes passaram (${overallRate}%)`);
  
  if (overallRate >= 80) {
    console.log('🎉 SISTEMA RAG FUNCIONANDO CORRETAMENTE!');
  } else if (overallRate >= 60) {
    console.log('⚠️ Sistema parcialmente funcional, mas precisa de ajustes');
  } else {
    console.log('🚨 SISTEMA COM PROBLEMAS CRÍTICOS!');
  }
}

// Executar testes
runCriticalTests().catch(console.error);