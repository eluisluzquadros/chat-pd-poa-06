import fetch from 'node-fetch';

const SUPABASE_URL = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

console.log('🎯 TESTE ABRANGENTE DE CONSISTÊNCIA UX\n');

async function testUXConsistency() {
  const testCases = [
    { neighborhood: 'Petrópolis', query: 'O que pode ser construído no bairro Petrópolis' },
    { neighborhood: 'Três Figueiras', query: 'O que pode ser construído no bairro Três Figueiras' },
    { neighborhood: 'Centro Histórico', query: 'O que pode ser construído no bairro Centro Histórico' },
    { neighborhood: 'Moinhos de Vento', query: 'O que pode ser construído no bairro Moinhos de Vento' },
    { neighborhood: 'Bela Vista', query: 'O que pode ser construído no bairro Bela Vista' },
    { neighborhood: 'Cidade Baixa', query: 'O que pode ser construído no bairro Cidade Baixa' },
    { neighborhood: 'Mont Serrat', query: 'O que pode ser construído no bairro Mont Serrat' },
    { neighborhood: 'Rio Branco', query: 'O que pode ser construído no bairro Rio Branco' }
  ];

  const results = [];
  const inconsistentFormats = [];

  for (const testCase of testCases) {
    console.log(`🔍 Testando: ${testCase.neighborhood}`);
    
    try {
      // 1. Fazer query via agentic-rag
      const ragResponse = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
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

      const ragData = await ragResponse.json();
      
      if (!ragData.response) {
        console.log(`❌ ${testCase.neighborhood}: Sem resposta`);
        continue;
      }

      // 2. Validar formatação UX
      const hasTable = /\|[^|]+\|/.test(ragData.response);
      const hasStructuredList = /•.*CA.*básico.*•.*CA.*máximo/i.test(ragData.response);
      const hasRequiredFields = /altura.*máxima/i.test(ragData.response) && 
                               /coeficiente.*aproveitamento/i.test(ragData.response);

      const result = {
        neighborhood: testCase.neighborhood,
        hasTable: hasTable,
        hasStructuredList: hasStructuredList,
        hasRequiredFields: hasRequiredFields,
        responseLength: ragData.response.length,
        isConsistent: hasTable && hasRequiredFields
      };

      results.push(result);

      // Log resultado
      console.log(`   📊 Tem tabela: ${hasTable ? '✅' : '❌'}`);
      console.log(`   📋 Lista estruturada: ${hasStructuredList ? '✅' : '❌'}`);
      console.log(`   📊 Campos obrigatórios: ${hasRequiredFields ? '✅' : '❌'}`);
      console.log(`   🎯 Consistente: ${result.isConsistent ? '✅' : '❌'}`);
      
      if (!result.isConsistent) {
        inconsistentFormats.push(testCase.neighborhood);
      }
      console.log('');

    } catch (error) {
      console.error(`❌ Erro testando ${testCase.neighborhood}:`, error.message);
    }
  }

  // 3. Relatório final
  console.log('📊 RELATÓRIO FINAL DE CONSISTÊNCIA UX:\n');
  
  const consistentCount = results.filter(r => r.isConsistent).length;
  const totalCount = results.length;
  const consistencyRate = (consistentCount / totalCount) * 100;
  
  console.log(`🎯 Taxa de Consistência: ${consistencyRate.toFixed(1)}% (${consistentCount}/${totalCount})`);
  
  const withTableCount = results.filter(r => r.hasTable).length;
  const withFieldsCount = results.filter(r => r.hasRequiredFields).length;
  
  console.log(`📊 Com tabela: ${withTableCount}/${totalCount}`);
  console.log(`📊 Com campos obrigatórios: ${withFieldsCount}/${totalCount}`);
  
  if (inconsistentFormats.length > 0) {
    console.log(`\n⚠️ Bairros com formatação inconsistente:`);
    inconsistentFormats.forEach(neighborhood => {
      console.log(`   • ${neighborhood}`);
    });
  } else {
    console.log(`\n✅ TODOS os bairros testados têm formatação consistente!`);
  }
  
  return { consistencyRate, results, inconsistentFormats };
}

// Executar teste
testUXConsistency().then(results => {
  if (results.consistencyRate === 100) {
    console.log('\n🎉 SUCESSO: Formatação UX 100% consistente!');
  } else {
    console.log(`\n⚠️ ATENÇÃO: ${results.inconsistentFormats.length} bairros precisam de correção.`);
  }
}).catch(console.error);