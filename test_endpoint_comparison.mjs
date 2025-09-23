import fetch from 'node-fetch';

const SUPABASE_URL = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

console.log('🔄 TESTE COMPARATIVO: /chat vs /admin/quality\n');

async function testEndpointComparison() {
  const testCases = [
    { neighborhood: 'Petrópolis', query: 'O que pode ser construído no bairro Petrópolis' },
    { neighborhood: 'Três Figueiras', query: 'O que pode ser construído no bairro Três Figueiras' },
    { neighborhood: 'Centro Histórico', query: 'O que pode ser construído no bairro Centro Histórico' },
    { neighborhood: 'Moinhos de Vento', query: 'O que pode ser construído no bairro Moinhos de Vento' },
    { neighborhood: 'Bela Vista', query: 'O que pode ser construído no bairro Bela Vista' },
    { neighborhood: 'Cidade Baixa', query: 'O que pode ser construído no bairro Cidade Baixa' }
  ];

  const results = [];

  for (const testCase of testCases) {
    console.log(`🔍 Testando: ${testCase.neighborhood}`);
    
    try {
      // 1. Teste via /chat (agentic-rag)
      console.log('   📱 Testando via /chat...');
      const chatResponse = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: testCase.query,
          model: 'anthropic/claude-3-5-sonnet-20241022'
        })
      });

      const chatData = await chatResponse.json();

      // 2. Teste via /admin/quality 
      console.log('   👑 Testando via /admin/quality...');
      const adminResponse = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'X-Source': 'admin-quality' // Header para identificar origem
        },
        body: JSON.stringify({
          query: testCase.query,
          model: 'anthropic/claude-3-5-sonnet-20241022'
        })
      });

      const adminData = await adminResponse.json();

      // 3. Análise comparativa de formatação
      const chatAnalysis = analyzeResponse(chatData.response || '');
      const adminAnalysis = analyzeResponse(adminData.response || '');

      const result = {
        neighborhood: testCase.neighborhood,
        chat: {
          hasTable: chatAnalysis.hasTable,
          hasStructuredList: chatAnalysis.hasStructuredList,
          hasRequiredFields: chatAnalysis.hasRequiredFields,
          responseLength: chatData.response?.length || 0,
          isConsistent: chatAnalysis.hasTable && chatAnalysis.hasRequiredFields
        },
        admin: {
          hasTable: adminAnalysis.hasTable,
          hasStructuredList: adminAnalysis.hasStructuredList,
          hasRequiredFields: adminAnalysis.hasRequiredFields,
          responseLength: adminData.response?.length || 0,
          isConsistent: adminAnalysis.hasTable && adminAnalysis.hasRequiredFields
        },
        isIdentical: false,
        differences: []
      };

      // 4. Comparar formatação entre endpoints
      if (result.chat.hasTable !== result.admin.hasTable) {
        result.differences.push('Tabela presente apenas em um endpoint');
      }
      if (result.chat.hasRequiredFields !== result.admin.hasRequiredFields) {
        result.differences.push('Campos obrigatórios diferentes');
      }
      if (Math.abs(result.chat.responseLength - result.admin.responseLength) > 100) {
        result.differences.push('Tamanho de resposta significativamente diferente');
      }
      
      result.isIdentical = result.differences.length === 0;

      results.push(result);

      // Log resultado detalhado
      console.log(`   📊 CHAT - Tabela: ${result.chat.hasTable ? '✅' : '❌'}, Campos: ${result.chat.hasRequiredFields ? '✅' : '❌'}`);
      console.log(`   👑 ADMIN - Tabela: ${result.admin.hasTable ? '✅' : '❌'}, Campos: ${result.admin.hasRequiredFields ? '✅' : '❌'}`);
      console.log(`   🔄 Idêntico: ${result.isIdentical ? '✅' : '❌'}`);
      
      if (result.differences.length > 0) {
        console.log(`   ⚠️ Diferenças: ${result.differences.join(', ')}`);
      }
      console.log('');

    } catch (error) {
      console.error(`❌ Erro testando ${testCase.neighborhood}:`, error.message);
    }
  }

  // 5. Relatório final comparativo
  console.log('📊 RELATÓRIO FINAL - COMPARAÇÃO ENDPOINTS:\n');
  
  const totalTests = results.length;
  const identicalResponses = results.filter(r => r.isIdentical).length;
  const identicalRate = (identicalResponses / totalTests) * 100;

  const chatConsistent = results.filter(r => r.chat.isConsistent).length;
  const adminConsistent = results.filter(r => r.admin.isConsistent).length;

  console.log(`🎯 Taxa de Identidade entre Endpoints: ${identicalRate.toFixed(1)}% (${identicalResponses}/${totalTests})`);
  console.log(`📱 Chat - Consistência: ${((chatConsistent / totalTests) * 100).toFixed(1)}% (${chatConsistent}/${totalTests})`);
  console.log(`👑 Admin - Consistência: ${((adminConsistent / totalTests) * 100).toFixed(1)}% (${adminConsistent}/${totalTests})`);

  // Análise de diferenças mais comuns
  const allDifferences = results.flatMap(r => r.differences);
  const diffCounts = {};
  allDifferences.forEach(diff => {
    diffCounts[diff] = (diffCounts[diff] || 0) + 1;
  });

  if (Object.keys(diffCounts).length > 0) {
    console.log('\n⚠️ Diferenças mais comuns entre endpoints:');
    Object.entries(diffCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([diff, count]) => {
        console.log(`   • ${diff}: ${count}x`);
      });
  }

  // Bairros com problemas específicos
  const problematicNeighborhoods = results.filter(r => !r.isIdentical);
  if (problematicNeighborhoods.length > 0) {
    console.log('\n🚨 Bairros com diferenças entre endpoints:');
    problematicNeighborhoods.forEach(r => {
      console.log(`   • ${r.neighborhood}: ${r.differences.join(', ')}`);
    });
  }

  // Recomendações baseadas nos resultados
  console.log('\n🔧 RECOMENDAÇÕES:');
  if (identicalRate < 90) {
    console.log('   • CRÍTICO: Padronizar formatação entre endpoints /chat e /admin/quality');
  }
  if (chatConsistent !== adminConsistent) {
    console.log('   • Investigar diferenças na lógica de formatação entre endpoints');
  }
  if (identicalRate === 100) {
    console.log('   • ✅ Formatação consistente entre todos os endpoints testados!');
  }

  return { identicalRate, results, problematicNeighborhoods };
}

function analyzeResponse(response) {
  if (!response) return {
    hasTable: false,
    hasStructuredList: false,
    hasRequiredFields: false
  };

  const hasTable = /\|[^|]+\|/.test(response);
  const hasStructuredList = /•.*CA.*básico.*•.*CA.*máximo/i.test(response);
  const hasRequiredFields = /altura.*máxima/i.test(response) && 
                           /coeficiente.*aproveitamento/i.test(response);

  return {
    hasTable,
    hasStructuredList,
    hasRequiredFields
  };
}

// Executar teste
testEndpointComparison().then(results => {
  if (results.identicalRate === 100) {
    console.log('\n🎉 SUCESSO: Formatação 100% idêntica entre endpoints!');
  } else {
    console.log(`\n⚠️ ATENÇÃO: ${results.problematicNeighborhoods.length} bairros com diferenças entre endpoints.`);
    console.log('🔧 Necessário padronizar formatação entre /chat e /admin/quality');
  }
}).catch(console.error);