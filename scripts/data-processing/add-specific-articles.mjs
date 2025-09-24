#!/usr/bin/env node

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Load environment variables
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !supabaseKey || !openaiApiKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const openai = new OpenAI({ apiKey: openaiApiKey });

// Artigos específicos importantes
const specificArticles = [
  {
    number: 75,
    content: `Art. 75. O regime volumétrico é um dos componentes do regime urbanístico e compreende os parâmetros que definem os limites físicos da edificação no lote, conforme estabelecido para cada Zona de Ordenamento Territorial (ZOT), podendo incluir:
    I - altura máxima da edificação;
    II - taxa de ocupação máxima do lote;
    III - índice de aproveitamento básico e máximo;
    IV - recuos mínimos obrigatórios;
    V - taxa de permeabilidade mínima do solo;
    VI - gabarito de altura das edificações.
    Parágrafo único. Os parâmetros volumétricos específicos de cada ZOT estão definidos no Anexo 2 desta Lei.`,
    source: 'LUOS',
    type: 'regime_volumetrico'
  },
  {
    number: 1,
    content: `Art. 1º Esta Lei estabelece as normas de uso e ocupação do solo no território do Município de Porto Alegre, em conformidade com o Plano Diretor de Desenvolvimento Urbano e Sustentável (PDUS 2025), visando:
    I - o ordenamento territorial equilibrado e sustentável;
    II - a função social da cidade e da propriedade urbana;
    III - a qualidade de vida da população;
    IV - a preservação do patrimônio ambiental, cultural e paisagístico;
    V - o desenvolvimento econômico compatível com a sustentabilidade urbana.`,
    source: 'LUOS',
    type: 'principios_gerais'
  },
  {
    number: 3,
    content: `Art. 3º São princípios fundamentais da Lei de Uso e Ocupação do Solo:
    I - Função social da cidade e da propriedade urbana;
    II - Desenvolvimento sustentável;
    III - Gestão democrática da cidade;
    IV - Equidade e justiça social;
    V - Direito à cidade para todos;
    VI - Preservação e valorização do patrimônio ambiental e cultural;
    VII - Integração entre planejamento urbano e políticas setoriais.`,
    source: 'LUOS',
    type: 'principios_fundamentais'
  },
  {
    number: 81,
    content: `Art. 81. As certificações urbanísticas compreendem:
    I - Certificação Verde: para empreendimentos que adotem práticas sustentáveis de construção;
    II - Certificação de Eficiência Energética: para edificações com alto desempenho energético;
    III - Certificação em Sustentabilidade Ambiental: para projetos que integrem soluções ambientalmente responsáveis;
    IV - Certificação de Acessibilidade Universal: para edificações plenamente acessíveis.
    Parágrafo único. As certificações poderão gerar benefícios urbanísticos conforme regulamentação específica.`,
    source: 'LUOS',
    type: 'certificacoes'
  },
  {
    number: 119,
    content: `Art. 119. O Sistema de Gestão e Controle (SGC) do Plano Diretor compreende:
    I - órgãos de planejamento e gestão urbana;
    II - conselhos municipais relacionados ao desenvolvimento urbano;
    III - instrumentos de participação popular;
    IV - sistema de informações urbanísticas;
    V - mecanismos de monitoramento e avaliação.
    Parágrafo único. O SGC deverá garantir a transparência, eficiência e participação social na gestão urbana.`,
    source: 'PLANO_DIRETOR',
    type: 'gestao_controle'
  },
  {
    number: 192,
    content: `Art. 192. A concessão urbanística é o instrumento pelo qual o Poder Público delega a pessoa jurídica ou consórcio de empresas, mediante licitação, a execução de obras de urbanização ou reurbanização de determinada área, incluindo:
    I - elaboração de projetos urbanísticos;
    II - execução de obras de infraestrutura;
    III - implantação de equipamentos públicos;
    IV - construção de habitação de interesse social;
    V - prestação de serviços públicos relacionados.
    Parágrafo único. A concessão urbanística será regida por contrato específico que estabelecerá direitos, deveres e contrapartidas.`,
    source: 'PLANO_DIRETOR',
    type: 'instrumentos_urbanisticos'
  }
];

