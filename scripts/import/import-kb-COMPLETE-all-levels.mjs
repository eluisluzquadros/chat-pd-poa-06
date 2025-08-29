#!/usr/bin/env node

/**
 * Script COMPLETO para importar TODOS os níveis hierárquicos
 * da knowledge_base_complete para o Supabase
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
  luos: {
    artigos: 0,
    capitulos: 0,
    secoes: 0,
    titulos: 0,
    partes: 0,
    hierarquico: 0,
    total: 0,
    imported: 0,
    errors: 0
  },
  pdus: {
    artigos: 0,
    capitulos: 0,
    secoes: 0,
    titulos: 0,
    partes: 0,
    hierarquico: 0,
    total: 0,
    imported: 0,
    errors: 0
  },
  regime: {
    bairros: 0,
    zonas: 0,
    hierarquicos: 0,
    total: 0,
    imported: 0,
    errors: 0
  },
  qa: {
    respostas: 0,
    categorias: 0,
    total: 0,
    imported: 0,
    errors: 0
  }
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
 * Extract keywords from content
 */
function extractKeywords(content, additionalKeywords = []) {
  const keywords = [...additionalKeywords];
  
  // Extract important terms
  const terms = [
    'altura máxima', 'coeficiente', 'aproveitamento', 'zona', 'ZOT',
    'afastamento', 'recuo', 'taxa de permeabilidade', 'lote', 'testada',
    'edificação', 'construção', 'habitação', 'comercial', 'industrial',
    'uso do solo', 'ocupação', 'parcelamento', 'desmembramento',
    'área construída', 'pavimento', 'subsolo', 'garagem', 'estacionamento',
    'título', 'capítulo', 'seção', 'parte', 'artigo'
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
    keywords.push(...artMatches.slice(0, 5));
  }
  
  // Extract hierarchy references
  const titleMatches = content.match(/TÍTULO\s+[IVX]+/gi);
  if (titleMatches) {
    keywords.push(...titleMatches);
  }
  
  const chapterMatches = content.match(/CAPÍTULO\s+[IVX]+/gi);
  if (chapterMatches) {
    keywords.push(...chapterMatches);
  }
  
  return [...new Set(keywords)].slice(0, 10); // Remove duplicates and limit
}

/**
 * Import ALL juridical documents (LUOS and PDUS) - INCLUDING ALL HIERARCHY LEVELS
 */
