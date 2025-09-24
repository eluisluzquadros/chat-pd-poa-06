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

async function checkEdgeFunctionHealth() {
  console.log('🔍 Verificando saúde das Edge Functions...\n');
  
  // Test with a simple query that should work
  const testQuery = 'Olá, o que é o Plano Diretor?';
  
  console.log('📝 Testando com query simples:', testQuery);
  console.log('🔄 Chamando agentic-rag...\n');
  
  try {
    const { data, error } = await supabase.functions.invoke('agentic-rag', {
      body: {
        message: testQuery,
        model: 'openai/gpt-3.5-turbo',
        bypassCache: true
      }
    });
    
    if (error) {
      console.error('❌ Erro na Edge Function:', error);
      console.error('Detalhes:', JSON.stringify(error, null, 2));
      
      // Try to get more details
      if (error.context) {
        console.error('Contexto do erro:', error.context);
      }
      
      return false;
    }
    
    if (data) {
      console.log('✅ Resposta recebida com sucesso!');
      console.log('Dados:', {
        hasResponse: !!data.response,
        responseLength: data.response?.length || 0,
        confidence: data.confidence,
        executionTime: data.executionTime,
        model: data.model
      });
      
      if (data.agentTrace) {
        console.log('\n📊 Trace do agente:');
        data.agentTrace.forEach((step, i) => {
          console.log(`   ${i + 1}. ${step.step} ${step.timestamp ? `(${step.timestamp}ms)` : ''}`);
        });
      }
      
      return true;
    }
    
  } catch (err) {
    console.error('❌ Erro ao chamar função:', err);
    console.error('Stack:', err.stack);
    return false;
  }
  
  return false;
}

async function testSpecificModel(model) {
  console.log(`\n🔧 Testando modelo específico: ${model}`);
  
  try {
    const { data, error } = await supabase.functions.invoke('agentic-rag', {
      body: {
        message: 'Qual é a altura máxima no bairro Centro?',
        model: model,
        bypassCache: true
      }
    });
    
    if (error) {
      console.error(`   ❌ Erro com ${model}:`, error.message);
      return false;
    }
    
    if (data && data.response) {
      console.log(`   ✅ ${model} funcionando!`);
      return true;
    }
    
    console.log(`   ⚠️ ${model} retornou sem resposta`);
    return false;
    
  } catch (err) {
    console.error(`   ❌ Erro inesperado com ${model}:`, err.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Diagnóstico de Edge Functions\n');
  console.log('=' .repeat(50));
  
  // Test basic health
  const isHealthy = await checkEdgeFunctionHealth();
  
  if (!isHealthy) {
    console.log('\n⚠️ Edge Function com problemas. Verificando modelos individuais...');
    
    const models = [
      'openai/gpt-3.5-turbo',
      'openai/gpt-4.1',
      'anthropic/claude-3-5-sonnet-20241022'
    ];
    
    let workingModels = 0;
    for (const model of models) {
      const works = await testSpecificModel(model);
      if (works) workingModels++;
    }
    
    console.log(`\n📊 Resumo: ${workingModels}/${models.length} modelos funcionando`);
    
    if (workingModels === 0) {
      console.log('\n❌ PROBLEMA CRÍTICO: Nenhum modelo está funcionando!');
      console.log('Possíveis causas:');
      console.log('1. Falta de API keys configuradas no Supabase');
      console.log('2. Erro na Edge Function agentic-rag');
      console.log('3. Problema com a tabela llm_metrics');
      console.log('4. Limite de rate limiting atingido');
    }
  } else {
    console.log('\n✅ Edge Functions operacionais!');
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('📋 Próximos passos:');
  console.log('1. Verificar logs no Supabase Dashboard');
  console.log('2. Verificar se as API keys estão configuradas');
  console.log('3. Verificar se a tabela llm_metrics foi criada corretamente');
  console.log('=' .repeat(50));
}

main().catch(console.error);