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

async function generateEmbedding(text) {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-ada-002',
      input: text.substring(0, 8000), // Limit input size
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

async function processDocumentFast(filePath) {
  const fileName = path.basename(filePath);
  console.log(chalk.yellow(`\nProcessing: ${fileName}`));
  
  try {
    // Extract text from DOCX
    const buffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer });
    const fullText = result.value;
    
    if (!fullText || fullText.length < 100) {
      console.log(chalk.red(`❌ ${fileName}: Empty or too short`));
      return 0;
    }
    
    // Process only first 10,000 characters for speed (most important content)
    const importantText = fullText.substring(0, 10000);
    
    // Create larger chunks (3000 chars) for faster processing
    const chunkSize = 3000;
    const chunks = [];
    for (let i = 0; i < importantText.length; i += chunkSize - 500) { // 500 char overlap
      chunks.push(importantText.substring(i, i + chunkSize));
    }
    
    console.log(chalk.gray(`  Creating ${chunks.length} chunks...`));
    
    // Process chunks in parallel batches
    const batchSize = 3;
    let processed = 0;
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, Math.min(i + batchSize, chunks.length));
      
      await Promise.all(batch.map(async (chunk, idx) => {
        try {
          const embedding = await generateEmbedding(chunk);
          
          const metadata = {
            source_file: fileName,
            document_type: fileName.includes('LUOS') ? 'luos' : 
                          fileName.includes('PLANO_DIRETOR') ? 'plano_diretor' : 
                          fileName.includes('QA') ? 'qa_knowledge' : 'general',
            chunk_index: i + idx,
            processing_date: new Date().toISOString()
          };
          
          await supabase.from('document_sections').insert({
            content: chunk,
            embedding: embedding,
            metadata: metadata
          });
          
          processed++;
        } catch (error) {
          console.log(chalk.red(`  Error: ${error.message}`));
        }
      }));
      
      console.log(chalk.gray(`  Progress: ${processed}/${chunks.length} chunks`));
    }
    
    console.log(chalk.green(`✅ ${fileName}: ${processed} chunks added`));
    return processed;
    
  } catch (error) {
    console.log(chalk.red(`❌ ${fileName}: ${error.message}`));
    return 0;
  }
}

async function main() {
  console.log(chalk.cyan.bold('📚 Fast DOCX Processing\n'));
  
  const files = [
    'knowledgebase/PDPOA2025-Minuta_Preliminar_PLANO_DIRETOR.docx',
    'knowledgebase/PDPOA2025-Objetivos_Previstos.docx',
    'knowledgebase/PDPOA2025-QA.docx-2025-08-11.docx'
  ];
  
  let total = 0;
  
  for (const file of files) {
    const fullPath = path.join(process.cwd(), file);
    
    try {
      await fs.access(fullPath);
      const count = await processDocumentFast(fullPath);
      total += count;
    } catch {
      console.log(chalk.red(`❌ File not found: ${file}`));
    }
  }
  
  console.log(chalk.cyan(`\n📊 Total: ${total} chunks processed`));
  
  // Quick verification
  const { count } = await supabase
    .from('document_sections')
    .select('*', { count: 'exact', head: true });
  
  console.log(chalk.green(`✅ Total documents in database: ${count}`));
}

main().catch(console.error);