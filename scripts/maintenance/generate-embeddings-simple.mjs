#!/usr/bin/env node

/**
 * Simple, robust embedding generation
 * Processes one by one with clear error handling
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error(chalk.red('❌ OPENAI_API_KEY not found in environment'));
  process.exit(1);
}

/**
 * Generate embedding using OpenAI API directly
 */
async function generateEmbedding(text) {
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: text.substring(0, 8000),
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error(chalk.red('OpenAI API error:', error));
      return null;
    }
    
    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error(chalk.red('Error generating embedding:', error.message));
    return null;
  }
}

/**
 * Main processing function
 */
async function processEmbeddings() {
  console.log(chalk.bold.cyan('\n🚀 GERAÇÃO DE EMBEDDINGS SIMPLES E ROBUSTA\n'));
  
  // Get count of articles without embeddings
  const { count: totalWithoutEmbeddings } = await supabase
    .from('legal_articles')
    .select('*', { count: 'exact', head: true })
    .is('embedding', null);
  
  console.log(chalk.blue(`📊 Artigos sem embeddings: ${totalWithoutEmbeddings}`));
  
  if (!totalWithoutEmbeddings || totalWithoutEmbeddings === 0) {
    console.log(chalk.green('✅ Todos os artigos já têm embeddings!'));
    return;
  }
  
  let processed = 0;
  let errors = 0;
  const startTime = Date.now();
  
  // Process in small batches to avoid timeouts
  const batchSize = 5;
  
  while (processed + errors < totalWithoutEmbeddings) {
    // Get next batch of articles without embeddings
    const { data: articles, error } = await supabase
      .from('legal_articles')
      .select('id, full_content, article_text, keywords, document_type, article_number')
      .is('embedding', null)
      .limit(batchSize);
    
    if (error || !articles || articles.length === 0) {
      console.log(chalk.yellow('No more articles to process'));
      break;
    }
    
    console.log(chalk.gray(`\nProcessing batch of ${articles.length} articles...`));
    
    // Process each article
    for (const article of articles) {
      // Prepare text for embedding
      const textParts = [
        `${article.document_type || ''} Article ${article.article_number || ''}`,
      ];
      
      if (article.keywords && Array.isArray(article.keywords)) {
        textParts.push(`Keywords: ${article.keywords.join(' ')}`);
      }
      
      textParts.push(article.full_content || article.article_text || '');
      
      const textForEmbedding = textParts.filter(t => t).join(' ').trim();
      
      if (!textForEmbedding) {
        console.log(chalk.yellow(`⚠️ Skipping article ${article.id} - no content`));
        errors++;
        continue;
      }
      
      // Generate embedding
      console.log(chalk.gray(`  Generating embedding for article ${article.id}...`));
      const embedding = await generateEmbedding(textForEmbedding);
      
      if (embedding && Array.isArray(embedding) && embedding.length === 1536) {
        // Update article with embedding (only update embedding column)
        const { error: updateError } = await supabase
          .from('legal_articles')
          .update({ 
            embedding: embedding
          })
          .eq('id', article.id);
        
        if (updateError) {
          console.error(chalk.red(`  ❌ Error updating article ${article.id}:`, updateError.message));
          errors++;
        } else {
          processed++;
          console.log(chalk.green(`  ✅ Article ${article.id} updated (${processed}/${totalWithoutEmbeddings})`));
        }
      } else {
        console.error(chalk.red(`  ❌ Invalid embedding for article ${article.id}`));
        errors++;
      }
      
      // Rate limiting - OpenAI allows 3000 RPM for embeddings
      await new Promise(resolve => setTimeout(resolve, 100)); // ~600 per minute
    }
    
    // Progress update
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = processed / elapsed;
    const remaining = totalWithoutEmbeddings - processed - errors;
    const eta = remaining / rate;
    
    console.log(chalk.cyan(`\n📊 Progress: ${processed}/${totalWithoutEmbeddings} (${errors} errors)`));
    console.log(chalk.gray(`⏱️ ETA: ${Math.ceil(eta / 60)} minutes`));
  }
  
  // Final report
  console.log(chalk.bold.cyan('\n' + '='.repeat(60)));
  console.log(chalk.bold.cyan('📊 RELATÓRIO FINAL'));
  console.log(chalk.bold.cyan('='.repeat(60)));
  
  console.log(chalk.green(`✅ Embeddings gerados: ${processed}`));
  if (errors > 0) {
    console.log(chalk.red(`❌ Erros: ${errors}`));
  }
  
  // Verify final state
  const { count: stillWithout } = await supabase
    .from('legal_articles')
    .select('*', { count: 'exact', head: true })
    .is('embedding', null);
  
  if (stillWithout > 0) {
    console.log(chalk.yellow(`⚠️ Ainda faltam: ${stillWithout} artigos`));
    console.log(chalk.gray('Execute novamente para processar os restantes'));
  } else {
    console.log(chalk.bold.green('\n🎉 TODOS os artigos agora têm embeddings!'));
  }
  
  // Cost estimate
  const tokensUsed = processed * 1000; // Rough estimate
  const cost = (tokensUsed / 1000) * 0.0001; // Ada-002 pricing
  console.log(chalk.gray(`\n💰 Custo total: $${cost.toFixed(4)}`));
  
  const totalTime = (Date.now() - startTime) / 1000 / 60;
  console.log(chalk.gray(`⏱️ Tempo total: ${totalTime.toFixed(1)} minutos`));
}

// Run the process
processEmbeddings().catch(error => {
  console.error(chalk.red('❌ Erro fatal:', error));
  process.exit(1);
});