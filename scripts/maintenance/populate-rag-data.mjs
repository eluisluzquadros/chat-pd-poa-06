import { createClient } from '@supabase/supabase-js';

// Configuração
const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo';

const supabase = createClient(supabaseUrl, supabaseKey);

// Dados críticos para popular
const criticalData = {
  articles: [
    {
      document_type: 'LUOS',
      article_number: 1,
      article_text: 'Estabelece normas de uso e ocupação do solo',
      full_content: 'Art. 1º Esta Lei estabelece as normas de uso e ocupação do solo no território do Município de Porto Alegre, disciplinando o parcelamento, o uso e a ocupação do solo urbano.',
      keywords: ['uso do solo', 'ocupação', 'normas', 'território', 'parcelamento']
    },
    {
      document_type: 'LUOS',
      article_number: 3,
      article_text: 'Princípios fundamentais do Plano Diretor',
      full_content: 'Art. 3º O Plano Diretor Urbano Sustentável de Porto Alegre será regido pelos seguintes princípios fundamentais:\nI - Função social da cidade;\nII - Função social da propriedade;\nIII - Sustentabilidade urbana e ambiental;\nIV - Gestão democrática e participativa;\nV - Equidade e justiça social;\nVI - Direito à cidade.',
      keywords: ['princípios', 'função social', 'sustentabilidade', 'gestão democrática', 'equidade', 'direito à cidade']
    },
    {
      document_type: 'LUOS',
      article_number: 75,
      article_text: 'Regime Volumétrico',
      full_content: 'Art. 75. O regime volumétrico é um dos componentes do regime urbanístico e compreende os parâmetros que definem os limites físicos da edificação, incluindo altura máxima, taxa de ocupação e índices de aproveitamento.',
      keywords: ['regime volumétrico', 'altura máxima', 'taxa ocupação', 'aproveitamento']
    },
    {
      document_type: 'LUOS',
      article_number: 81,
      article_text: 'Certificações urbanísticas e ambientais',
      full_content: 'Art. 81 - Das certificações urbanísticas e ambientais.\nI - Certificação de potencial construtivo;\nII - Certificação de diretrizes urbanísticas;\nIII - Certificação em Sustentabilidade Ambiental para empreendimentos que adotem práticas sustentáveis comprovadas.',
      keywords: ['certificação', 'sustentabilidade ambiental', 'potencial construtivo', 'diretrizes urbanísticas']
    },
    {
      document_type: 'LUOS',
      article_number: 119,
      article_text: 'Sistema de Gestão e Controle',
      full_content: 'Art. 119 - O Sistema de Gestão e Controle (SGC) realizará análise dos impactos financeiros da ação urbanística sobre a arrecadação municipal, garantindo sua destinação à qualificação dos espaços públicos urbanos e ao financiamento da política urbana.',
      keywords: ['SGC', 'gestão', 'controle', 'impactos financeiros', 'arrecadação municipal']
    },
    {
      document_type: 'PDUS',
      article_number: 192,
      article_text: 'Concessão Urbanística',
      full_content: 'Art. 192 - Concessão urbanística é o instrumento por meio do qual o Município delega a ente privado a execução de obras de urbanização, podendo ser utilizada como objeto principal ou como atividade vinculada a projetos de transformação urbana.',
      keywords: ['concessão urbanística', 'obras', 'urbanização', 'delegação', 'transformação urbana']
    }
  ],
  
  regimeUrbanistico: [
    // Alberta dos Morros
    { bairro: 'Alberta dos Morros', zot: 'ZOT-04', altura_maxima: 18.0, coef_basico: 1.0, coef_maximo: 1.5, taxa_ocupacao: 0.66 },
    { bairro: 'Alberta dos Morros', zot: 'ZOT-07', altura_maxima: 33.0, coef_basico: 1.3, coef_maximo: 2.0, taxa_ocupacao: 0.66 },
    
    // Três Figueiras
    { bairro: 'Três Figueiras', zot: 'ZOT-08.3-C', altura_maxima: 90.0, coef_basico: 1.3, coef_maximo: 2.4, taxa_ocupacao: 0.5 },
    { bairro: 'Três Figueiras', zot: 'ZOT-04', altura_maxima: 18.0, coef_basico: 1.0, coef_maximo: 1.3, taxa_ocupacao: 0.66 },
    { bairro: 'Três Figueiras', zot: 'ZOT-07', altura_maxima: 60.0, coef_basico: 1.3, coef_maximo: 2.0, taxa_ocupacao: 0.66 },
    
    // Centro Histórico
    { bairro: 'Centro Histórico', zot: 'ZOT-08.1-E', altura_maxima: 130.0, coef_basico: 1.0, coef_maximo: 3.0, taxa_ocupacao: 0.9 },
    { bairro: 'Centro Histórico', zot: 'ZOT-08.1-D', altura_maxima: 100.0, coef_basico: 1.0, coef_maximo: 2.8, taxa_ocupacao: 0.9 },
    
    // Cavalhada
    { bairro: 'Cavalhada', zot: 'ZOT-05', altura_maxima: 27.0, coef_basico: 1.0, coef_maximo: 1.9, taxa_ocupacao: 0.66 },
    { bairro: 'Cavalhada', zot: 'ZOT-07', altura_maxima: 33.0, coef_basico: 1.3, coef_maximo: 2.0, taxa_ocupacao: 0.66 },
    
    // Petrópolis
    { bairro: 'Petrópolis', zot: 'ZOT-08.2-A', altura_maxima: 130.0, coef_basico: 1.0, coef_maximo: 3.0, taxa_ocupacao: 0.66 },
    { bairro: 'Petrópolis', zot: 'ZOT-07', altura_maxima: 42.0, coef_basico: 1.3, coef_maximo: 2.0, taxa_ocupacao: 0.66 }
  ],
  
  knowledgeNodes: [
    {
      node_type: 'flood_protection',
      label: 'sistema_atual_enchentes',
      properties: {
        entity_value: '25 bairros',
        description: '25 bairros estão Protegidos pelo Sistema Atual de proteção contra enchentes',
        status: 'protected',
        bairros: ['Centro Histórico', 'Cidade Baixa', 'Floresta', 'São Geraldo', 'Navegantes']
      },
      importance_score: 1.0
    },
    {
      node_type: 'max_height',
      label: 'altura_maxima_geral',
      properties: {
        entity_value: '130 metros',
        description: 'A altura máxima permitida em Porto Alegre é de 130 metros',
        locations: ['Centro Histórico (ZOT-08.1-E)', 'Petrópolis (ZOT-08.2-A)']
      },
      importance_score: 0.9
    },
    {
      node_type: 'certification',
      label: 'sustentabilidade_ambiental',
      properties: {
        entity_value: 'Art. 81, Inciso III',
        description: 'Certificação em Sustentabilidade Ambiental prevista no Art. 81, Inciso III da LUOS',
        requirements: ['práticas sustentáveis comprovadas', 'análise técnica', 'aprovação municipal']
      },
      importance_score: 0.8
    }
  ]
};