// Dados de regime urbanístico de bairros importantes
const regimeData = [
  {
    bairro: 'Petrópolis',
    zona: 'ZOT-08',
    altura_maxima: 52,
    coef_aproveitamento_basico: 1.3,
    coef_aproveitamento_maximo: 3.0,
    taxa_ocupacao: 66,
    observacoes: 'Bairro predominantemente residencial com comércio local'
  },
  {
    bairro: 'Centro Histórico',
    zona: 'ZOT-08.1',
    altura_maxima: 60,
    coef_aproveitamento_basico: 3.0,
    coef_aproveitamento_maximo: 6.5,
    taxa_ocupacao: 90,
    observacoes: 'Área central com patrimônio histórico preservado'
  },
  {
    bairro: 'Cidade Baixa',
    zona: 'ZOT-08',
    altura_maxima: 52,
    coef_aproveitamento_basico: 1.9,
    coef_aproveitamento_maximo: 4.0,
    taxa_ocupacao: 75,
    observacoes: 'Bairro boêmio com intensa vida noturna'
  },
  {
    bairro: 'Menino Deus',
    zona: 'ZOT-08',
    altura_maxima: 52,
    coef_aproveitamento_basico: 1.9,
    coef_aproveitamento_maximo: 4.0,
    taxa_ocupacao: 75,
    observacoes: 'Bairro residencial e comercial próximo ao Guaíba'
  },
  {
    bairro: 'Moinhos de Vento',
    zona: 'ZOT-08',
    altura_maxima: 52,
    coef_aproveitamento_basico: 1.9,
    coef_aproveitamento_maximo: 4.0,
    taxa_ocupacao: 75,
    observacoes: 'Bairro nobre com comércio de alto padrão'
  }
];

// Bairros com proteção contra enchentes
const protectedNeighborhoods = [
  'Centro Histórico',
  'Cidade Baixa',
  'Floresta',
  'São Geraldo',
  'Navegantes',
  'Humaitá',
  'Farrapos',
  'São João',
  'Auxiliadora',
  'Azenha',
  'Santana',
  'Bom Fim',
  'Independência',
  'Moinhos de Vento',
  'Mont Serrat',
  'Praia de Belas',
  'Menino Deus',
  'Partenon',
  'Santo Antônio',
  'Medianeira',
  'Petrópolis',
  'Higienópolis',
  'Jardim Botânico',
  'Rio Branco',
  'Santa Cecília'
];

// Generate embedding for text
async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text.substring(0, 8000), // Limit to avoid token errors
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error.message);
    return null;
  }
}

// Add specific articles to database
async function addArticles() {
  console.log('📚 Adding specific articles to knowledge base...\n');
  
  let added = 0;
  let errors = 0;
  
  for (const article of specificArticles) {
    try {
      console.log(`Processing Art. ${article.number}...`);
      
      const embedding = await generateEmbedding(article.content);
      if (!embedding) {
        console.log(`⚠️ Skipping Art. ${article.number} - no embedding`);
        errors++;
        continue;
      }
      
      // Check if exists
      const { data: existing } = await supabase
        .from('document_sections')
        .select('id')
        .eq('metadata->article_number', article.number)
        .eq('metadata->source', article.source)
        .single();
      
      const documentSection = {
        content: article.content,
        metadata: {
          type: 'legal_article',
          source: article.source,
          article_number: article.number,
          article_type: article.type,
          manually_added: true,
          created_at: new Date().toISOString()
        },
        embedding: embedding
      };
      
      if (existing) {
        // Update
        const { error } = await supabase
          .from('document_sections')
          .update(documentSection)
          .eq('id', existing.id);
        
        if (error) throw error;
        console.log(`✅ Updated Art. ${article.number}`);
      } else {
        // Insert
        const { error } = await supabase
          .from('document_sections')
          .insert(documentSection);
        
        if (error) throw error;
        console.log(`✅ Added Art. ${article.number}`);
      }
      
      added++;
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`❌ Error with Art. ${article.number}:`, error.message);
      errors++;
    }
  }
  
  console.log(`\n📊 Articles: ${added} added/updated, ${errors} errors`);
  return { added, errors };
}

