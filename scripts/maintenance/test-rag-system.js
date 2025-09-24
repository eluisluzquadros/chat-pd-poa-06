import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRAGSystem() {
  console.log('🧪 Testando Sistema RAG com Novas Tabelas\n');
  console.log('=' .repeat(50));

  const testQueries = [
    'Qual é a altura máxima permitida na ZOT 8?',
    'Quais são os parâmetros construtivos do Centro Histórico?',
    'Liste todos os bairros com ZOT 7',
    'Qual o coeficiente de aproveitamento máximo da Cidade Baixa?',
    'Quais zonas permitem construções acima de 20 metros?',
    'Qual a taxa de ocupação máxima na ZOT 5?'
  ];

  for (const query of testQueries) {
    console.log(`\n📝 Pergunta: "${query}"`);
    console.log('-'.repeat(50));
    
    try {
      // Chamar a Edge Function agentic-rag
      const response = await fetch(`${supabaseUrl}/functions/v1/agentic-rag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          query: query,
          userMessage: query,
          sessionId: 'test-session-' + Date.now()
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Erro HTTP ${response.status}: ${errorText}`);
        continue;
      }

      const result = await response.json();
      
      // Exibir resposta
      if (result.answer) {
        console.log('✅ Resposta:', result.answer.substring(0, 200) + '...');
        
        // Verificar se está usando as novas tabelas
        if (result.debug?.sqlQueries) {
          const usesNewTables = result.debug.sqlQueries.some(q => 
            q.query.includes('regime_urbanistico') || 
            q.query.includes('zots_bairros')
          );
          
          if (usesNewTables) {
            console.log('✅ Usando NOVAS tabelas (regime_urbanistico/zots_bairros)');
          } else {
            console.log('⚠️ Ainda usando tabelas antigas (document_rows)');
          }
        }
        
        // Verificar precisão da resposta
        if (query.includes('ZOT 8') && result.answer.includes('metros')) {
          const match = result.answer.match(/(\d+(?:\.\d+)?)\s*metros/);
          if (match) {
            console.log(`📊 Valor encontrado: ${match[1]} metros`);
          }
        }
      } else {
        console.log('⚠️ Sem resposta do sistema');
      }
      
      // Pequena pausa entre requests
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error('❌ Erro:', error.message);
    }
  }

  // Teste direto no SQL Generator
  console.log('\n\n🔧 Teste Direto do SQL Generator');
  console.log('=' .repeat(50));
  
  try {
    const sqlGenResponse = await fetch(`${supabaseUrl}/functions/v1/sql-generator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        query: 'altura máxima ZOT 8',
        analysisResult: {
          entities: {
            zonas: ['ZOT 8']
          },
          isConstructionQuery: true
        }
      })
    });

    if (sqlGenResponse.ok) {
      const sqlResult = await sqlGenResponse.json();
      console.log('\n📝 SQL Gerado:');
      
      if (sqlResult.sqlQueries && sqlResult.sqlQueries.length > 0) {
        sqlResult.sqlQueries.forEach((q, i) => {
          console.log(`\nQuery ${i+1}:`);
          console.log(q.query.substring(0, 200));
          
          // Verificar se usa nova estrutura
          if (q.query.includes('regime_urbanistico')) {
            console.log('✅ Usando tabela regime_urbanistico');
          } else if (q.query.includes('document_rows')) {
            console.log('⚠️ Ainda usando document_rows');
          }
        });
      }
      
      // Verificar resultados da execução
      if (sqlResult.executionResults) {
        console.log('\n📊 Resultados da Execução:');
        sqlResult.executionResults.forEach((result, i) => {
          if (result.data && result.data.length > 0) {
            console.log(`\nResultado ${i+1}:`, result.data[0]);
          } else if (result.error) {
            console.log(`\n❌ Erro na query ${i+1}:`, result.error);
          }
        });
      }
    }
  } catch (error) {
    console.error('❌ Erro ao testar SQL Generator:', error.message);
  }

  console.log('\n\n✅ Testes concluídos!');
}

// Executar testes
testRAGSystem();