async function importAllJuridicalDocuments() {
  console.log(chalk.blue('\n📚 Importing ALL Juridical Documents (all hierarchy levels)...'));
  
  const juridicosPath = path.join(KNOWLEDGE_BASE_PATH, 'chunks_juridicos');
  const batch = [];
  let articleCounter = 10000; // Start from 10000 for non-article elements
  
  // Process LUOS
  const luosPath = path.join(juridicosPath, 'PDPOA2025-Minuta_Preliminar_LUOS');
  console.log(chalk.gray('\nProcessing LUOS (all levels)...'));
  
  for await (const filePath of walkDirectory(luosPath)) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const fileName = path.basename(filePath);
      const relativePath = path.relative(luosPath, filePath).replace(/\\/g, '/');
      
      // Skip index and complete files
      if (fileName === 'index.md' || fileName.includes('completo')) continue;
      
      // Determine document type and number
      let documentType = 'LUOS';
      let articleNumber = null;
      let hierarchyLevel = 'document';
      let subType = null;
      
      // Check file type
      if (relativePath.includes('chunks_artigos')) {
        const artMatch = fileName.match(/art_(\d+)\.md/);
        if (artMatch) {
          articleNumber = parseInt(artMatch[1]);
          hierarchyLevel = 'article';
          stats.luos.artigos++;
        }
      } else if (relativePath.includes('chunks_capitulos')) {
        articleNumber = articleCounter++;
        hierarchyLevel = 'chapter';
        subType = 'CAPÍTULO';
        stats.luos.capitulos++;
      } else if (relativePath.includes('chunks_secoes')) {
        articleNumber = articleCounter++;
        hierarchyLevel = 'section';
        subType = 'SEÇÃO';
        stats.luos.secoes++;
      } else if (relativePath.includes('chunks_titulos')) {
        articleNumber = articleCounter++;
        hierarchyLevel = 'title';
        subType = 'TÍTULO';
        stats.luos.titulos++;
      } else if (relativePath.includes('chunks_partes')) {
        articleNumber = articleCounter++;
        hierarchyLevel = 'part';
        subType = 'PARTE';
        stats.luos.partes++;
      } else if (relativePath.includes('chunks_hierarquico')) {
        articleNumber = articleCounter++;
        hierarchyLevel = 'hierarchical';
        
        // Determine subtype from path
        if (relativePath.includes('titulo_')) subType = 'TÍTULO_HIERÁRQUICO';
        else if (relativePath.includes('capitulo_')) subType = 'CAPÍTULO_HIERÁRQUICO';
        else if (relativePath.includes('secao_')) subType = 'SEÇÃO_HIERÁRQUICA';
        else subType = 'HIERÁRQUICO';
        
        stats.luos.hierarquico++;
      } else {
        // Unknown type, skip
        continue;
      }
      
      // Extract keywords with hierarchy info
      const keywords = extractKeywords(content, [
        documentType,
        hierarchyLevel.toUpperCase(),
        subType
      ].filter(Boolean));
      
      batch.push({
        document_type: documentType,
        article_number: articleNumber,
        full_content: content,
        article_text: content,
        keywords: keywords
      });
      
      stats.luos.total++;
      
      // Insert batch if full
      if (batch.length >= BATCH_SIZE) {
        await insertLegalArticlesBatch(batch.splice(0), 'luos');
      }
    } catch (error) {
      console.error(chalk.red(`Error processing ${filePath}:`, error.message));
      stats.luos.errors++;
    }
  }
  
  // Process PDUS
  const pdusPath = path.join(juridicosPath, 'PDPOA2025-Minuta_Preliminar_PLANO_DIRETOR');
  console.log(chalk.gray('\nProcessing PDUS (all levels)...'));
  
  for await (const filePath of walkDirectory(pdusPath)) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const fileName = path.basename(filePath);
      const relativePath = path.relative(pdusPath, filePath).replace(/\\/g, '/');
      
      // Skip index and complete files
      if (fileName === 'index.md' || fileName.includes('completo')) continue;
      
      // Determine document type and number
      let documentType = 'PDUS';
      let articleNumber = null;
      let hierarchyLevel = 'document';
      let subType = null;
      
      // Check file type
      if (relativePath.includes('chunks_artigos')) {
        const artMatch = fileName.match(/art_(\d+)\.md/);
        if (artMatch) {
          articleNumber = parseInt(artMatch[1]);
          hierarchyLevel = 'article';
          stats.pdus.artigos++;
        }
      } else if (relativePath.includes('chunks_capitulos')) {
        articleNumber = articleCounter++;
        hierarchyLevel = 'chapter';
        subType = 'CAPÍTULO';
        stats.pdus.capitulos++;
      } else if (relativePath.includes('chunks_secoes')) {
        articleNumber = articleCounter++;
        hierarchyLevel = 'section';
        subType = 'SEÇÃO';
        stats.pdus.secoes++;
      } else if (relativePath.includes('chunks_titulos')) {
        articleNumber = articleCounter++;
        hierarchyLevel = 'title';
        subType = 'TÍTULO';
        stats.pdus.titulos++;
      } else if (relativePath.includes('chunks_partes')) {
        articleNumber = articleCounter++;
        hierarchyLevel = 'part';
        subType = 'PARTE';
        stats.pdus.partes++;
      } else if (relativePath.includes('chunks_hierarquico')) {
        articleNumber = articleCounter++;
        hierarchyLevel = 'hierarchical';
        
        // Determine subtype from path
        if (relativePath.includes('parte_')) subType = 'PARTE_HIERÁRQUICA';
        else if (relativePath.includes('titulo_')) subType = 'TÍTULO_HIERÁRQUICO';
        else if (relativePath.includes('capitulo_')) subType = 'CAPÍTULO_HIERÁRQUICO';
        else if (relativePath.includes('secao_')) subType = 'SEÇÃO_HIERÁRQUICA';
        else subType = 'HIERÁRQUICO';
        
        stats.pdus.hierarquico++;
      } else {
        // Unknown type, skip
        continue;
      }
      
      // Extract keywords with hierarchy info
      const keywords = extractKeywords(content, [
        documentType,
        hierarchyLevel.toUpperCase(),
        subType
      ].filter(Boolean));
      
      batch.push({
        document_type: documentType,
        article_number: articleNumber,
        full_content: content,
        article_text: content,
        keywords: keywords
      });
      
      stats.pdus.total++;
      
      // Insert batch if full
      if (batch.length >= BATCH_SIZE) {
        await insertLegalArticlesBatch(batch.splice(0), 'pdus');
      }
    } catch (error) {
      console.error(chalk.red(`Error processing ${filePath}:`, error.message));
      stats.pdus.errors++;
    }
  }
  
  // Insert remaining batch
  if (batch.length > 0) {
    await insertLegalArticlesBatch(batch, 'final');
  }
  
  console.log(chalk.green(`\n✓ LUOS: ${stats.luos.imported}/${stats.luos.total} imported`));
  console.log(chalk.green(`✓ PDUS: ${stats.pdus.imported}/${stats.pdus.total} imported`));
}

