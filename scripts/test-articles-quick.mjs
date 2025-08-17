#!/usr/bin/env node

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';

// Load environment variables
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Quick test queries for articles
const testQueries = [
  'O que diz o artigo 75?',
  'O que estabelece o artigo 1?',
  'Qual o conteúdo do artigo 20 sobre outorga onerosa?',
  'O que define o artigo 45 sobre IPTU progressivo?',
  'Explique o artigo 55 sobre ZEIS'
];

async function testQuery(query) {
  console.log(chalk.yellow(`\nTesting: "${query}"`));
  
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: query,
        bypassCache: true
      })
    });

    if (!response.ok) {
      console.log(chalk.red(`❌ HTTP ${response.status}`));
      return false;
    }

    const data = await response.json();
    
    if (data.response) {
      console.log(chalk.green(`✅ Response received (${data.response.length} chars)`));
      console.log(chalk.gray(`   Confidence: ${data.confidence || 'N/A'}`));
      
      // Show first 200 chars of response
      const preview = data.response.substring(0, 200);
      console.log(chalk.cyan(`   Preview: "${preview}..."`));
      
      // Check if response mentions the article number
      const articleNumber = query.match(/artigo (\d+)/i)?.[1];
      if (articleNumber && data.response.toLowerCase().includes(`artigo ${articleNumber}`)) {
        console.log(chalk.green(`   ✅ Article ${articleNumber} found in response!`));
        return true;
      }
    } else {
      console.log(chalk.red(`❌ No response`));
      return false;
    }
    
  } catch (error) {
    console.log(chalk.red(`❌ Error: ${error.message}`));
    return false;
  }
  
  return false;
}

async function main() {
  console.log(chalk.cyan.bold('\n🧪 Quick Article Test\n'));
  console.log(chalk.gray('Testing if newly added articles are being found...\n'));
  
  let successCount = 0;
  
  for (const query of testQueries) {
    const success = await testQuery(query);
    if (success) successCount++;
    
    // Small delay between queries
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(chalk.cyan('\n📊 Results:'));
  console.log(chalk[successCount >= 3 ? 'green' : 'yellow'](
    `${successCount}/${testQueries.length} queries found the correct article`
  ));
  
  if (successCount >= 3) {
    console.log(chalk.green.bold('\n✅ Success! Articles are being found by the RAG system.'));
  } else {
    console.log(chalk.yellow.bold('\n⚠️ Some articles are not being found. May need to wait for indexing or check the RAG pipeline.'));
  }
}

main().catch(console.error);