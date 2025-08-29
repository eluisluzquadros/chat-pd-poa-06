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
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

async function testSystem() {
  console.log('🚀 Sistema Chat PD POA - Teste de Saúde\n');
  console.log('=' .repeat(50));
  
  const results = {
    llmMetrics: false,
    agenticRag: false,
    models: false,
    database: false
  };
  
  // 1. Testar tabela llm_metrics
  console.log('\n1️⃣ Testando tabela llm_metrics...');
  try {
    const { count, error } = await supabase
      .from('llm_metrics')
      .select('*', { count: 'exact', head: true });
    
    if (!error) {
      console.log(`✅ Tabela llm_metrics OK - ${count || 0} registros`);
      results.llmMetrics = true;
    } else {
      console.error('❌ Erro na tabela llm_metrics:', error.message);
    }
  } catch (err) {
    console.error('❌ Erro ao acessar llm_metrics:', err);
  }
  
  // 2. Testar Edge Function agentic-rag
  console.log('\n2️⃣ Testando Edge Function agentic-rag...');
  try {
    const testQueries = [
      'Olá',
      'Qual é a altura máxima permitida no bairro Centro?'
    ];
    
    for (const query of testQueries) {
      console.log(`   Testando: "${query}"`);
      
      const { data, error } = await supabase.functions.invoke('agentic-rag', {
        body: {
          message: query,
          model: 'openai/gpt-3.5-turbo',
          bypassCache: true
        }
      });
      
      if (!error && data?.response) {
        console.log(`   ✅ Resposta recebida (${data.executionTime}ms)`);
        results.agenticRag = true;
      } else {
        console.error(`   ❌ Erro:`, error?.message || 'Sem resposta');
      }
    }
  } catch (err) {
    console.error('❌ Erro ao testar agentic-rag:', err);
  }
  
  // 3. Verificar modelos disponíveis
  console.log('\n3️⃣ Verificando modelos LLM configurados...');
  const models = [
    'openai/gpt-4.1',
    'openai/gpt-4-turbo',
    'openai/gpt-3.5-turbo',
    'anthropic/claude-3-5-sonnet-20241022',
    'google/gemini-1.5-flash-002'
  ];
  
  console.log('   Modelos esperados:');
  models.forEach(model => {
    console.log(`   • ${model}`);
  });
  results.models = true;
  
  // 4. Verificar conexão com banco de dados
  console.log('\n4️⃣ Testando conexão com banco de dados...');
  try {
    const tables = [
      'qa_test_cases',
      'document_sections',
      'document_rows',
      'conversations',
      'messages'
    ];
    
    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .select('count')
        .limit(1);
      
      if (!error) {
        console.log(`   ✅ Tabela ${table} acessível`);
      } else {
        console.log(`   ⚠️ Tabela ${table}: ${error.message}`);
      }
    }
    results.database = true;
  } catch (err) {
    console.error('❌ Erro ao testar banco de dados:', err);
  }
  
  // Resumo
  console.log('\n' + '=' .repeat(50));
  console.log('📊 RESUMO DO TESTE:\n');
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(r => r).length;
  const healthPercentage = (passedTests / totalTests) * 100;
  
  console.log(`   • Tabela llm_metrics: ${results.llmMetrics ? '✅' : '❌'}`);
  console.log(`   • Edge Function agentic-rag: ${results.agenticRag ? '✅' : '❌'}`);
  console.log(`   • Modelos LLM: ${results.models ? '✅' : '❌'}`);
  console.log(`   • Banco de Dados: ${results.database ? '✅' : '❌'}`);
  
  console.log('\n' + '=' .repeat(50));
  
  if (healthPercentage === 100) {
    console.log('✅ SISTEMA 100% OPERACIONAL!');
  } else if (healthPercentage >= 75) {
    console.log(`⚠️ SISTEMA ${healthPercentage.toFixed(0)}% OPERACIONAL - Alguns problemas detectados`);
  } else {
    console.log(`❌ SISTEMA ${healthPercentage.toFixed(0)}% OPERACIONAL - Correções necessárias`);
  }
  
  console.log('=' .repeat(50));
}

testSystem().catch(console.error);