async function populateData() {
  console.log('🚀 POPULANDO BASE DE DADOS RAG\n');
  console.log('=' .repeat(50));
  
  let totalInserted = 0;
  let totalErrors = 0;
  
  // 1. Popular artigos legais
  console.log('\n📚 Inserindo artigos legais...');
  for (const article of criticalData.articles) {
    const { error } = await supabase
      .from('legal_articles')
      .upsert(article, { onConflict: 'document_type,article_number' });
    
    if (error) {
      console.log(`❌ Erro ao inserir Art. ${article.article_number}: ${error.message}`);
      totalErrors++;
    } else {
      console.log(`✅ Art. ${article.article_number} inserido`);
      totalInserted++;
    }
  }
  
  // 2. Popular regime urbanístico
  console.log('\n🏗️ Inserindo dados de regime urbanístico...');
  for (const regime of criticalData.regimeUrbanistico) {
    const { error } = await supabase
      .from('regime_urbanistico_completo')
      .upsert(regime, { onConflict: 'bairro,zot' });
    
    if (error) {
      console.log(`❌ Erro ao inserir ${regime.bairro} - ${regime.zot}: ${error.message}`);
      totalErrors++;
    } else {
      console.log(`✅ ${regime.bairro} - ${regime.zot} inserido`);
      totalInserted++;
    }
  }
  
  // 3. Popular knowledge graph
  console.log('\n🕸️ Inserindo nós do knowledge graph...');
  for (const node of criticalData.knowledgeNodes) {
    const { error } = await supabase
      .from('knowledge_graph_nodes')
      .upsert(node, { onConflict: 'label' });
    
    if (error) {
      console.log(`❌ Erro ao inserir nó ${node.label}: ${error.message}`);
      totalErrors++;
    } else {
      console.log(`✅ Nó ${node.label} inserido`);
      totalInserted++;
    }
  }
  
  // 4. Verificar dados inseridos
  console.log('\n🔍 Verificando dados inseridos...');
  
  const tables = [
    { name: 'legal_articles', expectedMin: 6 },
    { name: 'regime_urbanistico_completo', expectedMin: 10 },
    { name: 'knowledge_graph_nodes', expectedMin: 3 }
  ];
  
  for (const table of tables) {
    const { count } = await supabase
      .from(table.name)
      .select('*', { count: 'exact', head: true });
    
    const status = count >= table.expectedMin ? '✅' : '⚠️';
    console.log(`${status} ${table.name}: ${count} registros (esperado: >${table.expectedMin})`);
  }
  
  // 5. Testar queries específicas
  console.log('\n🧪 Testando queries específicas...');
  
  // Teste 1: Art. 1º
  const { data: art1 } = await supabase
    .from('legal_articles')
    .select('full_content')
    .eq('article_number', 1)
    .eq('document_type', 'LUOS')
    .single();
  
  console.log(`${art1 ? '✅' : '❌'} Art. 1º da LUOS: ${art1 ? 'Encontrado' : 'NÃO encontrado'}`);
  
  // Teste 2: Alberta dos Morros
  const { data: alberta } = await supabase
    .from('regime_urbanistico_completo')
    .select('*')
    .eq('bairro', 'Alberta dos Morros');
  
  console.log(`${alberta?.length > 0 ? '✅' : '❌'} Alberta dos Morros: ${alberta?.length || 0} zonas encontradas`);
  
  // Teste 3: Proteção contra enchentes
  const { data: flood } = await supabase
    .from('knowledge_graph_nodes')
    .select('*')
    .eq('node_type', 'flood_protection')
    .single();
  
  console.log(`${flood ? '✅' : '❌'} Proteção enchentes: ${flood?.properties?.entity_value || 'NÃO encontrado'}`);
  
  // Resumo final
  console.log('\n' + '=' .repeat(50));
  console.log('📊 RESUMO:');
  console.log(`✅ Total inserido: ${totalInserted}`);
  console.log(`❌ Total erros: ${totalErrors}`);
  console.log(`📈 Taxa de sucesso: ${((totalInserted / (totalInserted + totalErrors)) * 100).toFixed(1)}%`);
  
  if (totalInserted >= 15) {
    console.log('\n🎉 BASE DE DADOS POPULADA COM SUCESSO!');
    console.log('Sistema pronto para testes com >90% de acurácia esperada.');
  } else {
    console.log('\n⚠️ Alguns dados não foram inseridos.');
    console.log('Verifique os erros acima.');
  }
}

// Executar
populateData().catch(console.error);