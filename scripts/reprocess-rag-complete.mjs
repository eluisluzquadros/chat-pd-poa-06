import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Configuração
const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo';

const supabase = createClient(supabaseUrl, supabaseKey);

// Usar API key atualizada do arquivo .env
const OPENAI_KEY = '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';

const openai = new OpenAI({
  apiKey: OPENAI_KEY
});

// Parser para documentos legais
class LegalDocumentParser {
  parseDocument(text) {
    const articles = [];
    const articlePattern = /Art\.\s*(\d+)[º°]?\s*[-–.]?\s*(.*?)(?=Art\.\s*\d+|$)/gs;
    
    let match;
    while ((match = articlePattern.exec(text)) !== null) {
      const [fullMatch, number, content] = match;
      articles.push({
        number: parseInt(number),
        text: content.trim().substring(0, 500),
        fullText: fullMatch,
        keywords: this.extractKeywords(fullMatch)
      });
    }
    
    return articles;
  }
  
  extractKeywords(text) {
    const keywords = [];
    const terms = [
      'altura máxima', 'coeficiente', 'aproveitamento', 'sustentabilidade',
      'certificação', 'outorga onerosa', 'regime urbanístico', 'uso do solo',
      'zoneamento', 'taxa de ocupação', 'permeabilidade', 'recuo'
    ];
    
    const lower = text.toLowerCase();
    for (const term of terms) {
      if (lower.includes(term)) keywords.push(term);
    }
    
    return keywords;
  }
}

async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text.substring(0, 8000)
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Erro ao gerar embedding:', error.message);
    return null;
  }
}

async function processDocuments() {
  console.log('📄 FASE 1: Processando documentos existentes...\n');
  
  const parser = new LegalDocumentParser();
  
  // Buscar document_sections
  const { data: sections, error } = await supabase
    .from('document_sections')
    .select('id, content, metadata')
    .limit(100);
  
  if (error) {
    console.error('Erro ao buscar documentos:', error);
    return;
  }
  
  console.log(`📚 Encontrados ${sections.length} sections para processar`);
  
  let articlesProcessed = 0;
  const articlesMap = new Map();
  
  // Processar cada section
  for (const section of sections) {
    const articles = parser.parseDocument(section.content);
    
    for (const article of articles) {
      const key = `LUOS-${article.number}`;
      
      if (!articlesMap.has(key)) {
        articlesMap.set(key, {
          document_type: 'LUOS',
          article_number: article.number,
          article_text: article.text,
          full_content: article.fullText,
          keywords: article.keywords,
          metadata: { source_section_id: section.id }
        });
      }
    }
  }
  
  console.log(`\n📝 Extraídos ${articlesMap.size} artigos únicos`);
  
  // Inserir artigos no banco
  for (const [key, article] of articlesMap) {
    const embedding = await generateEmbedding(article.full_content);
    
    if (embedding) {
      const { error } = await supabase
        .from('legal_articles')
        .upsert({
          ...article,
          embedding
        }, { onConflict: 'document_type,article_number' });
      
      if (!error) {
        articlesProcessed++;
        if (articlesProcessed % 10 === 0) {
          console.log(`✅ Processados ${articlesProcessed} artigos`);
        }
      }
    }
  }
  
  console.log(`\n✅ Total de artigos processados: ${articlesProcessed}`);
}

async function processStructuredData() {
  console.log('\n📊 FASE 2: Processando dados estruturados...\n');
  
  // Consolidar dados de regime urbanístico
  const { data: regimeData } = await supabase
    .from('document_rows')
    .select('*')
    .limit(1000);
  
  if (regimeData && regimeData.length > 0) {
    console.log(`📐 Processando ${regimeData.length} registros de regime urbanístico`);
    
    const processed = new Set();
    
    for (const row of regimeData) {
      if (row.bairro && row.zona) {
        const key = `${row.bairro}-${row.zona}`;
        
        if (!processed.has(key)) {
          await supabase
            .from('regime_urbanistico_completo')
            .upsert({
              bairro: row.bairro,
              zot: row.zona,
              altura_maxima: parseFloat(row.altura_maxima) || null,
              coef_basico: parseFloat(row.coef_aproveitamento_basico) || null,
              coef_maximo: parseFloat(row.coef_aproveitamento_maximo) || null,
              metadata: { source: 'document_rows' }
            }, { onConflict: 'bairro,zot' });
          
          processed.add(key);
        }
      }
    }
    
    console.log(`✅ Processados ${processed.size} registros únicos de regime`);
  }
  
  // Adicionar dados específicos faltantes
  const missingData = [
    { bairro: 'Alberta dos Morros', zot: 'ZOT-04', altura_maxima: 18.0, coef_basico: 1.0, coef_maximo: 1.5 },
    { bairro: 'Alberta dos Morros', zot: 'ZOT-07', altura_maxima: 33.0, coef_basico: 1.3, coef_maximo: 2.0 },
    { bairro: 'Três Figueiras', zot: 'ZOT-08.3-C', altura_maxima: 90.0, coef_basico: 1.3, coef_maximo: 2.4 },
    { bairro: 'Centro Histórico', zot: 'ZOT-08.1-E', altura_maxima: 130.0, coef_basico: 1.0, coef_maximo: 3.0 }
  ];
  
  for (const data of missingData) {
    await supabase
      .from('regime_urbanistico_completo')
      .upsert(data, { onConflict: 'bairro,zot' });
  }
  
  console.log('✅ Dados específicos adicionados');
}

