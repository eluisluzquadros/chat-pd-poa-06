import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

const supabase = createClient(supabaseUrl, anonKey);

async function testConfusion() {
  console.log('=== Teste de Confusão entre Bairros ===\n');

  // Primeiro, vamos verificar os dados reais no banco
  console.log('1. Dados reais de Petrópolis:');
  const { data: petropolis } = await supabase.rpc('execute_sql_query', {
    query_text: `SELECT row_data->>'Zona' as zona, 
                        row_data->>'Altura Máxima - Edificação Isolada' as altura,
                        row_data->>'Coeficiente de Aproveitamento - Básico' as ca_basico,
                        row_data->>'Coeficiente de Aproveitamento - Máximo' as ca_maximo
                 FROM document_rows 
                 WHERE dataset_id = '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk'
                 AND UPPER(row_data->>'Bairro') = 'PETRÓPOLIS'`
  });
  console.log(petropolis);

  console.log('\n2. Dados reais de Três Figueiras:');
  const { data: tresFig } = await supabase.rpc('execute_sql_query', {
    query_text: `SELECT row_data->>'Zona' as zona, 
                        row_data->>'Altura Máxima - Edificação Isolada' as altura,
                        row_data->>'Coeficiente de Aproveitamento - Básico' as ca_basico,
                        row_data->>'Coeficiente de Aproveitamento - Máximo' as ca_maximo
                 FROM document_rows 
                 WHERE dataset_id = '17_GMWnJC1sKff-YS0wesgxsvo3tnZdgSSb4JZ0ZjpCk'
                 AND UPPER(row_data->>'Bairro') = 'TRÊS FIGUEIRAS'`
  });
  console.log(tresFig);

  // Agora vamos testar as queries problemáticas
  const queries = [
    'quais são os principais indices do regime urbanístico do bairro petrópolis?',
    'o que pode ser construído no bairro petrópolis?',
    'quais são os principais indices do regime urbanístico do bairro três figueiras?',
    'o que pode ser construído no bairro três figueiras?'
  ];

  for (const query of queries) {
    console.log(`\n\n=== Testando: ${query} ===`);
    
    const { data, error } = await supabase.functions.invoke('agentic-rag', {
      body: {
        message: query,
        userRole: 'user',
        sessionId: 'test-confusion-' + Date.now(),
        bypassCache: true
      }
    });

    if (error) {
      console.log('❌ Erro:', error);
      continue;
    }

    // Analisar a resposta
    const response = data?.response || '';
    
    // Verificar menções de bairros
    const mentionsPetropolis = response.includes('Petrópolis');
    const mentionsTresFig = response.includes('Três Figueiras');
    
    // Verificar valores específicos
    const has36 = response.includes('3.6') || response.includes('3,6');
    const has10 = response.includes('1.0') || response.includes('1,0');
    const hasZOT07 = response.includes('ZOT 07');
    const hasZOT08 = response.includes('ZOT 08');
    
    console.log('Análise da resposta:');
    console.log('- Menciona Petrópolis:', mentionsPetropolis);
    console.log('- Menciona Três Figueiras:', mentionsTresFig);
    console.log('- Tem valor 3.6:', has36);
    console.log('- Tem valor 1.0:', has10);
    console.log('- Tem ZOT 07:', hasZOT07);
    console.log('- Tem ZOT 08:', hasZOT08);
    
    // Verificar confusão
    if (query.includes('petrópolis') && mentionsTresFig) {
      console.log('❌ CONFUSÃO: Perguntou sobre Petrópolis mas responde sobre Três Figueiras!');
    }
    if (query.includes('três figueiras') && mentionsPetropolis) {
      console.log('❌ CONFUSÃO: Perguntou sobre Três Figueiras mas responde sobre Petrópolis!');
    }
    
    // Mostrar preview da resposta
    console.log('\nPreview da resposta:');
    console.log(response.substring(0, 500) + '...');
  }
}

testConfusion().catch(console.error);