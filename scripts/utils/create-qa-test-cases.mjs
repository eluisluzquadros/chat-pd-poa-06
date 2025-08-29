#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

// Casos de teste adicionais para QA
const additionalTestCases = [
  // Conceituais
  {
    test_id: "plano_diretor_objetivo",
    query: "Qual o objetivo principal do Plano Diretor de Porto Alegre?",
    expected_keywords: ["desenvolvimento", "urbano", "sustentável", "qualidade", "vida"],
    category: "conceptual",
    complexity: "medium",
    min_response_length: 150,
    is_active: true
  },
  {
    test_id: "plano_diretor_participacao",
    query: "Como funciona a participação popular no Plano Diretor?",
    expected_keywords: ["participação", "popular", "audiências", "públicas", "conselho"],
    category: "conceptual",
    complexity: "medium",
    min_response_length: 200,
    is_active: true
  },
  
  // Regras de Construção
  {
    test_id: "taxa_ocupacao",
    query: "Qual a taxa de ocupação máxima permitida em áreas residenciais?",
    expected_keywords: ["taxa", "ocupação", "residencial", "percentual", "máxima"],
    category: "construction_rules",
    complexity: "medium",
    min_response_length: 100,
    is_active: true
  },
  {
    test_id: "recuo_frontal",
    query: "Qual o recuo frontal mínimo exigido para construções?",
    expected_keywords: ["recuo", "frontal", "metros", "mínimo", "construção"],
    category: "construction_rules",
    complexity: "simple",
    min_response_length: 80,
    is_active: true
  },
  {
    test_id: "indice_aproveitamento",
    query: "Como calcular o índice de aproveitamento de um terreno?",
    expected_keywords: ["índice", "aproveitamento", "área", "construída", "terreno"],
    category: "construction_rules",
    complexity: "high",
    min_response_length: 250,
    is_active: true
  },
  
  // Zoneamento
  {
    test_id: "zonas_especiais",
    query: "Quais são as zonas especiais de interesse social (ZEIS)?",
    expected_keywords: ["ZEIS", "zonas", "especiais", "interesse", "social"],
    category: "zone_query",
    complexity: "high",
    min_response_length: 300,
    is_active: true
  },
  {
    test_id: "zona_comercial",
    query: "Que tipos de atividades são permitidas em zonas comerciais?",
    expected_keywords: ["comercial", "atividades", "permitidas", "comércio", "serviços"],
    category: "zone_query",
    complexity: "medium",
    min_response_length: 200,
    is_active: true
  },
  {
    test_id: "zona_industrial",
    query: "Onde ficam as zonas industriais em Porto Alegre?",
    expected_keywords: ["zonas", "industriais", "localização", "distrito", "industrial"],
    category: "zone_query",
    complexity: "medium",
    min_response_length: 150,
    is_active: true
  },
  
  // Meio Ambiente
  {
    test_id: "areas_preservacao",
    query: "Quais são as áreas de preservação permanente (APP)?",
    expected_keywords: ["APP", "preservação", "permanente", "ambiental", "proteção"],
    category: "environmental",
    complexity: "high",
    min_response_length: 250,
    is_active: true
  },
  {
    test_id: "arborizacao_urbana",
    query: "Quais as regras para corte de árvores em área urbana?",
    expected_keywords: ["corte", "árvores", "autorização", "compensação", "ambiental"],
    category: "environmental",
    complexity: "medium",
    min_response_length: 200,
    is_active: true
  },
  
  // Mobilidade
  {
    test_id: "corredores_onibus",
    query: "Quais são os principais corredores de ônibus previstos?",
    expected_keywords: ["corredores", "ônibus", "transporte", "público", "BRT"],
    category: "mobility",
    complexity: "medium",
    min_response_length: 200,
    is_active: true
  },
  {
    test_id: "ciclovias",
    query: "Qual a meta de ciclovias do Plano Diretor?",
    expected_keywords: ["ciclovias", "bicicletas", "km", "meta", "mobilidade"],
    category: "mobility",
    complexity: "simple",
    min_response_length: 100,
    is_active: true
  },
  
  // Habitação
  {
    test_id: "habitacao_social",
    query: "Como o Plano Diretor trata a habitação de interesse social?",
    expected_keywords: ["habitação", "interesse", "social", "moradia", "popular"],
    category: "housing",
    complexity: "high",
    min_response_length: 300,
    is_active: true
  },
  {
    test_id: "regularizacao_fundiaria",
    query: "O que é regularização fundiária no contexto do Plano Diretor?",
    expected_keywords: ["regularização", "fundiária", "posse", "propriedade", "informal"],
    category: "housing",
    complexity: "medium",
    min_response_length: 200,
    is_active: true
  },
  
  // Patrimônio
  {
    test_id: "patrimonio_historico",
    query: "Como são protegidos os imóveis de valor histórico?",
    expected_keywords: ["patrimônio", "histórico", "tombamento", "preservação", "cultural"],
    category: "heritage",
    complexity: "medium",
    min_response_length: 200,
    is_active: true
  },
  
  // Instrumentos Urbanísticos
  {
    test_id: "iptu_progressivo",
    query: "Como funciona o IPTU progressivo no tempo?",
    expected_keywords: ["IPTU", "progressivo", "tempo", "subutilizado", "função social"],
    category: "urban_instruments",
    complexity: "high",
    min_response_length: 250,
    is_active: true
  },
  {
    test_id: "outorga_onerosa",
    query: "O que é outorga onerosa do direito de construir?",
    expected_keywords: ["outorga", "onerosa", "direito", "construir", "contrapartida"],
    category: "urban_instruments",
    complexity: "high",
    min_response_length: 200,
    is_active: true
  },
  {
    test_id: "transferencia_potencial",
    query: "Como funciona a transferência de potencial construtivo?",
    expected_keywords: ["transferência", "potencial", "construtivo", "compensação", "preservação"],
    category: "urban_instruments",
    complexity: "high",
    min_response_length: 250,
    is_active: true
  },
  
  // Procedimentos
  {
    test_id: "alvara_construcao",
    query: "Quais documentos são necessários para obter alvará de construção?",
    expected_keywords: ["alvará", "construção", "documentos", "projeto", "aprovação"],
    category: "procedures",
    complexity: "medium",
    min_response_length: 200,
    is_active: true
  },
  {
    test_id: "consulta_viabilidade",
    query: "Como fazer uma consulta de viabilidade urbanística?",
    expected_keywords: ["consulta", "viabilidade", "urbanística", "protocolo", "análise"],
    category: "procedures",
    complexity: "medium",
    min_response_length: 150,
    is_active: true
  },
  
  // Casos complexos
  {
    test_id: "lista_completa_zonas",
    query: "Liste todas as categorias de zoneamento do Plano Diretor com suas características",
    expected_keywords: ["zonas", "residencial", "comercial", "industrial", "mista", "especial"],
    category: "comprehensive_list",
    complexity: "high",
    min_response_length: 500,
    is_active: true
  },
  {
    test_id: "todos_instrumentos",
    query: "Quais são todos os instrumentos de política urbana previstos?",
    expected_keywords: ["instrumentos", "IPTU", "outorga", "transferência", "operação", "urbana"],
    category: "comprehensive_list",
    complexity: "high",
    min_response_length: 400,
    is_active: true
  }
];

