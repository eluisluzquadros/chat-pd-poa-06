import fetch from 'node-fetch';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.join(__dirname, '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

console.log('🎯 TESTANDO CONSISTÊNCIA UX - Petrópolis vs Três Figueiras\n');

async function testNeighborhoodConsistency() {
  const testCases = [
    {
      neighborhood: 'Petrópolis',
      query: 'O que pode ser construído no bairro Petrópolis'
    },
    {
      neighborhood: 'Três Figueiras', 
      query: 'O que pode ser construído no bairro três figueiras'
    },
    {
      neighborhood: 'Centro Histórico',
      query: 'O que pode ser construído no bairro Centro Histórico'
    },
    {
      neighborhood: 'Moinhos de Vento',
      query: 'O que pode ser construído no bairro Moinhos de Vento'
    }
  ];

  const results = [];

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

      // 2. Validar consistência UX
      const validationResponse = await fetch(`${SUPABASE_URL}/functions/v1/ux-consistency-validator`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          response: ragData.response,
          queryType: 'neighborhood',
          originalQuery: testCase.query
        })
      });

      const validationData = await validationResponse.json();
      
      const result = {
        neighborhood: testCase.neighborhood,
        query: testCase.query,
        responseLength: ragData.response.length,
        validation: validationData.validation,
        response: ragData.response
      };

      results.push(result);

      // Log resultado
      console.log(`📊 ${testCase.neighborhood}:`);
      console.log(`   ✅ Consistente: ${validationData.validation.isConsistent ? 'SIM' : 'NÃO'}`);
      console.log(`   📊 Score: ${validationData.validation.score}/100`);
      console.log(`   📋 Formato: ${validationData.validation.format}`);
      console.log(`   📊 Tem tabela: ${validationData.validation.hasTable ? 'SIM' : 'NÃO'}`);
      console.log(`   📊 Indicadores: ${validationData.validation.hasRequiredIndicators ? 'SIM' : 'NÃO'}`);
      
      if (validationData.validation.issues.length > 0) {
        console.log(`   ⚠️ Issues: ${validationData.validation.issues.join(', ')}`);
      }
      console.log('');

    } catch (error) {
      console.error(`❌ Erro testando ${testCase.neighborhood}:`, error.message);
    }
  }

  // 3. Gerar relatório final
  console.log('📊 RELATÓRIO FINAL DE CONSISTÊNCIA UX:\n');
  
  const consistentCount = results.filter(r => r.validation.isConsistent).length;
  const totalCount = results.length;
  const consistencyRate = (consistentCount / totalCount) * 100;
  
  console.log(`🎯 Taxa de Consistência: ${consistencyRate.toFixed(1)}% (${consistentCount}/${totalCount})`);
  
  // Identificar padrões
  const hasTableCount = results.filter(r => r.validation.hasTable).length;
  const hasIndicatorsCount = results.filter(r => r.validation.hasRequiredIndicators).length;
  
  console.log(`📊 Com tabela: ${hasTableCount}/${totalCount}`);
  console.log(`📊 Com indicadores: ${hasIndicatorsCount}/${totalCount}`);
  
  // Mostrar issues mais comuns
  const allIssues = results.flatMap(r => r.validation.issues);
  const issueCounts = {};
  allIssues.forEach(issue => {
    issueCounts[issue] = (issueCounts[issue] || 0) + 1;
  });
  
  if (Object.keys(issueCounts).length > 0) {
    console.log('\n⚠️ Issues mais comuns:');
    Object.entries(issueCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([issue, count]) => {
        console.log(`   • ${issue}: ${count}x`);
      });
  }
  
  // Análise comparativa Petrópolis vs Três Figueiras
  const petropolis = results.find(r => r.neighborhood === 'Petrópolis');
  const tresFigueiras = results.find(r => r.neighborhood === 'Três Figueiras');
  
  if (petropolis && tresFigueiras) {
    console.log('\n🔍 COMPARAÇÃO PETRÓPOLIS vs TRÊS FIGUEIRAS:');
    console.log(`Petrópolis - Score: ${petropolis.validation.score}, Formato: ${petropolis.validation.format}`);
    console.log(`Três Figueiras - Score: ${tresFigueiras.validation.score}, Formato: ${tresFigueiras.validation.format}`);
    
    if (petropolis.validation.score !== tresFigueiras.validation.score) {
      console.log('❌ INCONSISTÊNCIA DETECTADA entre os bairros!');
      console.log('🔧 Recomendação: Aplicar correções na response-synthesizer');
    } else {
      console.log('✅ Ambos os bairros têm formatação consistente');
    }
  }

  return results;
}

// Executar teste
testNeighborhoodConsistency().catch(console.error);