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

async function clearCacheAndTest() {
  console.log('🧹 LIMPANDO CACHE E TESTANDO SISTEMA\n');
  console.log('=' .repeat(70));
  
  // 1. Limpar cache de queries
  console.log('1️⃣ Limpando cache de queries...');
  try {
    const { data, error } = await supabase
      .from('query_cache')
      .delete()
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    
    if (!error) {
      console.log('   ✅ Cache limpo com sucesso');
    } else {
      console.log('   ⚠️ Erro ao limpar cache:', error.message);
    }
  } catch (err) {
    console.log('   ⚠️ Erro:', err.message);
  }
  
  // 2. Verificar versões das Edge Functions
  console.log('\n2️⃣ Verificando Edge Functions deployadas...');
  
  const functionsToCheck = [
    'agentic-rag',
    'agentic-rag-v2',
    'sql-generator',
    'sql-generator-v2',
    'query-analyzer',
    'response-synthesizer'
  ];
  
  for (const func of functionsToCheck) {
    try {
      const testQuery = func.includes('rag') 
        ? { query: "teste", bypassCache: true }
        : { query: "teste", analysisResult: {} };
      
      const response = await fetch(`${supabaseUrl}/functions/v1/${func}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify(testQuery),
      });
      
      if (response.status === 404) {
        console.log(`   ❌ ${func}: NÃO EXISTE`);
      } else {
        console.log(`   ✅ ${func}: EXISTE (status ${response.status})`);
      }
    } catch (err) {
      console.log(`   ⚠️ ${func}: Erro ao verificar`);
    }
  }
  
  // 3. Testar query específica com bypassCache
  console.log('\n3️⃣ Testando query específica SEM CACHE...');
  
  const testQueries = [
    "Qual é a altura máxima permitida no bairro Petrópolis?",
    "Qual é a altura máxima mais alta no novo Plano Diretor?"
  ];
  
  for (const query of testQueries) {
    console.log(`\n📝 Testando: "${query}"`);
    
    try {
      // Testar via agentic-rag principal
      const response = await fetch(`${supabaseUrl}/functions/v1/agentic-rag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          query: query,
          message: query,
          bypassCache: true,
          model: 'openai/gpt-3.5-turbo'
        }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.response) {
        console.log(`   ✅ Resposta recebida`);
        
        // Verificar se tem dados específicos
        const hasSpecificData = 
          result.response.includes('60') ||
          result.response.includes('90') ||
          result.response.includes('metros') ||
          result.response.includes('ZOT');
        
        if (hasSpecificData) {
          console.log(`   📊 DADOS ESPECÍFICOS ENCONTRADOS!`);
          console.log(`   Trecho: ${result.response.substring(0, 200)}...`);
        } else {
          console.log(`   ⚠️ RESPOSTA GENÉRICA (sem dados específicos)`);
          console.log(`   Resposta: ${result.response.substring(0, 200)}...`);
        }
        
        // Verificar agentTrace
        if (result.agentTrace) {
          const sqlStep = result.agentTrace.find(s => s.step === 'sql_generation_complete');
          if (sqlStep) {
            console.log(`   📈 SQL gerado: ${sqlStep.hasResults ? 'COM RESULTADOS' : 'SEM RESULTADOS'}`);
          }
        }
      } else {
        console.log(`   ❌ Erro: ${result.error || 'Resposta inválida'}`);
      }
    } catch (err) {
      console.log(`   ❌ Erro de rede: ${err.message}`);
    }
  }
  
  // 4. Testar SQL Generator diretamente
  console.log('\n4️⃣ Testando SQL Generator diretamente...');
  
  const sqlResponse = await fetch(`${supabaseUrl}/functions/v1/sql-generator`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseServiceKey}`,
    },
    body: JSON.stringify({
      query: "altura máxima Petrópolis",
      analysisResult: {
        strategy: 'structured_only',
        entities: {
          bairros: ['Petrópolis'],
          parameters: ['altura_maxima']
        }
      },
      hints: { needsMax: true, useRegimeTable: true }
    }),
  });
  
  const sqlResult = await sqlResponse.json();
  
  if (sqlResponse.ok && sqlResult.executionResults) {
    console.log('   ✅ SQL Generator funcionando');
    
    for (const result of sqlResult.executionResults || []) {
      if (result.data && result.data.length > 0) {
        console.log(`   📊 Dados: ${JSON.stringify(result.data[0])}`);
      } else if (result.error) {
        console.log(`   ⚠️ Erro: ${result.error}`);
      }
    }
  } else {
    console.log('   ❌ SQL Generator com problema:', sqlResult.error);
  }
  
  console.log('\n' + '=' .repeat(70));
  console.log('✅ Diagnóstico completo!');
  
  console.log('\n⚠️ RECOMENDAÇÕES:');
  console.log('1. Se agentic-rag-v2 existe, delete-o (versão antiga com fallback)');
  console.log('2. Verifique se o frontend está usando bypassCache: true');
  console.log('3. Force refresh no navegador (Ctrl+Shift+R)');
  console.log('4. Verifique o console do navegador para erros');
}

clearCacheAndTest().catch(console.error);