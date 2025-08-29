// Teste simplificado e mais rápido para queries de bairros
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

// Carregar lista de bairros
const bairrosList = JSON.parse(fs.readFileSync('bairros_porto_alegre.json', 'utf8'));

// Função para testar uma query
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
    
    // Critérios de sucesso mais específicos
    const hasTable = response_text.includes('|') && response_text.includes('ZOT');
    const hasZOT = /ZOT\s*\d+/.test(response_text);
    const hasAltura = response_text.toLowerCase().includes('altura') || response_text.includes('m)');
    const hasCoeficiente = response_text.toLowerCase().includes('coef') || response_text.includes('CA');
    const hasBetaError = response_text.toLowerCase().includes('versão beta') || 
                        response_text.toLowerCase().includes('não consigo responder');
    const hasNoData = response_text.toLowerCase().includes('não encontr') ||
                     response_text.toLowerCase().includes('não foi possível');
    
    const success = (hasTable || (hasZOT && hasAltura)) && !hasBetaError && !hasNoData;
    
    return {
      success,
      hasTable,
      hasZOT,
      hasAltura,
      hasCoeficiente,
      hasBetaError,
      hasNoData,
      confidence: data.confidence,
      responseSnippet: response_text.substring(0, 200)
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Executar testes
async function runSimpleTest() {
  console.log('🧪 TESTE RÁPIDO DE QUERIES SIMPLES DE BAIRROS\n');
  
  const results = {
    total: 0,
    success: 0,
    failed: 0,
    errors: 0,
    details: {},
    failureReasons: {
      beta: [],
      noData: [],
      error: [],
      other: []
    }
  };

  // Testar todos os bairros com query simples
  for (let i = 0; i < bairrosList.length; i++) {
    const bairro = bairrosList[i];
    const query = bairro.toLowerCase();
    
    process.stdout.write(`\r⏳ Testando ${i + 1}/${bairrosList.length}: ${bairro.padEnd(30)} `);
    
    const result = await testQuery(query);
    results.total++;
    
    if (result.success) {
      results.success++;
      process.stdout.write('✅\n');
    } else if (result.error) {
      results.errors++;
      results.failureReasons.error.push({ bairro, error: result.error });
      process.stdout.write('⚠️\n');
    } else {
      results.failed++;
      if (result.hasBetaError) {
        results.failureReasons.beta.push(bairro);
      } else if (result.hasNoData) {
        results.failureReasons.noData.push(bairro);
      } else {
        results.failureReasons.other.push(bairro);
      }
      process.stdout.write('❌\n');
    }
    
    results.details[bairro] = result;
    
    // Pequena pausa entre requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Relatório
  console.log('\n' + '='.repeat(60));
  console.log('📊 RELATÓRIO FINAL\n');
  console.log(`Total testado: ${results.total}`);
  console.log(`✅ Sucesso: ${results.success} (${(results.success/results.total*100).toFixed(1)}%)`);
  console.log(`❌ Falhas: ${results.failed} (${(results.failed/results.total*100).toFixed(1)}%)`);
  console.log(`⚠️  Erros: ${results.errors}`);
  
  console.log('\n📈 ANÁLISE DE FALHAS:');
  console.log(`   Resposta Beta: ${results.failureReasons.beta.length}`);
  console.log(`   Sem dados: ${results.failureReasons.noData.length}`);
  console.log(`   Outros: ${results.failureReasons.other.length}`);
  
  if (results.failureReasons.beta.length > 0) {
    console.log('\n🚨 BAIRROS COM RESPOSTA BETA:');
    results.failureReasons.beta.slice(0, 10).forEach(b => console.log(`   - ${b}`));
    if (results.failureReasons.beta.length > 10) {
      console.log(`   ... e mais ${results.failureReasons.beta.length - 10} bairros`);
    }
  }

  // Salvar resultados
  fs.writeFileSync('test_results_simple.json', JSON.stringify(results, null, 2));
  console.log('\n📄 Relatório completo salvo em: test_results_simple.json');
  
  // Análise de padrões nos nomes que falharam
  const allFailed = [...results.failureReasons.beta, ...results.failureReasons.noData, ...results.failureReasons.other];
  console.log('\n🔍 PADRÕES NOS BAIRROS QUE FALHARAM:');
  
  const patterns = {
    comAcento: allFailed.filter(b => /[áéíóúãõç]/i.test(b)),
    comEspaco: allFailed.filter(b => b.includes(' ')),
    compridos: allFailed.filter(b => b.length > 15),
    comHifen: allFailed.filter(b => b.includes('-')),
    comSao: allFailed.filter(b => b.includes('SÃO') || b.includes('SANTO') || b.includes('SANTA'))
  };
  
  console.log(`   Com acentos: ${patterns.comAcento.length} (${(patterns.comAcento.length/allFailed.length*100).toFixed(1)}%)`);
  console.log(`   Com espaços: ${patterns.comEspaco.length} (${(patterns.comEspaco.length/allFailed.length*100).toFixed(1)}%)`);
  console.log(`   Nomes longos (>15 char): ${patterns.compridos.length}`);
  console.log(`   Com hífen: ${patterns.comHifen.length}`);
  console.log(`   Com São/Santo/Santa: ${patterns.comSao.length}`);
}

runSimpleTest().catch(console.error);