/**
 * Import ALL regime urbanístico data
 */
async function importAllRegimeUrbanistico() {
  console.log(chalk.blue('\n🏗️ Importing ALL Regime Urbanístico...'));
  
  const regimePath = path.join(KNOWLEDGE_BASE_PATH, 'chunks_regime_urbanistico_consolidado');
  const batch = [];
  let articleCounter = 90000; // High numbers for regime data
  
  for await (const filePath of walkDirectory(regimePath)) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const fileName = path.basename(filePath);
      const relativePath = path.relative(regimePath, filePath).replace(/\\/g, '/');
      
      // Skip index and metadata files
      if (fileName === 'index.md' || fileName === 'metadados.json' || fileName.includes('completo')) continue;
      
      let subType = 'REGIME';
      const keywords = [];
      
      // Determine type and extract keywords
      if (relativePath.includes('chunks_bairros')) {
        subType = 'REGIME_BAIRRO';
        const neighborhood = fileName.replace('.md', '').replace(/-/g, ' ').toUpperCase();
        keywords.push(`BAIRRO_${neighborhood.replace(/\s+/g, '_')}`);
        stats.regime.bairros++;
      } else if (relativePath.includes('chunks_zonas')) {
        subType = 'REGIME_ZONA';
        const parts = fileName.replace('.md', '').split('_');
        if (parts.length > 0) {
          const neighborhood = parts[0].replace(/-/g, ' ').toUpperCase();
          keywords.push(`BAIRRO_${neighborhood.replace(/\s+/g, '_')}`);
        }
        if (parts.length > 1) {
          const zone = parts.slice(1).join('_').toUpperCase();
          keywords.push(`ZONA_${zone}`);
        }
        stats.regime.zonas++;
      } else if (relativePath.includes('chunks_hierarquicos')) {
        subType = 'REGIME_HIERÁRQUICO';
        
        // Extract neighborhood from path
        const pathParts = relativePath.split('/');
        if (pathParts.length > 1) {
          const neighborhood = pathParts[1].replace(/-/g, ' ').toUpperCase();
          keywords.push(`BAIRRO_${neighborhood.replace(/\s+/g, '_')}`);
          keywords.push(`HIERÁRQUICO_${neighborhood.replace(/\s+/g, '_')}`);
        }
        
        // Extract zone from filename if exists
        const zoneMatch = fileName.match(/zot[_-]?(\d+|[\w-]+)/i);
        if (zoneMatch) {
          keywords.push(`ZONA_${zoneMatch[1].toUpperCase()}`);
        }
        
        stats.regime.hierarquicos++;
      }
      
      // Add more keywords from content
      const additionalKeywords = extractKeywords(content, keywords);
      
      batch.push({
        document_type: 'REGIME_FALLBACK',
        article_number: articleCounter++,
        full_content: `[${subType}]\n${content}`,
        article_text: content,
        keywords: additionalKeywords.slice(0, 10)
      });
      
      stats.regime.total++;
      
      // Insert batch if full
      if (batch.length >= BATCH_SIZE) {
        await insertLegalArticlesBatch(batch.splice(0), 'regime');
      }
    } catch (error) {
      console.error(chalk.red(`Error processing ${filePath}:`, error.message));
      stats.regime.errors++;
    }
  }
  
  // Insert remaining batch
  if (batch.length > 0) {
    await insertLegalArticlesBatch(batch, 'regime_final');
  }
  
  console.log(chalk.green(`✓ Regime: ${stats.regime.imported}/${stats.regime.total} imported`));
}

/**
 * Import ALL QA knowledge including categories
 */
