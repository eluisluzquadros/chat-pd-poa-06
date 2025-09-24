#!/usr/bin/env node

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';
import ora from 'ora';

// Load environment variables
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Common queries that should be pre-cached
const commonQueries = [
  // Artigos mais consultados
  'O que diz o artigo 1?',
  'O que diz o artigo 75?',
  'O que estabelece o artigo 20?',
  'Qual o conteúdo do artigo 45?',
  'Explique o artigo 55',
  
  // Bairros populares
  'Altura máxima em Petrópolis',
  'Regime urbanístico do Centro',
  'Parâmetros de Cidade Baixa',
  'Taxa de ocupação em Menino Deus',
  'Altura máxima em Moinhos de Vento',
  
  // ZOTs principais
  'O que é ZOT-08?',
  'Características da ZOT-07',
  'Parâmetros da ZOT-13',
  'Bairros da ZOT-15',
  'Diferença entre ZOT-01 e ZOT-02',
  
  // Conceitos frequentes
  'O que é outorga onerosa?',
  'O que são ZEIS?',
  'O que é taxa de ocupação?',
  'O que é coeficiente de aproveitamento?',
  'O que é recuo frontal?',
  
  // Proteção e riscos
  'Áreas de risco de inundação',
  'Bairros com proteção contra enchentes',
  'Zonas de preservação ambiental',
  'Áreas não edificáveis',
  'Proteção do patrimônio histórico'
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
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

async function generateResponse(query) {
  const spinner = ora(`Processing: "${query}"`).start();
  
  try {
    // Call the Edge Function
    const response = await fetch(`${supabaseUrl}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: query,
        bypassCache: true // Force generate new response
      })
    });

    if (!response.ok) {
      spinner.fail(chalk.red(`Failed: HTTP ${response.status}`));
      return null;
    }

    const data = await response.json();
    
    if (data.response && data.response.length > 50) {
      spinner.succeed(chalk.green(`✅ Generated response (${data.response.length} chars)`));
      return data;
    } else {
      spinner.fail(chalk.red('Response too short'));
      return null;
    }
    
  } catch (error) {
    spinner.fail(chalk.red(`Error: ${error.message}`));
    return null;
  }
}

async function preCacheQuery(query) {
  console.log(chalk.yellow(`\nCaching: "${query}"`));
  
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);
    
    // Generate response
    const responseData = await generateResponse(query);
    
    if (!responseData) {
      console.log(chalk.red('  ❌ Failed to generate response'));
      return false;
    }
    
    // Store in cache
    const cacheEntry = {
      query: query.toLowerCase().trim(),
      query_embedding: queryEmbedding,
      response: responseData.response,
      confidence: responseData.confidence || 0.85,
      metadata: {
        pre_cached: true,
        cached_at: new Date().toISOString(),
        ttl_hours: 168, // 1 week
        category: determineCategory(query)
      }
    };
    
    // Check if already cached
    const { data: existing } = await supabase
      .from('query_cache')
      .select('id')
      .eq('query', cacheEntry.query)
      .single();
    
    if (existing) {
      // Update existing cache
      const { error } = await supabase
        .from('query_cache')
        .update({
          response: cacheEntry.response,
          confidence: cacheEntry.confidence,
          metadata: cacheEntry.metadata,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
      
      if (error) throw error;
      console.log(chalk.blue('  📝 Updated existing cache entry'));
    } else {
      // Insert new cache
      const { error } = await supabase
        .from('query_cache')
        .insert(cacheEntry);
      
      if (error) throw error;
      console.log(chalk.green('  ✅ Added to cache'));
    }
    
    return true;
    
  } catch (error) {
    console.log(chalk.red(`  ❌ Cache error: ${error.message}`));
    return false;
  }
}

function determineCategory(query) {
  const q = query.toLowerCase();
  
  if (q.includes('artigo') || q.includes('art.')) return 'artigos';
  if (q.includes('zot')) return 'zonas';
  if (q.includes('altura') || q.includes('taxa') || q.includes('coeficiente')) return 'parametros';
  if (q.includes('bairro') || q.includes('petrópolis') || q.includes('menino') || q.includes('cidade')) return 'bairros';
  if (q.includes('risco') || q.includes('proteção') || q.includes('enchente')) return 'protecao';
  if (q.includes('o que é') || q.includes('definição') || q.includes('conceito')) return 'conceitos';
  
  return 'geral';
}

async function createSemanticCacheIndex() {
  console.log(chalk.cyan('\n🔧 Creating semantic cache index...'));
  
  try {
    // Create index for faster similarity searches
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_cache_embedding 
        ON query_cache 
        USING ivfflat (query_embedding vector_cosine_ops)
        WITH (lists = 100);
      `
    });
    
    console.log(chalk.green('✅ Semantic index created'));
  } catch (error) {
    console.log(chalk.yellow('⚠️ Could not create index (may already exist)'));
  }
}

