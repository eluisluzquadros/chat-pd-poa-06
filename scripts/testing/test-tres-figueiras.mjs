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

console.log('🧪 Testando Query do Bairro Três Figueiras\n');
console.log('URL:', SUPABASE_URL);
console.log('Query: "Qual a altura máxima no bairro Três Figueiras?"\n');

async function testTresFigueiras() {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        message: 'Qual a altura máxima no bairro Três Figueiras?',
        bypassCache: true,
        model: 'openai/gpt-3.5-turbo'
      }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('❌ Erro na requisição:', result);
      return;
    }
    
    console.log('✅ Resposta recebida:\n');
    console.log(result.response);
    
    // Verificar se contém os valores esperados
    const expectedValues = ['18', '60', '90', 'ZOT 04', 'ZOT 07', 'ZOT 08.3'];
    const foundValues = expectedValues.filter(val => result.response && result.response.includes(val));
    
    console.log('\n📊 Verificação de valores:');
    expectedValues.forEach(val => {
      if (result.response && result.response.includes(val)) {
        console.log(`  ✅ Contém "${val}"`);
      } else {
        console.log(`  ❌ Não contém "${val}"`);
      }
    });
    
    if (foundValues.length >= 4) {
      console.log('\n✅ TESTE PASSOU: Resposta contém a maioria dos valores esperados');
    } else {
      console.log('\n❌ TESTE FALHOU: Resposta não contém todos os valores esperados');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testTresFigueiras();