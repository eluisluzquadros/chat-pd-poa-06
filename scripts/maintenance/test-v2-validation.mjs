#!/usr/bin/env node

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log(chalk.bold.cyan('\n🔍 VALIDATING V2 (agentic-rag-v2) PERFORMANCE\n'));

const criticalQueries = [
  'o que diz o artigo 1 do pdus',
  'qual a altura máxima em petrópolis',
  'o que afirma literalmente o Art 1º da LUOS',
  'Como o Regime Volumétrico é tratado na LUOS',
  'o que posso construir no bairro Petrópolis'
];

async function testV2() {
  let successCount = 0;
  let contentValidCount = 0;
  
  for (const query of criticalQueries) {
    console.log(chalk.yellow(`\nTesting: "${query}"`));
    
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/agentic-rag-v2`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          bypassCache: true,
          model: 'openai/gpt-4-turbo-preview'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        successCount++;
        
        // Check if response has actual content (not generic error)
        const hasContent = data.response && 
                          data.response.length > 100 &&
                          !data.response.includes('Não foi possível encontrar informações');
        
        if (hasContent) {
          contentValidCount++;
          console.log(chalk.green('  ✅ Success with valid content'));
          console.log(chalk.gray(`  Preview: "${data.response.substring(0, 100)}..."`));
        } else {
          console.log(chalk.yellow('  ⚠️ Generic/empty response'));
          console.log(chalk.gray(`  Response: "${data.response?.substring(0, 100)}"`));
        }
      } else {
        console.log(chalk.red(`  ❌ Error: HTTP ${response.status}`));
      }
    } catch (error) {
      console.log(chalk.red(`  ❌ Fatal error: ${error.message}`));
    }
  }
  
  console.log(chalk.bold.cyan('\n\nSUMMARY:'));
  console.log(`API Success: ${successCount}/${criticalQueries.length} (${(successCount/criticalQueries.length*100).toFixed(0)}%)`);
  console.log(`Valid Content: ${contentValidCount}/${criticalQueries.length} (${(contentValidCount/criticalQueries.length*100).toFixed(0)}%)`);
  
  if (contentValidCount >= 3) {
    console.log(chalk.green('\n✅ V2 shows reasonable performance'));
    console.log(chalk.yellow('Note: V2 returns generic errors for some queries but works for others'));
  } else {
    console.log(chalk.red('\n❌ V2 is not suitable for production'));
  }
}

testV2().catch(error => {
  console.error(chalk.red('Fatal error:', error));
  process.exit(1);
});