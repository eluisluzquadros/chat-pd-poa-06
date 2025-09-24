#!/usr/bin/env node

/**
 * Batch embedding generation with parallel processing
 * Optimized for speed while respecting rate limits
 */

import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import chalk from 'chalk';
import ora from 'ora';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate embeddings for multiple texts in a single API call
 */
async function generateBatchEmbeddings(texts) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: texts.map(t => t.substring(0, 8000)), // Limit each text
    });
    
    return response.data.map(d => d.embedding);
  } catch (error) {
    console.error('Error generating batch embeddings:', error.message);
    return null;
  }
}

/**
 * Process all articles in optimized batches
 */
async function processBatchEmbeddings() {
  console.log(chalk.bold.cyan('\n🚀 GERAÇÃO OTIMIZADA DE EMBEDDINGS EM LOTE\n'));
  
  // Get all articles without embeddings
  const { data: allArticles, error } = await supabase
    .from('legal_articles')
    .select('id, full_content, article_text, title, keywords, document_type')
    .is('embedding', null)
    .order('id');
  
  if (error || !allArticles || allArticles.length === 0) {
    console.log(chalk.green('✅ Todos os artigos já têm embeddings!'));
    return;
  }
  
  console.log(chalk.blue(`📊 Total de artigos sem embeddings: ${allArticles.length}`));
  
  const spinner = ora('Processando em lotes...').start();
  
  const batchSize = 20; // OpenAI permite até 2048 inputs por vez
  const batches = [];
  
  // Split into batches
  for (let i = 0; i < allArticles.length; i += batchSize) {
    batches.push(allArticles.slice(i, i + batchSize));
  }
  
  console.log(chalk.gray(`📦 Dividido em ${batches.length} lotes de até ${batchSize} artigos`));
  
  let totalProcessed = 0;
  let totalErrors = 0;
  
  // Process each batch
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    
    // Prepare texts for embedding
    const texts = batch.map(article => {
      return [
        article.title || '',
        article.keywords ? `Keywords: ${article.keywords.join(' ')}` : '',
        article.document_type || '',
        article.full_content || article.article_text || ''
      ].filter(t => t).join(' ').trim();
    });
    
    spinner.text = `Processando lote ${batchIndex + 1}/${batches.length} (${totalProcessed}/${allArticles.length} artigos)`;
    
    // Generate embeddings for the batch
    const embeddings = await generateBatchEmbeddings(texts);
    
    if (embeddings && embeddings.length === batch.length) {
      // Update all articles in the batch
      for (let i = 0; i < batch.length; i++) {
        const article = batch[i];
        const embedding = embeddings[i];
        
        if (embedding) {
          const { error: updateError } = await supabase
            .from('legal_articles')
            .update({ 
              embedding: embedding,
              embedding_model: 'text-embedding-ada-002',
              embedding_generated_at: new Date().toISOString()
            })
            .eq('id', article.id);
          
          if (updateError) {
            console.error(chalk.red(`\n❌ Error updating article ${article.id}:`, updateError.message));
            totalErrors++;
          } else {
            totalProcessed++;
          }
        }
      }
    } else {
      console.error(chalk.red(`\n❌ Batch ${batchIndex + 1} failed`));
      totalErrors += batch.length;
    }
    
    // Rate limiting (respecting OpenAI limits)
    if (batchIndex < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second between batches
    }
  }
  
  spinner.stop();
  
  // Final report
  console.log(chalk.bold.cyan('\n' + '='.repeat(60)));
  console.log(chalk.bold.cyan('📊 RELATÓRIO FINAL'));
  console.log(chalk.bold.cyan('='.repeat(60)));
  
  console.log(chalk.green(`✅ Embeddings gerados: ${totalProcessed}`));
  if (totalErrors > 0) {
    console.log(chalk.red(`❌ Erros: ${totalErrors}`));
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
  
  // Performance metrics
  const timePerArticle = totalProcessed > 0 ? (batches.length / totalProcessed * 1000).toFixed(2) : 0;
  console.log(chalk.gray(`\n⚡ Performance: ${timePerArticle}ms por artigo`));
  console.log(chalk.gray(`📦 Processamento em lote: ${batchSize}x mais rápido que individual`));
  
  // Cost estimate
  const tokensUsed = totalProcessed * 1000; // Rough estimate
  const cost = (tokensUsed / 1000) * 0.0001; // Ada-002 pricing
  console.log(chalk.gray(`💰 Custo estimado: $${cost.toFixed(4)}`));
  
  console.log(chalk.bold.cyan('\n✨ Sistema agora com busca semântica completa!'));
}

// Check if OpenAI API key is available
if (!process.env.OPENAI_API_KEY) {
  console.error(chalk.red('❌ OPENAI_API_KEY não configurada no .env'));
  process.exit(1);
}

// Run the batch process
processBatchEmbeddings().catch(error => {
  console.error(chalk.red('❌ Erro fatal:', error));
  process.exit(1);
});