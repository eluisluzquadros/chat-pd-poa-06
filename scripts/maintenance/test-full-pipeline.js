import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

async function testFullPipeline() {
  console.log('🧪 Teste Completo do Pipeline RAG\n');
  console.log('=' .repeat(50));

  const testQuery = "Qual é a altura máxima permitida na ZOT 13?";
  
  console.log(`📝 Query: "${testQuery}"\n`);

  try {
    // 1. Testar Query Analyzer
    console.log('1️⃣ Testando Query Analyzer...');
    const analysisResponse = await fetch(`${SUPABASE_URL}/functions/v1/query-analyzer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ query: testQuery }),
    });

    const analysisResult = await analysisResponse.json();
    console.log('✅ Analysis Result:', {
      strategy: analysisResult.strategy,
      entities: analysisResult.entities,
      isConstructionQuery: analysisResult.isConstructionQuery
    });

    // 2. Testar SQL Generator
    console.log('\n2️⃣ Testando SQL Generator...');
    const sqlResponse = await fetch(`${SUPABASE_URL}/functions/v1/sql-generator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        query: testQuery,
        analysisResult
      }),
    });

    const sqlResult = await sqlResponse.json();
    console.log('✅ SQL Result:');
    
    if (sqlResult.sqlQueries && sqlResult.sqlQueries.length > 0) {
      sqlResult.sqlQueries.forEach((q, i) => {
        console.log(`\n   Query ${i+1}:`);
        console.log(`   Table: ${q.table || q.dataset_id || 'unknown'}`);
        console.log(`   SQL: ${q.query.substring(0, 100)}...`);
      });
    }

    if (sqlResult.executionResults && sqlResult.executionResults.length > 0) {
      console.log('\n   📊 Execution Results:');
      sqlResult.executionResults.forEach((result, i) => {
        if (result.data && result.data.length > 0) {
          console.log(`\n   Result ${i+1}: ${result.data.length} rows`);
          console.log('   Sample:', result.data[0]);
        } else if (result.error) {
          console.log(`\n   Result ${i+1}: ❌ Error - ${result.error}`);
        } else {
          console.log(`\n   Result ${i+1}: ⚠️ No data`);
        }
      });
    }

    // 3. Testar Response Synthesizer
    console.log('\n3️⃣ Testando Response Synthesizer...');
    const synthesisResponse = await fetch(`${SUPABASE_URL}/functions/v1/response-synthesizer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        originalQuery: testQuery,
        analysisResult,
        sqlResults: sqlResult,
        vectorResults: null
      }),
    });

    const synthesisResult = await synthesisResponse.json();
    console.log('✅ Synthesis Result:');
    console.log('   Response:', synthesisResult.response?.substring(0, 200) + '...');
    console.log('   Confidence:', synthesisResult.confidence);
    console.log('   Sources:', synthesisResult.sources);

    // 4. Testar Pipeline Completo (agentic-rag)
    console.log('\n4️⃣ Testando Pipeline Completo (agentic-rag)...');
    const fullResponse = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        query: testQuery,
        message: testQuery,
        sessionId: 'test-' + Date.now()
      }),
    });

    const fullResult = await fullResponse.json();
    console.log('✅ Full Pipeline Result:');
    console.log('   Response:', fullResult.response?.substring(0, 200) + '...');
    console.log('   Confidence:', fullResult.confidence);
    console.log('   Execution Time:', fullResult.executionTime + 'ms');

    // Verificar se está usando dados corretos
    console.log('\n📊 Análise Final:');
    
    // Verificar se a resposta menciona "60 metros" (valor correto)
    if (fullResult.response?.includes('60')) {
      console.log('✅ CORRETO: Resposta menciona 60 metros (valor da tabela)');
    } else if (fullResult.response?.includes('40')) {
      console.log('⚠️ INCORRETO: Resposta menciona 40 metros (valor genérico)');
    } else {
      console.log('❌ ERRO: Resposta não contém valores específicos');
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }

  console.log('\n' + '=' .repeat(50));
  console.log('✅ Teste concluído!');
}

// Executar teste
testFullPipeline();