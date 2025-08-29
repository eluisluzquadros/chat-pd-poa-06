// Debug profundo do problema com CAVALHADA
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugCavalhada() {
  console.log('🔍 DEBUG PROFUNDO - PROBLEMA COM CAVALHADA\n');
  
  // 1. Verificar dados na base
  console.log('1️⃣ Verificando dados de CAVALHADA na base...');
  const { data: cavalhadaData } = await supabase
    .from('document_rows')
    .select('row_data')
    .eq('dataset_id', '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk')
    .eq('row_data->>Bairro', 'CAVALHADA')
    .limit(3);
  
  console.log(`Encontrados: ${cavalhadaData?.length || 0} registros`);
  if (cavalhadaData && cavalhadaData.length > 0) {
    console.log('Amostra:', JSON.stringify(cavalhadaData[0].row_data, null, 2).substring(0, 300));
  }
  
  // 2. Testar diferentes queries
  console.log('\n2️⃣ Testando diferentes formatos de query...\n');
  
  const queries = [
    'CAVALHADA',
    'cavalhada',
    'bairro cavalhada',
    'o que posso construir no bairro CAVALHADA?',
    'altura máxima do cavalhada'
  ];
  
  for (const query of queries) {
    console.log(`\nTestando: "${query}"`);
    
    const response = await fetch(`${supabaseUrl}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg`,
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg'
      },
      body: JSON.stringify({
        message: query,
        sessionId: `debug-${Date.now()}-${Math.random()}`,
        bypassCache: true
      })
    });
    
    const result = await response.json();
    const hasData = result.response?.includes('ZOT 01') || result.response?.includes('|');
    const hasError = result.response?.includes('não consegui localizar');
    
    console.log(`  Resultado: ${hasData ? '✅ TEM DADOS' : '❌ SEM DADOS'}`);
    console.log(`  Erro Beta: ${hasError ? 'SIM' : 'NÃO'}`);
    console.log(`  Confiança: ${result.confidence}`);
    
    if (hasData) {
      console.log(`  Preview: ${result.response.substring(0, 200)}...`);
    }
    
    // Pequena pausa entre requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // 3. Verificar logs de execução
  console.log('\n3️⃣ Verificando execuções recentes...');
  const { data: executions } = await supabase
    .from('agent_executions')
    .select('user_query, intent_classification, created_at')
    .ilike('user_query', '%cavalhada%')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (executions && executions.length > 0) {
    console.log('\nÚltimas execuções:');
    executions.forEach(exec => {
      console.log(`- "${exec.user_query}"`);
      console.log(`  Intent: ${exec.intent_classification?.intent}`);
      console.log(`  Strategy: ${exec.intent_classification?.strategy}`);
      console.log(`  Construction: ${exec.intent_classification?.isConstructionQuery}`);
    });
  }
}

debugCavalhada().catch(console.error);