async function importAllQAKnowledge() {
  console.log(chalk.blue('\n❓ Importing ALL QA Knowledge...'));
  
  const qaPath = path.join(KNOWLEDGE_BASE_PATH, 'chunks_qa');
  const testCases = [];
  const categoryArticles = [];
  let articleCounter = 95000; // High numbers for QA categories
  
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
      
      // Extract main content
      const contentStart = lines.findIndex(l => l.trim() === '' && lines.indexOf(l) > 5);
      const mainContent = contentStart > 0 ? 
        lines.slice(contentStart).join('\n').trim() : 
        content;
      
      // Determine if SQL related
      const isSqlRelated = category.includes('sql') || 
                          tags.some(t => t.toLowerCase().includes('sql')) ||
                          mainContent.toLowerCase().includes('select ');
      
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
      
      stats.qa.respostas++;
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
      
      // Store as special article for searchability
      categoryArticles.push({
        document_type: 'QA_CATEGORY',
        article_number: articleCounter++,
        full_content: `[CATEGORIA QA: ${category}]\n${content}`,
        article_text: content,
        keywords: ['QA_CATEGORIA', `CATEGORIA_${category.toUpperCase()}`, ...extractKeywords(content)]
      });
      
      stats.qa.categorias++;
    } catch (error) {
      console.error(chalk.red(`Error processing ${filePath}:`, error.message));
      stats.qa.errors++;
    }
  }
  
  stats.qa.total = stats.qa.respostas + stats.qa.categorias;
  
  // Insert test cases
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
      }
    }
  }
  
  // Insert category articles
  if (categoryArticles.length > 0) {
    console.log(chalk.gray(`Inserting ${categoryArticles.length} QA category articles...`));
    await insertLegalArticlesBatch(categoryArticles, 'qa_categories');
  }
  
  console.log(chalk.green(`✓ QA: ${stats.qa.imported}/${stats.qa.total} imported`));
}

/**
 * Insert batch of legal articles
 */
async function insertLegalArticlesBatch(batch, type) {
  const { error } = await supabase
    .from('legal_articles')
    .upsert(batch, { 
      onConflict: 'document_type,article_number',
      ignoreDuplicates: false 
    });
  
  if (error) {
    console.error(chalk.red(`Batch insert error (${type}):`, error.message));
    
    // Update error stats based on type
    if (type.includes('luos')) stats.luos.errors += batch.length;
    else if (type.includes('pdus')) stats.pdus.errors += batch.length;
    else if (type.includes('regime')) stats.regime.errors += batch.length;
    else if (type.includes('qa')) stats.qa.errors += batch.length;
  } else {
    console.log(chalk.gray(`  ✓ Inserted ${batch.length} ${type} records`));
    
    // Update success stats
    if (type.includes('luos')) stats.luos.imported += batch.length;
    else if (type.includes('pdus')) stats.pdus.imported += batch.length;
    else if (type.includes('regime')) stats.regime.imported += batch.length;
    else if (type.includes('qa')) stats.qa.imported += batch.length;
  }
}

/**
 * Clear existing imported data
 */
async function clearExistingData() {
  console.log(chalk.yellow('\n🗑️ Clearing existing imported data...'));
  
  // Clear hierarchical juridical documents
  await supabase
    .from('legal_articles')
    .delete()
    .gte('article_number', 10000);
  
  // Clear regime fallback
  await supabase
    .from('legal_articles')
    .delete()
    .eq('document_type', 'REGIME_FALLBACK');
  
  // Clear QA categories
  await supabase
    .from('legal_articles')
    .delete()
    .eq('document_type', 'QA_CATEGORY');
  
  // Clear imported QA test cases
  await supabase
    .from('qa_test_cases')
    .delete()
    .like('test_id', 'kb_%');
  
  console.log(chalk.green('✓ Existing data cleared'));
}

/**
 * Main execution
 */