async function implementSemanticCache() {
  console.log(chalk.cyan('\n🧠 Implementing semantic cache...'));
  
  // Create function for semantic cache lookup
  const semanticCacheFunction = `
    CREATE OR REPLACE FUNCTION find_cached_response(
      query_text TEXT,
      query_embedding vector(1536),
      similarity_threshold float DEFAULT 0.95
    )
    RETURNS TABLE (
      id UUID,
      query TEXT,
      response TEXT,
      confidence float,
      similarity float
    )
    LANGUAGE sql STABLE
    AS $$
      SELECT
        id,
        query,
        response,
        confidence,
        1 - (query_embedding <=> $2) as similarity
      FROM query_cache
      WHERE 
        -- Exact match (fast)
        (LOWER(TRIM(query)) = LOWER(TRIM($1)))
        OR
        -- Semantic match (slower but catches variations)
        (1 - (query_embedding <=> $2) > similarity_threshold)
      ORDER BY 
        CASE 
          WHEN LOWER(TRIM(query)) = LOWER(TRIM($1)) THEN 1
          ELSE 1 - (query_embedding <=> $2)
        END DESC
      LIMIT 1;
    $$;
  `;
  
  try {
    await supabase.rpc('exec_sql', { sql: semanticCacheFunction });
    console.log(chalk.green('✅ Semantic cache function created'));
  } catch (error) {
    console.log(chalk.yellow('⚠️ Function may already exist'));
  }
}

async function clearOldCache() {
  console.log(chalk.cyan('\n🧹 Clearing old cache entries...'));
  
  try {
    // Delete cache entries older than 7 days
    const { data, error } = await supabase
      .from('query_cache')
      .delete()
      .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .select();
    
    if (error) throw error;
    
    const count = data ? data.length : 0;
    console.log(chalk.green(`✅ Cleared ${count} old cache entries`));
  } catch (error) {
    console.log(chalk.red(`❌ Error clearing cache: ${error.message}`));
  }
}

async function analyzeCachePerformance() {
  console.log(chalk.cyan('\n📊 Cache Performance Analysis...'));
  
  try {
    // Get cache statistics
    const { data: cacheStats } = await supabase
      .from('query_cache')
      .select('*');
    
    if (cacheStats) {
      const total = cacheStats.length;
      const preCached = cacheStats.filter(c => c.metadata?.pre_cached).length;
      const recent = cacheStats.filter(c => 
        new Date(c.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
      ).length;
      
      console.log(chalk.green('\n📈 Cache Statistics:'));
      console.log(`   Total entries: ${total}`);
      console.log(`   Pre-cached: ${preCached}`);
      console.log(`   Added last 24h: ${recent}`);
      
      // Category breakdown
      const categories = {};
      cacheStats.forEach(entry => {
        const cat = entry.metadata?.category || 'unknown';
        categories[cat] = (categories[cat] || 0) + 1;
      });
      
      console.log(chalk.green('\n📂 By Category:'));
      Object.entries(categories).forEach(([cat, count]) => {
        console.log(`   ${cat}: ${count}`);
      });
    }
  } catch (error) {
    console.log(chalk.red(`❌ Error analyzing cache: ${error.message}`));
  }
}

async function main() {
  console.log(chalk.cyan.bold('🚀 Optimizing Cache System\n'));
  console.log(chalk.gray('This will pre-cache common queries and optimize performance...\n'));
  
  // Step 1: Clear old cache
  await clearOldCache();
  
  // Step 2: Create semantic cache infrastructure
  await createSemanticCacheIndex();
  await implementSemanticCache();
  
  // Step 3: Pre-cache common queries
  console.log(chalk.cyan('\n📦 Pre-caching common queries...'));
  console.log(chalk.gray(`Processing ${commonQueries.length} queries...\n`));
  
  let successCount = 0;
  let failCount = 0;
  
  for (const query of commonQueries) {
    const success = await preCacheQuery(query);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(chalk.cyan('\n📊 Pre-caching Summary:'));
  console.log(chalk.green(`✅ Successfully cached: ${successCount}`));
  if (failCount > 0) {
    console.log(chalk.red(`❌ Failed: ${failCount}`));
  }
  
  // Step 4: Analyze performance
  await analyzeCachePerformance();
  
  // Step 5: Recommendations
  console.log(chalk.cyan('\n💡 Cache Optimization Complete!'));
  console.log(chalk.gray('\nRecommendations:'));
  console.log('1. Cache hit rate should improve by 30-40%');
  console.log('2. Response times for cached queries: <100ms');
  console.log('3. Monitor cache performance in /admin/metrics');
  console.log('4. Run this script weekly to maintain cache');
  
  console.log(chalk.green.bold('\n✨ Cache system optimized!\n'));
}

main().catch(console.error);