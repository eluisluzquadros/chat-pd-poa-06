#!/usr/bin/env node

/**
 * Script para importar knowledge_base_complete para as tabelas EXISTENTES do Supabase
 * Adaptado para usar as colunas corretas das tabelas atuais
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import chalk from 'chalk';

// Load environment variables
dotenv.config({ path: '.env' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

const KNOWLEDGE_BASE_PATH = path.join(__dirname, '..', 'knowledge_base_complete');
const BATCH_SIZE = 50;

// Statistics
const stats = {
  juridicos: { total: 0, imported: 0, errors: 0 },
  qa: { total: 0, imported: 0, errors: 0 }
};

/**
 * Walk directory recursively to find .md files
 */
async function* walkDirectory(dir) {
  try {
    const dirents = await fs.readdir(dir, { withFileTypes: true });
    for (const dirent of dirents) {
      const res = path.resolve(dir, dirent.name);
      if (dirent.isDirectory()) {
        yield* walkDirectory(res);
      } else if (dirent.name.endsWith('.md')) {
        yield res;
      }
    }
  } catch (error) {
    console.error(chalk.red(`Error reading directory ${dir}:`, error.message));
  }
}

/**
 * Import juridical documents into legal_articles table
 * Using EXISTING columns: document_type, article_number, full_content, article_text, keywords
 */
async function importJuridicalDocuments() {
  console.log(chalk.blue('\n📚 Importing Juridical Documents to legal_articles...'));
  
  const juridicosPath = path.join(KNOWLEDGE_BASE_PATH, 'chunks_juridicos');
  const batch = [];
  
  // Process LUOS documents
  const luosPath = path.join(juridicosPath, 'PDPOA2025-Minuta_Preliminar_LUOS');
  console.log(chalk.gray('Processing LUOS documents...'));
  
  for await (const filePath of walkDirectory(luosPath)) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const fileName = path.basename(filePath);
      const relativePath = path.relative(luosPath, filePath).replace(/\\/g, '/');
      
      // Skip index files and complete files
      if (fileName === 'index.md' || fileName.includes('completo')) continue;
      
      // Only process article files
      const artMatch = fileName.match(/art_(\d+)\.md/);
      if (!artMatch) continue;
      
      const articleNumber = parseInt(artMatch[1]);
      
      // Extract title from content
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : `Artigo ${articleNumber}`;
      
      // Extract keywords from content
      const keywords = extractKeywords(content);
      
      batch.push({
        document_type: 'LUOS',
        article_number: articleNumber,
        full_content: content,
        article_text: content, // Duplicate for compatibility
        keywords: keywords
      });
      
      stats.juridicos.total++;
      
      // Insert batch if full
      if (batch.length >= BATCH_SIZE) {
        await insertLegalArticlesBatch(batch.splice(0));
      }
    } catch (error) {
      console.error(chalk.red(`Error processing ${filePath}:`, error.message));
      stats.juridicos.errors++;
    }
  }
  
  // Process PDUS documents
  const pdusPath = path.join(juridicosPath, 'PDPOA2025-Minuta_Preliminar_PLANO_DIRETOR');
  console.log(chalk.gray('Processing PDUS documents...'));
  
  for await (const filePath of walkDirectory(pdusPath)) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const fileName = path.basename(filePath);
      
      // Skip index files and complete files
      if (fileName === 'index.md' || fileName.includes('completo')) continue;
      
      // Only process article files
      const artMatch = fileName.match(/art_(\d+)\.md/);
      if (!artMatch) continue;
      
      const articleNumber = parseInt(artMatch[1]);
      
      // Extract keywords from content
      const keywords = extractKeywords(content);
      
      batch.push({
        document_type: 'PDUS',
        article_number: articleNumber,
        full_content: content,
        article_text: content, // Duplicate for compatibility
        keywords: keywords
      });
      
      stats.juridicos.total++;
      
      // Insert batch if full
      if (batch.length >= BATCH_SIZE) {
        await insertLegalArticlesBatch(batch.splice(0));
      }
    } catch (error) {
      console.error(chalk.red(`Error processing ${filePath}:`, error.message));
      stats.juridicos.errors++;
    }
  }
  
  // Insert remaining batch
  if (batch.length > 0) {
    await insertLegalArticlesBatch(batch);
  }
  
  console.log(chalk.green(`✓ Juridical documents: ${stats.juridicos.imported} imported, ${stats.juridicos.errors} errors`));
}

