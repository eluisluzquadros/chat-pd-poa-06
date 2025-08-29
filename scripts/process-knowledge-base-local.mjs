#!/usr/bin/env node
/**
 * Processador Local de Base de Conhecimento - PDPOA 2025
 * 
 * Processa arquivos DOCX localmente e gera embeddings antes de enviar ao Supabase
 * Baseado no processador Python mas adaptado para Node.js
 */

import fs from 'fs/promises';
import path from 'path';
import mammoth from 'mammoth';
import yaml from 'js-yaml';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';

// Load environment variables
dotenv.config({ path: '.env' });

// Configuration
const CONFIG = {
  outputDir: 'pdpoa_knowledge_base_local',
  chunkSize: 2000,
  overlapSize: 200,
  batchSize: 10,
  maxRetries: 3,
  openaiApiKey: process.env.OPENAI_API_KEY,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY
};

class LocalKnowledgeProcessor {
  constructor(outputDir = CONFIG.outputDir) {
    this.outputDir = outputDir;
    this.supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
    this.processedChunks = [];
    this.stats = {
      totalDocuments: 0,
      totalSections: 0,
      totalArticles: 0,
      totalChunks: 0,
      totalWords: 0,
      processingTime: 0
    };
  }

  /**
   * Initialize output directories
   */
  async initializeDirectories() {
    const dirs = [
      this.outputDir,
      path.join(this.outputDir, 'complete_docs'),
      path.join(this.outputDir, 'sections'),
      path.join(this.outputDir, 'articles'),
      path.join(this.outputDir, 'chunks'),
      path.join(this.outputDir, 'embeddings'),
      path.join(this.outputDir, 'raw_text')
    ];

    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }

