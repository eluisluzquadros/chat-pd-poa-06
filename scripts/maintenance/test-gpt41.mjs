import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testGPT41() {
  console.log('🧪 Testando modelo GPT-4.1\n');
  console.log('=' .repeat(60));
  
  const testQueries = [
    'Olá, o que é o Plano Diretor?',
    'Qual é a altura máxima no bairro Centro?',
    'Qual artigo da LUOS trata da Certificação em Sustentabilidade Ambiental?'
  ];
  
  let successCount = 0;
  
  for (const query of testQueries) {
    console.log(`\n📝 Testando: "${query}"`);
    console.log('   Modelo: openai/gpt-4.1');
    
    const startTime = Date.now();
    
    try {
      const { data, error } = await supabase.functions.invoke('agentic-rag', {
        body: {
          message: query,
          model: 'openai/gpt-4.1',
          bypassCache: true
        }
      });
      
      const executionTime = Date.now() - startTime;
      
      if (error) {
        console.error(`   ❌ Erro: ${error.message}`);
        continue;
      }
      
      if (!data || !data.response) {
        console.error('   ❌ Sem resposta');
        continue;
      }
      
      console.log(`   ✅ Sucesso! (${executionTime}ms)`);
      console.log(`   Confiança: ${(data.confidence * 100).toFixed(1)}%`);
      console.log(`   Modelo usado: ${data.model || 'openai/gpt-4.1'}`);
      
      // Mostrar preview da resposta
      const preview = data.response.substring(0, 150) + 
                     (data.response.length > 150 ? '...' : '');
      console.log(`   Resposta: "${preview}"`);
      
      successCount++;
      
    } catch (err) {
      console.error(`   ❌ Erro inesperado:`, err.message);
    }
    
    // Pequeno delay entre requisições
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('📊 RESUMO DO TESTE GPT-4.1:\n');
  console.log(`   Total de testes: ${testQueries.length}`);
  console.log(`   ✅ Sucessos: ${successCount}`);
  console.log(`   ❌ Falhas: ${testQueries.length - successCount}`);
  console.log(`   Taxa de sucesso: ${((successCount / testQueries.length) * 100).toFixed(1)}%`);
  
  if (successCount === testQueries.length) {
    console.log('\n✨ GPT-4.1 FUNCIONANDO PERFEITAMENTE!');
  } else if (successCount > 0) {
    console.log('\n⚠️ GPT-4.1 FUNCIONANDO PARCIALMENTE');
  } else {
    console.log('\n❌ GPT-4.1 COM PROBLEMAS');
  }
  
  console.log('=' .repeat(60));
}

testGPT41().catch(console.error);