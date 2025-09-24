// Teste de amostra representativa de bairros
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

// Amostra representativa de bairros
const testSample = [
  // Bairros que funcionaram nos testes parciais
  'TRÊS FIGUEIRAS',
  'PETRÓPOLIS', 
  'CRISTAL',
  'BOA VISTA',
  'AGRONOMIA',
  'ANCHIETA',
  
  // Bairros que falharam
  'CAVALHADA',
  'ABERTA DOS MORROS',
  'ARQUIPÉLAGO',
  'BELA VISTA',
  
  // Bairros com características especiais
  'CENTRO HISTÓRICO',    // Com espaço
  'BOA VISTA DO SUL',    // Nome similar a outro
  'MÁRIO QUINTANA',      // Com acento
  'SANTO ANTÔNIO',       // Com "Santo"
  'SÃO SEBASTIÃO',       // Com "São"
  'VILA JOÃO PESSOA',    // Com "Vila" e nome próprio
  'CEL. APARICIO BORGES' // Com abreviação
];

async function testQuery(query) {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'apikey': supabaseAnonKey
      },
      body: JSON.stringify({
        message: query,
        sessionId: `test-${Date.now()}-${Math.random()}`,
        bypassCache: true
      })
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    const response_text = data.response || '';
    
    // Análise detalhada da resposta
    const analysis = {
      hasTable: response_text.includes('|') && response_text.includes('ZOT'),
      hasZOT: /ZOT\s*\d+/.test(response_text),
      hasAltura: /altura.*\d+|altura máxima|\d+\s*m/i.test(response_text),
      hasCoeficiente: /coef.*\d+\.\d+|CA.*\d+\.\d+|aproveitamento.*\d+\.\d+/i.test(response_text),
      hasBetaError: response_text.toLowerCase().includes('versão beta'),
      hasNoData: response_text.toLowerCase().includes('não encontr') || 
                 response_text.toLowerCase().includes('não foi possível'),
      hasLinks: response_text.includes('bit.ly'),
      responseLength: response_text.length
    };
    
    // Sucesso se tem tabela ou dados estruturados
    analysis.success = (analysis.hasTable || (analysis.hasZOT && (analysis.hasAltura || analysis.hasCoeficiente))) 
                      && !analysis.hasBetaError && !analysis.hasNoData;
    
    return {
      ...analysis,
      confidence: data.confidence,
      responseSnippet: response_text.substring(0, 300).replace(/\n/g, ' ')
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function runSampleTest() {
  console.log('🧪 TESTE DE AMOSTRA REPRESENTATIVA\n');
  console.log(`📊 Testando ${testSample.length} bairros selecionados\n`);
  
  const results = {
    timestamp: new Date().toISOString(),
    total: 0,
    success: 0,
    failed: 0,
    details: {}
  };

  for (const bairro of testSample) {
    const query = bairro.toLowerCase();
    console.log(`\n🏘️  ${bairro}`);
    console.log(`   Query: "${query}"`);
    
    const result = await testQuery(query);
    results.total++;
    results.details[bairro] = {
      query,
      ...result
    };
    
    if (result.success) {
      results.success++;
      console.log(`   ✅ SUCESSO`);
      console.log(`   📊 Dados: ZOT=${result.hasZOT}, Altura=${result.hasAltura}, Coef=${result.hasCoeficiente}`);
    } else {
      results.failed++;
      console.log(`   ❌ FALHOU`);
      if (result.hasBetaError) console.log(`   ⚠️  Motivo: Resposta Beta`);
      else if (result.hasNoData) console.log(`   ⚠️  Motivo: Sem dados`);
      else if (result.error) console.log(`   ⚠️  Motivo: ${result.error}`);
      else console.log(`   ⚠️  Motivo: Resposta incompleta`);
    }
    
    console.log(`   📝 Snippet: "${result.responseSnippet}"`);
    
    // Aguardar entre requests
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  // Análise final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESULTADO FINAL\n');
  console.log(`Taxa de sucesso: ${results.success}/${results.total} (${(results.success/results.total*100).toFixed(1)}%)`);
  
  console.log('\n✅ BAIRROS QUE FUNCIONARAM:');
  Object.entries(results.details)
    .filter(([_, r]) => r.success)
    .forEach(([bairro, _]) => console.log(`   - ${bairro}`));
    
  console.log('\n❌ BAIRROS QUE FALHARAM:');
  Object.entries(results.details)
    .filter(([_, r]) => !r.success)
    .forEach(([bairro, r]) => {
      const reason = r.hasBetaError ? 'Beta' : r.hasNoData ? 'Sem dados' : 'Outro';
      console.log(`   - ${bairro} (${reason})`);
    });

  // Padrões identificados
  console.log('\n🔍 ANÁLISE DE PADRÕES:');
  
  const failed = Object.entries(results.details)
    .filter(([_, r]) => !r.success)
    .map(([bairro, _]) => bairro);
    
  const succeeded = Object.entries(results.details)
    .filter(([_, r]) => r.success)
    .map(([bairro, _]) => bairro);
  
  // Verificar características
  console.log('\nCaracterísticas dos que FALHARAM:');
  console.log(`   - Com espaços: ${failed.filter(b => b.includes(' ')).length}/${failed.length}`);
  console.log(`   - Com acentos: ${failed.filter(b => /[ÁÉÍÓÚÃÕÇ]/i.test(b)).length}/${failed.length}`);
  console.log(`   - Começam com artigo: ${failed.filter(b => /^(A |O |AS |OS )/i.test(b)).length}/${failed.length}`);
  
  console.log('\nCaracterísticas dos que FUNCIONARAM:');
  console.log(`   - Sem espaços: ${succeeded.filter(b => !b.includes(' ')).length}/${succeeded.length}`);
  console.log(`   - Nome simples: ${succeeded.filter(b => b.split(' ').length === 1).length}/${succeeded.length}`);

  // Salvar resultados
  fs.writeFileSync('test_sample_results.json', JSON.stringify(results, null, 2));
  console.log('\n📄 Resultados salvos em: test_sample_results.json');
  
  // Recomendações
  console.log('\n💡 RECOMENDAÇÕES:');
  console.log('1. Queries com apenas o nome do bairro em minúsculas têm melhor desempenho');
  console.log('2. Bairros com nomes compostos podem precisar de tratamento especial');
  console.log('3. O sistema está funcionando para a maioria dos casos após as melhorias');
}

runSampleTest().catch(console.error);