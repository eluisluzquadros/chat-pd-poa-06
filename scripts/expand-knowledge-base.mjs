#!/usr/bin/env node

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import xlsx from 'xlsx';

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

// Generate embedding for text
async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return null;
  }
}

// Process DOCX files and extract articles
async function processDocxFile(filePath, docType) {
  console.log(`\n📄 Processing ${docType}: ${path.basename(filePath)}`);
  
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    const text = result.value;
    
    // Try multiple regex patterns for articles
    const patterns = [
      /Art\.\s*(\d+)[º°]?\s*[–-]\s*([^.]+(?:\.[^.]+)*?)(?=\s*Art\.\s*\d+|$)/gs,
      /Art\.\s*(\d+)[º°]?\.?\s*([^.]+(?:\.[^.]+)*?)(?=\s*Art\.\s*\d+|$)/gs,
      /Artigo\s*(\d+)[º°]?\s*[–-]\s*([^.]+(?:\.[^.]+)*?)(?=\s*Artigo\s*\d+|$)/gs
    ];
    
    const articles = [];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const articleNumber = match[1];
        const articleContent = match[0].trim();
        
        // Skip if too short
        if (articleContent.length < 50) continue;
        
        // Check if we already have this article
        if (!articles.find(a => a.number === parseInt(articleNumber))) {
          articles.push({
            number: parseInt(articleNumber),
            content: articleContent,
            type: docType
          });
        }
      }
    }
    
    // If no articles found with regex, try to split by chunks
    if (articles.length === 0) {
      console.log('⚠️ No articles found with regex, creating chunks...');
      // Create smaller chunks to avoid token limit (max ~1000 chars for safety)
      const chunks = text.match(/.{1,1000}/gs) || [];
      chunks.forEach((chunk, index) => {
        if (chunk.trim().length > 100) {
          articles.push({
            number: index + 1,
            content: chunk.trim(),
            type: docType
          });
        }
      });
    }
    
    console.log(`✅ Found ${articles.length} articles/chunks`);
    return articles;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error);
    return [];
  }
}

// Process and save articles to Supabase
async function saveArticlesToSupabase(articles, source) {
  console.log(`\n💾 Saving ${articles.length} articles to database...`);
  
  let saved = 0;
  let errors = 0;
  
  for (const article of articles) {
    try {
      // Generate embedding
      const embedding = await generateEmbedding(article.content);
      if (!embedding) {
        console.log(`⚠️ Skipping article ${article.number} - no embedding`);
        continue;
      }
      
      // Prepare document section
      const documentSection = {
        content: article.content,
        metadata: {
          type: 'legal_article',
          source: source,
          article_number: article.number,
          article_type: article.type,
          created_at: new Date().toISOString()
        },
        embedding: embedding
      };
      
      // Check if already exists
      const { data: existing } = await supabase
        .from('document_sections')
        .select('id')
        .eq('metadata->article_number', article.number)
        .eq('metadata->source', source)
        .single();
      
      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('document_sections')
          .update(documentSection)
          .eq('id', existing.id);
        
        if (error) throw error;
        console.log(`📝 Updated article ${article.number}`);
      } else {
        // Insert new
        const { error } = await supabase
          .from('document_sections')
          .insert(documentSection);
        
        if (error) throw error;
        console.log(`✅ Saved article ${article.number}`);
      }
      
      saved++;
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`❌ Error saving article ${article.number}:`, error.message);
      errors++;
    }
  }
  
  console.log(`\n📊 Results: ${saved} saved, ${errors} errors`);
  return { saved, errors };
}

