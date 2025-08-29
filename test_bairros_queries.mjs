// Script de teste automatizado para validar queries de bairros
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

// Carregar lista de bairros
const bairrosList = JSON.parse(fs.readFileSync('bairros_porto_alegre.json', 'utf8'));

// Tipos de queries para testar
const queryTemplates = [
  '{bairro}',
  'regime urbanístico do {bairro}',
  'o que posso construir no {bairro}',
  'altura máxima do {bairro}',
  'zonas do {bairro}'
];

// Função para testar uma query
async function testQuery(query, bairro) {
  const response = await fetch(`${supabaseUrl}/functions/v1/agentic-rag`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'apikey': supabaseAnonKey
    },
    body: JSON.stringify({
      message: query,
      sessionId: `test-${Date.now()}`,
      bypassCache: true
    })
  });

  if (!response.ok) {
    return {
      success: false,
      error: `HTTP ${response.status}`,
      response: null
    };
  }

  const data = await response.json();
  
  // Critérios de sucesso
  const hasTable = data.response?.includes('|');
  const hasZOT = data.response?.match(/ZOT\s*\d+/);
  const hasAltura = data.response?.toLowerCase().includes('altura');
  const hasCoeficiente = data.response?.toLowerCase().includes('coef');
  const hasBetaError = data.response?.toLowerCase().includes('versão beta');
  const hasData = hasTable || hasZOT || (hasAltura && hasCoeficiente);
  
  return {
    success: hasData && !hasBetaError,
    hasTable,
    hasZOT,
    hasAltura,
    hasCoeficiente,
    hasBetaError,
    confidence: data.confidence,
    responseLength: data.response?.length,
    response: data.response
  };
}

// Função para normalizar nome do bairro para query
function normalizeBairroForQuery(bairro) {
  // Remover acentos e converter para minúsculas para algumas variações
  const variations = [
    bairro, // Original
    bairro.toLowerCase(), // Minúsculas
    bairro.toLowerCase()
      .replace(/á/g, 'a')
      .replace(/é/g, 'e')
      .replace(/í/g, 'i')
      .replace(/ó/g, 'o')
      .replace(/ú/g, 'u')
      .replace(/ã/g, 'a')
      .replace(/õ/g, 'o')
      .replace(/ç/g, 'c')
  ];
  
  return variations;
}

// Função principal
async function runTests() {
  console.log('🧪 TESTE AUTOMATIZADO DE QUERIES DE BAIRROS\n');
  console.log(`📊 Total de bairros a testar: ${bairrosList.length}`);
  console.log(`📋 Tipos de queries: ${queryTemplates.length}\n`);
  
  const results = {
    totalTests: 0,
    successful: 0,
    failed: 0,
    failedBairros: new Set(),
    failedQueries: [],
    summary: {}
  };

  // Testar apenas alguns bairros primeiro (para não sobrecarregar)
  const testSample = [
    'TRÊS FIGUEIRAS',
    'CAVALHADA', 
    'PETRÓPOLIS',
    'CRISTAL',
    'BOA VISTA',
    'CENTRO HISTÓRICO',
    'CIDADE BAIXA',
    'MOINHOS DE VENTO',
    'JARDIM BOTÂNICO',
    'VILA NOVA'
  ];

  for (const bairro of testSample) {
    console.log(`\n🏘️  Testando: ${bairro}`);
    results.summary[bairro] = {
      total: 0,
      success: 0,
      failed: 0,
      details: []
    };

    // Testar query simples (só o nome do bairro)
    const simpleQuery = bairro.toLowerCase();
    console.log(`   📝 Query: "${simpleQuery}"`);
    
    try {
      const result = await testQuery(simpleQuery, bairro);
      results.totalTests++;
      results.summary[bairro].total++;
      
      if (result.success) {
        results.successful++;
        results.summary[bairro].success++;
        console.log(`   ✅ Sucesso (confiança: ${result.confidence?.toFixed(2)})`);
      } else {
        results.failed++;
        results.summary[bairro].failed++;
        results.failedBairros.add(bairro);
        results.failedQueries.push({
          bairro,
          query: simpleQuery,
          reason: result.hasBetaError ? 'Resposta Beta' : 'Sem dados',
          details: result
        });
        console.log(`   ❌ Falhou: ${result.hasBetaError ? 'Resposta Beta' : 'Sem dados encontrados'}`);
      }
      
      results.summary[bairro].details.push({
        query: simpleQuery,
        ...result
      });
      
      // Aguardar um pouco entre requests
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.log(`   ⚠️  Erro: ${error.message}`);
      results.failed++;
      results.summary[bairro].failed++;
      results.failedBairros.add(bairro);
    }
  }

  // Relatório final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RELATÓRIO FINAL\n');
  console.log(`Total de testes: ${results.totalTests}`);
  console.log(`✅ Sucesso: ${results.successful} (${(results.successful/results.totalTests*100).toFixed(1)}%)`);
  console.log(`❌ Falhas: ${results.failed} (${(results.failed/results.totalTests*100).toFixed(1)}%)`);
  
  console.log('\n🚨 BAIRROS COM FALHA:');
  Array.from(results.failedBairros).forEach(bairro => {
    console.log(`   - ${bairro}`);
  });

  // Salvar relatório detalhado
  fs.writeFileSync('test_results_bairros.json', JSON.stringify(results, null, 2));
  console.log('\n📄 Relatório detalhado salvo em: test_results_bairros.json');

  // Análise de padrões
  console.log('\n🔍 ANÁLISE DE PADRÕES:');
  const betaErrors = results.failedQueries.filter(q => q.details.hasBetaError).length;
  const noDataErrors = results.failedQueries.filter(q => !q.details.hasBetaError).length;
  
  console.log(`   - Erros "Versão Beta": ${betaErrors}`);
  console.log(`   - Erros "Sem dados": ${noDataErrors}`);
  
  // Verificar se há padrão nos nomes
  const failedNames = Array.from(results.failedBairros);
  const hasAccents = failedNames.filter(n => /[áéíóúãõç]/i.test(n));
  const hasSpaces = failedNames.filter(n => n.includes(' '));
  
  console.log(`   - Bairros com acentos que falharam: ${hasAccents.length}`);
  console.log(`   - Bairros com espaços que falharam: ${hasSpaces.length}`);
}

// Executar testes
runTests().catch(console.error);