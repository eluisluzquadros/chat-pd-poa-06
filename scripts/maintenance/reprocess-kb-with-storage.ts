/**
 * SCRIPT COMPLETO DE REPROCESSAMENTO - INCLUINDO SUPABASE STORAGE
 * Processa TODOS os documentos: database + storage bucket
 */

import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import * as pdf from 'pdf-parse';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

// ============================================
// FASE 0: PROCESSAR BUCKET KNOWLEDGEBASE
// ============================================

async function processStorageBucket() {
  console.log('🗂️ FASE 0: Processando bucket knowledgebase do Storage...');
  
  // Listar todos os arquivos no bucket
  const { data: files, error } = await supabase
    .storage
    .from('knowledgebase')
    .list('', {
      limit: 1000,
      offset: 0
    });
  
  if (error) {
    console.error('Erro ao listar arquivos:', error);
    return;
  }
  
  console.log(`📁 Encontrados ${files.length} arquivos no bucket`);
  
  const processedDocuments = [];
  
  for (const file of files) {
    console.log(`📄 Processando: ${file.name}`);
    
    try {
      // Download do arquivo
      const { data: fileData, error: downloadError } = await supabase
        .storage
        .from('knowledgebase')
        .download(file.name);
      
      if (downloadError) {
        console.error(`Erro ao baixar ${file.name}:`, downloadError);
        continue;
      }
      
      // Processar baseado no tipo de arquivo
      let content = '';
      const extension = file.name.split('.').pop()?.toLowerCase();
      
      switch (extension) {
        case 'pdf':
          content = await processPDF(fileData);
          break;
        case 'docx':
        case 'doc':
          content = await processDOCX(fileData);
          break;
        case 'xlsx':
        case 'xls':
          content = await processExcel(fileData);
          break;
        case 'txt':
        case 'md':
          content = await fileData.text();
          break;
        default:
          console.log(`⚠️ Tipo de arquivo não suportado: ${extension}`);
          continue;
      }
      
      if (content) {
        processedDocuments.push({
          filename: file.name,
          content: content,
          metadata: {
            size: file.metadata?.size,
            type: extension,
            source: 'storage_bucket',
            bucket: 'knowledgebase',
            processed_at: new Date().toISOString()
          }
        });
        
        // Inserir na tabela document_sections
        await insertDocumentContent(content, file.name);
      }
      
    } catch (err) {
      console.error(`Erro ao processar ${file.name}:`, err);
    }
  }
  
  console.log(`✅ Processados ${processedDocuments.length} documentos do storage`);
  return processedDocuments;
}

async function processPDF(fileData: Blob): Promise<string> {
  try {
    const buffer = await fileData.arrayBuffer();
    const data = await pdf(Buffer.from(buffer));
    return data.text;
  } catch (error) {
    console.error('Erro ao processar PDF:', error);
    return '';
  }
}

async function processDOCX(fileData: Blob): Promise<string> {
  try {
    const buffer = await fileData.arrayBuffer();
    const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
    return result.value;
  } catch (error) {
    console.error('Erro ao processar DOCX:', error);
    return '';
  }
}

async function processExcel(fileData: Blob): Promise<string> {
  try {
    const buffer = await fileData.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    let content = '';
    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      content += `\n## ${sheetName}\n`;
      content += jsonData.map(row => row.join('\t')).join('\n');
    });
    
    return content;
  } catch (error) {
    console.error('Erro ao processar Excel:', error);
    return '';
  }
}

async function insertDocumentContent(content: string, filename: string) {
  // Dividir em chunks se necessário
  const MAX_CHUNK_SIZE = 4000;
  const chunks = [];
  
  if (content.length <= MAX_CHUNK_SIZE) {
    chunks.push(content);
  } else {
    // Dividir por parágrafos mantendo contexto
    const paragraphs = content.split(/\n\n+/);
    let currentChunk = '';
    
    for (const paragraph of paragraphs) {
      if ((currentChunk + paragraph).length <= MAX_CHUNK_SIZE) {
        currentChunk += paragraph + '\n\n';
      } else {
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = paragraph + '\n\n';
      }
    }
    if (currentChunk) chunks.push(currentChunk.trim());
  }
  
  // Inserir chunks na base
  for (let i = 0; i < chunks.length; i++) {
    const embedding = await generateEmbedding(chunks[i]);
    
    await supabase
      .from('document_sections')
      .insert({
        content: chunks[i],
        embedding: embedding,
        metadata: {
          source_file: filename,
          chunk_index: i,
          total_chunks: chunks.length,
          source: 'storage_bucket'
        }
      });
  }
}

