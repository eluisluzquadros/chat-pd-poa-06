import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testLUOSQuery() {
  console.log('🔍 Testando query específica sobre LUOS e Sustentabilidade\n');
  console.log('=' .repeat(60));
  
  const testQuery = 'qual artigo da LUOS trata da Certificação em Sustentabilidade Ambiental?';
  
  const models = [
    'openai/gpt-3.5-turbo',
    'openai/gpt-4-turbo',
    'openai/gpt-4o-mini',
    'openai/gpt-4.1'
  ];
  
  for (const model of models) {
    console.log(`\n📝 Testando com ${model}:`);
    console.log(`   Query: "${testQuery}"`);
    
    const startTime = Date.now();
    
    try {
      // First, test the query-analyzer
      console.log('   1️⃣ Analisando query...');
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke('query-analyzer', {
        body: {
          query: testQuery
        }
      });
      
      if (analysisError) {
        console.error('   ❌ Erro no query-analyzer:', analysisError.message);
      } else {
        console.log('   ✅ Análise concluída:', {
          intent: analysisData?.intent,
          strategy: analysisData?.strategy,
          entities: analysisData?.entities
        });
      }
      
      // Then test the full pipeline
      console.log('   2️⃣ Processando com agentic-rag...');
      const { data, error } = await supabase.functions.invoke('agentic-rag', {
        body: {
          message: testQuery,
          model: model,
          bypassCache: true
        }
      });
      
      const executionTime = Date.now() - startTime;
      
      if (error) {
        console.error(`   ❌ Erro: ${error.message}`);
        
        // Try to understand the error better
        if (error.message.includes('500')) {
          console.log('   ℹ️ Erro 500 - Verificando possíveis causas:');
          console.log('      - Modelo pode não estar configurado');
          console.log('      - API key pode estar faltando');
          console.log('      - Problema no response-synthesizer');
        }
        continue;
      }
      
      if (!data) {
        console.error('   ❌ Sem dados retornados');
        continue;
      }
      
      if (data.response) {
        console.log(`   ✅ Sucesso! (${executionTime}ms)`);
        console.log(`   Confiança: ${(data.confidence * 100).toFixed(1)}%`);
        
        // Check if response mentions LUOS or sustainability
        const response = data.response.toLowerCase();
        if (response.includes('luos') || response.includes('sustentabilidade') || response.includes('artigo')) {
          console.log('   ✅ Resposta relevante encontrada');
        } else {
          console.log('   ⚠️ Resposta pode não estar relacionada à pergunta');
        }
        
        // Show preview
        const preview = data.response.substring(0, 200) + '...';
        console.log(`   Preview: "${preview}"`);
      } else {
        console.log('   ⚠️ Resposta vazia');
      }
      
      if (data.agentTrace) {
        console.log('   📊 Trace:');
        data.agentTrace.forEach(step => {
          console.log(`      - ${step.step}`);
        });
      }
      
    } catch (err) {
      console.error(`   ❌ Erro inesperado:`, err.message);
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('✅ Teste concluído!');
  console.log('\nRecomendações:');
  console.log('1. Se todos os modelos exceto gpt-3.5-turbo falharem com erro 500:');
  console.log('   - Verificar mapeamento de modelos no response-synthesizer');
  console.log('   - Verificar API keys para cada provider');
  console.log('2. Se a resposta não mencionar LUOS ou artigos:');
  console.log('   - Verificar se os documentos sobre LUOS estão indexados');
  console.log('   - Verificar a busca vetorial (enhanced-vector-search)');
}

testLUOSQuery().catch(console.error);