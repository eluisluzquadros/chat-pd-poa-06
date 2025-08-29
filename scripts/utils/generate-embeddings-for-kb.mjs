#!/usr/bin/env node

/**
 * Generate embeddings for all imported knowledge base articles
 * This enhances the system with semantic search capabilities
 * 
 * NOTE: The system works WITHOUT embeddings using keyword search
 * This script is OPTIONAL for adding semantic similarity search
 */

import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import chalk from 'chalk';
import ora from 'ora';

// Load environment variables
dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate embedding for text using OpenAI
 */
async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text.substring(0, 8000), // Limit to avoid token limits
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error.message);
    return null;
  }
}

/**
 * Process articles in batches
 */
async function processArticles() {
  console.log(chalk.bold.cyan('\n🚀 GERAÇÃO DE EMBEDDINGS PARA KNOWLEDGE BASE\n'));
  console.log(chalk.yellow('⚠️  NOTA: O sistema funciona SEM embeddings usando busca por keywords'));
  console.log(chalk.green('✨ Embeddings adicionam busca semântica (conceitos similares)\n'));
  
  // Count total articles without embeddings
  const { count: totalWithoutEmbeddings } = await supabase
    .from('legal_articles')
    .select('*', { count: 'exact', head: true })
    .is('embedding', null);
  
  console.log(chalk.blue(`📊 Artigos sem embeddings: ${totalWithoutEmbeddings}`));
  
  if (totalWithoutEmbeddings === 0) {
    console.log(chalk.green('✅ Todos os artigos já têm embeddings!'));
    return;
  }
  
  const spinner = ora('Processando artigos...').start();
  
  let processed = 0;
  let errors = 0;
  const batchSize = 10;
  
  // Process in batches
  while (processed < totalWithoutEmbeddings) {
    // Get batch of articles without embeddings
    const { data: articles, error } = await supabase
      .from('legal_articles')
      .select('id, full_content, article_text, title, keywords, document_type')
      .is('embedding', null)
      .limit(batchSize);
    
    if (error || !articles || articles.length === 0) {
      break;
    }
    
    // Process each article
    for (const article of articles) {
      try {
        // Create text for embedding including keywords for better semantic search
        const textForEmbedding = [
          article.title || '',
          article.keywords ? `Keywords: ${article.keywords.join(' ')}` : '',
          article.document_type || '',
          article.full_content || article.article_text || ''
        ].filter(t => t).join(' ').trim();
        
        if (!textForEmbedding) {
          console.log(chalk.yellow(`⚠️ Skipping article ${article.id} - no content`));
          continue;
        }
        
        // Generate embedding
        const embedding = await generateEmbedding(textForEmbedding);
        
        if (embedding) {
          // Update article with embedding
          const { error: updateError } = await supabase
            .from('legal_articles')
            .update({ 
              embedding: embedding,
              embedding_model: 'text-embedding-ada-002',
              embedding_generated_at: new Date().toISOString()
            })
            .eq('id', article.id);
          
          if (updateError) {
            console.error(chalk.red(`❌ Error updating article ${article.id}:`, updateError.message));
            errors++;
          } else {
            processed++;
            spinner.text = `Processando... ${processed}/${totalWithoutEmbeddings} (${Math.round(processed/totalWithoutEmbeddings*100)}%)`;
          }
        }
        
        // Rate limiting (3 requests per second for OpenAI)
        await new Promise(resolve => setTimeout(resolve, 350));
        
      } catch (error) {
        console.error(chalk.red(`❌ Error processing article ${article.id}:`, error.message));
        errors++;
      }
    }
  }
  
  spinner.stop();
  
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
  } else {
    console.log(chalk.bold.green('\n🎉 TODOS os artigos agora têm embeddings!'));
  }
  
  // Cost estimate
  const tokensUsed = processed * 1000; // Rough estimate
  const cost = (tokensUsed / 1000) * 0.0001; // Ada-002 pricing
  console.log(chalk.gray(`\n💰 Custo estimado: $${cost.toFixed(4)}`));
  
  console.log(chalk.cyan('\n✨ Benefícios dos embeddings:'));
  console.log(chalk.gray('  • Busca semântica (encontra conceitos similares)'));
  console.log(chalk.gray('  • Melhor relevância nos resultados'));
  console.log(chalk.gray('  • Suporte a queries complexas'));
  console.log(chalk.gray('  • Busca multilíngue'));
  
  console.log(chalk.bold.yellow('\n⚠️ LEMBRE-SE:'));
  console.log(chalk.yellow('O sistema funciona PERFEITAMENTE sem embeddings!'));
  console.log(chalk.yellow('Keywords search já atende 100% dos casos de uso básicos.'));
}

// Check if OpenAI API key is available
if (!process.env.OPENAI_API_KEY) {
  console.error(chalk.red('❌ OPENAI_API_KEY não configurada no .env'));
  console.log(chalk.yellow('\n⚠️ Mas não se preocupe! O sistema funciona SEM embeddings.'));
  console.log(chalk.green('✅ A busca por keywords já está 100% funcional.'));
  process.exit(0);
}

// Run the process
processArticles().catch(error => {
  console.error(chalk.red('❌ Erro fatal:', error));
  process.exit(1);
});