// ============================================
// IDENTIFICAR DOCUMENTOS CHAVE DA LUOS/PDUS
// ============================================

async function identifyKeyDocuments(documents: any[]) {
  console.log('🔍 Identificando documentos chave (LUOS, PDUS)...');
  
  const keyDocuments = {
    luos: null,
    pdus: null,
    regime_urbanistico: [],
    outros: []
  };
  
  for (const doc of documents) {
    const lowerName = doc.filename.toLowerCase();
    const lowerContent = doc.content.substring(0, 1000).toLowerCase();
    
    // Identificar LUOS
    if (lowerName.includes('luos') || 
        lowerContent.includes('lei de uso e ocupação do solo')) {
      keyDocuments.luos = doc;
      console.log('✅ LUOS identificada:', doc.filename);
    }
    
    // Identificar PDUS
    else if (lowerName.includes('pdus') || 
             lowerName.includes('plano diretor') ||
             lowerContent.includes('plano diretor urbano sustentável')) {
      keyDocuments.pdus = doc;
      console.log('✅ PDUS identificado:', doc.filename);
    }
    
    // Identificar Regime Urbanístico
    else if (lowerName.includes('regime') || 
             lowerName.includes('urbanistico') ||
             lowerName.includes('altura') ||
             lowerName.includes('coeficiente')) {
      keyDocuments.regime_urbanistico.push(doc);
      console.log('✅ Regime Urbanístico:', doc.filename);
    }
    
    else {
      keyDocuments.outros.push(doc);
    }
  }
  
  return keyDocuments;
}

// ============================================
// PROCESSAR DOCUMENTOS LEGAIS ESPECÍFICOS
// ============================================

async function processLegalDocuments(keyDocuments: any) {
  console.log('⚖️ Processando documentos legais (LUOS/PDUS)...');
  
  const parser = new LegalDocumentParser();
  
  // Processar LUOS
  if (keyDocuments.luos) {
    console.log('📜 Processando LUOS completa...');
    const articles = parser.parseDocument(keyDocuments.luos.content);
    
    for (const article of articles) {
      const embedding = await generateEmbedding(article.fullText);
      
      await supabase
        .from('legal_articles')
        .upsert({
          document_type: 'LUOS',
          article_number: article.number,
          article_text: article.text.substring(0, 500),
          article_title: article.title,
          full_content: article.fullText,
          embedding: embedding,
          keywords: article.keywords,
          references: article.references,
          metadata: {
            ...article.metadata,
            source_file: keyDocuments.luos.filename
          }
        }, { onConflict: 'document_type,article_number' });
    }
    
    console.log(`✅ ${articles.length} artigos da LUOS processados`);
  }
  
  // Processar PDUS
  if (keyDocuments.pdus) {
    console.log('📜 Processando PDUS completo...');
    const articles = parser.parseDocument(keyDocuments.pdus.content);
    
    for (const article of articles) {
      const embedding = await generateEmbedding(article.fullText);
      
      await supabase
        .from('legal_articles')
        .upsert({
          document_type: 'PDUS',
          article_number: article.number,
          article_text: article.text.substring(0, 500),
          article_title: article.title,
          full_content: article.fullText,
          embedding: embedding,
          keywords: article.keywords,
          references: article.references,
          metadata: {
            ...article.metadata,
            source_file: keyDocuments.pdus.filename
          }
        }, { onConflict: 'document_type,article_number' });
    }
    
    console.log(`✅ ${articles.length} artigos do PDUS processados`);
  }
}

// ============================================
// PROCESSAR DADOS DE REGIME URBANÍSTICO
// ============================================