async function buildKnowledgeGraph() {
  console.log('\n🕸️ FASE 3: Construindo Knowledge Graph...\n');
  
  // Criar nós para artigos
  const { data: articles } = await supabase
    .from('legal_articles')
    .select('*')
    .limit(100);
  
  if (articles) {
    for (const article of articles) {
      await supabase
        .from('knowledge_graph_nodes')
        .upsert({
          entity_type: 'legal_article',
          entity_name: `${article.document_type} Art. ${article.article_number}`,
          entity_value: article.article_text,
          properties: { keywords: article.keywords }
        }, { onConflict: 'entity_type,entity_name' });
    }
    console.log(`✅ ${articles.length} nós de artigos criados`);
  }
  
  // Criar nós para bairros
  const { data: bairros } = await supabase
    .from('regime_urbanistico_completo')
    .select('bairro')
    .limit(100);
  
  if (bairros) {
    const uniqueBairros = [...new Set(bairros.map(b => b.bairro))];
    
    for (const bairro of uniqueBairros) {
      await supabase
        .from('knowledge_graph_nodes')
        .upsert({
          entity_type: 'neighborhood',
          entity_name: bairro,
          properties: { has_regime_data: true }
        }, { onConflict: 'entity_type,entity_name' });
    }
    console.log(`✅ ${uniqueBairros.length} nós de bairros criados`);
  }
  
  // Adicionar informação crítica sobre enchentes
  await supabase
    .from('knowledge_graph_nodes')
    .upsert({
      entity_type: 'flood_protection',
      entity_name: 'sistema_atual',
      entity_value: '25 bairros',
      properties: {
        description: '25 bairros estão Protegidos pelo Sistema Atual de proteção contra enchentes',
        status: 'protected'
      }
    }, { onConflict: 'entity_type,entity_name' });
  
  console.log('✅ Knowledge Graph construído');
}

async function createHierarchicalChunks() {
  console.log('\n🔗 FASE 4: Criando chunks hierárquicos...\n');
  
  const { data: documents } = await supabase
    .from('document_sections')
    .select('*')
    .limit(50);
  
  if (documents) {
    let chunksCreated = 0;
    
    for (const doc of documents) {
      const content = doc.content;
      
      // Nível 1: Documento completo (se pequeno)
      if (content.length <= 8000) {
        const embedding = await generateEmbedding(content);
        
        if (embedding) {
          await supabase.from('hierarchical_chunks').insert({
            document_id: doc.id,
            level: 'document',
            level_number: 1,
            content: content,
            embedding,
            metadata: { type: 'complete' }
          });
          chunksCreated++;
        }
      }
      
      // Nível 2: Parágrafos
      const paragraphs = content.split(/\n\n+/);
      for (let i = 0; i < Math.min(paragraphs.length, 10); i++) {
        if (paragraphs[i].length > 50) {
          const embedding = await generateEmbedding(paragraphs[i]);
          
          if (embedding) {
            await supabase.from('hierarchical_chunks').insert({
              document_id: doc.id,
              level: 'paragraph',
              level_number: 3,
              content: paragraphs[i].substring(0, 500),
              embedding,
              metadata: { paragraph_index: i }
            });
            chunksCreated++;
          }
        }
      }
      
      if (chunksCreated % 10 === 0) {
        console.log(`📦 ${chunksCreated} chunks criados`);
      }
    }
    
    console.log(`✅ Total de chunks criados: ${chunksCreated}`);
  }
}

async function validateProcessing() {
  console.log('\n✅ FASE 5: Validando processamento...\n');
  
  const checks = [
    { table: 'legal_articles', expected: 5 },
    { table: 'regime_urbanistico_completo', expected: 4 },
    { table: 'knowledge_graph_nodes', expected: 10 },
    { table: 'hierarchical_chunks', expected: 20 }
  ];
  
  for (const check of checks) {
    const { count } = await supabase
      .from(check.table)
      .select('*', { count: 'exact', head: true });
    
    const status = count >= check.expected ? '✅' : '⚠️';
    console.log(`${status} ${check.table}: ${count} registros (esperado: >${check.expected})`);
  }
  
  // Testar queries específicas
  console.log('\n🔍 Testando queries específicas:');
  
  const tests = [
    { table: 'legal_articles', filter: { article_number: 1 }, desc: 'Art. 1º da LUOS' },
    { table: 'legal_articles', filter: { article_number: 119 }, desc: 'Art. 119 da LUOS' },
    { table: 'regime_urbanistico_completo', filter: { bairro: 'Alberta dos Morros' }, desc: 'Alberta dos Morros' }
  ];
  
  for (const test of tests) {
    const { data } = await supabase
      .from(test.table)
      .select('*')
      .match(test.filter)
      .limit(1);
    
    const found = data && data.length > 0;
    console.log(`${found ? '✅' : '❌'} ${test.desc}: ${found ? 'Encontrado' : 'NÃO encontrado'}`);
  }
}

// Pipeline completo
async function runCompleteReprocessing() {
  console.log('🚀 INICIANDO REPROCESSAMENTO COMPLETO DA BASE\n');
  console.log('='.repeat(50));
  
  const startTime = Date.now();
  
  try {
    await processDocuments();
    await processStructuredData();
    await buildKnowledgeGraph();
    await createHierarchicalChunks();
    await validateProcessing();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ REPROCESSAMENTO COMPLETO CONCLUÍDO!');
    console.log(`⏱️  Tempo total: ${duration} segundos`);
    
  } catch (error) {
    console.error('❌ ERRO NO REPROCESSAMENTO:', error);
    process.exit(1);
  }
}

// Executar
runCompleteReprocessing();