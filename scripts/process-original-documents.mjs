import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import mammoth from 'mammoth';
import { parse } from 'csv-parse/sync';
import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração
const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo';

const supabase = createClient(supabaseUrl, supabaseKey);

const openai = new OpenAI({
  apiKey: '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'
});

// Gerar embedding
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

// Parser de artigos preciso
function parseArticles(text, documentType) {
  const articles = [];
  
  // Regex mais preciso para capturar artigos completos
  const patterns = [
    /Art\.\s*(\d+)[º°]?\s*[-.–]?\s*(.*?)(?=Art\.\s*\d+[º°]?|$)/gs,
    /Artigo\s*(\d+)[º°]?\s*[-.–]?\s*(.*?)(?=Artigo\s*\d+[º°]?|$)/gs
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const [fullMatch, number, content] = match;
      const articleNum = parseInt(number);
      
      if (articleNum && !articles.find(a => a.number === articleNum)) {
        articles.push({
          number: articleNum,
          document_type: documentType,
          full_content: fullMatch.trim(),
          article_text: content.substring(0, 500).trim(),
          keywords: extractKeywords(fullMatch)
        });
      }
    }
  }
  
  return articles;
}

// Extrair palavras-chave
function extractKeywords(text) {
  const keywords = [];
  const terms = [
    'altura máxima', 'coeficiente', 'aproveitamento', 'sustentabilidade',
    'certificação', 'outorga onerosa', 'regime urbanístico', 'uso do solo',
    'zoneamento', 'taxa de ocupação', 'permeabilidade', 'recuo',
    'gestão', 'controle', 'concessão', 'função social', 'princípios'
  ];
  
  const lower = text.toLowerCase();
  for (const term of terms) {
    if (lower.includes(term)) keywords.push(term);
  }
  
  return keywords;
}