async function createTestCases() {
  console.log('🚀 Criando casos de teste QA adicionais...\n');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const testCase of additionalTestCases) {
    try {
      // Verificar se já existe
      const { data: existing } = await supabase
        .from('qa_test_cases')
        .select('test_id')
        .eq('test_id', testCase.test_id)
        .single();
      
      if (existing) {
        console.log(`⏭️  Caso já existe: ${testCase.test_id}`);
        continue;
      }
      
      // Inserir novo caso
      const { error } = await supabase
        .from('qa_test_cases')
        .insert(testCase);
      
      if (error) {
        console.error(`❌ Erro ao inserir ${testCase.test_id}:`, error.message);
        errorCount++;
      } else {
        console.log(`✅ Inserido: ${testCase.test_id} - ${testCase.query.substring(0, 50)}...`);
        successCount++;
      }
      
    } catch (error) {
      console.error(`❌ Erro geral com ${testCase.test_id}:`, error);
      errorCount++;
    }
  }
  
  console.log('\n📊 Resumo:');
  console.log(`✅ Casos inseridos com sucesso: ${successCount}`);
  console.log(`❌ Erros encontrados: ${errorCount}`);
  console.log(`⏭️  Casos já existentes: ${additionalTestCases.length - successCount - errorCount}`);
  
  // Mostrar total
  const { count } = await supabase
    .from('qa_test_cases')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);
  
  console.log(`\n📈 Total de casos de teste ativos no banco: ${count}`);
}

createTestCases();