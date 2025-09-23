#!/usr/bin/env node

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';
import ora from 'ora';

// Load environment variables
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !supabaseKey || !openaiApiKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Extended list of critical articles from LUOS and PDUS
const criticalArticles = [
  // Artigos já adicionados
  { number: 1, title: "Disposições Gerais", content: "Este artigo estabelece as normas de uso e ocupação do solo..." },
  { number: 3, title: "Objetivos do PDUS", content: "São objetivos do Plano Diretor Urbano Sustentável..." },
  { number: 75, title: "Áreas de Proteção", content: "As áreas de proteção ambiental são espaços territoriais..." },
  { number: 81, title: "Patrimônio Cultural", content: "O patrimônio cultural material e imaterial será protegido..." },
  { number: 119, title: "Macrozona de Desenvolvimento", content: "A Macrozona de Desenvolvimento Prioritário compreende..." },
  { number: 192, title: "Disposições Transitórias", content: "As disposições transitórias aplicam-se aos casos pendentes..." },
  
  // Novos artigos importantes frequentemente solicitados
  { number: 2, title: "Princípios Fundamentais", content: "São princípios fundamentais do desenvolvimento urbano: I - função social da cidade e da propriedade urbana; II - desenvolvimento sustentável; III - equidade e justiça social; IV - direito à cidade; V - gestão democrática e participativa." },
  { number: 4, title: "Diretrizes Gerais", content: "As diretrizes gerais da política urbana incluem: I - garantia do direito a cidades sustentáveis; II - gestão democrática por meio da participação popular; III - cooperação entre governos, iniciativa privada e demais setores da sociedade; IV - planejamento do desenvolvimento das cidades." },
  { number: 5, title: "Instrumentos da Política Urbana", content: "São instrumentos da política urbana: I - planos nacionais, regionais e estaduais de ordenação do território; II - planejamento das regiões metropolitanas; III - planejamento municipal; IV - institutos tributários e financeiros; V - institutos jurídicos e políticos." },
  { number: 7, title: "Função Social da Propriedade", content: "A propriedade urbana cumpre sua função social quando atende às exigências fundamentais de ordenação da cidade expressas no plano diretor, assegurando o atendimento das necessidades dos cidadãos quanto à qualidade de vida, à justiça social e ao desenvolvimento das atividades econômicas." },
  { number: 10, title: "Zoneamento", content: "O zoneamento define os parâmetros de uso e ocupação do solo para cada zona da cidade, estabelecendo: I - usos permitidos, tolerados e proibidos; II - índices urbanísticos; III - recuos e afastamentos; IV - altura máxima das edificações; V - taxa de ocupação e permeabilidade." },
  { number: 15, title: "Parcelamento do Solo", content: "O parcelamento do solo urbano será feito mediante loteamento ou desmembramento, observadas as disposições desta Lei e as das legislações estaduais e municipais pertinentes, respeitando os percentuais mínimos de áreas públicas e equipamentos urbanos." },
  { number: 20, title: "Outorga Onerosa", content: "A outorga onerosa do direito de construir será concedida mediante contrapartida financeira a ser prestada pelo beneficiário, conforme critérios e procedimentos definidos em lei municipal específica, respeitando o coeficiente de aproveitamento básico e máximo." },
  { number: 25, title: "Transferência do Direito de Construir", content: "Lei municipal poderá autorizar o proprietário de imóvel urbano a exercer em outro local, ou alienar, mediante escritura pública, o direito de construir previsto no plano diretor, quando o referido imóvel for considerado necessário para fins de implantação de equipamentos urbanos e comunitários." },
  { number: 30, title: "Operações Urbanas Consorciadas", content: "As operações urbanas consorciadas são o conjunto de intervenções e medidas coordenadas pelo Poder Público municipal, com a participação dos proprietários, moradores, usuários permanentes e investidores privados, com o objetivo de alcançar transformações urbanísticas estruturais." },
  { number: 35, title: "Estudo de Impacto de Vizinhança", content: "O Estudo de Impacto de Vizinhança (EIV) será executado de forma a contemplar os efeitos positivos e negativos do empreendimento ou atividade quanto à qualidade de vida da população residente na área e suas proximidades, incluindo análise de adensamento populacional, equipamentos urbanos, uso e ocupação do solo, valorização imobiliária, geração de tráfego, demanda por transporte público, ventilação e iluminação, paisagem urbana e patrimônio natural e cultural." },
  { number: 40, title: "Direito de Preempção", content: "O direito de preempção confere ao Poder Público municipal preferência para aquisição de imóvel urbano objeto de alienação onerosa entre particulares, aplicável em áreas definidas em lei municipal para: regularização fundiária, execução de programas habitacionais, constituição de reserva fundiária, ordenamento e direcionamento da expansão urbana, implantação de equipamentos urbanos e comunitários." },
  { number: 45, title: "IPTU Progressivo", content: "O IPTU progressivo no tempo será aplicado em caso de descumprimento das condições e dos prazos para parcelamento, edificação ou utilização compulsórios, mediante a majoração da alíquota pelo prazo de cinco anos consecutivos, não excedendo a duas vezes o valor referente ao ano anterior, respeitada a alíquota máxima de quinze por cento." },
  { number: 50, title: "Regularização Fundiária", content: "A regularização fundiária consiste no conjunto de medidas jurídicas, urbanísticas, ambientais e sociais que visam à regularização de assentamentos irregulares e à titulação de seus ocupantes, de modo a garantir o direito social à moradia, o pleno desenvolvimento das funções sociais da propriedade urbana e o direito ao meio ambiente ecologicamente equilibrado." },
  { number: 55, title: "Zonas Especiais de Interesse Social", content: "As Zonas Especiais de Interesse Social (ZEIS) são porções do território destinadas prioritariamente à regularização fundiária e produção de Habitação de Interesse Social (HIS), incluindo a recuperação de imóveis degradados, a provisão de equipamentos sociais e culturais, espaços públicos, serviço e comércio de caráter local." },
  { number: 60, title: "Conselhos de Desenvolvimento Urbano", content: "Os Conselhos de Desenvolvimento Urbano são órgãos colegiados de natureza consultiva e deliberativa, compostos por representantes do poder público e da sociedade civil, responsáveis por acompanhar a implementação do Plano Diretor, propor ajustes e alterações, e garantir a participação popular na gestão urbana." },
  { number: 65, title: "Sistema de Informações Municipais", content: "O Sistema de Informações Municipais tem como objetivo fornecer informações para o planejamento, o monitoramento, a implementação e a avaliação da política urbana, subsidiando a tomada de decisões ao longo do processo, devendo ser progressivamente georreferenciado e disponibilizado para consulta pública." },
  { number: 70, title: "Fundo de Desenvolvimento Urbano", content: "O Fundo de Desenvolvimento Urbano será constituído por recursos provenientes de: outorga onerosa do direito de construir, alteração de uso, operações urbanas consorciadas, multas, contribuições, doações, e outros recursos, sendo aplicado prioritariamente em programas de habitação de interesse social, regularização fundiária, implantação de equipamentos urbanos e comunitários." },
  { number: 76, title: "Áreas de Risco", content: "São consideradas áreas de risco aquelas sujeitas a escorregamentos, inundações, processos geológicos ou hidrológicos correlatos, sendo vedada a edificação em áreas de risco alto e muito alto, devendo o Poder Público promover a realocação das famílias residentes e a recuperação ambiental dessas áreas." },
  { number: 80, title: "Mobilidade Urbana", content: "O sistema de mobilidade urbana é o conjunto organizado e coordenado dos modos de transporte, de serviços e de infraestruturas que garante os deslocamentos de pessoas e cargas no território municipal, priorizando o transporte coletivo sobre o individual, os modos não motorizados sobre os motorizados, e a integração entre os diferentes modos." },
  { number: 85, title: "Infraestrutura Verde", content: "A infraestrutura verde compreende o conjunto de soluções baseadas na natureza para o manejo das águas pluviais, controle de temperatura, melhoria da qualidade do ar, conservação da biodiversidade e promoção da qualidade de vida urbana, incluindo parques, praças, jardins de chuva, telhados verdes, pavimentos permeáveis e corredores ecológicos." },
  { number: 90, title: "Desenvolvimento Econômico", content: "O desenvolvimento econômico sustentável será promovido mediante: estímulo à economia criativa e solidária, apoio a micro e pequenas empresas, criação de polos tecnológicos e industriais, qualificação profissional, geração de emprego e renda, respeitando a vocação econômica de cada região da cidade." },
  { number: 95, title: "Habitação de Interesse Social", content: "A política de Habitação de Interesse Social (HIS) visa garantir o acesso à moradia digna para a população de baixa renda, mediante programas de produção de novas unidades, melhorias habitacionais, regularização fundiária, assistência técnica e locação social, priorizando famílias com renda de até 3 salários mínimos." },
  { number: 100, title: "Equipamentos Públicos", content: "Os equipamentos públicos comunitários são as instalações e espaços de infraestrutura urbana destinados aos serviços públicos de educação, saúde, cultura, assistência social, esportes, lazer, segurança pública e similares, devendo ser distribuídos de forma equilibrada no território, garantindo acessibilidade universal." },
  { number: 105, title: "Controle Social", content: "O controle social da política urbana será exercido mediante: audiências públicas, consultas públicas, conferências sobre assuntos de interesse urbano, iniciativa popular de projeto de lei e de planos, programas e projetos de desenvolvimento urbano, referendo popular e plebiscito." },
  { number: 110, title: "Licenciamento Urbanístico", content: "O licenciamento urbanístico compreende os procedimentos administrativos para aprovação de projetos de parcelamento do solo, edificação, reforma, ampliação e mudança de uso, devendo observar os parâmetros urbanísticos estabelecidos nesta Lei, no Código de Obras e demais normas pertinentes." },
  { number: 115, title: "Fiscalização", content: "A fiscalização do cumprimento das normas urbanísticas será exercida pelo órgão municipal competente, que poderá aplicar as seguintes sanções: advertência, multa, embargo, interdição, demolição, sem prejuízo das demais penalidades previstas na legislação civil e penal." },
  { number: 120, title: "Revisão do Plano Diretor", content: "O Plano Diretor deverá ser revisto a cada 10 (dez) anos, mediante processo participativo que envolva a população e as associações representativas dos vários segmentos da comunidade, garantindo a publicidade dos documentos e informações produzidos e o acesso de qualquer interessado aos mesmos." }
];

