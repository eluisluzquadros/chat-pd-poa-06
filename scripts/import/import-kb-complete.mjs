#!/usr/bin/env node

/**
 * Script para importar toda a base de conhecimento do knowledge_base_complete
 * para o Supabase, incluindo chunks jurídicos, regime urbanístico e QA
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
  regime: { total: 0, imported: 0, errors: 0 },
  qa: { total: 0, imported: 0, errors: 0 },
  sections: { total: 0, imported: 0, errors: 0 }
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
 * Import juridical documents (LUOS and PDUS)
 */
async function importJuridicalDocuments() {
  console.log(chalk.blue('\n📚 Importing Juridical Documents...'));
  
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
      
      // Skip index files
      if (fileName === 'index.md') continue;
      
      // Extract article number if present
      let articleNumber = null;
      const artMatch = fileName.match(/art_(\d+)\.md/);
      if (artMatch) {
        articleNumber = parseInt(artMatch[1]);
      }
      
      // Extract title from content
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : fileName.replace('.md', '');
      
      // Determine hierarchy level
      let hierarchyLevel = 'document';
      if (relativePath.includes('chunks_artigos')) hierarchyLevel = 'article';
      else if (relativePath.includes('chunks_secoes')) hierarchyLevel = 'section';
      else if (relativePath.includes('chunks_capitulos')) hierarchyLevel = 'chapter';
      else if (relativePath.includes('chunks_titulos')) hierarchyLevel = 'title';
      else if (relativePath.includes('chunks_partes')) hierarchyLevel = 'part';
      else if (relativePath.includes('chunks_hierarquico')) hierarchyLevel = 'hierarchical';
      
      batch.push({
        source: 'LUOS',
        article_number: articleNumber,
        title,
        content,
        hierarchy_level: hierarchyLevel,
        metadata: {
          file_path: relativePath,
          imported_at: new Date().toISOString(),
          type: 'juridical'
        }
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
      const relativePath = path.relative(pdusPath, filePath).replace(/\\/g, '/');
      
      // Skip index files
      if (fileName === 'index.md') continue;
      
      // Extract article number if present
      let articleNumber = null;
      const artMatch = fileName.match(/art_(\d+)\.md/);
      if (artMatch) {
        articleNumber = parseInt(artMatch[1]);
      }
      
      // Extract title from content
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : fileName.replace('.md', '');
      
      // Determine hierarchy level
      let hierarchyLevel = 'document';
      if (relativePath.includes('chunks_artigos')) hierarchyLevel = 'article';
      else if (relativePath.includes('chunks_secoes')) hierarchyLevel = 'section';
      else if (relativePath.includes('chunks_capitulos')) hierarchyLevel = 'chapter';
      else if (relativePath.includes('chunks_titulos')) hierarchyLevel = 'title';
      else if (relativePath.includes('chunks_partes')) hierarchyLevel = 'part';
      else if (relativePath.includes('chunks_hierarquico')) hierarchyLevel = 'hierarchical';
      
      batch.push({
        source: 'PDUS',
        article_number: articleNumber,
        title,
        content,
        hierarchy_level: hierarchyLevel,
        metadata: {
          file_path: relativePath,
          imported_at: new Date().toISOString(),
          type: 'juridical'
        }
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
 * Insert batch of legal articles
 */
async function insertLegalArticlesBatch(batch) {
  const { error } = await supabase
    .from('legal_articles')
    .upsert(batch, { onConflict: 'source,article_number' });
  
  if (error) {
    console.error(chalk.red('Batch insert error:', error.message));
    stats.juridicos.errors += batch.length;
  } else {
    stats.juridicos.imported += batch.length;
    console.log(chalk.gray(`  Inserted ${batch.length} legal articles`));
  }
}

/**
 * Import regime urbanistico data
 */
async function importRegimeUrbanistico() {
  console.log(chalk.blue('\n🏗️ Importing Regime Urbanístico...'));
  
  const regimePath = path.join(KNOWLEDGE_BASE_PATH, 'chunks_regime_urbanistico_consolidado');
  const batch = [];
  
  // Process all regime files
  for await (const filePath of walkDirectory(regimePath)) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const fileName = path.basename(filePath);
      const relativePath = path.relative(regimePath, filePath).replace(/\\/g, '/');
      
      // Skip index and metadata files
      if (fileName === 'index.md' || fileName === 'metadados.json') continue;
      
      // Determine document type
      let documentType = 'regime_urbanistico';
      let zone = null;
      let neighborhood = null;
      
      if (relativePath.includes('chunks_bairros')) {
        documentType = 'regime_bairro';
        neighborhood = fileName.replace('.md', '').replace(/-/g, ' ').toUpperCase();
      } else if (relativePath.includes('chunks_zonas')) {
        documentType = 'regime_zona';
        const parts = fileName.replace('.md', '').split('_');
        neighborhood = parts[0].replace(/-/g, ' ').toUpperCase();
        zone = parts.slice(1).join('_').toUpperCase();
      } else if (relativePath.includes('chunks_hierarquicos')) {
        documentType = 'regime_hierarquico';
      }
      
      // Extract title
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : fileName.replace('.md', '').replace(/-/g, ' ');
      
      batch.push({
        title,
        content,
        document_type: documentType,
        hierarchy_level: 1,
        chunk_index: 0,
        section_path: relativePath,
        metadata: {
          type: 'regime_urbanistico',
          zone,
          neighborhood,
          original_file: fileName,
          use_as_fallback: true,
          imported_at: new Date().toISOString()
        }
      });
      
      stats.regime.total++;
      
      // Insert batch if full
      if (batch.length >= BATCH_SIZE) {
        await insertDocumentSectionsBatch(batch.splice(0), 'regime');
      }
    } catch (error) {
      console.error(chalk.red(`Error processing ${filePath}:`, error.message));
      stats.regime.errors++;
    }
  }
  
  // Insert remaining batch
  if (batch.length > 0) {
    await insertDocumentSectionsBatch(batch, 'regime');
  }
  
  console.log(chalk.green(`✓ Regime urbanístico: ${stats.regime.imported} imported, ${stats.regime.errors} errors`));
}

/**
 * Import QA knowledge base
 */
async function importQAKnowledgeBase() {
  console.log(chalk.blue('\n❓ Importing QA Knowledge Base...'));
  
  const qaPath = path.join(KNOWLEDGE_BASE_PATH, 'chunks_qa');
  const testCases = [];
  const sections = [];
  
  // Read metadata
  let metadata = {};
  try {
    const metadataPath = path.join(qaPath, 'pdpoa_qa_metadados.json');
    const metadataContent = await fs.readFile(metadataPath, 'utf-8');
    metadata = JSON.parse(metadataContent);
  } catch (error) {
    console.log(chalk.yellow('Warning: Could not read QA metadata'));
  }
  
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
      const categoryLine = lines.find(l => l.includes('**Categoria:**'));
      const tagsLine = lines.find(l => l.includes('**Tags:**'));
      const difficultyLine = lines.find(l => l.includes('**Dificuldade:**'));
      const originLine = lines.find(l => l.includes('**Origem:**'));
      
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
      
      // Create test case
      testCases.push({
        id: parseInt(id),
        category,
        question: `Pergunta relacionada a ${category.replace(/_/g, ' ')}`,
        expected_answer: mainContent,
        difficulty,
        tags,
        version: 1,
        metadata: {
          file_name: fileName,
          source: 'knowledge_base_complete',
          imported_at: new Date().toISOString()
        }
      });
      
      // Create document section for semantic search
      sections.push({
        title: `QA Response #${id} - ${category.replace(/_/g, ' ')}`,
        content: mainContent,
        document_type: 'qa_response',
        hierarchy_level: 1,
        chunk_index: parseInt(id),
        section_path: `chunks_qa/chunks_respostas_pdpoa/${fileName}`,
        metadata: {
          type: 'qa_knowledge',
          category,
          tags,
          difficulty,
          case_id: parseInt(id),
          is_complementary: true,
          imported_at: new Date().toISOString()
        }
      });
      
      stats.qa.total++;
    } catch (error) {
      console.error(chalk.red(`Error processing ${filePath}:`, error.message));
      stats.qa.errors++;
    }
  }
  
  // Process category files
  const categoriasPath = path.join(qaPath, 'chunks_categorias_pdpoa');
  console.log(chalk.gray('Processing QA categories...'));
  
  for await (const filePath of walkDirectory(categoriasPath)) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const fileName = path.basename(filePath);
      
      // Extract category from filename
      const category = fileName.replace('categoria_', '').replace('.md', '').replace(/-/g, '_');
      
      // Create document section
      sections.push({
        title: `QA Category - ${category.replace(/_/g, ' ')}`,
        content,
        document_type: 'qa_category',
        hierarchy_level: 1,
        chunk_index: 0,
        section_path: `chunks_qa/chunks_categorias_pdpoa/${fileName}`,
        metadata: {
          type: 'qa_knowledge',
          category,
          is_category_description: true,
          is_complementary: true,
          imported_at: new Date().toISOString()
        }
      });
      
      stats.sections.total++;
    } catch (error) {
      console.error(chalk.red(`Error processing ${filePath}:`, error.message));
      stats.sections.errors++;
    }
  }
  
  // Insert test cases
  if (testCases.length > 0) {
    console.log(chalk.gray(`Inserting ${testCases.length} QA test cases...`));
    
    for (let i = 0; i < testCases.length; i += BATCH_SIZE) {
      const batch = testCases.slice(i, i + BATCH_SIZE);
      
      const { error } = await supabase
        .from('qa_test_cases')
        .upsert(batch, { onConflict: 'id' });
      
      if (error) {
        console.error(chalk.red('Error inserting test cases:', error.message));
        stats.qa.errors += batch.length;
      } else {
        stats.qa.imported += batch.length;
      }
    }
  }
  
  // Insert document sections
  if (sections.length > 0) {
    console.log(chalk.gray(`Inserting ${sections.length} QA document sections...`));
    
    for (let i = 0; i < sections.length; i += BATCH_SIZE) {
      const batch = sections.slice(i, i + BATCH_SIZE);
      await insertDocumentSectionsBatch(batch, 'sections');
    }
  }
  
  console.log(chalk.green(`✓ QA Knowledge Base: ${stats.qa.imported} test cases, ${stats.sections.imported} sections imported`));
}

