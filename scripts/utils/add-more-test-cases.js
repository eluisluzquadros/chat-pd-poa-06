import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Casos de teste adicionais baseados em perguntas frequentes
const additionalTestCases = [
  // Casos sobre quarteirões e endereços específicos
  {
    question: "Qual o zoneamento do quarteirão 123 no centro?",
    answer: "Para consultar o zoneamento de um quarteirão específico, utilize o GeoPortal da Prefeitura ou compareça à Secretaria de Urbanismo com o número do quarteirão. Não forneço informações sobre endereços ou quarteirões específicos.",
    category: "geral",
    complexity: "medium"
  },
  {
    question: "Posso construir um prédio de 10 andares na Rua da República?",
    answer: "Não posso fornecer informações sobre endereços específicos. Por favor, informe o bairro ou a zona para que eu possa indicar os parâmetros urbanísticos aplicáveis.",
    category: "geral",
    complexity: "medium"
  },
  
  // Casos sobre usos específicos
  {
    question: "Posso abrir um comércio em zona residencial?",
    answer: "Em zonas residenciais (ZR), comércios de pequeno porte e serviços locais podem ser permitidos como uso tolerado, desde que não causem incômodo à vizinhança. Consulte a lista de atividades permitidas para cada tipo de ZR.",
    category: "zonas",
    complexity: "medium"
  },
  {
    question: "O que são atividades de baixo impacto?",
    answer: "Atividades de baixo impacto são aquelas que não geram ruído excessivo, movimento intenso de veículos ou poluição. Exemplos: escritórios, consultórios, ateliês, pequenas lojas. São geralmente permitidas em zonas mistas e toleradas em algumas residenciais.",
    category: "conceitual",
    complexity: "medium"
  },
  
  // Casos sobre índices e cálculos
  {
    question: "Como calcular o número máximo de pavimentos?",
    answer: "O número de pavimentos depende da altura máxima permitida e do pé-direito adotado. Exemplo: altura máxima 30m ÷ pé-direito 3m = 10 pavimentos. Considere térreo, subsolo e elementos técnicos conforme as regras da zona.",
    category: "altura_maxima",
    complexity: "medium"
  },
  {
    question: "O que é quota ideal mínima de terreno por economia?",
    answer: "Quota ideal é a área mínima de terreno por unidade habitacional. Exemplo: terreno de 1000m² com quota de 50m² permite máximo 20 unidades. Varia por zona e tipo de edificação.",
    category: "coeficiente_aproveitamento",
    complexity: "high"
  },
  
  // Casos sobre procedimentos
  {
    question: "Quais documentos preciso para aprovar um projeto?",
    answer: "Documentação básica: projeto arquitetônico, ART/RRT, matrícula do imóvel, memorial descritivo, projetos complementares. Podem ser exigidos: EIV, licença ambiental, aprovação do patrimônio histórico, conforme o caso.",
    category: "geral",
    complexity: "high"
  },
  {
    question: "O que é Estudo de Impacto de Vizinhança (EIV)?",
    answer: "O EIV é obrigatório para empreendimentos de grande porte ou potencial impacto. Analisa efeitos na infraestrutura, trânsito, paisagem e qualidade de vida. Define medidas mitigadoras e compensatórias.",
    category: "conceitual",
    complexity: "high"
  },
  
  // Casos sobre áreas especiais
  {
    question: "O que são áreas de interesse cultural?",
    answer: "Áreas de Interesse Cultural (AIC) são zonas com valor histórico, arquitetônico ou cultural sob proteção especial. Têm regras específicas para preservação de fachadas, gabaritos e características originais.",
    category: "zonas",
    complexity: "medium"
  },
  {
    question: "Quais as regras para construir perto de arroios?",
    answer: "Construções próximas a arroios devem respeitar faixa de proteção mínima de 30m (área urbana consolidada) ou conforme legislação ambiental. São áreas não edificáveis destinadas à preservação.",
    category: "recuos",
    complexity: "high"
  },
  
  // Casos sobre incentivos e benefícios
  {
    question: "O que é transferência de potencial construtivo?",
    answer: "Permite transferir direitos de construir de imóveis tombados ou áreas de preservação para outros locais. O proprietário que preserva pode vender o potencial não utilizado para quem quer construir além do básico.",
    category: "coeficiente_aproveitamento",
    complexity: "high"
  },
  {
    question: "Existem incentivos para construções sustentáveis?",
    answer: "Sim, edificações com certificação ambiental podem ter benefícios como aumento de índices construtivos, redução de contrapartidas ou prioridade na tramitação. Consulte o programa de incentivos vigente.",
    category: "conceitual",
    complexity: "medium"
  },
  
  // Casos sobre regularização
  {
    question: "Como regularizar uma construção antiga?",
    answer: "Construções anteriores ao Plano Diretor podem ser regularizadas mediante comprovação da época de construção (IPTU, fotos, documentos). Aplica-se a legislação vigente na época ou regras especiais de regularização.",
    category: "geral",
    complexity: "high"
  },
  {
    question: "O que é anistia construtiva?",
    answer: "Programas periódicos que permitem regularizar construções irregulares mediante pagamento de multas reduzidas e adequações mínimas. Não se aplica a áreas de risco ou preservação permanente.",
    category: "conceitual",
    complexity: "medium"
  },
  
  // Casos sobre mobilidade
  {
    question: "Quantas vagas de garagem são obrigatórias?",
    answer: "O número mínimo varia por uso e zona: residencial geralmente 1 vaga/unidade, comercial conforme área construída. Algumas zonas centrais têm máximo de vagas para incentivar transporte público.",
    category: "geral",
    complexity: "medium"
  },
  {
    question: "O que são eixos de mobilidade urbana?",
    answer: "Corredores com transporte público de alta capacidade que permitem maior adensamento. Têm índices construtivos superiores para concentrar desenvolvimento próximo ao transporte coletivo.",
    category: "zonas",
    complexity: "medium"
  }
];

