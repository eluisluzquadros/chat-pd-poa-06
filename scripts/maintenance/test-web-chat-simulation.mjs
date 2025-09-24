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

async function testWebChatSimulation() {
  console.log('🧪 SIMULAÇÃO DO CHAT WEB\n');
  console.log('=' .repeat(70));
  
  const testQuery = "Qual é a altura máxima permitida no bairro Petrópolis?";
  
  console.log('📝 Testando query:', testQuery);
  console.log('-'.repeat(50));
  
  // Teste 1: Como o script de teste faz (FUNCIONANDO)
  console.log('\n✅ Método 1: Como o script de teste (com query + bypassCache):');
  try {
    const response1 = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        query: testQuery,
        bypassCache: true,
        model: 'openai/gpt-3.5-turbo'
      }),
    });
    
    const result1 = await response1.json();
    if (response1.ok && result1.response) {
      console.log('Resposta recebida (primeiros 500 chars):');
      console.log(result1.response.substring(0, 500) + '...\n');
    } else {
      console.log('Erro:', result1.error || 'Resposta inválida');
    }
  } catch (error) {
    console.log('Erro:', error.message);
  }
  
  // Teste 2: Como o chat web ESTAVA fazendo (SEM bypassCache)
  console.log('\n❌ Método 2: Como o chat web ESTAVA fazendo (com message, sem bypassCache):');
  try {
    const response2 = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        message: testQuery,
        userRole: 'citizen',
        sessionId: 'test-session-' + Date.now()
      }),
    });
    
    const result2 = await response2.json();
    if (response2.ok && result2.response) {
      console.log('Resposta recebida (primeiros 500 chars):');
      console.log(result2.response.substring(0, 500) + '...\n');
    } else {
      console.log('Erro:', result2.error || 'Resposta inválida');
    }
  } catch (error) {
    console.log('Erro:', error.message);
  }
  
  // Teste 3: Como o chat web FAZ AGORA (com bypassCache)
  console.log('\n✅ Método 3: Como o chat web FAZ AGORA (com message + bypassCache):');
  try {
    const response3 = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        message: testQuery,
        userRole: 'citizen',
        sessionId: 'test-session-' + Date.now(),
        bypassCache: true,
        model: 'openai/gpt-3.5-turbo'
      }),
    });
    
    const result3 = await response3.json();
    if (response3.ok && result3.response) {
      console.log('Resposta recebida (primeiros 500 chars):');
      console.log(result3.response.substring(0, 500) + '...\n');
    } else {
      console.log('Erro:', result3.error || 'Resposta inválida');
    }
  } catch (error) {
    console.log('Erro:', error.message);
  }
  
  console.log('=' .repeat(70));
  console.log('✅ Teste completo!');
  console.log('\n💡 Se o Método 2 retornou uma resposta diferente/errada,');
  console.log('   o problema era o cache. O Método 3 deve funcionar igual ao Método 1.');
  console.log('\n🔄 Agora recarregue o chat web em http://localhost:8080/chat');
  console.log('   As respostas devem estar corretas com a atualização que fizemos!');
}

testWebChatSimulation().catch(console.error);