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

async function testQueries() {
  console.log('🧪 Testando Queries Específicas do Sistema\n');
  console.log('=' .repeat(60));
  
  const testQueries = [
    {
      query: 'Qual é a altura máxima permitida mais alta no novo Plano Diretor?',
      model: 'openai/gpt-3.5-turbo',
      expectedKeywords: ['altura', 'máxima', 'metros']
    },
    {
      query: 'Quais são os principais índices do regime urbanístico do bairro Petrópolis?',
      model: 'openai/gpt-4.1',
      expectedKeywords: ['Petrópolis', 'índice', 'aproveitamento']
    },
    {
      query: 'Qual é o índice de aproveitamento médio do bairro Cristal?',
      model: 'anthropic/claude-3-5-sonnet-20241022',
      expectedKeywords: ['Cristal', 'aproveitamento']
    },
    {
      query: 'Qual artigo da LUOS trata da Certificação em Sustentabilidade Ambiental?',
      model: 'google/gemini-1.5-flash-002',
      expectedKeywords: ['artigo', 'LUOS', 'sustentabilidade']
    },
    {
      query: 'Qual a regra para empreendimentos no 4° Distrito?',
      model: 'openai/gpt-4o-mini-2024-07-18',
      expectedKeywords: ['4° Distrito', 'empreendimento']
    }
  ];
  
  let successCount = 0;
  let totalTests = testQueries.length;
  
  for (let i = 0; i < testQueries.length; i++) {
    const test = testQueries[i];
    console.log(`\n${i + 1}. Testando: "${test.query}"`);
    console.log(`   Modelo: ${test.model}`);
    console.log('   Status: Processando...');
    
    const startTime = Date.now();
    
    try {
      const { data, error } = await supabase.functions.invoke('agentic-rag', {
        body: {
          message: test.query,
          model: test.model,
          bypassCache: true
        }
      });
      
      const executionTime = Date.now() - startTime;
      
      if (error) {
        console.error(`   ❌ Erro: ${error.message}`);
        continue;
      }
      
      if (!data || !data.response) {
        console.error('   ❌ Sem resposta do sistema');
        continue;
      }
      
      // Verificar se a resposta contém palavras-chave esperadas
      const response = data.response.toLowerCase();
      const hasKeywords = test.expectedKeywords.some(keyword => 
        response.includes(keyword.toLowerCase())
      );
      
      if (hasKeywords) {
        console.log(`   ✅ Sucesso (${executionTime}ms)`);
        console.log(`   Confiança: ${(data.confidence * 100).toFixed(1)}%`);
        console.log(`   Fontes: Tabular=${data.sources?.tabular || 0}, Conceitual=${data.sources?.conceptual || 0}`);
        
        // Mostrar preview da resposta
        const preview = data.response.substring(0, 150) + 
                       (data.response.length > 150 ? '...' : '');
        console.log(`   Resposta: "${preview}"`);
        
        successCount++;
      } else {
        console.log(`   ⚠️ Resposta não contém informações esperadas`);
        console.log(`   Resposta: "${data.response.substring(0, 100)}..."`);
      }
      
    } catch (err) {
      console.error(`   ❌ Erro inesperado:`, err.message);
    }
    
    // Pequeno delay entre requisições
    if (i < testQueries.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Resumo final
  console.log('\n' + '=' .repeat(60));
  console.log('📊 RESUMO DOS TESTES:\n');
  console.log(`   Total de testes: ${totalTests}`);
  console.log(`   ✅ Sucessos: ${successCount}`);
  console.log(`   ❌ Falhas: ${totalTests - successCount}`);
  console.log(`   Taxa de sucesso: ${((successCount / totalTests) * 100).toFixed(1)}%`);
  
  if (successCount === totalTests) {
    console.log('\n✨ TODOS OS TESTES PASSARAM!');
  } else if (successCount > totalTests * 0.7) {
    console.log('\n⚠️ SISTEMA FUNCIONANDO PARCIALMENTE');
  } else {
    console.log('\n❌ SISTEMA COM PROBLEMAS CRÍTICOS');
  }
  
  console.log('=' .repeat(60));
}

testQueries().catch(console.error);