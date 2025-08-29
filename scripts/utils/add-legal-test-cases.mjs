import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Casos de teste específicos para artigos da LEI/LUOS
const legalTestCases = [
  {
    question: "Qual artigo da LUOS trata da Certificação em Sustentabilidade Ambiental?",
    expected_answer: "Art. 81 - III: os acréscimos definidos em regulamento para projetos que obtenham Certificação em Sustentabilidade Ambiental, desde que não ultrapassem o limite de 20% (vinte por cento) do total da área construída computável permitida",
    category: "legal_articles",
    keywords: ["artigo 81", "certificação", "sustentabilidade", "ambiental", "III", "inciso III", "20%"]
  },
  {
    question: "Qual a regra para empreendimentos no 4° Distrito?",
    expected_answer: "Art. 74: Os empreendimentos localizados na ZOT 8.2 - 4º Distrito deverão observar as diretrizes específicas do Programa de Revitalização do 4º Distrito, com incentivos para uso misto e preservação do patrimônio histórico",
    category: "legal_articles",
    keywords: ["artigo 74", "4º distrito", "quarto distrito", "ZOT 8.2", "empreendimentos", "revitalização", "uso misto"]
  },
  {
    question: "O que diz o artigo sobre altura máxima de edificação?",
    expected_answer: "Art. 81: A altura máxima da edificação será definida conforme a ZOT, podendo variar de 18m a 130m, com possibilidade de acréscimos mediante contrapartida",
    category: "legal_articles",
    keywords: ["artigo 81", "altura máxima", "edificação", "ZOT", "18m", "130m", "contrapartida"]
  },
  {
    question: "Qual artigo trata do coeficiente de aproveitamento?",
    expected_answer: "Art. 82: O coeficiente de aproveitamento define a relação entre a área construída computável e a área do terreno, variando entre básico e máximo conforme a ZOT",
    category: "legal_articles",
    keywords: ["artigo 82", "coeficiente", "aproveitamento", "básico", "máximo", "área construída", "terreno"]
  },
  {
    question: "O que estabelece o artigo sobre recuos obrigatórios?",
    expected_answer: "Art. 83: Os recuos obrigatórios (frontal, lateral e de fundos) são definidos conforme a altura da edificação e a largura da via, com mínimo de 4m frontal",
    category: "legal_articles",
    keywords: ["artigo 83", "recuos", "obrigatórios", "frontal", "lateral", "fundos", "4m"]
  },
  {
    question: "Qual artigo define o Estudo de Impacto de Vizinhança?",
    expected_answer: "Art. 89: O Estudo de Impacto de Vizinhança (EIV) será exigido para empreendimentos de impacto, conforme critérios de porte, uso e localização",
    category: "legal_articles",
    keywords: ["artigo 89", "estudo", "impacto", "vizinhança", "EIV", "empreendimentos", "porte"]
  },
  {
    question: "O que diz sobre outorga onerosa do direito de construir?",
    expected_answer: "Art. 86: A outorga onerosa do direito de construir permite edificar acima do coeficiente básico até o máximo, mediante contrapartida financeira ao município",
    category: "legal_articles",
    keywords: ["artigo 86", "outorga onerosa", "direito de construir", "coeficiente básico", "máximo", "contrapartida"]
  },
  {
    question: "Qual artigo trata das ZEIS - Zonas Especiais de Interesse Social?",
    expected_answer: "Art. 92: As ZEIS são porções do território destinadas à regularização fundiária e produção de habitação de interesse social, com parâmetros urbanísticos especiais",
    category: "legal_articles",
    keywords: ["artigo 92", "ZEIS", "zonas especiais", "interesse social", "regularização", "habitação", "HIS"]
  },
  {
    question: "O que estabelece sobre áreas de preservação permanente?",
    expected_answer: "Art. 95: As áreas de preservação permanente (APP) devem ser mantidas intocadas, salvo casos de utilidade pública ou interesse social com autorização ambiental",
    category: "legal_articles",
    keywords: ["artigo 95", "APP", "preservação permanente", "utilidade pública", "interesse social", "autorização ambiental"]
  },
  {
    question: "Qual artigo define os instrumentos de política urbana?",
    expected_answer: "Art. 78: São instrumentos de política urbana o parcelamento, edificação ou utilização compulsórios, IPTU progressivo, desapropriação, direito de preempção, entre outros",
    category: "legal_articles",
    keywords: ["artigo 78", "instrumentos", "política urbana", "parcelamento", "IPTU progressivo", "desapropriação", "preempção"]
  }
];

async function addTestCases() {
  console.log('📝 Adicionando casos de teste legais ao banco de dados...\n');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const testCase of legalTestCases) {
    try {
      // Verificar se já existe
      const { data: existing } = await supabase
        .from('qa_test_cases')
        .select('id')
        .eq('question', testCase.question)
        .single();
      
      if (existing) {
        console.log(`⚠️ Caso já existe: "${testCase.question.substring(0, 50)}..."`);
        continue;
      }
      
      // Gerar test_id único
      const testId = `legal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Inserir novo caso
      const { data, error } = await supabase
        .from('qa_test_cases')
        .insert({
          test_id: testId,
          query: testCase.question,  // campo 'query' ao invés de 'question' apenas
          question: testCase.question,
          expected_answer: testCase.expected_answer,
          expected_keywords: testCase.keywords || [],
          category: testCase.category,
          complexity: 'high',
          is_active: true,
          tags: ['legal', 'artigo', 'luos'],
          is_sql_related: false,
          version: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        console.error(`❌ Erro ao inserir: ${error.message}`);
        errorCount++;
      } else {
        console.log(`✅ Adicionado caso ${data.id}: "${testCase.question.substring(0, 50)}..."`);
        successCount++;
      }
      
    } catch (err) {
      console.error(`❌ Erro: ${err.message}`);
      errorCount++;
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log(`📊 RESUMO:`);
  console.log(`  ✅ Casos adicionados: ${successCount}`);
  console.log(`  ❌ Erros: ${errorCount}`);
  console.log(`  ⚠️ Casos já existentes: ${legalTestCases.length - successCount - errorCount}`);
  
  // Verificar total de casos no banco
  const { count } = await supabase
    .from('qa_test_cases')
    .select('*', { count: 'exact', head: true });
  
  console.log(`  📚 Total de casos no banco: ${count}`);
}

// Executar
addTestCases().catch(console.error);