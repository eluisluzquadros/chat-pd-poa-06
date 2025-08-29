import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Casos de teste baseados no padrão Q&A do Plano Diretor
const qaTestCases = [
  // Casos sobre zonas
  {
    question: "Quais são as zonas da cidade?",
    answer: "Porto Alegre possui diversas zonas urbanas definidas no Plano Diretor, incluindo zonas residenciais (ZR), comerciais (ZC), industriais (ZI), mistas (ZM) e de proteção ambiental (ZPA). Cada zona tem regras específicas de uso e ocupação do solo.",
    category: "zonas"
  },
  {
    question: "O que é uma zona mista?",
    answer: "Zona Mista (ZM) é uma área onde são permitidos usos residenciais e não residenciais de forma integrada, promovendo a diversidade de atividades urbanas. Permite comércio, serviços e habitação no mesmo local.",
    category: "zonas"
  },
  {
    question: "Qual a diferença entre ZR1 e ZR2?",
    answer: "ZR1 é zona residencial de baixa densidade, com lotes maiores e menor altura permitida. ZR2 permite maior adensamento, com lotes menores e construções mais altas. Os índices construtivos também variam entre elas.",
    category: "zonas"
  },
  
  // Casos sobre altura máxima
  {
    question: "Qual a altura máxima permitida na zona central?",
    answer: "Na Zona Central de Porto Alegre, a altura máxima varia conforme o quarteirão específico, podendo chegar até 52 metros em algumas áreas, respeitando os índices construtivos e recuos estabelecidos.",
    category: "altura_maxima"
  },
  {
    question: "Qual a altura máxima do bairro Petrópolis?",
    answer: "No bairro Petrópolis, a altura máxima varia por zona: ZOT 07 permite até 60m, ZOT 08.3-B e ZOT 08.3-C permitem até 90m. É necessário verificar a zona específica do terreno.",
    category: "altura_maxima"
  },
  {
    question: "Como é calculada a altura de uma edificação?",
    answer: "A altura é medida do ponto médio do meio-fio até o ponto mais alto da edificação, excluindo casa de máquinas, caixa d'água e elementos técnicos. Inclui todos os pavimentos habitáveis.",
    category: "altura_maxima"
  },
  
  // Casos sobre coeficiente de aproveitamento
  {
    question: "O que é coeficiente de aproveitamento?",
    answer: "O coeficiente de aproveitamento (CA) é um índice que determina o potencial construtivo de um terreno. É calculado multiplicando a área do terreno pelo coeficiente. Por exemplo, terreno de 500m² com CA 2,0 permite construir 1.000m² de área computável.",
    category: "coeficiente_aproveitamento"
  },
  {
    question: "Qual a diferença entre CA básico e CA máximo?",
    answer: "CA básico é o direito de construir gratuito. CA máximo é o limite mediante contrapartida financeira (outorga onerosa). Entre o básico e o máximo, paga-se pelo direito adicional de construir.",
    category: "coeficiente_aproveitamento"
  },
  {
    question: "Como calcular a área máxima construível?",
    answer: "Área máxima = Área do terreno × CA máximo. Exemplo: terreno de 300m² com CA máximo 3,0 = 900m² de área computável máxima. Áreas não computáveis (garagem, sacadas) não entram neste cálculo.",
    category: "coeficiente_aproveitamento"
  },
  
  // Casos sobre taxa de permeabilidade
  {
    question: "Qual a taxa de permeabilidade mínima?",
    answer: "A taxa de permeabilidade mínima varia por zona: residenciais geralmente 20%, zonas de proteção ambiental 40% ou mais. Esta área deve permanecer permeável para absorção de água da chuva.",
    category: "taxa_permeabilidade"
  },
  {
    question: "O que conta como área permeável?",
    answer: "Área permeável inclui jardins, gramados e superfícies que permitam infiltração de água. Pisos drenantes podem contar parcialmente. Piscinas, calçadas impermeáveis e construções não contam.",
    category: "taxa_permeabilidade"
  },
  
  // Casos sobre recuos
  {
    question: "Quais são os recuos obrigatórios?",
    answer: "Recuos variam por zona e altura: frontal mínimo 4m, laterais 1,50m (ou H/10 para edificações acima de 12m), fundos seguem regras dos laterais. Consulte o anexo específico da zona.",
    category: "recuos"
  },
  {
    question: "Posso construir na divisa?",
    answer: "Construção na divisa é permitida apenas em casos específicos: edificações até 6m de altura, acordos entre vizinhos, ou zonas comerciais específicas. A maioria das zonas exige recuos laterais.",
    category: "recuos"
  },
  
  // Casos sobre bairros
  {
    question: "Quais são os bairros da zona sul?",
    answer: "Principais bairros da zona sul: Cristal, Camaquã, Cavalhada, Nonoai, Teresópolis, Vila Nova, Espírito Santo, Guarujá, Ipanema, Pedra Redonda, Serraria, Ponta Grossa, Belém Velho, Chapéu do Sol, Belém Novo, Lami, Lageado.",
    category: "bairros"
  },
  {
    question: "Quais bairros fazem parte do centro histórico?",
    answer: "O centro histórico inclui: Centro, Cidade Baixa, Bom Fim, Independência, Floresta, partes do Moinhos de Vento e Praia de Belas. Estas áreas têm regras especiais de preservação.",
    category: "bairros"
  },
  
  // Casos conceituais
  {
    question: "O que é o Plano Diretor?",
    answer: "O Plano Diretor de Desenvolvimento Urbano Ambiental (PDDUA) é o instrumento básico da política de desenvolvimento do Município, estabelecendo normas de ordenamento territorial, uso do solo e desenvolvimento sustentável.",
    category: "conceitual"
  },
  {
    question: "O que é uso do solo?",
    answer: "Uso do solo define as atividades permitidas em cada zona: residencial, comercial, industrial, misto. Cada zona tem lista de usos conformes, tolerados e proibidos, garantindo compatibilidade urbana.",
    category: "conceitual"
  },
  
  // Casos gerais
  {
    question: "Como consultar o zoneamento de um terreno?",
    answer: "Consulte o zoneamento através do site da Prefeitura com o endereço ou matrícula do imóvel, ou presencialmente na Secretaria de Urbanismo. O GeoPortal também oferece consulta online interativa.",
    category: "geral"
  },
  {
    question: "Preciso de arquiteto para construir?",
    answer: "Sim, projetos de construção, reforma ou ampliação exigem responsável técnico (arquiteto ou engenheiro) habilitado no CAU ou CREA. Apenas pequenos reparos dispensam projeto técnico.",
    category: "geral"
  },
  {
    question: "O que é outorga onerosa?",
    answer: "Outorga onerosa é a contrapartida financeira paga ao município pelo direito de construir acima do coeficiente básico até o máximo. Os recursos são destinados a melhorias urbanas.",
    category: "conceitual"
  }
];

