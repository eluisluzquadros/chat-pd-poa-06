import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

const supabase = createClient(supabaseUrl, supabaseKey);

const testQueries = [
  "Altura máxima da construção dos prédios em porto alegre",
  "Como poderá ser feito a flexibilizaçao de Recuo de jardim?",
  "qual a altura máxima permitida?",
  "coeficiente de aproveitamento em porto alegre"
];

console.log('🔍 Testando queries diretamente com a estrutura correta...\n');

for (const query of testQueries) {
  console.log(`\n📝 Query: "${query}"`);
  console.log('=' * 60);
  
  try {
    // Chamar a edge function com a estrutura correta
    const { data: responseData, error: responseError } = await supabase.functions.invoke('agentic-rag', {
      body: { 
        message: query,  // usar 'message' em vez de 'messages'
        bypassCache: true  // forçar bypass do cache para testes
      }
    });

    if (responseError) {
      console.error('❌ Erro na resposta:', responseError);
      continue;
    }

    const response = responseData.response;
    
    if (!response) {
      console.error('❌ Sem resposta válida:', responseData);
      continue;
    }
    
    // Verificar se a resposta menciona Petrópolis incorretamente
    const mentionsPetropolis = response.toLowerCase().includes('petrópolis') || 
                              response.toLowerCase().includes('petropolis');
    
    console.log('\n📋 Resposta (primeira parte):');
    console.log(response.substring(0, 500) + '...');
    
    console.log('\n📊 Metadados:');
    console.log('- Confidence:', responseData.confidence);
    console.log('- Sources:', responseData.sources);
    console.log('- Execution Time:', responseData.executionTime, 'ms');
    
    if (mentionsPetropolis) {
      console.log('\n⚠️  ALERTA: A resposta menciona Petrópolis!');
      // Mostrar contexto onde Petrópolis é mencionado
      const lines = response.split('\n');
      lines.forEach((line, idx) => {
        if (line.toLowerCase().includes('petrópolis') || line.toLowerCase().includes('petropolis')) {
          console.log(`  Linha ${idx + 1}: ${line}`);
        }
      });
    } else {
      console.log('\n✅ Resposta OK: Não menciona Petrópolis');
    }
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  }
}

console.log('\n\n🏁 Testes concluídos!');