async function main() {
  console.log(chalk.bold.cyan('\n🚀 COMPLETE Knowledge Base Import (ALL Hierarchy Levels)\n'));
  console.log(chalk.gray('Importing ALL 1907 files from knowledge_base_complete\n'));
  
  // Check service role key
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(chalk.red('❌ SUPABASE_SERVICE_ROLE_KEY not found in .env'));
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
  
  console.log(chalk.green('✓ Connected to Supabase'));
  
  try {
    // Clear if requested
    if (process.argv.includes('--clear')) {
      await clearExistingData();
    }
    
    // Import everything
    await importAllJuridicalDocuments();
    await importAllRegimeUrbanistico();
    await importAllQAKnowledge();
    
    // Print detailed summary
    console.log(chalk.bold.cyan('\n' + '='.repeat(60)));
    console.log(chalk.bold.cyan('📊 DETAILED IMPORT SUMMARY'));
    console.log(chalk.bold.cyan('='.repeat(60) + '\n'));
    
    console.log(chalk.white('📚 LUOS Documents:'));
    console.log(chalk.gray(`  Artigos: ${stats.luos.artigos}`));
    console.log(chalk.gray(`  Capítulos: ${stats.luos.capitulos}`));
    console.log(chalk.gray(`  Seções: ${stats.luos.secoes}`));
    console.log(chalk.gray(`  Títulos: ${stats.luos.titulos}`));
    console.log(chalk.gray(`  Partes: ${stats.luos.partes}`));
    console.log(chalk.gray(`  Hierárquico: ${stats.luos.hierarquico}`));
    console.log(chalk.green(`  Total: ${stats.luos.imported}/${stats.luos.total} imported`));
    if (stats.luos.errors > 0) console.log(chalk.red(`  Errors: ${stats.luos.errors}`));
    
    console.log(chalk.white('\n📚 PDUS Documents:'));
    console.log(chalk.gray(`  Artigos: ${stats.pdus.artigos}`));
    console.log(chalk.gray(`  Capítulos: ${stats.pdus.capitulos}`));
    console.log(chalk.gray(`  Seções: ${stats.pdus.secoes}`));
    console.log(chalk.gray(`  Títulos: ${stats.pdus.titulos}`));
    console.log(chalk.gray(`  Partes: ${stats.pdus.partes}`));
    console.log(chalk.gray(`  Hierárquico: ${stats.pdus.hierarquico}`));
    console.log(chalk.green(`  Total: ${stats.pdus.imported}/${stats.pdus.total} imported`));
    if (stats.pdus.errors > 0) console.log(chalk.red(`  Errors: ${stats.pdus.errors}`));
    
    console.log(chalk.white('\n🏗️ Regime Urbanístico:'));
    console.log(chalk.gray(`  Bairros: ${stats.regime.bairros}`));
    console.log(chalk.gray(`  Zonas: ${stats.regime.zonas}`));
    console.log(chalk.gray(`  Hierárquicos: ${stats.regime.hierarquicos}`));
    console.log(chalk.green(`  Total: ${stats.regime.imported}/${stats.regime.total} imported`));
    if (stats.regime.errors > 0) console.log(chalk.red(`  Errors: ${stats.regime.errors}`));
    
    console.log(chalk.white('\n❓ QA Knowledge:'));
    console.log(chalk.gray(`  Respostas: ${stats.qa.respostas}`));
    console.log(chalk.gray(`  Categorias: ${stats.qa.categorias}`));
    console.log(chalk.green(`  Total: ${stats.qa.imported}/${stats.qa.total} imported`));
    if (stats.qa.errors > 0) console.log(chalk.red(`  Errors: ${stats.qa.errors}`));
    
    // Grand total
    const grandTotal = stats.luos.total + stats.pdus.total + stats.regime.total + stats.qa.total;
    const grandImported = stats.luos.imported + stats.pdus.imported + stats.regime.imported + stats.qa.imported;
    const grandErrors = stats.luos.errors + stats.pdus.errors + stats.regime.errors + stats.qa.errors;
    
    console.log(chalk.bold.cyan('\n' + '='.repeat(60)));
    console.log(chalk.bold.green(`🎯 GRAND TOTAL: ${grandImported}/${grandTotal} files imported`));
    if (grandErrors > 0) console.log(chalk.bold.red(`⚠️ Total Errors: ${grandErrors}`));
    console.log(chalk.bold.cyan('='.repeat(60) + '\n'));
    
    // Success message
    if (grandImported === grandTotal) {
      console.log(chalk.bold.green('✨ PERFECT! All files imported successfully!'));
    } else if (grandImported > 0) {
      console.log(chalk.bold.yellow(`⚠️ Partial import: ${grandTotal - grandImported} files were not imported`));
    }
    
    console.log(chalk.yellow('\nNext steps:'));
    console.log(chalk.gray('1. Test with: npm run test:qa'));
    console.log(chalk.gray('2. The agentic-rag function will now use ALL hierarchy levels'));
    console.log(chalk.gray('3. Monitor at /admin/metrics'));
    
  } catch (error) {
    console.error(chalk.red('\n❌ Import failed:', error));
    process.exit(1);
  }
}

// Execute
main();