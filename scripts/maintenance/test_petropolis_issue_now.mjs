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

console.log('🔍 Testando queries que estavam retornando dados de Petrópolis...\n');

for (const query of testQueries) {
  console.log(`\n📝 Query: "${query}"`);
  console.log('=' * 60);
  
  try {
    // Chamar a edge function query-analyzer
    const { data: analysisData, error: analysisError } = await supabase.functions.invoke('query-analyzer', {
      body: { query }
    });

    if (analysisError) {
      console.error('❌ Erro na análise:', analysisError);
      continue;
    }

    console.log('\n📊 Análise da query:');
    console.log('Intent:', analysisData.intent);
    console.log('Strategy:', analysisData.strategy);
    console.log('Bairros detectados:', analysisData.entities?.bairros || 'Nenhum');
    console.log('Is Construction Query:', analysisData.isConstructionQuery);

    // Verificar se "PORTO ALEGRE" foi incorretamente detectado como bairro
    if (analysisData.entities?.bairros?.some(b => b.toUpperCase().includes('PORTO ALEGRE'))) {
      console.log('\n🚨 ERRO: "PORTO ALEGRE" foi detectado como bairro!');
    }

    // Chamar a edge function principal
    const { data: responseData, error: responseError } = await supabase.functions.invoke('agentic-rag', {
      body: { 
        messages: [{ role: 'user', content: query }],
        temperature: 0.7
      }
    });

    if (responseError) {
      console.error('❌ Erro na resposta:', responseError);
      continue;
    }

    // A resposta da edge function tem estrutura diferente
    const response = responseData.response || responseData.choices?.[0]?.message?.content;
    
    if (!response) {
      console.error('❌ Resposta inválida:', responseData);
      continue;
    }
    
    // Verificar se a resposta menciona Petrópolis incorretamente
    const mentionsPetropolis = response.toLowerCase().includes('petrópolis') || 
                              response.toLowerCase().includes('petropolis');
    
    console.log('\n📋 Resposta:');
    console.log(response.substring(0, 300) + '...');
    
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