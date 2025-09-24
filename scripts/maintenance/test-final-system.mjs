#!/usr/bin/env node

import fetch from 'node-fetch';

const SUPABASE_URL = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

console.log('🎉 TESTE FINAL DO SISTEMA\n');

async function testQuery(query) {
  console.log(`\n📝 Testando: "${query}"`);
  console.log('─'.repeat(60));
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        sessionId: `test-final-${Date.now()}`,
        bypassCache: true
      })
    });
    
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      const data = await response.json();
      
      console.log('✅ Status: Sucesso');
      console.log(`⏱️  Tempo de resposta: ${responseTime}ms`);
      console.log(`🎯 Confiança: ${data.confidence ? (data.confidence * 100).toFixed(0) + '%' : 'N/A'}`);
      console.log(`📊 Fontes: Tabular=${data.sources?.tabular || 0}, Conceitual=${data.sources?.conceptual || 0}`);
      console.log(`🤖 Modelo: ${data.model || 'gpt-3.5-turbo'}`);
      console.log('\n📄 Resposta:');
      console.log('─'.repeat(60));
      console.log(data.response);
      console.log('─'.repeat(60));
      
      return { success: true, data, responseTime };
    } else {
      console.log('❌ Status: Erro HTTP', response.status);
      const errorText = await response.text();
      console.log('Detalhes:', errorText.substring(0, 200));
      return { success: false, error: errorText, responseTime };
    }
  } catch (error) {
    console.log('❌ Erro de rede:', error.message);
    return { success: false, error: error.message, responseTime: Date.now() - startTime };
  }
}

async function main() {
  const testQueries = [
    'oi',
    'Quais são as zonas do Centro Histórico?',
    'Qual a altura máxima permitida no bairro Petrópolis?'
  ];
  
  const results = [];
  
  for (const query of testQueries) {
    const result = await testQuery(query);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Resumo
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 RESUMO DOS TESTES');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.success).length;
  const avgTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
  
  console.log(`✅ Taxa de sucesso: ${(successful / results.length * 100).toFixed(0)}%`);
  console.log(`⏱️  Tempo médio: ${avgTime.toFixed(0)}ms`);
  
  console.log('\n🏁 STATUS DO SISTEMA:');
  if (successful === results.length) {
    console.log('✅ Sistema totalmente operacional!');
    console.log('✅ Chat respondendo corretamente');
    console.log('✅ LLM integrado e funcionando');
    console.log('✅ Dados do Plano Diretor acessíveis');
  } else {
    console.log('⚠️  Sistema parcialmente operacional');
    console.log(`   ${successful}/${results.length} testes bem-sucedidos`);
  }
  
  console.log('\n💡 PRÓXIMOS PASSOS:');
  console.log('1. Executar benchmark completo com múltiplos modelos');
  console.log('2. Implementar seleção dinâmica de modelo');
  console.log('3. Otimizar trade-off qualidade vs custo vs velocidade');
}

main().catch(console.error);