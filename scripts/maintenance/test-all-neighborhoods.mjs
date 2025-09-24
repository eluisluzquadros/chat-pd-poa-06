import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

const supabase = createClient(supabaseUrl, anonKey);

async function testAllNeighborhoods() {
  console.log('=== TESTE URGENTE: Verificando dados de TODOS os bairros ===\n');

  // Primeiro, pegar alguns bairros para testar
  const testBairros = ['PETRÓPOLIS', 'TRÊS FIGUEIRAS', 'CRISTAL', 'CENTRO HISTÓRICO', 'BOA VISTA'];
  
  for (const bairro of testBairros) {
    console.log(`\n=== ${bairro} ===`);
    
    // 1. Dados reais do banco
    const { data: realData } = await supabase.rpc('execute_sql_query', {
      query_text: `SELECT row_data->>'Zona' as zona, 
                          row_data->>'Altura Máxima - Edificação Isolada' as altura,
                          row_data->>'Coeficiente de Aproveitamento - Básico' as ca_basico,
                          row_data->>'Coeficiente de Aproveitamento - Máximo' as ca_maximo
                   FROM document_rows 
                   WHERE dataset_id = '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk'
                   AND UPPER(row_data->>'Bairro') = '${bairro}'
                   LIMIT 1`
    });
    
    if (realData && realData[0]) {
      console.log('Dados REAIS:', realData[0]);
    }
    
    // 2. Testar a pergunta via RAG
    const { data: ragData } = await supabase.functions.invoke('agentic-rag', {
      body: {
        message: `o que pode ser construído no bairro ${bairro}?`,
        userRole: 'user',
        sessionId: 'test-' + Date.now(),
        bypassCache: true
      }
    });
    
    if (ragData?.response) {
      // Extrair valores da resposta
      const response = ragData.response;
      const caBasicoMatch = response.match(/Coef\.\s*Básico[^|]*\|\s*([\d.,]+)/);
      const caMaximoMatch = response.match(/Coef\.\s*Máximo[^|]*\|\s*([\d.,]+)/);
      const alturaMatch = response.match(/Altura Máxima[^|]*\|\s*([\d.,]+)/);
      
      console.log('Valores no RAG:');
      console.log('- CA Básico:', caBasicoMatch?.[1] || 'NÃO ENCONTRADO');
      console.log('- CA Máximo:', caMaximoMatch?.[1] || 'NÃO ENCONTRADO');
      console.log('- Altura:', alturaMatch?.[1] || 'NÃO ENCONTRADO');
      
      // Verificar se está inventando valores
      if (realData && realData[0]) {
        const realBasico = parseFloat(realData[0].ca_basico);
        const ragBasico = parseFloat(caBasicoMatch?.[1]?.replace(',', '.') || '0');
        
        if (Math.abs(realBasico - ragBasico) > 0.1) {
          console.log(`❌ ERRO CRÍTICO: CA Básico REAL: ${realBasico}, RAG mostra: ${ragBasico}`);
        }
      }
    }
  }
  
  // Teste específico: Ver o que está sendo passado para o synthesizer
  console.log('\n\n=== DEBUG: Analisando pipeline completo ===');
  const { data: debugData } = await supabase.functions.invoke('agentic-rag', {
    body: {
      message: 'o que pode ser construído no bairro petrópolis?',
      userRole: 'user',
      sessionId: 'debug-pipeline',
      bypassCache: true
    }
  });
  
  if (debugData?.agentTrace) {
    debugData.agentTrace.forEach(step => {
      if (step.step === 'sql_generation' && step.result?.executionResults) {
        console.log('\nDados SQL enviados para synthesizer:');
        step.result.executionResults.forEach(result => {
          if (result.data && result.data.length > 0) {
            console.log(result.data[0]);
          }
        });
      }
    });
  }
}

testAllNeighborhoods().catch(console.error);