// Função para gerar tags
function generateTags(question, category) {
  const tags = [category];
  const lowerQuestion = question.toLowerCase();
  
  // Tags baseadas em palavras-chave
  const keywordTags = {
    'zona': 'zoneamento',
    'altura': 'gabarito',
    'pavimento': 'gabarito',
    'andar': 'gabarito',
    'coeficiente': 'indices',
    'potencial': 'indices',
    'bairro': 'localizacao',
    'quarteirão': 'localizacao',
    'comercial': 'uso_comercial',
    'residencial': 'uso_residencial',
    'sustentável': 'sustentabilidade',
    'regularização': 'legalizacao',
    'documento': 'procedimentos',
    'vaga': 'estacionamento',
    'garagem': 'estacionamento',
    'arroio': 'ambiental',
    'preservação': 'ambiental',
    'cultural': 'patrimonio',
    'histórico': 'patrimonio'
  };
  
  Object.entries(keywordTags).forEach(([keyword, tag]) => {
    if (lowerQuestion.includes(keyword)) {
      tags.push(tag);
    }
  });
  
  return [...new Set(tags)]; // Remove duplicatas
}

async function addMoreTestCases() {
  console.log('🚀 Adicionando mais casos de teste...\n');
  
  try {
    // Preparar casos para inserção
    const timestamp = Date.now();
    const testCases = additionalTestCases.map((item, index) => ({
      test_id: `pdpoa_add_${timestamp}_${index + 1}`,
      query: item.question,
      question: item.question,
      expected_answer: item.answer,
      expected_keywords: [item.category],
      category: item.category,
      complexity: item.complexity,
      is_active: true,
      is_sql_related: false,
      tags: generateTags(item.question, item.category),
      version: 1
    }));
    
    // Inserir todos de uma vez
    console.log(`📝 Inserindo ${testCases.length} casos de teste adicionais...`);
    
    const { data, error } = await supabase
      .from('qa_test_cases')
      .insert(testCases)
      .select();
    
    if (error) {
      console.error('❌ Erro ao inserir:', error);
      return;
    }
    
    console.log(`✅ ${data?.length || 0} casos de teste adicionais inseridos!\n`);
    
    // Contar total de casos
    const { count } = await supabase
      .from('qa_test_cases')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📊 Total de casos de teste no banco: ${count}\n`);
    
    // Mostrar resumo por categoria
    const { data: categories } = await supabase
      .from('qa_test_cases')
      .select('category');
    
    if (categories) {
      const categoryCounts = {};
      categories.forEach(item => {
        categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
      });
      
      console.log('📊 Distribuição por categoria:');
      Object.entries(categoryCounts)
        .sort(([,a], [,b]) => b - a)
        .forEach(([cat, count]) => {
          console.log(`   ${cat}: ${count} casos`);
        });
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar
addMoreTestCases();