    console.log('📁 Directories initialized');
  }

  /**
   * Extract text from DOCX file using mammoth
   */
  async extractTextFromDocx(docxPath) {
    console.log(`📖 Reading file: ${docxPath}`);
    
    try {
      const buffer = await fs.readFile(docxPath);
      const result = await mammoth.extractRawText({ buffer });
      
      if (result.messages.length > 0) {
        console.log('⚠️ Warnings:', result.messages);
      }

      const text = result.value;
      console.log(`✅ Text extracted: ${text.length} characters`);
      
      return text;
    } catch (error) {
      console.error(`❌ Error reading DOCX file: ${error.message}`);
      throw error;
    }
  }

  /**
   * Clean and structure extracted text
   */
  cleanAndStructureText(text) {
    // Remove excessive line breaks
    text = text.replace(/\n\s*\n\s*\n+/g, '\n\n');
    
    // Standardize main titles
    text = text.replace(/\*\*(PROJETO DE LEI.*?)\*\*/g, '# $1');
    text = text.replace(/\*\*(PLANO DIRETOR.*?)\*\*/g, '# $1');
    text = text.replace(/\*\*(LEI DE USO.*?)\*\*/g, '# $1');
    
    // Standardize parts and titles
    text = text.replace(/\*\*(PARTE [IVX]+)\*\*/g, '# $1');
    text = text.replace(/\*\*(Título [IVX]+)\*\*/g, '## $1');
    text = text.replace(/\*\*(Capítulo [IVX]+)\*\*/g, '### $1');
    
    // Standardize sections
    text = text.replace(/\*\*(Seção [IVX]+)\*\*/g, '#### $1');
    text = text.replace(/\*\*(Subseção [IVX]+)\*\*/g, '##### $1');
    
    // Standardize articles
    text = text.replace(/\*\*(Art\.\s*\d+[ºª]?\.?)\*\*/g, '\n### $1\n');
    
    // Standardize paragraphs
    text = text.replace(/\*\*(§\s*\d+[ºª]?\.?)\*\*/g, '\n**$1**');
    
    return text.trim();
  }

  /**
   * Extract document information
   */
  extractDocumentInfo(text, filename) {
    const info = {
      filename,
      processedAt: new Date().toISOString()
    };
    
    // Law number
    const leiMatch = text.match(/PROJETO DE LEI COMPLEMENTAR Nº\s*([^.\n]+)/);
    if (leiMatch) {
      info.leiNumber = leiMatch[1].trim();
    }
    
    // Main title and type
    if (text.includes('PLANO DIRETOR')) {
      info.title = 'Plano Diretor Urbano Sustentável';
      info.docType = 'PDUS';
    } else if (text.includes('LEI DE USO')) {
      info.title = 'Lei de Uso e Ocupação do Solo';
      info.docType = 'LUOS';
    } else {
      info.title = 'Documento PDPOA';
      info.docType = 'GENERAL';
    }
    
    return info;
  }

  /**
   * Extract articles from text
   */
  extractArticles(text) {
    const articles = [];
    // Updated pattern to match actual article format in the documents
    // Matches: Art. 1º, Art. 2º, etc. without requiring ###
    const articlePattern = /^(Art\.\s*\d+[ºª]?)(?:\s+|\.)(.*?)(?=^Art\.\s*\d+[ºª]?|^Título|^PARTE|^Capítulo|^Seção|\Z)/gms;
    let match;
    
    while ((match = articlePattern.exec(text)) !== null) {
      const header = match[1];
      const content = match[2].trim();
      
      const numberMatch = header.match(/(\d+)/);
      if (!numberMatch) continue;
      
      const articleNumber = parseInt(numberMatch[1]);
      
      articles.push({
        number: articleNumber,
        header,
        content,
        section: this.findArticleSection(text, header),
        rawText: `${header}\n${content}`,
        wordCount: content.split(/\s+/).length
      });
    }
    
    return articles.sort((a, b) => a.number - b.number);
  }

  /**
   * Find the section containing an article
   */
  findArticleSection(text, articleHeader) {
    const articlePos = text.indexOf(articleHeader);
    if (articlePos === -1) return 'Disposições Gerais';
    
    const textBefore = text.substring(0, articlePos);
    
    // Search for hierarchical titles
    const patterns = [
      { regex: /##### ([^#\n]+)/g, level: 'Subseção' },
      { regex: /#### ([^#\n]+)/g, level: 'Seção' },
      { regex: /### ([^#\n]+)/g, level: 'Capítulo' },
      { regex: /## ([^#\n]+)/g, level: 'Título' },
      { regex: /# ([^#\n]+)/g, level: 'Parte' }
    ];
    
    for (const { regex } of patterns) {
      const matches = [...textBefore.matchAll(regex)];
      if (matches.length > 0) {
        return matches[matches.length - 1][1].trim();
      }
    }
    
    return 'Disposições Gerais';
  }

  /**
   * Extract sections from text
   */
  extractSections(text) {
    const sections = [];
    
    const patterns = [
      { regex: /# (PARTE [^#\n]+)\n(.*?)(?=# PARTE|\Z)/gs, type: 'Parte' },
      { regex: /## (Título [^#\n]+)\n(.*?)(?=## Título|# PARTE|\Z)/gs, type: 'Título' },
      { regex: /### (Capítulo [^#\n]+)\n(.*?)(?=### Capítulo|## Título|# PARTE|\Z)/gs, type: 'Capítulo' },
      { regex: /#### (Seção [^#\n]+)\n(.*?)(?=#### Seção|### Capítulo|## Título|# PARTE|\Z)/gs, type: 'Seção' }
    ];
    
    for (const { regex, type } of patterns) {
      let match;
      while ((match = regex.exec(text)) !== null) {
        sections.push({
          type,
          title: match[1].trim(),
          content: match[2].trim(),
          wordCount: match[2].split(/\s+/).length
        });
      }
    }
    
    return sections;
  }

  /**
   * Create chunks with overlap for better context
   */
  createChunks(text, chunkSize = CONFIG.chunkSize, overlap = CONFIG.overlapSize) {
    const chunks = [];
    const words = text.split(/\s+/);
    
    for (let i = 0; i < words.length; i += chunkSize - overlap) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      chunks.push({
        content: chunk,
        startIndex: i,
        endIndex: Math.min(i + chunkSize, words.length),
        wordCount: chunk.split(/\s+/).length
      });
      
      if (i + chunkSize >= words.length) break;
    }
    
    return chunks;
  }

  /**
   * Generate embedding using OpenAI API
   */
  async generateEmbedding(text) {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CONFIG.openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'text-embedding-ada-002',
          input: text.substring(0, 8000) // Limit to avoid token limits
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.error('❌ Error generating embedding:', error.message);
      throw error;
    }
  }

  /**
   * Process chunks in batches to avoid rate limits
   */
  async processChunksBatch(chunks, docInfo, batchSize = CONFIG.batchSize) {
    const processedChunks = [];
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      console.log(`📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(chunks.length/batchSize)}`);
      
      const batchPromises = batch.map(async (chunk, index) => {
        const chunkId = crypto.randomBytes(16).toString('hex');
        
        // Generate embedding
        console.log(`🔄 Generating embedding for chunk ${i + index + 1}/${chunks.length}`);
        const embedding = await this.generateEmbedding(chunk.content);
        
        return {
          id: chunkId,
          content: chunk.content,
          embedding,
          metadata: {
            document_type: docInfo.docType,
            document_title: docInfo.title,
            source_file: docInfo.filename,
            chunk_index: i + index,
            word_count: chunk.wordCount,
            processed_at: new Date().toISOString()
          }
        };
      });
      
      const batchResults = await Promise.all(batchPromises);
      processedChunks.push(...batchResults);
      
      // Add delay to avoid rate limits
      if (i + batchSize < chunks.length) {
        console.log('⏳ Waiting 2 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    return processedChunks;
  }

  /**
   * Save chunks to Supabase
   */
  async saveChunksToSupabase(chunks) {
    console.log(`💾 Saving ${chunks.length} chunks to Supabase...`);
    
    const chunksForDb = chunks.map(chunk => ({
      id: chunk.id,
      content: chunk.content,
      embedding: chunk.embedding,
      metadata: chunk.metadata,
      created_at: new Date().toISOString()
    }));

    // Save in batches of 50
    const batchSize = 50;
    for (let i = 0; i < chunksForDb.length; i += batchSize) {
      const batch = chunksForDb.slice(i, i + batchSize);
      
      const { error } = await this.supabase
        .from('document_sections')
        .upsert(batch, { onConflict: 'id' });
      
      if (error) {
        console.error(`❌ Error saving batch: ${error.message}`);
        throw error;
      }
      
      console.log(`✅ Saved batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(chunksForDb.length/batchSize)}`);
    }
  }

  /**
   * Save articles to Supabase
   */
  async saveArticlesToSupabase(articles, docInfo) {
    console.log(`💾 Saving ${articles.length} articles to Supabase...`);
    
    const articlesWithEmbeddings = [];
    
    // Process articles in batches
    for (let i = 0; i < articles.length; i += CONFIG.batchSize) {
      const batch = articles.slice(i, i + CONFIG.batchSize);
      console.log(`📦 Processing articles batch ${Math.floor(i/CONFIG.batchSize) + 1}/${Math.ceil(articles.length/CONFIG.batchSize)}`);
      
      const batchPromises = batch.map(async article => {
        const embedding = await this.generateEmbedding(article.rawText);
        
        return {
          id: crypto.randomBytes(16).toString('hex'),
          content: article.rawText,
          embedding,
          metadata: {
            document_type: docInfo.docType,
            document_title: docInfo.title,
            article_number: article.number,
            article_header: article.header,
            section: article.section,
            source_file: docInfo.filename,
            word_count: article.wordCount
          },
          created_at: new Date().toISOString()
        };
      });
      
      const batchResults = await Promise.all(batchPromises);
      articlesWithEmbeddings.push(...batchResults);
      
      // Add delay to avoid rate limits
      if (i + CONFIG.batchSize < articles.length) {
        console.log('⏳ Waiting 2 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Save to database
    const { error } = await this.supabase
      .from('legal_articles')
      .upsert(articlesWithEmbeddings, { onConflict: 'id' });
    
    if (error) {
      console.error(`❌ Error saving articles: ${error.message}`);
      throw error;
    }
    
    console.log(`✅ Saved ${articlesWithEmbeddings.length} articles`);
  }

  /**
   * Save processing metadata locally
   */
  async saveMetadata(docInfo, articles, sections, chunks) {
    const metadata = {
      document: docInfo,
      statistics: {
        articles: articles.length,
        sections: sections.length,
        chunks: chunks.length,
        totalWords: this.stats.totalWords
      },
      processing: {
        date: new Date().toISOString(),
        version: '1.0',
        config: {
          chunkSize: CONFIG.chunkSize,
          overlapSize: CONFIG.overlapSize
        }
      }
    };
    
    const metadataPath = path.join(this.outputDir, `${docInfo.docType}_metadata.json`);
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    
    console.log(`📊 Metadata saved to ${metadataPath}`);
  }

  /**
   * Process a single document
   */
  async processSingleDocument(docxPath) {
    const filename = path.basename(docxPath);
    console.log(`\n📄 Processing: ${filename}`);
    
    const startTime = Date.now();
    
    try {
      // Extract text
      const rawText = await this.extractTextFromDocx(docxPath);
      
      // Save raw text for debugging
      const rawPath = path.join(this.outputDir, 'raw_text', `${path.parse(filename).name}_raw.txt`);
      await fs.writeFile(rawPath, rawText);
      
      // Clean and structure text
      const cleanedText = this.cleanAndStructureText(rawText);
      
      // Extract document info
      const docInfo = this.extractDocumentInfo(cleanedText, filename);
      
      // Extract articles
      const articles = this.extractArticles(cleanedText);
      console.log(`📋 Found ${articles.length} articles`);
      
      // Extract sections
      const sections = this.extractSections(cleanedText);
      console.log(`📑 Found ${sections.length} sections`);
      
      // Create chunks
      const chunks = this.createChunks(cleanedText);
      console.log(`📦 Created ${chunks.length} chunks`);
      
      // Process chunks with embeddings
      const processedChunks = await this.processChunksBatch(chunks, docInfo);
      
      // Save to Supabase
      await this.saveChunksToSupabase(processedChunks);
      await this.saveArticlesToSupabase(articles, docInfo);
      
      // Save metadata locally
      await this.saveMetadata(docInfo, articles, sections, processedChunks);
      
      // Update stats
      this.stats.totalDocuments++;
      this.stats.totalArticles += articles.length;
      this.stats.totalSections += sections.length;
      this.stats.totalChunks += processedChunks.length;
      this.stats.totalWords += cleanedText.split(/\s+/).length;
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ ${filename} processed in ${(processingTime / 1000).toFixed(2)} seconds`);
      
      return {
        success: true,
        docInfo,
        stats: {
          articles: articles.length,
          sections: sections.length,
          chunks: processedChunks.length,
          processingTime
        }
      };
      
    } catch (error) {
      console.error(`❌ Error processing ${filename}: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create comprehensive documentation
   */
  async createDocumentation() {
    const readme = `# Knowledge Base Processing Report

## 📊 Processing Statistics

- **Documents Processed:** ${this.stats.totalDocuments}
- **Total Articles:** ${this.stats.totalArticles}
- **Total Sections:** ${this.stats.totalSections}
- **Total Chunks:** ${this.stats.totalChunks}
- **Total Words:** ${this.stats.totalWords.toLocaleString()}
- **Processing Time:** ${(this.stats.processingTime / 1000).toFixed(2)} seconds

## 📁 Output Structure

\`\`\`
${this.outputDir}/
├── complete_docs/      # Complete processed documents
├── sections/          # Document sections
├── articles/          # Individual articles
├── chunks/            # Text chunks with overlap
├── embeddings/        # Generated embeddings
├── raw_text/          # Original extracted text
└── *_metadata.json    # Processing metadata
\`\`\`

## 🔄 Supabase Integration

Data has been saved to the following tables:
- \`document_sections\`: Text chunks with embeddings
- \`legal_articles\`: Individual articles with embeddings

## 🚀 Next Steps

1. Verify data in Supabase dashboard
2. Test vector search functionality
3. Update RAG pipeline to use new data

---
*Generated on ${new Date().toISOString()}*
`;

    const readmePath = path.join(this.outputDir, 'README.md');
    await fs.writeFile(readmePath, readme);
    
    console.log(`\n📖 Documentation saved to ${readmePath}`);
  }

  /**
   * Main processing function
   */
  async run(docxFiles) {
    console.log('🚀 Starting local knowledge base processing');
    console.log(`📂 Output directory: ${path.resolve(this.outputDir)}`);
    
    const startTime = Date.now();
    
    // Initialize directories
    await this.initializeDirectories();
    
    // Process each document
    for (const docxPath of docxFiles) {
      if (await this.fileExists(docxPath)) {
        await this.processSingleDocument(docxPath);
      } else {
        console.log(`⚠️ File not found: ${docxPath}`);
      }
    }
    
    // Calculate total processing time
    this.stats.processingTime = Date.now() - startTime;
    
    // Create documentation
    await this.createDocumentation();
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 Processing Complete!');
    console.log('='.repeat(60));
    console.log(`📊 Total Documents: ${this.stats.totalDocuments}`);
    console.log(`📋 Total Articles: ${this.stats.totalArticles}`);
    console.log(`📑 Total Sections: ${this.stats.totalSections}`);
    console.log(`📦 Total Chunks: ${this.stats.totalChunks}`);
    console.log(`📝 Total Words: ${this.stats.totalWords.toLocaleString()}`);
    console.log(`⏱️ Total Time: ${(this.stats.processingTime / 1000).toFixed(2)} seconds`);
    console.log('='.repeat(60));
  }

  /**
   * Check if file exists
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

// Main execution
async function main() {
  console.log('🔧 Starting Knowledge Base Processor...');
  console.log('📁 Loading environment variables from .env');
  
  // Check for required environment variables
  if (!CONFIG.openaiApiKey) {
    console.error('❌ OPENAI_API_KEY not found in environment');
    console.error('💡 Please add OPENAI_API_KEY to your .env file');
    process.exit(1);
  }
  
  if (!CONFIG.supabaseUrl || !CONFIG.supabaseKey) {
    console.error('❌ Supabase configuration not found in environment');
    console.error('💡 Please add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env');
    process.exit(1);
  }
  
  console.log('✅ Environment variables loaded successfully');
  
  // Default document paths
  const docxFiles = [
    'knowledgebase/PDPOA2025-Minuta_Preliminar_PLANO_DIRETOR.docx',
    'knowledgebase/PDPOA2025-Minuta_Preliminar_LUOS.docx'
  ];
  
  // Check if custom files were provided as arguments
  if (process.argv.length > 2) {
    docxFiles.length = 0;
    docxFiles.push(...process.argv.slice(2));
  }
  
  console.log('📚 Files to process:');
  docxFiles.forEach(file => console.log(`  - ${file}`));
  
  // Create processor and run
  const processor = new LocalKnowledgeProcessor();
  
  try {
    await processor.run(docxFiles);
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
console.log('🏃 Script started');
console.log('📍 Current directory:', process.cwd());
console.log('📝 Script path:', import.meta.url);
console.log('📝 Process argv[1]:', process.argv[1]);

main().catch(error => {
  console.error('❌ Fatal error in main:', error);
  process.exit(1);
});

export { LocalKnowledgeProcessor };