/**
 * Extract keywords from content
 */
function extractKeywords(content) {
  const keywords = [];
  
  // Extract important terms
  const terms = [
    'altura máxima', 'coeficiente', 'aproveitamento', 'zona', 'ZOT',
    'afastamento', 'recuo', 'taxa de permeabilidade', 'lote', 'testada',
    'edificação', 'construção', 'habitação', 'comercial', 'industrial',
    'uso do solo', 'ocupação', 'parcelamento', 'desmembramento',
    'área construída', 'pavimento', 'subsolo', 'garagem', 'estacionamento'
  ];
  
  const contentLower = content.toLowerCase();
  terms.forEach(term => {
    if (contentLower.includes(term)) {
      keywords.push(term);
    }
  });
  
  // Extract ZOT numbers
  const zotMatches = content.match(/ZOT[\s-]?\d+/gi);
  if (zotMatches) {
    keywords.push(...zotMatches.map(z => z.toUpperCase()));
  }
  
  // Extract article references
  const artMatches = content.match(/art(?:igo)?\.?\s*\d+/gi);
  if (artMatches) {
    keywords.push(...artMatches.slice(0, 5)); // Limit to 5 references
  }
  
  return keywords.slice(0, 10); // PostgreSQL array limit
}

/**
 * Insert batch of legal articles
 */
async function insertLegalArticlesBatch(batch) {
  const { error } = await supabase
    .from('legal_articles')
    .upsert(batch, { 
      onConflict: 'document_type,article_number',
      ignoreDuplicates: false 
    });
  
  if (error) {
    console.error(chalk.red('Batch insert error:', error.message));
    stats.juridicos.errors += batch.length;
  } else {
    stats.juridicos.imported += batch.length;
    console.log(chalk.gray(`  Inserted ${batch.length} legal articles`));
  }
}

/**
 * Import QA knowledge base into qa_test_cases
 * Using EXISTING columns: id, query, expected_answer, category, difficulty, tags, etc.
 */
async function importQAKnowledgeBase() {
  console.log(chalk.blue('\n❓ Importing QA Knowledge Base...'));
  
  const qaPath = path.join(KNOWLEDGE_BASE_PATH, 'chunks_qa');
  const testCases = [];
  
  // Process response files
  const respostasPath = path.join(qaPath, 'chunks_respostas_pdpoa');
  console.log(chalk.gray('Processing QA responses...'));
  
  for await (const filePath of walkDirectory(respostasPath)) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const fileName = path.basename(filePath);
      
      // Extract ID and category from filename
      const match = fileName.match(/resposta_(\d+)_(.+)\.md/);
      if (!match) continue;
      
      const [, id, categoryRaw] = match;
      const category = categoryRaw.replace(/-/g, '_');
      
      // Extract metadata from content
      const lines = content.split('\n');
      const tagsLine = lines.find(l => l.includes('**Tags:**'));
      const difficultyLine = lines.find(l => l.includes('**Dificuldade:**'));
      
      const tags = tagsLine ? 
        tagsLine.replace('**Tags:**', '').trim().split(',').map(t => t.trim()) : 
        [category];
      
      const difficulty = difficultyLine ? 
        difficultyLine.replace('**Dificuldade:**', '').trim() : 
        'medium';
      
      // Extract main content (skip metadata lines)
      const contentStart = lines.findIndex(l => l.trim() === '' && lines.indexOf(l) > 5);
      const mainContent = contentStart > 0 ? 
        lines.slice(contentStart).join('\n').trim() : 
        content;
      
      // Determine if it's SQL related
      const isSqlRelated = category.includes('sql') || 
                          tags.some(t => t.toLowerCase().includes('sql')) ||
                          mainContent.toLowerCase().includes('select ');
      
      // Create test case
      testCases.push({
        id: parseInt(id),
        test_id: `kb_${id}`,
        query: `Pergunta sobre ${category.replace(/_/g, ' ')}`,
        question: `Caso de teste #${id} - ${category.replace(/_/g, ' ')}`,
        expected_answer: mainContent,
        expected_keywords: extractKeywords(mainContent).slice(0, 5),
        category,
        difficulty,
        tags,
        is_sql_related: isSqlRelated,
        sql_complexity: isSqlRelated ? 'medium' : null,
        complexity: difficulty === 'high' ? 'complex' : difficulty === 'medium' ? 'medium' : 'simple',
        min_response_length: mainContent.length > 500 ? 200 : 100,
        is_active: true,
        version: 1
      });
      
      stats.qa.total++;
    } catch (error) {
      console.error(chalk.red(`Error processing ${filePath}:`, error.message));
      stats.qa.errors++;
    }
  }
  
  // Insert test cases in batches
  if (testCases.length > 0) {
    console.log(chalk.gray(`Inserting ${testCases.length} QA test cases...`));
    
    for (let i = 0; i < testCases.length; i += BATCH_SIZE) {
      const batch = testCases.slice(i, i + BATCH_SIZE);
      
      const { error } = await supabase
        .from('qa_test_cases')
        .upsert(batch, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        });
      
      if (error) {
        console.error(chalk.red('Error inserting test cases:', error.message));
        stats.qa.errors += batch.length;
      } else {
        stats.qa.imported += batch.length;
        console.log(chalk.gray(`  Inserted ${batch.length} test cases`));
      }
    }
  }
  
  console.log(chalk.green(`✓ QA Knowledge Base: ${stats.qa.imported} imported, ${stats.qa.errors} errors`));
}

