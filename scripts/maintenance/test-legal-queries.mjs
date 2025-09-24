import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🧪 Testando Queries Legais (Artigos da LUOS)\n');
console.log('=' .repeat(70));

const testQueries = [
  {
    name: "Certificação Sustentável",
    query: "Qual artigo da LUOS trata da Certificação em Sustentabilidade Ambiental?",
    expectedKeywords: ["81", "III", "certificação", "sustentabilidade"]
  },
  {
    name: "4º Distrito",
    query: "Qual a regra para empreendimentos no 4° Distrito?",
    expectedKeywords: ["74", "4º distrito", "ZOT 8.2"]
  }
];

async function testLegalQuery(test) {
  console.log(`\n📝 Testando: ${test.name}`);
  console.log(`Query: "${test.query}"`);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        message: test.query,
        bypassCache: true,
        model: 'openai/gpt-3.5-turbo'
      }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('❌ Erro na requisição:', result);
      return false;
    }
    
    console.log('\n📄 Resposta recebida:');
    console.log('-'.repeat(50));
    console.log(result.response);
    console.log('-'.repeat(50));
    
    // Verificar palavras-chave esperadas
    const responseText = result.response || '';
    const foundKeywords = test.expectedKeywords.filter(kw => 
      responseText.toLowerCase().includes(kw.toLowerCase())
    );
    
    console.log('\n📊 Análise de palavras-chave:');
    test.expectedKeywords.forEach(kw => {
      const found = responseText.toLowerCase().includes(kw.toLowerCase());
      console.log(`  ${found ? '✅' : '❌'} "${kw}"`);
    });
    
    const successRate = (foundKeywords.length / test.expectedKeywords.length) * 100;
    
    if (successRate >= 75) {
      console.log(`\n✅ TESTE PASSOU (${successRate.toFixed(0)}% das palavras-chave encontradas)`);
      return true;
    } else if (successRate >= 50) {
      console.log(`\n⚠️ TESTE PARCIAL (${successRate.toFixed(0)}% das palavras-chave encontradas)`);
      return false;
    } else {
      console.log(`\n❌ TESTE FALHOU (apenas ${successRate.toFixed(0)}% das palavras-chave encontradas)`);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    return false;
  }
}

async function runTests() {
  let passed = 0;
  let failed = 0;
  
  for (const test of testQueries) {
    const result = await testLegalQuery(test);
    if (result) {
      passed++;
    } else {
      failed++;
    }
    
    // Delay entre testes
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 RESUMO DOS TESTES LEGAIS:');
  console.log(`  ✅ Passou: ${passed}`);
  console.log(`  ❌ Falhou: ${failed}`);
  console.log(`  📈 Taxa de sucesso: ${(passed / testQueries.length * 100).toFixed(0)}%`);
  
  if (failed > 0) {
    console.log('\n⚠️ CONCLUSÃO: Sistema precisa de ajustes para queries legais');
    console.log('   Recomendação: Ativar sistema de chunking hierárquico');
  } else {
    console.log('\n✅ CONCLUSÃO: Sistema funcionando corretamente para queries legais!');
  }
}

runTests().catch(console.error);