/**
 * Insert batch of document sections
 */
async function insertDocumentSectionsBatch(batch, type) {
  const { error } = await supabase
    .from('document_sections')
    .insert(batch);
  
  if (error) {
    console.error(chalk.red('Batch insert error:', error.message));
    stats[type].errors += batch.length;
  } else {
    stats[type].imported += batch.length;
    console.log(chalk.gray(`  Inserted ${batch.length} ${type} sections`));
  }
}

/**
 * Clear existing data (optional)
 */
async function clearExistingData() {
  console.log(chalk.yellow('\n🗑️ Clearing existing knowledge base data...'));
  
  // Clear document sections
  const { error: sectionsError } = await supabase
    .from('document_sections')
    .delete()
    .or('document_type.eq.regime_bairro,document_type.eq.regime_zona,document_type.eq.regime_hierarquico,document_type.eq.qa_response,document_type.eq.qa_category');
  
  if (sectionsError) {
    console.error(chalk.red('Error clearing document sections:', sectionsError.message));
  }
  
  console.log(chalk.green('✓ Existing data cleared'));
}

/**
 * Generate embeddings for new content
 */
async function generateEmbeddings() {
  console.log(chalk.blue('\n🧮 Generating embeddings...'));
  
  try {
    const { data, error } = await supabase.functions.invoke('generate-embeddings', {
      body: {
        tables: ['legal_articles', 'document_sections'],
        batch_size: 100
      }
    });
    
    if (error) {
      console.error(chalk.yellow('Warning: Could not generate embeddings:', error.message));
      console.log(chalk.yellow('You may need to run embedding generation separately'));
    } else {
      console.log(chalk.green('✓ Embedding generation initiated'));
    }
  } catch (error) {
    console.error(chalk.yellow('Warning: Embedding generation failed:', error.message));
  }
}