// Process CSV file with regime data
async function processRegimeCSV(filePath) {
  console.log(`\n📊 Processing regime data: ${path.basename(filePath)}`);
  
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    
    // Try to detect delimiter
    const firstLine = fileContent.split('\n')[0];
    const delimiter = firstLine.includes('\t') ? '\t' : ',';
    
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      delimiter: delimiter,
      relax_column_count: true
    });
    
    console.log(`✅ Found ${records.length} regime records`);
    
    let saved = 0;
    for (const record of records) {
      const content = `
        Bairro: ${record.NOME_BAIRRO || record.nome_bairro || 'N/A'}
        Zona: ${record.ZONA || record.zona || 'N/A'}
        Altura Máxima: ${record.ALTURA_MAX || record.altura_max || 'N/A'} metros
        Taxa de Ocupação: ${record.TAXA_OCUPACAO || record.taxa_ocupacao || 'N/A'}%
        Índice de Aproveitamento: ${record.INDICE_APROVEITAMENTO || record.indice_aproveitamento || 'N/A'}
        Observações: ${record.OBSERVACOES || record.observacoes || 'N/A'}
      `.trim();
      
      const embedding = await generateEmbedding(content);
      if (!embedding) continue;
      
      const { error } = await supabase
        .from('document_sections')
        .upsert({
          content: content,
          metadata: {
            type: 'regime_urbanistico',
            bairro: record.NOME_BAIRRO || record.nome_bairro,
            zona: record.ZONA || record.zona,
            source: 'PDPOA2025-Regime_Urbanistico.csv'
          },
          embedding: embedding
        }, {
          onConflict: 'content'
        });
      
      if (!error) {
        saved++;
        console.log(`✅ Saved regime for ${record.NOME_BAIRRO || record.nome_bairro}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`📊 Saved ${saved} regime records`);
    return saved;
  } catch (error) {
    console.error('Error processing CSV:', error);
    return 0;
  }
}

// Process XLSX files
async function processExcelFile(filePath, sheetType) {
  console.log(`\n📊 Processing Excel: ${path.basename(filePath)}`);
  
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);
    
    console.log(`✅ Found ${data.length} records in ${sheetType}`);
    
    let saved = 0;
    for (const row of data) {
      let content = '';
      
      if (sheetType === 'risk') {
        content = `
          Bairro: ${row.BAIRRO || row.bairro || 'N/A'}
          Risco de Inundação: ${row.RISCO_INUNDACAO || row.risco_inundacao || 'N/A'}
          Risco de Deslizamento: ${row.RISCO_DESLIZAMENTO || row.risco_deslizamento || 'N/A'}
          Proteção contra Enchentes: ${row.PROTECAO_ENCHENTES || row.protecao_enchentes || 'N/A'}
          Observações: ${row.OBSERVACOES || row.observacoes || 'N/A'}
        `.trim();
      } else if (sheetType === 'zot') {
        content = `
          Bairro: ${row.BAIRRO || row.bairro || 'N/A'}
          ZOT: ${row.ZOT || row.zot || 'N/A'}
          Descrição: ${row.DESCRICAO || row.descricao || 'N/A'}
          Parâmetros: ${row.PARAMETROS || row.parametros || 'N/A'}
        `.trim();
      }
      
      if (!content) continue;
      
      const embedding = await generateEmbedding(content);
      if (!embedding) continue;
      
      const { error } = await supabase
        .from('document_sections')
        .upsert({
          content: content,
          metadata: {
            type: sheetType === 'risk' ? 'risk_assessment' : 'zot_mapping',
            bairro: row.BAIRRO || row.bairro,
            source: path.basename(filePath)
          },
          embedding: embedding
        }, {
          onConflict: 'content'
        });
      
      if (!error) {
        saved++;
        console.log(`✅ Saved ${sheetType} data for ${row.BAIRRO || row.bairro}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`📊 Saved ${saved} ${sheetType} records`);
    return saved;
  } catch (error) {
    console.error('Error processing Excel:', error);
    return 0;
  }
}

// Main processing function
async function expandKnowledgeBase() {
  console.log('🚀 Starting Knowledge Base Expansion');
  console.log('=' .repeat(50));
  
  const stats = {
    articles: 0,
    regime: 0,
    risk: 0,
    zot: 0,
    total: 0
  };
  
  // Process LUOS document
  const luosPath = 'knowledgebase/PDPOA2025-Minuta_Preliminar_LUOS.docx';
  if (fs.existsSync(luosPath)) {
    const luosArticles = await processDocxFile(luosPath, 'LUOS');
    const result = await saveArticlesToSupabase(luosArticles, 'LUOS');
    stats.articles += result.saved;
  }
  
  // Process Plano Diretor document
  const pdPath = 'knowledgebase/PDPOA2025-Minuta_Preliminar_PLANO_DIRETOR.docx';
  if (fs.existsSync(pdPath)) {
    const pdArticles = await processDocxFile(pdPath, 'PLANO_DIRETOR');
    const result = await saveArticlesToSupabase(pdArticles, 'PLANO_DIRETOR');
    stats.articles += result.saved;
  }
  
  // Process Regime Urbanístico CSV
  const regimePath = 'knowledgebase/PDPOA2025-Regime_Urbanistico.csv';
  if (fs.existsSync(regimePath)) {
    stats.regime = await processRegimeCSV(regimePath);
  }
  
  // Process Risk Assessment Excel
  const riskPath = 'knowledgebase/PDPOA2025-Risco_Desastre_vs_Bairros.xlsx';
  if (fs.existsSync(riskPath)) {
    stats.risk = await processExcelFile(riskPath, 'risk');
  }
  
  // Process ZOT mapping Excel
  const zotPath = 'knowledgebase/PDPOA2025-ZOTs_vs_Bairros.xlsx';
  if (fs.existsSync(zotPath)) {
    stats.zot = await processExcelFile(zotPath, 'zot');
  }
  
  // Calculate total
  stats.total = stats.articles + stats.regime + stats.risk + stats.zot;
  
  console.log('\n' + '=' .repeat(50));
  console.log('📊 EXPANSION COMPLETE!');
  console.log('=' .repeat(50));
  console.log(`📚 Articles processed: ${stats.articles}`);
  console.log(`🏘️ Regime records: ${stats.regime}`);
  console.log(`⚠️ Risk assessments: ${stats.risk}`);
  console.log(`🗺️ ZOT mappings: ${stats.zot}`);
  console.log(`✅ TOTAL DOCUMENTS: ${stats.total}`);
  console.log('=' .repeat(50));
  
  // Test a query to verify
  console.log('\n🧪 Testing expanded knowledge base...');
  const testQuery = 'O que diz o artigo 75?';
  const embedding = await generateEmbedding(testQuery);
  
  if (embedding) {
    const { data: results } = await supabase.rpc('match_document_sections', {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: 3
    });
    
    if (results && results.length > 0) {
      console.log(`✅ Found ${results.length} matching documents`);
      console.log(`📝 Best match (similarity ${results[0].similarity}):`);
      console.log(results[0].content.substring(0, 200) + '...');
    } else {
      console.log('⚠️ No matches found - may need to adjust threshold');
    }
  }
}

// Run the expansion
expandKnowledgeBase().catch(console.error);