// Função para gerar tags
function generateTags(question, category) {
  const tags = [category];
  const lowerQuestion = question.toLowerCase();
  
  if (lowerQuestion.includes('zona')) tags.push('zoneamento');
  if (lowerQuestion.includes('altura')) tags.push('gabarito');
  if (lowerQuestion.includes('coeficiente')) tags.push('indices');
  if (lowerQuestion.includes('bairro')) tags.push('localizacao');
  if (lowerQuestion.includes('sul')) tags.push('zona_sul');
  if (lowerQuestion.includes('centro')) tags.push('centro');
  if (lowerQuestion.includes('residencial')) tags.push('residencial');
  if (lowerQuestion.includes('comercial')) tags.push('comercial');
  
  return [...new Set(tags)]; // Remove duplicatas
}

async function populateTestCases() {
  console.log('🚀 Iniciando população de casos de teste...\n');
  
  try {
    // Limpar casos existentes
    console.log('🧹 Limpando casos de teste existentes...');
    const { error: deleteError } = await supabase
      .from('qa_test_cases')
      .delete()
      .gte('id', 0);
    
    if (deleteError) {
      console.error('Erro ao limpar:', deleteError);
    }
    
    // Preparar casos para inserção
    const timestamp = Date.now();
    const testCases = qaTestCases.map((item, index) => ({
      test_id: `pdpoa_${timestamp}_${index + 1}`,
      query: item.question,
      question: item.question,
      expected_answer: item.answer,
      expected_keywords: [item.category], // Campo obrigatório
      category: item.category,
      complexity: 'medium', // Campo obrigatório
      is_active: true,
      is_sql_related: false,
      tags: generateTags(item.question, item.category),
      version: 1
    }));
    
    // Inserir todos de uma vez
    console.log(`📝 Inserindo ${testCases.length} casos de teste...`);
    
    const { data, error } = await supabase
      .from('qa_test_cases')
      .insert(testCases)
      .select();
    
    if (error) {
      console.error('❌ Erro ao inserir:', error);
      return;
    }
    
    console.log(`✅ ${data?.length || 0} casos de teste inseridos com sucesso!\n`);
    
    // Mostrar resumo por categoria
    const categoryCounts = {};
    testCases.forEach(tc => {
      categoryCounts[tc.category] = (categoryCounts[tc.category] || 0) + 1;
    });
    
    console.log('📊 Resumo por categoria:');
    Object.entries(categoryCounts).forEach(([cat, count]) => {
      console.log(`   ${cat}: ${count} casos`);
    });
    
    // Verificar alguns exemplos
    const { data: examples } = await supabase
      .from('qa_test_cases')
      .select('*')
      .limit(3);
    
    if (examples && examples.length > 0) {
      console.log('\n📝 Exemplos inseridos:');
      examples.forEach((ex, idx) => {
        console.log(`\n${idx + 1}. ${ex.question}`);
        console.log(`   Resposta: ${ex.expected_answer.substring(0, 100)}...`);
        console.log(`   Categoria: ${ex.category}`);
        console.log(`   Tags: ${ex.tags?.join(', ')}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar
populateTestCases();