/**
 * Store regime urbanístico as fallback in a new table
 * Since we can't modify regime_urbanistico_consolidado structure easily
 */
async function createRegimeFallbackTable() {
  console.log(chalk.blue('\n🏗️ Creating regime_fallback table for chunks...'));
  
  // Create table if not exists
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS regime_fallback (
      id SERIAL PRIMARY KEY,
      bairro TEXT,
      zona TEXT,
      content TEXT,
      source_type TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_regime_fallback_bairro ON regime_fallback(bairro);
    CREATE INDEX IF NOT EXISTS idx_regime_fallback_zona ON regime_fallback(zona);
  `;
  
  // Note: This would need to be run via Supabase SQL editor
  console.log(chalk.yellow('Please run the following SQL in Supabase SQL editor:'));
  console.log(chalk.gray(createTableSQL));
  
  // For now, we'll store regime data in legal_articles with special article numbers
  await importRegimeAsLegalArticles();
}

/**
 * Import regime urbanístico as special legal articles (workaround)
 */
async function importRegimeAsLegalArticles() {
  console.log(chalk.blue('\n🏗️ Importing Regime Urbanístico as special legal articles...'));
  
  const regimePath = path.join(KNOWLEDGE_BASE_PATH, 'chunks_regime_urbanistico_consolidado');
  const batch = [];
  let articleCounter = 90000; // Use high numbers to avoid conflicts
  
  // Process all regime files
  for await (const filePath of walkDirectory(regimePath)) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const fileName = path.basename(filePath);
      const relativePath = path.relative(regimePath, filePath).replace(/\\/g, '/');
      
      // Skip index and metadata files
      if (fileName === 'index.md' || fileName === 'metadados.json') continue;
      
      // Extract keywords
      const keywords = extractKeywords(content);
      
      // Add neighborhood/zone info to keywords
      if (relativePath.includes('chunks_bairros')) {
        const neighborhood = fileName.replace('.md', '').replace(/-/g, ' ');
        keywords.unshift(`BAIRRO_${neighborhood.toUpperCase()}`);
      } else if (relativePath.includes('chunks_zonas')) {
        const parts = fileName.replace('.md', '').split('_');
        if (parts.length > 1) {
          keywords.unshift(`ZONA_${parts[1].toUpperCase()}`);
          keywords.unshift(`BAIRRO_${parts[0].replace(/-/g, ' ').toUpperCase()}`);
        }
      }
      
      batch.push({
        document_type: 'REGIME_FALLBACK',
        article_number: articleCounter++,
        full_content: `[REGIME URBANÍSTICO - FALLBACK]\n${content}`,
        article_text: content,
        keywords: keywords.slice(0, 10)
      });
      
      // Insert batch if full
      if (batch.length >= BATCH_SIZE) {
        const { error } = await supabase
          .from('legal_articles')
          .insert(batch);
        
        if (error) {
          console.error(chalk.red('Error inserting regime batch:', error.message));
        } else {
          console.log(chalk.gray(`  Inserted ${batch.length} regime fallback articles`));
        }
        batch.length = 0;
      }
    } catch (error) {
      console.error(chalk.red(`Error processing ${filePath}:`, error.message));
    }
  }
  
  // Insert remaining batch
  if (batch.length > 0) {
    const { error } = await supabase
      .from('legal_articles')
      .insert(batch);
    
    if (error) {
      console.error(chalk.red('Error inserting final regime batch:', error.message));
    } else {
      console.log(chalk.gray(`  Inserted ${batch.length} regime fallback articles`));
    }
  }
  
  console.log(chalk.green('✓ Regime urbanístico imported as fallback'));
}

/**
 * Main execution
 */
async function main() {
  console.log(chalk.bold.cyan('\n🚀 Knowledge Base Import (Adapted for Existing Tables)\n'));
  console.log(chalk.gray('Importing knowledge_base_complete to existing Supabase tables\n'));
  
  // Check service role key
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(chalk.red('❌ SUPABASE_SERVICE_ROLE_KEY not found in .env'));
    console.log(chalk.yellow('Please add your service role key to .env'));
    process.exit(1);
  }
  
  // Test connection
  const { error: testError } = await supabase
    .from('legal_articles')
    .select('count')
    .limit(1)
    .single();
  
  if (testError && testError.code !== 'PGRST116') {
    console.error(chalk.red('❌ Cannot connect to Supabase:', testError.message));
    process.exit(1);
  }
  
  console.log(chalk.green('✓ Connected to Supabase\n'));
  
  try {
    // Clear existing imported data if flag is set
    if (process.argv.includes('--clear')) {
      console.log(chalk.yellow('🗑️ Clearing existing imported data...'));
      
      // Clear PDUS/LUOS articles with numbers > 1000 (likely imported)
      await supabase
        .from('legal_articles')
        .delete()
        .in('document_type', ['PDUS', 'LUOS'])
        .gt('article_number', 1000);
      
      // Clear regime fallback articles
      await supabase
        .from('legal_articles')
        .delete()
        .eq('document_type', 'REGIME_FALLBACK');
      
      // Clear QA test cases with IDs > 1000
      await supabase
        .from('qa_test_cases')
        .delete()
        .gt('id', 1000);
      
      console.log(chalk.green('✓ Existing data cleared\n'));
    }
    
    // Import all data
    await importJuridicalDocuments();
    await importQAKnowledgeBase();
    await importRegimeAsLegalArticles();
    
    // Print summary
    console.log(chalk.bold.cyan('\n📊 Import Summary\n'));
    
    console.log(chalk.white('Juridical Documents:'));
    console.log(chalk.gray(`  Total: ${stats.juridicos.total}`));
    console.log(chalk.green(`  Imported: ${stats.juridicos.imported}`));
    if (stats.juridicos.errors > 0) console.log(chalk.red(`  Errors: ${stats.juridicos.errors}`));
    
    console.log(chalk.white('\nQA Knowledge Base:'));
    console.log(chalk.gray(`  Total: ${stats.qa.total}`));
    console.log(chalk.green(`  Imported: ${stats.qa.imported}`));
    if (stats.qa.errors > 0) console.log(chalk.red(`  Errors: ${stats.qa.errors}`));
    
    const totalImported = stats.juridicos.imported + stats.qa.imported;
    const totalErrors = stats.juridicos.errors + stats.qa.errors;
    
    console.log(chalk.bold.cyan(`\n✨ Import complete! ${totalImported} items imported, ${totalErrors} errors\n`));
    
    // Next steps
    console.log(chalk.yellow('Next steps:'));
    console.log(chalk.gray('1. Test queries with: npm run test:qa'));
    console.log(chalk.gray('2. The agentic-rag function will automatically use the new data'));
    console.log(chalk.gray('3. Regime data is stored as REGIME_FALLBACK in legal_articles'));
    console.log(chalk.gray('4. Monitor performance at /admin/metrics'));
    
  } catch (error) {
    console.error(chalk.red('\n❌ Import failed:', error));
    process.exit(1);
  }
}

// Execute
main();