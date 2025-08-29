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

async function analyzeTestCases() {
  console.log('📊 Análise dos Casos de Teste QA\n');
  console.log('=' .repeat(70));
  
  // Buscar todos os casos de teste
  const { data: testCases, error } = await supabase
    .from('qa_test_cases')
    .select('*')
    .eq('is_active', true)
    .order('id', { ascending: true });
  
  if (error) {
    console.error('❌ Erro:', error);
    return;
  }
  
  console.log(`✅ Total de casos de teste ativos: ${testCases.length}\n`);
  
  // Casos problemáticos mencionados
  const problematicQueries = [
    'altura máxima permitida mais alta',
    'principais índices do regime urbanístico do bairro Petrópolis',
    'índice de aproveitamento médio do bairro Cristal',
    'artigo da LUOS trata da Certificação em Sustentabilidade',
    '4° Distrito',
    '4º Distrito'
  ];
  
  console.log('🔍 CASOS DE TESTE RELACIONADOS AOS PROBLEMAS MENCIONADOS:\n');
  
  const relevantCases = [];
  
  testCases.forEach(tc => {
    const isRelevant = problematicQueries.some(q => 
      tc.question.toLowerCase().includes(q.toLowerCase())
    );
    
    if (isRelevant) {
      relevantCases.push(tc);
      console.log(`ID: ${tc.id}`);
      console.log(`❓ Pergunta: "${tc.question}"`);
      console.log(`✅ Resposta Esperada: "${tc.expected_answer?.substring(0, 200)}..."`);
      console.log(`📊 Categoria: ${tc.category}`);
      console.log(`💾 SQL: ${tc.is_sql_related ? 'Sim' : 'Não'}`);
      if (tc.expected_sql) {
        console.log(`🔧 SQL: ${tc.expected_sql.substring(0, 150)}...`);
      }
      console.log('-' .repeat(70) + '\n');
    }
  });
  
  // Estatísticas gerais
  console.log('📈 ESTATÍSTICAS GERAIS:\n');
  
  const categories = {};
  const sqlCases = testCases.filter(tc => tc.is_sql_related);
  
  testCases.forEach(tc => {
    categories[tc.category] = (categories[tc.category] || 0) + 1;
  });
  
  console.log('Por Categoria:');
  Object.entries(categories).forEach(([cat, count]) => {
    console.log(`  • ${cat}: ${count} casos`);
  });
  
  console.log(`\nPor Tipo:`);
  console.log(`  • SQL: ${sqlCases.length} casos`);
  console.log(`  • Não-SQL: ${testCases.length - sqlCases.length} casos`);
  
  // Amostra de casos por categoria
  console.log('\n📝 AMOSTRA DE CASOS POR CATEGORIA:\n');
  
  Object.keys(categories).forEach(cat => {
    const samples = testCases.filter(tc => tc.category === cat).slice(0, 2);
    console.log(`\n${cat.toUpperCase()}:`);
    samples.forEach(tc => {
      console.log(`  • "${tc.question.substring(0, 80)}..."`);
    });
  });
  
  return { testCases, relevantCases };
}

analyzeTestCases().catch(console.error);