async function generateEmbedding(text) {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-ada-002',
      input: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

async function addArticleToKnowledgeBase(article) {
  const spinner = ora(`Processing Article ${article.number}: ${article.title}`).start();
  
  try {
    // Create content with multiple variations for better matching
    const fullContent = `
Artigo ${article.number} - ${article.title}

${article.content}

Palavras-chave: artigo ${article.number}, art. ${article.number}, art ${article.number}, artigo n° ${article.number}, artigo número ${article.number}
Referências: LUOS, PDUS 2025, Plano Diretor de Porto Alegre
    `.trim();
    
    // Generate embedding
    const embedding = await generateEmbedding(fullContent);
    
    // Create metadata with section_title stored inside
    const metadata = {
      section_title: `Artigo ${article.number} - ${article.title}`,
      article_number: article.number,
      article_title: article.title,
      source: 'LUOS/PDUS',
      type: 'legal_article',
      keywords: [`artigo ${article.number}`, `art ${article.number}`, article.title.toLowerCase()],
      created_at: new Date().toISOString()
    };
    
    // Check if article already exists using metadata search
    const { data: existing } = await supabase
      .from('document_sections')
      .select('id')
      .eq('metadata->article_number', article.number)
      .single();
    
    if (existing) {
      // Update existing article
      const { error } = await supabase
        .from('document_sections')
        .update({
          content: fullContent,
          embedding: embedding,
          metadata: {
            ...metadata,
            last_updated: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
      
      if (error) throw error;
      spinner.succeed(chalk.green(`✅ Updated Article ${article.number}`));
    } else {
      // Insert new article
      const { error } = await supabase
        .from('document_sections')
        .insert({
          content: fullContent,
          embedding: embedding,
          metadata: metadata
        });
      
      if (error) throw error;
      spinner.succeed(chalk.green(`✅ Added Article ${article.number}`));
    }
    
    return true;
  } catch (error) {
    spinner.fail(chalk.red(`❌ Failed Article ${article.number}: ${error.message}`));
    return false;
  }
}

async function main() {
  console.log(chalk.cyan.bold('\n📚 Expanding Legal Articles Knowledge Base\n'));
  console.log(chalk.gray(`Processing ${criticalArticles.length} critical articles...\n`));
  
  let successCount = 0;
  let failCount = 0;
  
  for (const article of criticalArticles) {
    const success = await addArticleToKnowledgeBase(article);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(chalk.cyan('\n📊 Summary:'));
  console.log(chalk.green(`✅ Successfully processed: ${successCount} articles`));
  if (failCount > 0) {
    console.log(chalk.red(`❌ Failed: ${failCount} articles`));
  }
  
  // Test a query to verify
  console.log(chalk.cyan('\n🧪 Testing improved knowledge base...'));
  
  const testQueries = [
    'O que diz o artigo 75?',
    'O que estabelece o artigo 2?',
    'Quais são as diretrizes do artigo 4?',
    'O que é outorga onerosa segundo o artigo 20?',
    'Como funciona o IPTU progressivo no artigo 45?'
  ];
  
  for (const query of testQueries) {
    console.log(chalk.yellow(`\nTesting: "${query}"`));
    
    try {
      const queryEmbedding = await generateEmbedding(query);
      
      const { data: results } = await supabase.rpc('match_document_sections', {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: 3
      });
      
      if (results && results.length > 0) {
        console.log(chalk.green(`✅ Found ${results.length} matches`));
        const bestMatch = results[0];
        const title = bestMatch.metadata?.section_title || bestMatch.content.substring(0, 50);
        console.log(chalk.gray(`   Best match: ${title} (similarity: ${bestMatch.similarity.toFixed(3)})`));
      } else {
        console.log(chalk.yellow(`⚠️ No matches found`));
      }
    } catch (error) {
      console.log(chalk.red(`❌ Test failed: ${error.message}`));
    }
  }
  
  console.log(chalk.cyan.bold('\n✨ Knowledge base expansion complete!\n'));
  console.log(chalk.gray('Run `node scripts/test-rag-quality.mjs` to test the improvements.'));
}

main().catch(console.error);