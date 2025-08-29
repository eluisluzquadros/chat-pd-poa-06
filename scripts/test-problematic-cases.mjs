import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testProblematicCases() {
  console.log('🔍 Testando Casos Problemáticos Específicos\n');
  console.log('=' .repeat(70));
  
  // Casos específicos mencionados como problemáticos
  const problematicQueries = [
    {
      question: "Qual é a altura máxima permitida mais alta no novo Plano Diretor?",
      expectedAnswer: "130 metros"
    },
    {
      question: "Qual é a altura máxima permitida mais alta no novo Plano Diretor, ENTRE TODAS AS ZONAS OU BAIRROS?",
      expectedAnswer: "130 metros"
    },
    {
      question: "Quais são os principais índices do regime urbanístico do bairro Petrópolis?",
      expectedAnswer: "altura máxima 52 metros, CA básico 3.6, CA máximo"
    },
    {
      question: "Qual é o índice de aproveitamento médio do bairro Cristal?",
      expectedAnswer: "3.3125"
    },
    {
      question: "qual artigo da LUOS trata da Certificação em Sustentabilidade Ambiental?",
      expectedAnswer: "artigo"
    },
    {
      question: "qual a regra para empreendimentos no 4° Distrito?",
      expectedAnswer: "4° Distrito"
    }
  ];
  
  // Buscar esses casos na tabela qa_test_cases
  const { data: testCases, error } = await supabase
    .from('qa_test_cases')
    .select('*')
    .eq('is_active', true);
  
  if (error) {
    console.error('❌ Erro ao buscar casos:', error);
    return;
  }
  
  console.log(`📊 Total de casos no banco: ${testCases.length}\n`);
  
  const results = [];
  
  for (const problemCase of problematicQueries) {
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`❓ TESTANDO: "${problemCase.question}"`);
    console.log(`✅ ESPERADO: "${problemCase.expectedAnswer}"`);
    
    // Buscar caso de teste correspondente
    const dbCase = testCases.find(tc => 
      tc.question.toLowerCase().includes(problemCase.question.toLowerCase().substring(0, 30)) ||
      problemCase.question.toLowerCase().includes(tc.question.toLowerCase().substring(0, 30))
    );
    
    if (dbCase) {
      console.log(`📋 Caso encontrado no banco (ID: ${dbCase.id})`);
      console.log(`   Categoria: ${dbCase.category}`);
      console.log(`   SQL Related: ${dbCase.is_sql_related}`);
      if (dbCase.expected_sql) {
        console.log(`   SQL: ${dbCase.expected_sql.substring(0, 100)}...`);
      }
    } else {
      console.log(`⚠️ Caso não encontrado no banco de testes`);
    }
    
    // Testar com agentic-rag
    console.log(`\n🔄 Processando query...`);
    
    try {
      const startTime = Date.now();
      
      const { data, error } = await supabase.functions.invoke('agentic-rag', {
        body: {
          message: problemCase.question,
          model: 'openai/gpt-3.5-turbo',
          bypassCache: true
        }
      });
      
      const executionTime = Date.now() - startTime;
      
      if (error) {
        console.log(`   ❌ ERRO: ${error.message}`);
        results.push({ question: problemCase.question, status: 'error', error: error.message });
        continue;
      }
      
      if (!data || !data.response) {
        console.log(`   ❌ SEM RESPOSTA`);
        results.push({ question: problemCase.question, status: 'no_response' });
        continue;
      }
      
      console.log(`\n📤 RESPOSTA RECEBIDA (${executionTime}ms):`);
      console.log(`   "${data.response.substring(0, 200)}..."`);
      
      // Verificar se contém informação esperada
      const response = data.response.toLowerCase();
      const expected = problemCase.expectedAnswer.toLowerCase();
      
      // Buscar números ou palavras-chave específicas
      const hasExpectedInfo = expected.split(/[\s,]+/).some(word => 
        word.length > 2 && response.includes(word)
      );
      
      if (hasExpectedInfo) {
        console.log(`   ✅ CONTÉM INFORMAÇÃO ESPERADA`);
        
        // Verificar especificamente para altura máxima
        if (problemCase.question.includes('altura máxima')) {
          const has130 = response.includes('130');
          if (has130) {
            console.log(`   ✅ RESPOSTA CORRETA: Menciona 130 metros`);
          } else {
            console.log(`   ❌ FALTA INFO: Não menciona 130 metros`);
            // Buscar qual altura está mencionando
            const alturas = response.match(/\d+\s*metros/g);
            if (alturas) {
              console.log(`   📊 Alturas mencionadas: ${alturas.join(', ')}`);
            }
          }
        }
        
        results.push({ question: problemCase.question, status: 'correct' });
      } else {
        console.log(`   ❌ NÃO CONTÉM INFORMAÇÃO ESPERADA`);
        results.push({ question: problemCase.question, status: 'incorrect' });
      }
      
      // Debug info
      if (data.agentTrace) {
        console.log(`   📊 Pipeline: ${data.agentTrace.map(s => s.step).join(' → ')}`);
      }
      console.log(`   🎯 Confiança: ${(data.confidence * 100).toFixed(1)}%`);
      console.log(`   📈 Fontes: Tabular=${data.sources?.tabular || 0}, Conceitual=${data.sources?.conceptual || 0}`);
      
    } catch (err) {
      console.error(`   ❌ ERRO INESPERADO: ${err.message}`);
      results.push({ question: problemCase.question, status: 'exception', error: err.message });
    }
    
    // Delay entre testes
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Resumo final
  console.log(`\n${'═'.repeat(70)}`);
  console.log('📊 RESUMO FINAL:\n');
  
  const correct = results.filter(r => r.status === 'correct').length;
  const incorrect = results.filter(r => r.status === 'incorrect').length;
  const errors = results.filter(r => r.status === 'error' || r.status === 'exception').length;
  
  console.log(`Total testado: ${results.length}`);
  console.log(`✅ Corretos: ${correct} (${(correct/results.length*100).toFixed(1)}%)`);
  console.log(`❌ Incorretos: ${incorrect} (${(incorrect/results.length*100).toFixed(1)}%)`);
  console.log(`⚠️ Erros: ${errors} (${(errors/results.length*100).toFixed(1)}%)`);
  
  console.log('\n🔍 ANÁLISE DE PROBLEMAS:');
  
  if (incorrect > 0) {
    console.log('\nCasos que falharam:');
    results.filter(r => r.status === 'incorrect').forEach(r => {
      console.log(`  • "${r.question.substring(0, 50)}..."`);
    });
  }
  
  console.log(`\n${'═'.repeat(70)}`);
  
  return results;
}

testProblematicCases().catch(console.error);