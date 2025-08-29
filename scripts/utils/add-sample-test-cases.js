import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addSampleTestCases() {
  console.log('📝 Adding sample test cases...\n');

  try {
    const timestamp = Date.now();
    const sampleTestCases = [
      {
        test_id: `test_${timestamp}_1`,
        query: 'Olá',
        question: 'Olá',
        expected_answer: 'Olá! Como posso ajudá-lo com informações sobre o Plano Diretor de Porto Alegre?',
        category: 'geral',
        is_active: true,
        is_sql_related: false,
        tags: ['saudacao', 'basico']
      },
      {
        test_id: `test_${timestamp}_2`,
        question: 'Quais são as zonas da cidade?',
        expected_answer: 'Porto Alegre possui diversas zonas urbanas definidas no Plano Diretor, incluindo zonas residenciais, comerciais, industriais e mistas. As principais categorias são: Zona Residencial (ZR), Zona Comercial (ZC), Zona Industrial (ZI), Zona Mista (ZM) e Zona de Proteção Ambiental (ZPA).',
        category: 'zonas',
        is_active: true,
        is_sql_related: false,
        tags: ['zonas', 'classificacao']
      },
      {
        test_id: `test_${timestamp}_3`,
        question: 'Qual a altura máxima permitida na Zona Central?',
        expected_answer: 'Na Zona Central de Porto Alegre, a altura máxima permitida varia conforme o quarteirão específico e pode chegar até 52 metros em algumas áreas, respeitando os índices construtivos e recuos estabelecidos pelo Plano Diretor.',
        category: 'altura_maxima',
        is_active: true,
        is_sql_related: false,
        tags: ['altura', 'zona_central', 'indices']
      },
      {
        test_id: `test_${timestamp}_4`,
        question: 'O que é coeficiente de aproveitamento?',
        expected_answer: 'O coeficiente de aproveitamento é um índice que determina o potencial construtivo de um terreno. É calculado multiplicando a área do terreno pelo coeficiente estabelecido para a zona. Por exemplo, um terreno de 500m² com coeficiente 2,0 permite construir até 1.000m² de área computável.',
        category: 'coeficiente_aproveitamento',
        is_active: true,
        is_sql_related: false,
        tags: ['indices', 'construcao', 'conceitual']
      },
      {
        test_id: `test_${timestamp}_5`,
        question: 'Quais são os bairros da zona sul?',
        expected_answer: 'Os principais bairros da zona sul de Porto Alegre incluem: Cristal, Camaquã, Cavalhada, Nonoai, Teresópolis, Vila Nova, Espírito Santo, Guarujá, Ipanema, Pedra Redonda, Serraria, Ponta Grossa, Belém Velho, Chapéu do Sol, Belém Novo, Lami e Lageado.',
        category: 'bairros',
        is_active: true,
        is_sql_related: false,
        tags: ['bairros', 'zona_sul', 'localizacao']
      },
      {
        test_id: `test_${timestamp}_6`,
        question: 'Qual a taxa de permeabilidade mínima?',
        expected_answer: 'A taxa de permeabilidade mínima varia conforme a zona. Em zonas residenciais geralmente é de 20% da área do terreno, enquanto em zonas de proteção ambiental pode chegar a 40% ou mais. Esta área deve permanecer permeável para absorção de água da chuva.',
        category: 'taxa_permeabilidade',
        is_active: true,
        is_sql_related: false,
        tags: ['permeabilidade', 'meio_ambiente', 'indices']
      },
      {
        test_id: `test_${timestamp}_7`,
        question: 'Quais são os recuos obrigatórios?',
        expected_answer: 'Os recuos obrigatórios variam por zona e altura da edificação. Geralmente: recuo frontal mínimo de 4 metros, recuos laterais de 1,50m (ou H/10 para edificações acima de 12m), e recuo de fundos seguindo as mesmas regras dos laterais. Consulte o anexo específico da zona para valores exatos.',
        category: 'recuos',
        is_active: true,
        is_sql_related: false,
        tags: ['recuos', 'afastamentos', 'normas']
      },
      {
        test_id: `test_${timestamp}_8`,
        question: 'O que é o Plano Diretor?',
        expected_answer: 'O Plano Diretor de Desenvolvimento Urbano Ambiental (PDDUA) é o instrumento básico da política de desenvolvimento do Município de Porto Alegre. Ele estabelece as normas de ordenamento territorial, uso e ocupação do solo, sistema viário, desenvolvimento econômico e social, visando o pleno desenvolvimento das funções sociais da cidade.',
        category: 'conceitual',
        is_active: true,
        is_sql_related: false,
        tags: ['conceitual', 'definicao', 'basico']
      }
    ];

    const { data, error } = await supabase
      .from('qa_test_cases')
      .insert(sampleTestCases)
      .select();

    if (error) {
      console.error('❌ Error inserting test cases:', error);
      return;
    }

    console.log(`✅ Successfully added ${data?.length || 0} test cases`);
    
    if (data && data.length > 0) {
      console.log('\n📋 Added test cases:');
      data.forEach((tc, idx) => {
        console.log(`\n${idx + 1}. ${tc.question}`);
        console.log(`   Category: ${tc.category}`);
        console.log(`   Tags: ${tc.tags?.join(', ') || 'None'}`);
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

addSampleTestCases();