// Add regime data
async function addRegimeData() {
  console.log('\n🏘️ Adding regime urbanístico data...\n');
  
  let added = 0;
  let errors = 0;
  
  for (const regime of regimeData) {
    try {
      console.log(`Processing ${regime.bairro}...`);
      
      const content = `
        Bairro: ${regime.bairro}
        Zona: ${regime.zona}
        Altura Máxima: ${regime.altura_maxima} metros
        Coeficiente de Aproveitamento Básico: ${regime.coef_aproveitamento_basico}
        Coeficiente de Aproveitamento Máximo: ${regime.coef_aproveitamento_maximo}
        Taxa de Ocupação: ${regime.taxa_ocupacao}%
        Observações: ${regime.observacoes}
      `.trim();
      
      const embedding = await generateEmbedding(content);
      if (!embedding) {
        console.log(`⚠️ Skipping ${regime.bairro} - no embedding`);
        errors++;
        continue;
      }
      
      const { error } = await supabase
        .from('document_sections')
        .upsert({
          content: content,
          metadata: {
            type: 'regime_urbanistico',
            bairro: regime.bairro,
            zona: regime.zona,
            altura_maxima: regime.altura_maxima,
            manually_added: true,
            source: 'manual_regime_data'
          },
          embedding: embedding
        }, {
          onConflict: 'content'
        });
      
      if (error) throw error;
      console.log(`✅ Added regime for ${regime.bairro}`);
      added++;
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`❌ Error with ${regime.bairro}:`, error.message);
      errors++;
    }
  }
  
  console.log(`\n📊 Regime: ${added} added, ${errors} errors`);
  return { added, errors };
}

// Add flood protection data
async function addFloodProtection() {
  console.log('\n🌊 Adding flood protection data...\n');
  
  const content = `
    Bairros com Proteção Contra Enchentes em Porto Alegre:
    
    O sistema de proteção contra enchentes de Porto Alegre protege 25 bairros da cidade:
    ${protectedNeighborhoods.join(', ')}.
    
    Estes bairros estão protegidos pelo sistema de diques, comportas e casas de bombas que formam o sistema de proteção contra cheias do Guaíba. O sistema foi projetado para proteger contra enchentes de até 6 metros de cota.
    
    Bairros protegidos incluem áreas centrais como Centro Histórico e Cidade Baixa, bairros residenciais como Petrópolis e Menino Deus, e áreas comerciais importantes como Moinhos de Vento e Praia de Belas.
  `.trim();
  
  try {
    const embedding = await generateEmbedding(content);
    if (!embedding) {
      console.log('⚠️ Failed to generate embedding for flood protection');
      return { added: 0, errors: 1 };
    }
    
    const { error } = await supabase
      .from('document_sections')
      .upsert({
        content: content,
        metadata: {
          type: 'flood_protection',
          topic: 'enchentes',
          neighborhoods_count: protectedNeighborhoods.length,
          neighborhoods: protectedNeighborhoods,
          manually_added: true,
          source: 'manual_flood_data'
        },
        embedding: embedding
      }, {
        onConflict: 'content'
      });
    
    if (error) throw error;
    console.log(`✅ Added flood protection data for ${protectedNeighborhoods.length} neighborhoods`);
    return { added: 1, errors: 0 };
    
  } catch (error) {
    console.error('❌ Error adding flood protection:', error.message);
    return { added: 0, errors: 1 };
  }
}

// Main function
async function main() {
  console.log('🚀 Starting Knowledge Base Enhancement');
  console.log('=' .repeat(50));
  
  const stats = {
    articles: { added: 0, errors: 0 },
    regime: { added: 0, errors: 0 },
    flood: { added: 0, errors: 0 }
  };
  
  // Add specific articles
  stats.articles = await addArticles();
  
  // Add regime data
  stats.regime = await addRegimeData();
  
  // Add flood protection
  stats.flood = await addFloodProtection();
  
  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('📊 ENHANCEMENT COMPLETE!');
  console.log('=' .repeat(50));
  
  const totalAdded = stats.articles.added + stats.regime.added + stats.flood.added;
  const totalErrors = stats.articles.errors + stats.regime.errors + stats.flood.errors;
  
  console.log(`✅ Total added/updated: ${totalAdded}`);
  console.log(`❌ Total errors: ${totalErrors}`);
  console.log('\nBreakdown:');
  console.log(`  📚 Articles: ${stats.articles.added} added`);
  console.log(`  🏘️ Regime: ${stats.regime.added} added`);
  console.log(`  🌊 Flood: ${stats.flood.added} added`);
  
  console.log('\n✨ Knowledge base enhanced successfully!');
}

// Run
main().catch(console.error);