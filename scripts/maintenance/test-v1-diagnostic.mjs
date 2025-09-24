#!/usr/bin/env node

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log(chalk.bold.cyan('\n🔍 DIAGNOSING V1 (agentic-rag) ISSUES\n'));

async function testQuery(query, description) {
  console.log(chalk.yellow(`Testing: ${description}`));
  console.log(chalk.gray(`Query: "${query}"\n`));
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        bypassCache: true,
        model: 'openai/gpt-4-turbo-preview',
        timeout: 30000
      })
    });
    
    const elapsed = Date.now() - startTime;
    console.log(`  Status: ${response.status}`);
    console.log(`  Time: ${elapsed}ms`);
    
    if (!response.ok) {
      const text = await response.text();
      console.log(chalk.red(`  Error: ${text.substring(0, 200)}`));
      return false;
    }
    
    const data = await response.json();
    console.log(chalk.green(`  ✅ Success!`));
    console.log(`  Response length: ${data.response?.length || 0} chars`);
    console.log(`  Confidence: ${(data.confidence * 100).toFixed(0)}%`);
    
    // Show preview
    if (data.response) {
      const preview = data.response.substring(0, 100).replace(/\n/g, ' ');
      console.log(chalk.gray(`  Preview: "${preview}..."`));
    }
    
    return true;
  } catch (error) {
    console.log(chalk.red(`  Fatal error: ${error.message}`));
    return false;
  }
}

async function runDiagnostic() {
  // Test different query types
  const tests = [
    { query: 'teste', description: 'Simple test query' },
    { query: 'o que diz o artigo 1 do pdus', description: 'Article query' },
    { query: 'qual a altura máxima em petrópolis', description: 'Regime query' },
    { query: 'resuma o plano diretor', description: 'Summary query' }
  ];
  
  let successCount = 0;
  
  for (const test of tests) {
    const success = await testQuery(test.query, test.description);
    if (success) successCount++;
    console.log(chalk.gray('-'.repeat(60)) + '\n');
  }
  
  // Summary
  console.log(chalk.bold.cyan('SUMMARY:'));
  console.log(`Success rate: ${successCount}/${tests.length} (${(successCount/tests.length*100).toFixed(0)}%)`);
  
  if (successCount === 0) {
    console.log(chalk.red('\n❌ V1 is completely broken!'));
    console.log(chalk.yellow('Possible causes:'));
    console.log('1. Edge Function deployment issue');
    console.log('2. Service role key expired');
    console.log('3. Database connection issues');
    console.log('4. Timeout configuration');
  } else if (successCount < tests.length) {
    console.log(chalk.yellow('\n⚠️ V1 has intermittent issues'));
  } else {
    console.log(chalk.green('\n✅ V1 is working correctly'));
  }
}

runDiagnostic().catch(error => {
  console.error(chalk.red('Fatal error:', error));
  process.exit(1);
});