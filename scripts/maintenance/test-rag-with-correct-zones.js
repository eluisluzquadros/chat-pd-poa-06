import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRAGSystem() {
  console.log('🧪 Testando Sistema RAG com Zonas Corretas\n');
  console.log('=' .repeat(50));

  const testQueries = [
    "Qual é a altura máxima permitida na ZOT 08?",
    "Qual é a altura máxima permitida na ZOT 8?", // teste com formato diferente
    "Quais são os parâmetros construtivos do Centro Histórico?",
    "Liste todos os bairros com ZOT 07",
    "Qual a altura máxima na zona ZOT 13?",
    "Quais bairros estão na ZOT 03?"
  ];

  for (const query of testQueries) {
    console.log(`\n📝 Pergunta: "${query}"`);
    console.log('-'.repeat(50));

    try {
      // Chamar o agentic-rag
      const response = await fetch(`${supabaseUrl}/functions/v1/agentic-rag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          query,
          model: 'openai/gpt-3.5-turbo',
          conversationId: 'test-' + Date.now()
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('❌ Erro na resposta:', error);
        continue;
      }

      const result = await response.json();
      
      if (result.response) {
        console.log('✅ Resposta:', result.response.substring(0, 200) + '...');
        
        // Mostrar SQL gerado se disponível
        if (result.debug?.sqlQueries) {
          console.log('\n🔍 SQL Gerado:');
          result.debug.sqlQueries.forEach((sq, idx) => {
            console.log(`   Query ${idx + 1}: ${sq.query}`);
          });
        }
      } else {
        console.log('⚠️ Sem resposta do sistema');
      }

    } catch (error) {
      console.error('❌ Erro:', error.message);
    }
  }

  // Teste direto no banco para confirmar dados
  console.log('\n\n🔧 Teste Direto no Banco de Dados');
  console.log('=' .repeat(50));

  // Teste 1: ZOT 08
  console.log('\n📊 Bairros na ZOT 08:');
  const { data: zot08 } = await supabase
    .from('regime_urbanistico')
    .select('bairro, altura_maxima')
    .eq('zona', 'ZOT 08')
    .limit(5);

  if (zot08 && zot08.length > 0) {
    zot08.forEach(row => {
      console.log(`   - ${row.bairro}: ${row.altura_maxima}m`);
    });
  } else {
    console.log('   ⚠️ Nenhum bairro encontrado');
  }

  // Teste 2: Centro Histórico
  console.log('\n📊 Dados do Centro Histórico:');
  const { data: centro } = await supabase
    .from('regime_urbanistico')
    .select('zona, altura_maxima, coef_basico_4d, coef_maximo_4d')
    .eq('bairro', 'CENTRO HISTÓRICO')
    .limit(5);

  if (centro && centro.length > 0) {
    centro.forEach(row => {
      console.log(`   - Zona: ${row.zona}`);
      console.log(`   - Altura máxima: ${row.altura_maxima}m`);
      console.log(`   - Coef. básico: ${row.coef_basico_4d}`);
      console.log(`   - Coef. máximo: ${row.coef_maximo_4d}`);
    });
  }

  console.log('\n✅ Testes concluídos!');
}

// Executar
testRAGSystem().catch(console.error);