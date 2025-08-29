import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function testBrowserExactSimulation() {
  console.log('🌐 SIMULAÇÃO EXATA DO NAVEGADOR\n');
  console.log('=' .repeat(70));
  
  const testQueries = [
    "Qual é a altura máxima permitida no bairro Três Figueiras?",
    "Qual é a altura máxima mais alta no novo Plano Diretor?",
    "Principais índices do bairro Centro Histórico?"
  ];
  
  for (const query of testQueries) {
    console.log(`\n📝 Query: "${query}"`);
    console.log('-'.repeat(50));
    
    try {
      // EXATAMENTE como o chatService.ts faz agora
      const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          message: query,
          userRole: 'citizen',
          sessionId: 'test-session-' + Date.now(),
          userId: 'test-user',
          bypassCache: true,  // Como configuramos no chatService.ts
          model: 'openai/gpt-3.5-turbo'  // Como configuramos no chatService.ts
        }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.response) {
        console.log('✅ Resposta recebida:\n');
        console.log(result.response);
        
        // Verificar dados chave
        console.log('\n🔍 Verificação de dados:');
        
        if (query.includes('Três Figueiras')) {
          const hasCorrectHeight = result.response.includes('18') || 
                                  result.response.includes('60') || 
                                  result.response.includes('90');
          const hasWrongHeight = result.response.includes('12');
          
          if (hasWrongHeight) {
            console.log('   ❌ ERRO: Altura de 12m está ERRADA! Deveria ser 18m, 60m ou 90m');
          }
          if (!hasCorrectHeight) {
            console.log('   ❌ ERRO: Não encontrou as alturas corretas (18m, 60m, 90m)');
          }
          if (hasCorrectHeight && !hasWrongHeight) {
            console.log('   ✅ Alturas corretas encontradas');
          }
        }
        
        if (query.includes('mais alta')) {
          const hasCorrectMax = result.response.includes('130');
          const hasWrongMax = result.response.includes('40');
          
          if (hasWrongMax) {
            console.log('   ❌ ERRO: Altura máxima de 40m está ERRADA! Deveria ser 130m');
          }
          if (!hasCorrectMax) {
            console.log('   ❌ ERRO: Não encontrou a altura máxima correta (130m)');
          }
          if (hasCorrectMax && !hasWrongMax) {
            console.log('   ✅ Altura máxima correta (130m)');
          }
        }
        
        if (query.includes('Centro Histórico')) {
          const hasCorrectHeights = result.response.includes('60') || 
                                   result.response.includes('75') || 
                                   result.response.includes('90') ||
                                   result.response.includes('100') ||
                                   result.response.includes('130');
          const hasWrongHeight = result.response.includes('27');
          
          if (hasWrongHeight) {
            console.log('   ❌ ERRO: Altura de 27m está ERRADA! Deveria ser 60m, 75m, 90m, 100m ou 130m');
          }
          if (!hasCorrectHeights) {
            console.log('   ❌ ERRO: Não encontrou as alturas corretas do Centro Histórico');
          }
          if (hasCorrectHeights && !hasWrongHeight) {
            console.log('   ✅ Alturas corretas do Centro Histórico');
          }
        }
        
        // Verificar coeficientes
        if (result.response.includes('Não disponível')) {
          console.log('   ⚠️ AVISO: Coeficientes marcados como "Não disponível"');
        }
        
      } else {
        console.log(`❌ Erro: ${result.error || 'Resposta inválida'}`);
      }
    } catch (error) {
      console.log(`❌ Erro de rede: ${error.message}`);
    }
  }
  
  console.log('\n' + '=' .repeat(70));
  console.log('✅ Teste completo!');
  console.log('\n📊 DADOS CORRETOS ESPERADOS:');
  console.log('\nTRÊS FIGUEIRAS:');
  console.log('- ZOT 04: 18m (CA básico: 2, CA máximo: 4)');
  console.log('- ZOT 07: 60m (CA básico: null, CA máximo: null)');
  console.log('- ZOT 08.3 - C: 90m (CA básico: null, CA máximo: null)');
  console.log('\nCENTRO HISTÓRICO:');
  console.log('- ZOT 08.1 - A: 60m');
  console.log('- ZOT 08.1 - B: 75m');
  console.log('- ZOT 08.1 - C: 90m');
  console.log('- ZOT 08.1 - D: 100m');
  console.log('- ZOT 08.1 - E: 130m');
  console.log('\nALTURA MÁXIMA MAIS ALTA: 130m (várias zonas)');
}

testBrowserExactSimulation().catch(console.error);