async function processRegimeUrbanistico(regimeDocs: any[]) {
  console.log('🏗️ Processando dados de Regime Urbanístico...');
  
  for (const doc of regimeDocs) {
    // Tentar extrair dados tabulares
    const data = extractRegimeData(doc.content);
    
    for (const entry of data) {
      await supabase
        .from('regime_urbanistico_completo')
        .upsert({
          bairro: entry.bairro,
          zot: entry.zot,
          altura_maxima: entry.altura_maxima,
          altura_base: entry.altura_base,
          coef_basico: entry.coef_basico,
          coef_maximo: entry.coef_maximo,
          taxa_ocupacao: entry.taxa_ocupacao,
          taxa_permeabilidade: entry.taxa_permeabilidade,
          metadata: {
            source_file: doc.filename,
            extracted_at: new Date().toISOString()
          }
        }, { onConflict: 'bairro,zot' });
    }
  }
  
  console.log('✅ Dados de regime urbanístico processados');
}

function extractRegimeData(content: string): any[] {
  const data = [];
  
  // Padrões para extrair dados
  const patterns = {
    bairro: /(?:bairro|neighborhood):\s*([^\n,]+)/gi,
    zot: /(?:zot|zona)[\s:]+([A-Z0-9\.\-]+)/gi,
    altura: /altura.*?m[áa]x.*?:\s*([\d,\.]+)\s*m/gi,
    coef_basico: /coef.*?b[áa]s.*?:\s*([\d,\.]+)/gi,
    coef_max: /coef.*?m[áa]x.*?:\s*([\d,\.]+)/gi
  };
  
  // Tentar extrair linha por linha
  const lines = content.split('\n');
  let currentEntry: any = {};
  
  for (const line of lines) {
    // Detectar bairro
    const bairroMatch = line.match(/^([A-Z][^\t\|]+?)[\t\|]/);
    if (bairroMatch) {
      if (currentEntry.bairro) {
        data.push(currentEntry);
      }
      currentEntry = { bairro: bairroMatch[1].trim() };
    }
    
    // Extrair números da linha
    const numbers = line.match(/\d+[,\.]?\d*/g);
    if (numbers && currentEntry.bairro) {
      // Assumir ordem: ZOT, altura, coef_basico, coef_max
      if (numbers[0]) currentEntry.altura_maxima = parseFloat(numbers[0].replace(',', '.'));
      if (numbers[1]) currentEntry.coef_basico = parseFloat(numbers[1].replace(',', '.'));
      if (numbers[2]) currentEntry.coef_maximo = parseFloat(numbers[2].replace(',', '.'));
    }
  }
  
  if (currentEntry.bairro) {
    data.push(currentEntry);
  }
  
  return data;
}

// ============================================
// CLASSE PARSER (mesma do script anterior)
// ============================================

class LegalDocumentParser {
  private patterns = {
    article: /Art\.\s*(\d+)[º°]?\s*[-–.]?\s*(.*?)(?=Art\.\s*\d+|$)/gs,
    paragraph: /§\s*(\d+)[º°]?\s*(.*?)(?=§|Art\.|$)/gs,
    inciso: /([IVXLCDM]+)\s*[-–]\s*(.*?)(?=[IVXLCDM]+\s*[-–]|§|Art\.|$)/gs,
    reference: /(?:Art\.|Artigo)\s*(\d+)/g
  };
  
  parseDocument(text: string): any[] {
    const articles = [];
    let match;
    
    this.patterns.article.lastIndex = 0;
    
    while ((match = this.patterns.article.exec(text)) !== null) {
      const [fullMatch, number, content] = match;
      
      articles.push({
        number: parseInt(number),
        text: content.trim(),
        fullText: fullMatch,
        title: content.split('\n')[0].substring(0, 100),
        keywords: this.extractKeywords(fullMatch),
        references: this.extractReferences(fullMatch),
        metadata: {
          paragraphs: this.extractParagraphs(content),
          incisos: this.extractIncisos(content)
        }
      });
    }
    
    return articles;
  }
  
