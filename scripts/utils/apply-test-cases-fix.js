import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixTestCases() {
  console.log('🔧 Fixing empty test cases...\n');

  try {
    // First, delete empty test cases
    const { error: deleteError, count } = await supabase
      .from('qa_test_cases')
      .delete()
      .or('question.is.null,question.eq.,expected_answer.is.null,expected_answer.eq.')
      .select('*', { count: 'exact' });

    if (deleteError) {
      console.error('❌ Error deleting empty records:', deleteError);
      return;
    }

    console.log(`✅ Deleted ${count || 0} empty test cases\n`);

    // Check if we need to insert sample data
    const { count: existingCount } = await supabase
      .from('qa_test_cases')
      .select('*', { count: 'exact', head: true })
      .neq('question', '')
      .not('question', 'is', null);

    if (existingCount === 0) {
      console.log('📝 Inserting sample test cases...\n');

      const sampleTestCases = [
        {
          question: 'Olá',
          expected_answer: 'Olá! Como posso ajudá-lo com informações sobre o Plano Diretor de Porto Alegre?',
          category: 'geral',
          difficulty: 'simple',
          is_active: true,
          is_sql_related: false,
          tags: ['saudacao', 'basico']
        },
        {
          question: 'Quais são as zonas da cidade?',
          expected_answer: 'Porto Alegre possui diversas zonas urbanas definidas no Plano Diretor, incluindo zonas residenciais, comerciais, industriais e mistas. As principais categorias são: Zona Residencial (ZR), Zona Comercial (ZC), Zona Industrial (ZI), Zona Mista (ZM) e Zona de Proteção Ambiental (ZPA).',
          category: 'zonas',
          difficulty: 'simple',
          is_active: true,
          is_sql_related: false,
          tags: ['zonas', 'classificacao']
        },
        {
          question: 'Qual a altura máxima permitida na Zona Central?',
          expected_answer: 'Na Zona Central de Porto Alegre, a altura máxima permitida varia conforme o quarteirão específico e pode chegar até 52 metros em algumas áreas, respeitando os índices construtivos e recuos estabelecidos pelo Plano Diretor.',
          category: 'altura_maxima',
          difficulty: 'medium',
          is_active: true,
          is_sql_related: false,
          tags: ['altura', 'zona_central', 'indices']
        },
        {
          question: 'O que é coeficiente de aproveitamento?',
          expected_answer: 'O coeficiente de aproveitamento é um índice que determina o potencial construtivo de um terreno. É calculado multiplicando a área do terreno pelo coeficiente estabelecido para a zona. Por exemplo, um terreno de 500m² com coeficiente 2,0 permite construir até 1.000m² de área computável.',
          category: 'coeficiente_aproveitamento',
          difficulty: 'medium',
          is_active: true,
          is_sql_related: false,
          tags: ['indices', 'construcao', 'conceitual']
        },
        {
          question: 'Quais são os bairros da zona sul?',
          expected_answer: 'Os principais bairros da zona sul de Porto Alegre incluem: Cristal, Camaquã, Cavalhada, Nonoai, Teresópolis, Vila Nova, Espírito Santo, Guarujá, Ipanema, Pedra Redonda, Serraria, Ponta Grossa, Belém Velho, Chapéu do Sol, Belém Novo, Lami e Lageado.',
          category: 'bairros',
          difficulty: 'simple',
          is_active: true,
          is_sql_related: false,
          tags: ['bairros', 'zona_sul', 'localizacao']
        },
        {
          question: 'Qual a taxa de permeabilidade mínima?',
          expected_answer: 'A taxa de permeabilidade mínima varia conforme a zona. Em zonas residenciais geralmente é de 20% da área do terreno, enquanto em zonas de proteção ambiental pode chegar a 40% ou mais. Esta área deve permanecer permeável para absorção de água da chuva.',
          category: 'taxa_permeabilidade',
          difficulty: 'medium',
          is_active: true,
          is_sql_related: false,
          tags: ['permeabilidade', 'meio_ambiente', 'indices']
        },
        {
          question: 'Quais são os recuos obrigatórios?',
          expected_answer: 'Os recuos obrigatórios variam por zona e altura da edificação. Geralmente: recuo frontal mínimo de 4 metros, recuos laterais de 1,50m (ou H/10 para edificações acima de 12m), e recuo de fundos seguindo as mesmas regras dos laterais. Consulte o anexo específico da zona para valores exatos.',
          category: 'recuos',
          difficulty: 'complex',
          is_active: true,
          is_sql_related: false,
          tags: ['recuos', 'afastamentos', 'normas']
        },
        {
          question: 'Liste todas as zonas com coeficiente maior que 2',
          expected_answer: 'SELECT nome_zona, coeficiente_aproveitamento FROM zonas WHERE coeficiente_aproveitamento > 2 ORDER BY coeficiente_aproveitamento DESC',
          category: 'zonas',
          difficulty: 'complex',
          is_active: true,
          is_sql_related: true,
          expected_sql: 'SELECT nome_zona, coeficiente_aproveitamento FROM zonas WHERE coeficiente_aproveitamento > 2 ORDER BY coeficiente_aproveitamento DESC',
          sql_complexity: 'medium',
          tags: ['sql', 'consulta', 'coeficiente']
        },
        {
          question: 'O que é o Plano Diretor?',
          expected_answer: 'O Plano Diretor de Desenvolvimento Urbano Ambiental (PDDUA) é o instrumento básico da política de desenvolvimento do Município de Porto Alegre. Ele estabelece as normas de ordenamento territorial, uso e ocupação do solo, sistema viário, desenvolvimento econômico e social, visando o pleno desenvolvimento das funções sociais da cidade.',
          category: 'conceitual',
          difficulty: 'simple',
          is_active: true,
          is_sql_related: false,
          tags: ['conceitual', 'definicao', 'basico']
        }
      ];

      const { data: insertedData, error: insertError } = await supabase
        .from('qa_test_cases')
        .insert(sampleTestCases)
        .select();

      if (insertError) {
        console.error('❌ Error inserting sample test cases:', insertError);
        return;
      }

      console.log(`✅ Inserted ${insertedData?.length || 0} sample test cases\n`);
    } else {
      console.log(`ℹ️  Found ${existingCount} existing test cases with content. No sample data needed.\n`);
    }

    // Final count
    const { count: finalCount } = await supabase
      .from('qa_test_cases')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Total test cases in database: ${finalCount}`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixTestCases();