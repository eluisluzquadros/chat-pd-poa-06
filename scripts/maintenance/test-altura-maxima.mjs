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

console.log('🧪 Testando Query de Altura Máxima\n');
console.log('URL:', SUPABASE_URL);
console.log('Query: "Qual a altura máxima mais alta permitida em Porto Alegre?"\n');

async function testAlturaMaxima() {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        message: 'Qual a altura máxima mais alta permitida em Porto Alegre?',
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
    
    // Verificar se contém "130" na resposta
    if (result.response && result.response.includes('130')) {
      console.log('\n✅ TESTE PASSOU: Resposta contém 130m (valor correto)');
    } else {
      console.log('\n❌ TESTE FALHOU: Resposta não contém 130m');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testAlturaMaxima();