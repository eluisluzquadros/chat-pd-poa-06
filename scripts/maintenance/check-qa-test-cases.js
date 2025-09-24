import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkQATestCases() {
  console.log('🔍 Verificando casos de teste QA no banco de dados\n');
  console.log('=' .repeat(50));

  // Contar total de casos
  const { count: totalCount, error: countError } = await supabase
    .from('qa_test_cases')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('❌ Erro ao contar casos:', countError.message);
    return;
  }

  console.log(`📊 Total de casos de teste: ${totalCount}\n`);

  // Buscar amostra de casos
  const { data: cases, error: casesError } = await supabase
    .from('qa_test_cases')
    .select('*')
    .limit(10);

  if (casesError) {
    console.error('❌ Erro ao buscar casos:', casesError.message);
    return;
  }

  if (cases && cases.length > 0) {
    console.log('📝 Amostra de casos de teste:\n');
    cases.forEach((testCase, i) => {
      console.log(`${i + 1}. ID: ${testCase.id}`);
      console.log(`   Pergunta: ${testCase.question || testCase.query}`);
      console.log(`   Resposta esperada: ${(testCase.expected_answer || testCase.expected_response || '').substring(0, 100)}...`);
      console.log(`   Categoria: ${testCase.category || 'N/A'}`);
      console.log(`   Complexidade: ${testCase.complexity || 'N/A'}`);
      console.log();
    });
  }

  // Verificar estrutura da tabela
  console.log('🔧 Estrutura da tabela qa_test_cases:');
  
  const { data: columns, error: columnsError } = await supabase
    .rpc('execute_sql_query', { 
      query_text: `
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'qa_test_cases'
        ORDER BY ordinal_position
      ` 
    });

  if (!columnsError && columns) {
    console.log('\nColunas disponíveis:');
    columns.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });
  }

  // Verificar se precisa importar do PDPOA2025-QA
  if (totalCount < 50) {
    console.log('\n⚠️ ATENÇÃO: Poucos casos de teste encontrados!');
    console.log('   Recomenda-se importar os ~100 casos do arquivo PDPOA2025-QA.docx');
    console.log('   Use o script de importação para adicionar mais casos de teste.');
  } else {
    console.log('\n✅ Boa quantidade de casos de teste disponíveis para validação!');
  }

  console.log('\n' + '=' .repeat(50));
  console.log('✅ Verificação concluída!');
}

// Executar
checkQATestCases();