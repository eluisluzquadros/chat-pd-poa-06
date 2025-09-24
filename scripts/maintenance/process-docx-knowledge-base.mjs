#!/usr/bin/env node

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs/promises';
import path from 'path';
import mammoth from 'mammoth';

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

// Document files to process
const documentFiles = [
  'knowledgebase/PDPOA2025-Minuta_Preliminar_LUOS.docx',
  'knowledgebase/PDPOA2025-Minuta_Preliminar_PLANO_DIRETOR.docx',
  'knowledgebase/PDPOA2025-Objetivos_Previstos.docx',
  'knowledgebase/PDPOA2025-QA.docx-2025-08-11.docx'
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
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

function splitIntoChunks(text, maxChunkSize = 1500, overlap = 200) {
  const chunks = [];
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  let currentChunk = '';
  let currentSize = 0;
  
  for (const sentence of sentences) {
    const sentenceSize = sentence.length;
    
    if (currentSize + sentenceSize > maxChunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      
      // Add overlap by keeping last few sentences
      const overlapText = currentChunk.split(/[.!?]+/).slice(-2).join('. ');
      currentChunk = overlapText + ' ' + sentence;
      currentSize = currentChunk.length;
    } else {
      currentChunk += ' ' + sentence;
      currentSize += sentenceSize;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

async function extractTextFromDocx(filePath) {
  const buffer = await fs.readFile(filePath);
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

async function processDocument(filePath) {
  const fileName = path.basename(filePath);
  const spinner = ora(`Processing ${fileName}`).start();
  
  try {
    // Extract text from DOCX
    const fullText = await extractTextFromDocx(filePath);
    
    if (!fullText || fullText.length < 100) {
      spinner.warn(chalk.yellow(`⚠️ ${fileName}: Document too short or empty`));
      return { success: 0, failed: 1 };
    }
    
    // Determine document type and metadata
    let documentType = 'general';
    let documentTitle = fileName;
    
    if (fileName.includes('LUOS')) {
      documentType = 'luos';
      documentTitle = 'Lei de Uso e Ocupação do Solo (LUOS)';
    } else if (fileName.includes('PLANO_DIRETOR')) {
      documentType = 'plano_diretor';
      documentTitle = 'Plano Diretor de Porto Alegre (PDUS 2025)';
    } else if (fileName.includes('Objetivos')) {
      documentType = 'objetivos';
      documentTitle = 'Objetivos do PDUS 2025';
    } else if (fileName.includes('QA')) {
      documentType = 'qa_knowledge';
      documentTitle = 'Base de Conhecimento Q&A';
    }
    
    // Split into chunks
    const chunks = splitIntoChunks(fullText);
    spinner.text = `${fileName}: Creating ${chunks.length} chunks...`;
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      try {
        // Generate embedding for chunk
        const embedding = await generateEmbedding(chunk);
        
        // Create metadata
        const metadata = {
          source_file: fileName,
          document_type: documentType,
          document_title: documentTitle,
          chunk_index: i,
          total_chunks: chunks.length,
          chunk_size: chunk.length,
          processing_date: new Date().toISOString()
        };
        
        // Extract section title if possible (first line or heading)
        const firstLine = chunk.split('\n')[0].trim();
        if (firstLine && firstLine.length < 200) {
          metadata.section_title = firstLine;
        }
        
        // Extract keywords from chunk
        const keywords = extractKeywords(chunk);
        if (keywords.length > 0) {
          metadata.keywords = keywords;
        }
        
        // Check if similar chunk already exists
        const { data: existing } = await supabase
          .from('document_sections')
          .select('id')
          .eq('metadata->source_file', fileName)
          .eq('metadata->chunk_index', i)
          .single();
        
        if (existing) {
          // Update existing chunk
          const { error } = await supabase
            .from('document_sections')
            .update({
              content: chunk,
              embedding: embedding,
              metadata: metadata,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);
          
          if (error) throw error;
        } else {
          // Insert new chunk
          const { error } = await supabase
            .from('document_sections')
            .insert({
              content: chunk,
              embedding: embedding,
              metadata: metadata
            });
          
          if (error) throw error;
        }
        
        successCount++;
        spinner.text = `${fileName}: Processed ${i + 1}/${chunks.length} chunks`;
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(chalk.red(`\nError processing chunk ${i}: ${error.message}`));
        failCount++;
      }
    }
    
    if (successCount > 0) {
      spinner.succeed(chalk.green(`✅ ${fileName}: ${successCount} chunks processed successfully`));
    } else {
      spinner.fail(chalk.red(`❌ ${fileName}: Failed to process`));
    }
    
    return { success: successCount, failed: failCount };
    
  } catch (error) {
    spinner.fail(chalk.red(`❌ ${fileName}: ${error.message}`));
    return { success: 0, failed: 1 };
  }
}

function extractKeywords(text) {
  const keywords = [];
  
  // Extract article references
  const articleMatches = text.match(/artigo\s+\d+|art\.\s*\d+/gi) || [];
  keywords.push(...articleMatches.map(a => a.toLowerCase()));
  
  // Extract zone references
  const zoneMatches = text.match(/zot-?\d+|zona\s+\w+/gi) || [];
  keywords.push(...zoneMatches.map(z => z.toLowerCase()));
  
  // Extract neighborhood names (common ones)
  const neighborhoods = [
    'centro', 'cidade baixa', 'menino deus', 'petrópolis', 'moinhos de vento',
    'bom fim', 'floresta', 'navegantes', 'são joão', 'auxiliadora'
  ];
  
  for (const neighborhood of neighborhoods) {
    if (text.toLowerCase().includes(neighborhood)) {
      keywords.push(neighborhood);
    }
  }
  
  // Extract urban parameters
  const parameters = ['altura máxima', 'taxa de ocupação', 'índice de aproveitamento', 'recuo'];
  for (const param of parameters) {
    if (text.toLowerCase().includes(param)) {
      keywords.push(param);
    }
  }
  
  // Remove duplicates and limit to 10 keywords
  return [...new Set(keywords)].slice(0, 10);
}

async function verifyProcessing() {
  console.log(chalk.cyan('\n🔍 Verifying processed documents...'));
  
  try {
    // Count documents by source file
    const { data: stats } = await supabase
      .from('document_sections')
      .select('metadata')
      .in('metadata->document_type', ['luos', 'plano_diretor', 'objetivos', 'qa_knowledge']);
    
    if (stats) {
      const fileStats = {};
      stats.forEach(row => {
        const sourceFile = row.metadata?.source_file;
        if (sourceFile) {
          fileStats[sourceFile] = (fileStats[sourceFile] || 0) + 1;
        }
      });
      
      console.log(chalk.green('\n📊 Documents in database:'));
      Object.entries(fileStats).forEach(([file, count]) => {
        console.log(chalk.gray(`   ${file}: ${count} chunks`));
      });
    }
    
    // Test a sample query
    console.log(chalk.cyan('\n🧪 Testing document search...'));
    
    const testQuery = 'O que é o Plano Diretor de Porto Alegre?';
    const queryEmbedding = await generateEmbedding(testQuery);
    
    const { data: results } = await supabase.rpc('match_document_sections', {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: 3
    });
    
    if (results && results.length > 0) {
      console.log(chalk.green(`✅ Found ${results.length} relevant chunks`));
      results.forEach((result, i) => {
        const source = result.metadata?.source_file || 'Unknown';
        console.log(chalk.gray(`   ${i + 1}. ${source} (similarity: ${result.similarity.toFixed(3)})`));
      });
    } else {
      console.log(chalk.yellow('⚠️ No matching documents found'));
    }
    
  } catch (error) {
    console.error(chalk.red(`❌ Verification error: ${error.message}`));
  }
}

async function main() {
  console.log(chalk.cyan.bold('\n📚 Processing DOCX Knowledge Base\n'));
  console.log(chalk.gray(`Processing ${documentFiles.length} documents...\n`));
  
  let totalSuccess = 0;
  let totalFailed = 0;
  
  for (const filePath of documentFiles) {
    const fullPath = path.join(process.cwd(), filePath);
    
    // Check if file exists
    try {
      await fs.access(fullPath);
    } catch {
      console.log(chalk.red(`❌ File not found: ${filePath}`));
      totalFailed++;
      continue;
    }
    
    const result = await processDocument(fullPath);
    totalSuccess += result.success;
    totalFailed += result.failed;
  }
  
  console.log(chalk.cyan('\n📊 Processing Summary:'));
  console.log(chalk.green(`✅ Successfully processed: ${totalSuccess} chunks`));
  if (totalFailed > 0) {
    console.log(chalk.red(`❌ Failed: ${totalFailed} chunks`));
  }
  
  // Verify processing
  await verifyProcessing();
  
  console.log(chalk.cyan.bold('\n✨ Document processing complete!\n'));
  console.log(chalk.gray('Run `node scripts/test-rag-quality.mjs` to test the improvements.'));
}

// Check if mammoth is installed
async function checkDependencies() {
  try {
    await import('mammoth');
  } catch {
    console.log('Installing mammoth for DOCX processing...');
    const { exec } = await import('child_process');
    await new Promise((resolve) => {
      exec('npm install mammoth', (error) => {
        if (error) console.error('Error installing:', error);
        resolve();
      });
    });
  }
}

checkDependencies().then(() => main()).catch(console.error);