/**
 * Main execution
 */
async function main() {
  console.log(chalk.bold.cyan('\n🚀 Knowledge Base Complete Import\n'));
  console.log(chalk.gray('Importing all chunks from knowledge_base_complete to Supabase\n'));
  
  // Check service role key
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(chalk.red('❌ SUPABASE_SERVICE_ROLE_KEY not found in .env.local'));
    console.log(chalk.yellow('Please add your service role key to .env.local'));
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
    // Clear existing data if flag is set
    if (process.argv.includes('--clear')) {
      await clearExistingData();
    }
    
    // Import all data
    await importJuridicalDocuments();
    await importRegimeUrbanistico();
    await importQAKnowledgeBase();
    
    // Generate embeddings if flag is set
    if (process.argv.includes('--embeddings')) {
      await generateEmbeddings();
    }
    
    // Print summary
    console.log(chalk.bold.cyan('\n📊 Import Summary\n'));
    
    const total = {
      imported: stats.juridicos.imported + stats.regime.imported + stats.qa.imported + stats.sections.imported,
      errors: stats.juridicos.errors + stats.regime.errors + stats.qa.errors + stats.sections.errors,
      total: stats.juridicos.total + stats.regime.total + stats.qa.total + stats.sections.total
    };
    
    console.log(chalk.white('Juridical Documents:'));
    console.log(chalk.gray(`  Total: ${stats.juridicos.total}`));
    console.log(chalk.green(`  Imported: ${stats.juridicos.imported}`));
    if (stats.juridicos.errors > 0) console.log(chalk.red(`  Errors: ${stats.juridicos.errors}`));
    
    console.log(chalk.white('\nRegime Urbanístico:'));
    console.log(chalk.gray(`  Total: ${stats.regime.total}`));
    console.log(chalk.green(`  Imported: ${stats.regime.imported}`));
    if (stats.regime.errors > 0) console.log(chalk.red(`  Errors: ${stats.regime.errors}`));
    
    console.log(chalk.white('\nQA Knowledge Base:'));
    console.log(chalk.gray(`  Test Cases: ${stats.qa.total}`));
    console.log(chalk.green(`  Imported: ${stats.qa.imported}`));
    console.log(chalk.gray(`  Sections: ${stats.sections.total}`));
    console.log(chalk.green(`  Imported: ${stats.sections.imported}`));
    if (stats.qa.errors > 0) console.log(chalk.red(`  Errors: ${stats.qa.errors}`));
    
    console.log(chalk.bold.cyan(`\n✨ Import complete! ${total.imported}/${total.total} items imported\n`));
    
    // Next steps
    console.log(chalk.yellow('Next steps:'));
    console.log(chalk.gray('1. Run with --embeddings flag to generate vector embeddings'));
    console.log(chalk.gray('2. Test queries with: npm run test:qa'));
    console.log(chalk.gray('3. Update Edge Functions to use the new data'));
    console.log(chalk.gray('4. Monitor performance at /admin/metrics'));
    
  } catch (error) {
    console.error(chalk.red('\n❌ Import failed:', error));
    process.exit(1);
  }
}

// Execute
main();