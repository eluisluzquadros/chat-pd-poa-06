import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function testResponseSynthesizer() {
  console.log('🧪 TESTE DIRETO DO RESPONSE-SYNTHESIZER COM COEFICIENTES\n');
  console.log('=' .repeat(70));
  
  // Dados simulando o que vem do SQL (Três Figueiras tem 3 zonas)
  const testData = {
    originalQuery: "Três Figueiras",
    analysisResult: {
      intent: 'tabular',
      entities: {
        bairros: ['TRÊS FIGUEIRAS']
      },
      strategy: 'structured_only'
    },
    sqlResults: {
      executionResults: [{
        data: [
          { 
            bairro: 'TRÊS FIGUEIRAS', 
            zona: 'ZOT 04', 
            altura_maxima: 18, 
            coef_aproveitamento_basico: 2, 
            coef_aproveitamento_maximo: 4 
          },
          { 
            bairro: 'TRÊS FIGUEIRAS', 
            zona: 'ZOT 07', 
            altura_maxima: 60, 
            coef_aproveitamento_basico: null, 
            coef_aproveitamento_maximo: null 
          },
          { 
            bairro: 'TRÊS FIGUEIRAS', 
            zona: 'ZOT 08.3 - C', 
            altura_maxima: 90, 
            coef_aproveitamento_basico: null, 
            coef_aproveitamento_maximo: null 
          }
        ]
      }]
    },
    model: 'openai/gpt-3.5-turbo'
  };
  
  console.log('📤 Enviando dados de teste para response-synthesizer...\n');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/response-synthesizer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(testData),
    });
    
    const result = await response.json();
    
    if (result.response) {
      console.log('📝 Resposta recebida:');
      console.log('-'.repeat(50));
      console.log(result.response);
      console.log('-'.repeat(50));
      
      // Análise da resposta
      console.log('\n🔍 ANÁLISE DA RESPOSTA:\n');
      
      // Verificar ZOT 04
      console.log('ZOT 04 (deve ter coeficientes 2 e 4):');
      const zot04Section = result.response.match(/ZOT 04[^]*?(?=ZOT|📍|$)/s);
      if (zot04Section) {
        const has2 = zot04Section[0].includes('2');
        const has4 = zot04Section[0].includes('4');
        const hasNaoDisp = zot04Section[0].includes('Não disponível') || zot04Section[0].includes('Não definido');
        
        console.log(`  CA básico = 2: ${has2 ? '✅' : '❌'}`);
        console.log(`  CA máximo = 4: ${has4 ? '✅' : '❌'}`);
        console.log(`  "Não disponível": ${hasNaoDisp ? '❌ ERRO!' : '✅ Correto'}`);
      }
      
      // Verificar ZOT 07
      console.log('\nZOT 07 (não tem coeficientes definidos):');
      const zot07Section = result.response.match(/ZOT 07[^]*?(?=ZOT|📍|$)/s);
      if (zot07Section) {
        const hasNaoDisp = zot07Section[0].includes('Não disponível') || zot07Section[0].includes('Não definido');
        console.log(`  "Não disponível/definido": ${hasNaoDisp ? '✅ Correto' : '❌'}`);
      }
      
      // Contagem geral
      const totalNaoDisp = (result.response.match(/Não disponível|Não definido/g) || []).length;
      console.log(`\n📊 Total de "Não disponível/definido": ${totalNaoDisp}`);
      console.log(`   Esperado: 4 (2 para ZOT 07 + 2 para ZOT 08.3-C)`);
      
      if (totalNaoDisp === 4) {
        console.log('   ✅ Quantidade correta!');
      } else if (totalNaoDisp === 0) {
        console.log('   ✅ Nenhum "Não disponível" (melhor ainda!)');
      } else {
        console.log('   ⚠️ Quantidade diferente do esperado');
      }
      
    } else {
      console.log('❌ Erro:', result.error);
    }
    
  } catch (error) {
    console.log('❌ Erro na requisição:', error.message);
  }
  
  console.log('\n' + '=' .repeat(70));
  console.log('✅ Teste completo!');
}

testResponseSynthesizer().catch(console.error);