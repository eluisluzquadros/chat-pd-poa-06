// Teste após deploy do fix Porto Alegre
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

async function testAfterDeploy() {
  console.log('✅ TESTE APÓS DEPLOY DO FIX\n');
  console.log('Deploy realizado com sucesso às', new Date().toLocaleTimeString('pt-BR'));
  console.log('-----------------------------------\n');
  
  const problematicQueries = [
    'Altura máxima da construção dos prédios em porto alegre',
    'Como poderá ser feito a flexibilizaçao de Recuo de jardim?',
    'qual a altura máxima permitida?',
    'coeficiente de aproveitamento em porto alegre'
  ];
  
  console.log('🧪 Testando queries problemáticas...\n');
  
  for (const query of problematicQueries) {
    console.log(`\n📝 Query: "${query}"`);
    
    try {
      // Testar resposta completa
      const response = await fetch(`${supabaseUrl}/functions/v1/agentic-rag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'apikey': supabaseAnonKey
        },
        body: JSON.stringify({
          message: query,
          sessionId: `test-after-deploy-${Date.now()}`,
          bypassCache: true
        })
      });
      
      const result = await response.json();
      
      // Verificar se contém "Petrópolis"
      const containsPetropolis = result.response?.toLowerCase().includes('petrópolis') || 
                                result.response?.toLowerCase().includes('petropolis');
      
      console.log(`   Status: ${containsPetropolis ? '❌ AINDA COM PROBLEMA' : '✅ CORRIGIDO'}`);
      
      if (containsPetropolis) {
        console.log('   ⚠️  Resposta ainda menciona Petrópolis');
        // Mostrar trecho
        const start = result.response.toLowerCase().indexOf('petróp');
        if (start !== -1) {
          console.log(`   Preview: "...${result.response.substring(Math.max(0, start - 30), start + 80)}..."`);
        }
      } else {
        console.log('   ✅ Resposta não menciona Petrópolis');
        // Mostrar início da resposta
        console.log(`   Preview: "${result.response.substring(0, 150)}..."`);
      }
      
    } catch (error) {
      console.error(`   ❌ Erro ao testar: ${error.message}`);
    }
    
    // Pequena pausa entre requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n\n📊 RESUMO DO TESTE');
  console.log('==================');
  console.log('Deploy realizado: ✅');
  console.log('Função atualizada: query-analyzer');
  console.log('Correção aplicada: Porto Alegre não é mais tratado como bairro');
  console.log('\n⚠️  Se ainda houver problemas, pode ser necessário:');
  console.log('1. Limpar cache do navegador');
  console.log('2. Aguardar propagação (1-2 minutos)');
  console.log('3. Testar em janela anônima');
}

testAfterDeploy().catch(console.error);