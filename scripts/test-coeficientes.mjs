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

console.log('🧪 Testando Query de Coeficientes da ZOT 04\n');
console.log('URL:', SUPABASE_URL);
console.log('Query: "Quais os coeficientes de aproveitamento da ZOT 04?"\n');

async function testCoeficientes() {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        message: 'Quais os coeficientes de aproveitamento da ZOT 04?',
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
    
    // Verificar se contém os valores numéricos esperados
    const hasBasico2 = result.response && (result.response.includes('2.0') || result.response.includes('2,0') || result.response.includes(': 2'));
    const hasMaximo4 = result.response && (result.response.includes('4.0') || result.response.includes('4,0') || result.response.includes(': 4'));
    const hasNaoDisponivel = result.response && result.response.includes('Não disponível');
    
    console.log('\n📊 Verificação de valores:');
    console.log(`  ${hasBasico2 ? '✅' : '❌'} CA básico = 2.0`);
    console.log(`  ${hasMaximo4 ? '✅' : '❌'} CA máximo = 4.0`);
    console.log(`  ${!hasNaoDisponivel ? '✅' : '⚠️'} ${hasNaoDisponivel ? 'Contém "Não disponível" (deveria mostrar valores numéricos)' : 'Não contém "Não disponível" (correto)'}`);
    
    if (hasBasico2 && hasMaximo4 && !hasNaoDisponivel) {
      console.log('\n✅ TESTE PASSOU: Resposta contém valores numéricos corretos');
    } else if (hasBasico2 && hasMaximo4) {
      console.log('\n⚠️ TESTE PARCIAL: Valores corretos mas ainda mostra "Não disponível"');
    } else {
      console.log('\n❌ TESTE FALHOU: Resposta não contém os valores corretos');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testCoeficientes();