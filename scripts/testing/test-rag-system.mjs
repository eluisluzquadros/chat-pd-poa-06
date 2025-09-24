import fetch from 'node-fetch';

const testQueries = [
  'escreva um resumo de até 25 palavras sobre a lei do plano diretor de porto alegre',
  'qual é a altura máxima e coef. básico e máx do alberta dos morros para cada zot',
  'Quantos bairros estão Protegidos pelo Sistema Atual para proteção contra enchentes',
  'Qual artigo da LUOS trata da Certificação em Sustentabilidade Ambiental',
  'Como o Regime Volumétrico é tratado na LUOS',
  'o que afirma literalmente o Art 1º da LUOS',
  'do que se trata o Art. 119 da LUOS',
  'O Art. 3º O Plano Diretor Urbano Sustentável de Porto Alegre será regido por princípios fundamentais. quais são eles',
  'resuma o Art. 192 do plano diretor',
  'Qual a altura máxima da construção dos prédios em Porto Alegre'
];

async function testSystem() {
  const url = 'https://ngrqwmvuhvjkeohesbxs.supabase.co/functions/v1/agentic-rag';
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';
  
  console.log('🔍 TESTANDO SISTEMA RAG COM 10 PERGUNTAS\n');
  console.log('='.repeat(60));
  
  let successCount = 0;
  let failCount = 0;
  const results = [];
  
  for (let i = 0; i < testQueries.length; i++) {
    const query = testQueries[i];
    console.log(`\n📝 PERGUNTA ${i+1}: ${query}`);
    console.log('-'.repeat(60));
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + anonKey
        },
        body: JSON.stringify({ 
          query: query,
          mode: 'complete',
          useCache: false
        })
      });
      
      if (!response.ok) {
        const text = await response.text();
        console.log('❌ Erro HTTP:', response.status);
        console.log('Resposta:', text.substring(0, 200));
        failCount++;
        results.push({ query, status: 'error', error: `HTTP ${response.status}` });
        continue;
      }
      
      const data = await response.json();
      
      if (data.answer || data.response) {
        const answer = data.answer || data.response;
        console.log('✅ RESPOSTA:', answer.substring(0, 400));
        if (answer.length > 400) console.log('... [truncado]');
        
        // Verificar se tem dados estruturados
        if (data.structuredData) {
          console.log('📊 Dados estruturados:', JSON.stringify(data.structuredData).substring(0, 100));
        }
        
        // Verificar confiança
        if (data.confidence) {
          console.log('🎯 Confiança:', data.confidence);
        }
        
        // Verificar se é resposta genérica ou hardcoded
        const genericPhrases = [
          'não encontr',
          'não foi possível',
          'sem informação',
          'dados não disponíveis',
          'erro ao processar'
        ];
        
        const isGeneric = genericPhrases.some(phrase => 
          answer.toLowerCase().includes(phrase)
        );
        
        if (isGeneric) {
          console.log('⚠️  Resposta genérica detectada');
          results.push({ query, status: 'generic', answer: answer.substring(0, 100) });
        } else {
          successCount++;
          results.push({ query, status: 'success', answer: answer.substring(0, 100) });
        }
        
      } else {
        console.log('⚠️ Resposta vazia ou estrutura inválida');
        failCount++;
        results.push({ query, status: 'empty' });
      }
      
    } catch (error) {
      console.log('❌ Erro na requisição:', error.message);
      failCount++;
      results.push({ query, status: 'error', error: error.message });
    }
    
    // Pequena pausa entre requisições
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Resumo final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO DO TESTE');
  console.log('='.repeat(60));
  console.log(`✅ Sucessos: ${successCount}/${testQueries.length}`);
  console.log(`❌ Falhas: ${failCount}/${testQueries.length}`);
  console.log(`📈 Taxa de sucesso: ${Math.round((successCount/testQueries.length)*100)}%`);
  
  // Análise detalhada
  console.log('\n📋 ANÁLISE DETALHADA:');
  const byStatus = {};
  results.forEach(r => {
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
  });
  
  Object.entries(byStatus).forEach(([status, count]) => {
    console.log(`  ${status}: ${count} respostas`);
  });
  
  // Identificar padrões problemáticos
  console.log('\n⚠️  PROBLEMAS IDENTIFICADOS:');
  
  const problems = results.filter(r => r.status !== 'success');
  if (problems.length > 0) {
    problems.forEach((p, i) => {
      console.log(`${i+1}. Pergunta: "${p.query.substring(0, 50)}..."`);
      console.log(`   Status: ${p.status}`);
      if (p.error) console.log(`   Erro: ${p.error}`);
    });
  } else {
    console.log('  Nenhum problema identificado!');
  }
  
  return results;
}

testSystem().catch(console.error);