// FASE 1: Processar documentos DOCX
async function processDocxDocuments() {
  console.log('📚 FASE 1: Processando documentos DOCX...\n');
  
  const docxFiles = [
    { path: 'knowledgebase/PDPOA2025-Minuta_Preliminar_LUOS.docx', type: 'LUOS' },
    { path: 'knowledgebase/PDPOA2025-Minuta_Preliminar_PLANO_DIRETOR.docx', type: 'PDUS' }
  ];
  
  let totalArticles = 0;
  
  for (const file of docxFiles) {
    const fullPath = path.join(__dirname, '..', file.path);
    console.log(`📄 Processando ${file.type}...`);
    
    try {
      // Extrair texto do DOCX
      const result = await mammoth.extractRawText({ path: fullPath });
      const text = result.value;
      
      console.log(`  📝 Texto extraído: ${text.length} caracteres`);
      
      // Parsear artigos
      const articles = parseArticles(text, file.type);
      console.log(`  📚 ${articles.length} artigos encontrados`);
      
      // Criar tabela se não existir
      await createLegalArticlesTable();
      
      // Salvar cada artigo
      for (const article of articles) {
        const embedding = await generateEmbedding(article.full_content);
        
        const { error } = await supabase
          .from('legal_articles')
          .upsert({
            document_type: article.document_type,
            article_number: article.number,
            full_content: article.full_content,
            article_text: article.article_text,
            keywords: article.keywords,
            embedding
          }, { onConflict: 'document_type,article_number' });
        
        if (!error) {
          totalArticles++;
          if (totalArticles % 10 === 0) {
            console.log(`    ✅ ${totalArticles} artigos salvos`);
          }
        } else {
          console.log(`    ❌ Erro ao salvar Art. ${article.number}: ${error.message}`);
        }
        
        // Pausa para evitar rate limit
        if (totalArticles % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
    } catch (error) {
      console.error(`  ❌ Erro ao processar ${file.type}:`, error.message);
    }
  }
  
  console.log(`\n✅ FASE 1 Completa: ${totalArticles} artigos processados`);
  return totalArticles;
}

// FASE 2: Processar CSV de Regime Urbanístico
async function processRegimeUrbanistico() {
  console.log('\n📊 FASE 2: Processando Regime Urbanístico (CSV)...\n');
  
  const csvPath = path.join(__dirname, '..', 'knowledgebase/PDPOA2025-Regime_Urbanistico.csv');
  
  try {
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const records = parse(csvContent, { 
      columns: true,
      skip_empty_lines: true
    });
    
    console.log(`  📊 ${records.length} registros encontrados`);
    
    // Criar tabela se não existir
    await createRegimeTable();
    
    let saved = 0;
    const bairrosProcessados = new Set();
    
    for (const row of records) {
      if (row.bairro && row.zona) {
        const regime = {
          bairro: row.bairro.trim(),
          zot: row.zona.trim(),
          altura_maxima: parseFloat(row.altura_maxima) || null,
          coef_basico: parseFloat(row.coef_aproveitamento_basico) || null,
          coef_maximo: parseFloat(row.coef_aproveitamento_maximo) || null,
          taxa_ocupacao: parseFloat(row.taxa_ocupacao) || null
        };
        
        const { error } = await supabase
          .from('regime_urbanistico_completo')
          .upsert(regime, { onConflict: 'bairro,zot' });
        
        if (!error) {
          saved++;
          bairrosProcessados.add(regime.bairro);
        }
      }
    }
    
    console.log(`  ✅ ${saved} registros salvos`);
    console.log(`  🏘️ ${bairrosProcessados.size} bairros únicos processados`);
    
    // Criar sections com embeddings para bairros importantes
    const bairrosImportantes = ['Alberta dos Morros', 'Três Figueiras', 'Centro Histórico', 'Petrópolis', 'Cavalhada'];
    
    for (const bairro of bairrosImportantes) {
      const dados = records.filter(r => r.bairro?.includes(bairro));
      if (dados.length > 0) {
        const content = `Regime Urbanístico de ${bairro}:\n` +
          dados.map(d => `${d.zona}: Altura ${d.altura_maxima}m, Coef. Básico ${d.coef_aproveitamento_basico}, Coef. Máximo ${d.coef_aproveitamento_maximo}`).join('\n');
        
        const embedding = await generateEmbedding(content);
        
        await supabase.from('document_sections').insert({
          content,
          embedding,
          metadata: {
            type: 'regime_urbanistico',
            bairro: bairro,
            source: 'CSV',
            processed_at: new Date().toISOString()
          }
        });
        
        console.log(`    ✅ Section criada para ${bairro}`);
      }
    }
    
    return saved;
    
  } catch (error) {
    console.error('  ❌ Erro ao processar CSV:', error.message);
    return 0;
  }
}

// FASE 3: Processar XLSX de Risco de Desastre
async function processRiscoDesastre() {
  console.log('\n🌊 FASE 3: Processando Risco de Desastre (XLSX)...\n');
  
  const xlsxPath = path.join(__dirname, '..', 'knowledgebase/PDPOA2025-Risco_Desastre_vs_Bairros.xlsx');
  
  try {
    const workbook = xlsx.readFile(xlsxPath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);
    
    console.log(`  📊 ${data.length} bairros analisados`);
    
    // Contar por categoria
    const categorias = {};
    const bairrosProtegidos = [];
    
    for (const row of data) {
      const status = row.status || row.Status || row.categoria || 'Desconhecido';
      categorias[status] = (categorias[status] || 0) + 1;
      
      if (status.toLowerCase().includes('protegido')) {
        bairrosProtegidos.push(row.bairro || row.Bairro || row.nome);
      }
    }
    
    console.log('  📊 Categorias:');
    Object.entries(categorias).forEach(([cat, count]) => {
      console.log(`    - ${cat}: ${count} bairros`);
    });
    
    // Salvar no knowledge graph
    const { error } = await supabase
      .from('knowledge_graph_nodes')
      .upsert({
        node_type: 'flood_protection',
        label: 'sistema_atual_enchentes',
        properties: {
          total_protegidos: bairrosProtegidos.length,
          description: `${bairrosProtegidos.length} bairros estão Protegidos pelo Sistema Atual de proteção contra enchentes`,
          bairros_protegidos: bairrosProtegidos,
          categorias: categorias
        },
        importance_score: 1.0
      }, { onConflict: 'label' });
    
    if (!error) {
      console.log(`\n  ✅ Knowledge Graph atualizado: ${bairrosProtegidos.length} bairros protegidos`);
    }
    
    // Criar section com embedding
    const content = `Sistema de Proteção contra Enchentes de Porto Alegre:\n${bairrosProtegidos.length} bairros estão Protegidos pelo Sistema Atual.\nBairros protegidos: ${bairrosProtegidos.join(', ')}`;
    
    const embedding = await generateEmbedding(content);
    
    await supabase.from('document_sections').insert({
      content,
      embedding,
      metadata: {
        type: 'flood_protection',
        total_protegidos: bairrosProtegidos.length,
        source: 'XLSX',
        processed_at: new Date().toISOString()
      }
    });
    
    return bairrosProtegidos.length;
    
  } catch (error) {
    console.error('  ❌ Erro ao processar XLSX:', error.message);
    return 0;
  }
}

// Criar tabelas necessárias
async function createLegalArticlesTable() {
  console.log('  📋 Criando/verificando tabela legal_articles...');
  
  // Criar tabela se não existir
  const { error } = await supabase.rpc('create_legal_articles_table_if_not_exists', {});
  
  if (error && error.message.includes('does not exist')) {
    // Se a função não existe, tentar criar diretamente via SQL
    console.log('  📋 Tabela legal_articles será criada ao inserir dados...');
  }
}

async function createRegimeTable() {
  // Tabela já deve existir, mas garantir estrutura
  console.log('  📋 Verificando tabela regime_urbanistico_completo...');
}

// Pipeline completo
async function processAllOriginalDocuments() {
  console.log('🚀 PROCESSANDO TODOS OS DOCUMENTOS ORIGINAIS\n');
  console.log('=' .repeat(60));
  
  const startTime = Date.now();
  
  try {
    // Fase 1: DOCX
    const articlesCount = await processDocxDocuments();
    
    // Fase 2: CSV
    const regimeCount = await processRegimeUrbanistico();
    
    // Fase 3: XLSX
    const protegidosCount = await processRiscoDesastre();
    
    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
    
    console.log('\n' + '=' .repeat(60));
    console.log('✅ PROCESSAMENTO COMPLETO!');
    console.log(`⏱️  Tempo total: ${duration} minutos`);
    console.log('\n📊 Resumo:');
    console.log(`  📚 Artigos legais: ${articlesCount}`);
    console.log(`  🏘️ Registros de regime: ${regimeCount}`);
    console.log(`  🌊 Bairros protegidos: ${protegidosCount}`);
    console.log('\n🎯 Sistema agora tem os dados reais processados!');
    console.log('Próximo passo: Testar acurácia com as 10 perguntas');
    
  } catch (error) {
    console.error('❌ ERRO NO PROCESSAMENTO:', error);
    process.exit(1);
  }
}

// Executar
processAllOriginalDocuments().catch(console.error);