  private extractKeywords(text: string): string[] {
    const keywords = [];
    const terms = [
      'altura máxima', 'coeficiente', 'aproveitamento', 
      'sustentabilidade', 'certificação', 'outorga onerosa',
      'regime urbanístico', 'uso do solo', 'zoneamento'
    ];
    
    const lower = text.toLowerCase();
    for (const term of terms) {
      if (lower.includes(term)) keywords.push(term);
    }
    
    return keywords;
  }
  
  private extractReferences(text: string): number[] {
    const refs = new Set<number>();
    let match;
    this.patterns.reference.lastIndex = 0;
    
    while ((match = this.patterns.reference.exec(text)) !== null) {
      refs.add(parseInt(match[1]));
    }
    
    return Array.from(refs);
  }
  
  private extractParagraphs(content: string): any[] {
    const paragraphs = [];
    let match;
    this.patterns.paragraph.lastIndex = 0;
    
    while ((match = this.patterns.paragraph.exec(content)) !== null) {
      paragraphs.push({
        number: match[1],
        text: match[2].trim()
      });
    }
    
    return paragraphs;
  }
  
  private extractIncisos(content: string): any[] {
    const incisos = [];
    let match;
    this.patterns.inciso.lastIndex = 0;
    
    while ((match = this.patterns.inciso.exec(content)) !== null) {
      incisos.push({
        number: match[1],
        text: match[2].trim()
      });
    }
    
    return incisos;
  }
}

// ============================================
// GERAR EMBEDDINGS
// ============================================

async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text.substring(0, 8000)
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Erro ao gerar embedding:', error);
    return new Array(1536).fill(0);
  }
}

// ============================================
// PIPELINE COMPLETO ATUALIZADO
// ============================================

async function runCompleteReprocessing() {
  console.log('🚀 REPROCESSAMENTO COMPLETO - DATABASE + STORAGE');
  console.log('='.repeat(60));
  
  const startTime = Date.now();
  
  try {
    // FASE 1: Processar Storage Bucket
    const storageDocuments = await processStorageBucket();
    
    // FASE 2: Identificar documentos chave
    const keyDocuments = await identifyKeyDocuments(storageDocuments);
    
    // FASE 3: Processar documentos legais
    await processLegalDocuments(keyDocuments);
    
    // FASE 4: Processar regime urbanístico
    await processRegimeUrbanistico(keyDocuments.regime_urbanistico);
    
    // FASE 5: Criar estruturas do script anterior
    await createTablesStructure();
    
    // FASE 6: Processar document_sections existentes
    await processAllDocuments();
    
    // FASE 7: Consolidar dados estruturados
    await processStructuredData();
    
    // FASE 8: Criar chunks hierárquicos
    await createHierarchicalChunks();
    
    // FASE 9: Construir Knowledge Graph
    await buildKnowledgeGraph();
    
    // FASE 10: Adicionar dados hardcoded críticos
    await addMissingHardcodedData();
    
    // FASE 11: Validação final
    await validateProcessing();
    
    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ REPROCESSAMENTO COMPLETO CONCLUÍDO!');
    console.log(`⏱️ Tempo total: ${duration} minutos`);
    console.log('\n📊 Resumo:');
    console.log(`- Documentos do storage processados: ${storageDocuments.length}`);
    console.log(`- LUOS: ${keyDocuments.luos ? '✅' : '❌'}`);
    console.log(`- PDUS: ${keyDocuments.pdus ? '✅' : '❌'}`);
    console.log(`- Regime Urbanístico: ${keyDocuments.regime_urbanistico.length} docs`);
    
  } catch (error) {
    console.error('❌ ERRO NO REPROCESSAMENTO:', error);
    process.exit(1);
  }
}

// Importar funções do script anterior
import {
  createTablesStructure,
  processAllDocuments,
  processStructuredData,
  createHierarchicalChunks,
  buildKnowledgeGraph,
  addMissingHardcodedData,
  validateProcessing
} from './reprocess-complete-knowledge-base';

// Executar
if (require.main === module) {
  runCompleteReprocessing();
}

export { runCompleteReprocessing };