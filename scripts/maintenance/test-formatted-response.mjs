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

async function testFormattedResponse() {
  console.log('🧪 TESTE DE FORMATAÇÃO DAS RESPOSTAS\n');
  console.log('=' .repeat(70));
  
  const testQueries = [
    "Qual é a altura máxima permitida no bairro Petrópolis?",
    "Quais são os principais índices urbanísticos do bairro Centro Histórico?",
    "Qual a altura máxima no bairro Moinhos de Vento?"
  ];
  
  for (const query of testQueries) {
    console.log(`\n📝 Testando: "${query}"`);
    console.log('-'.repeat(50));
    
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          query: query,
          bypassCache: true,
          model: 'openai/gpt-3.5-turbo'
        }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.response) {
        console.log('✅ Resposta recebida\n');
        console.log(result.response);
        
        // Verificar formatação
        console.log('\n🔍 Verificações:');
        
        // 1. Tem os 3 indicadores?
        const hasAltura = result.response.includes('Altura máxima:') || result.response.includes('altura máxima');
        const hasCABasico = result.response.includes('CA básico') || result.response.includes('Coeficiente de aproveitamento mínimo');
        const hasCAMaximo = result.response.includes('CA máximo') || result.response.includes('Coeficiente de aproveitamento máximo');
        
        console.log(`   ✓ Altura máxima: ${hasAltura ? '✅' : '❌'}`);
        console.log(`   ✓ CA básico: ${hasCABasico ? '✅' : '❌'}`);
        console.log(`   ✓ CA máximo: ${hasCAMaximo ? '✅' : '❌'}`);
        
        // 2. Tem o template obrigatório?
        const hasTemplate = result.response.includes('📍 **Explore mais:**') && 
                          result.response.includes('https://bit.ly/3ILdXRA') &&
                          result.response.includes('https://bit.ly/4o7AWqb') &&
                          result.response.includes('https://bit.ly/4oefZKm') &&
                          result.response.includes('planodiretor@portoalegre.rs.gov.br');
        
        console.log(`   ✓ Template obrigatório: ${hasTemplate ? '✅' : '❌'}`);
        
        if (!hasAltura || !hasCABasico || !hasCAMaximo) {
          console.log('\n   ⚠️ AVISO: Faltam indicadores obrigatórios!');
        }
        
        if (!hasTemplate) {
          console.log('\n   ⚠️ AVISO: Template obrigatório incompleto ou ausente!');
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
  
  console.log('\n📋 FORMATO ESPERADO:\n');
  console.log('Para o bairro [NOME], os indicadores urbanísticos são:\n');
  console.log('**Zona [X]:**');
  console.log('1. **Altura máxima**: X metros');
  console.log('2. **Coeficiente de aproveitamento mínimo (CA básico)**: X.X');
  console.log('3. **Coeficiente de aproveitamento máximo (CA máximo)**: X.X\n');
  console.log('[Se houver múltiplas zonas, repetir para cada uma]\n');
  console.log('📍 **Explore mais:**');
  console.log('• Mapa com Regras Construtivas: https://bit.ly/3ILdXRA ↗');
  console.log('• Contribua com sugestões: https://bit.ly/4o7AWqb ↗');
  console.log('• Participe da Audiência Pública: https://bit.ly/4oefZKm ↗\n');
  console.log('💬 **Dúvidas?** planodiretor@portoalegre.rs.gov.br');
}

testFormattedResponse().catch(console.error);