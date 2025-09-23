#!/usr/bin/env node

/**
 * Test single query directly with orchestrator
 */

import fetch from 'node-fetch';
import chalk from 'chalk';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function testSingleQuery() {
  console.log(chalk.cyan('🧪 Testing Single Query: EIV Definition'));
  
  const query = 'Qual o artigo da LUOS que define o Estudo de Impacto de Vizinhança?';
  
  try {
    console.log(chalk.gray(`Query: ${query}`));
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/orchestrator-master`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        query,
        sessionId: 'test-single-query',
        options: {
          debug: true,
          useKnowledgeGraph: true,
          useHierarchicalChunks: true
        }
      })
    });
    
    console.log(chalk.gray(`Status: ${response.status}`));
    
    if (!response.ok) {
      const error = await response.text();
      console.log(chalk.red('❌ HTTP Error:', error));
      return;
    }
    
    const result = await response.json();
    
    console.log(chalk.yellow('\n📊 RESULT ANALYSIS:'));
    console.log(chalk.gray(`Response: ${result.response}`));
    console.log(chalk.gray(`Confidence: ${result.confidence}`));
    console.log(chalk.gray(`Agents Used: ${result.metadata?.agents_used?.join(', ')}`));
    console.log(chalk.gray(`Refined: ${result.metadata?.refined}`));
    
    // Context analysis
    if (result.metadata?.context) {
      console.log(chalk.yellow('\n🔍 CONTEXT ANALYSIS:'));
      console.log(chalk.gray(`Legal References: ${result.metadata.context.hasLegalReferences}`));
      console.log(chalk.gray(`Location References: ${result.metadata.context.hasLocationReferences}`));
      console.log(chalk.gray(`Parameter Queries: ${result.metadata.context.hasParameterQueries}`));
      console.log(chalk.gray(`Entities: ${JSON.stringify(result.metadata.context.entities)}`));
    }
    
    // Validation analysis
    if (result.metadata?.validation) {
      console.log(chalk.yellow('\n✅ VALIDATION ANALYSIS:'));
      console.log(chalk.gray(`Valid: ${result.metadata.validation.isValid}`));
      console.log(chalk.gray(`Issues: ${result.metadata.validation.issues?.length || 0}`));
      console.log(chalk.gray(`Requires Refinement: ${result.metadata.validation.requiresRefinement}`));
    }
    
    // Check if expected content is present
    const expectedElements = [
      { name: 'LUOS - Art. 89', present: result.response?.includes('89') },
      { name: 'EIV', present: result.response?.toLowerCase().includes('eiv') },
      { name: 'Estudo de Impacto', present: result.response?.toLowerCase().includes('estudo de impacto') },
      { name: 'Vizinhança', present: result.response?.toLowerCase().includes('vizinhança') }
    ];
    
    console.log(chalk.yellow('\n🎯 EXPECTED ELEMENTS:'));
    expectedElements.forEach(element => {
      const icon = element.present ? '✅' : '❌';
      console.log(chalk.gray(`${icon} ${element.name}: ${element.present ? 'Found' : 'Missing'}`));
    });
    
    const successRate = expectedElements.filter(e => e.present).length / expectedElements.length;
    console.log(chalk.bold(`\nSuccess Rate: ${(successRate * 100).toFixed(0)}%`));
    
    if (successRate >= 0.75) {
      console.log(chalk.green('🎉 Query successful!'));
    } else if (successRate >= 0.5) {
      console.log(chalk.yellow('⚠️ Partial success'));
    } else {
      console.log(chalk.red('❌ Query failed'));
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Test error:'), error.message);
  }
}

async function testSimpleQueries() {
  console.log(chalk.cyan('\n🔄 Testing Multiple Simple Queries...'));
  
  const queries = [
    'EIV',
    'Art. 89',
    'LUOS Art 89',
    'Estudo de Impacto de Vizinhança'
  ];
  
  for (const query of queries) {
    console.log(chalk.yellow(`\n📝 Testing: "${query}"`));
    
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/orchestrator-master`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          query,
          sessionId: `test-simple-${Date.now()}`,
          options: { debug: true }
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(chalk.gray(`Response: ${result.response?.substring(0, 100)}...`));
        console.log(chalk.gray(`Confidence: ${result.confidence}`));
        console.log(chalk.gray(`Agents: ${result.metadata?.agents_used?.join(', ')}`));
        
        const hasRelevantContent = result.response?.toLowerCase().includes('eiv') || 
                                  result.response?.includes('89') ||
                                  result.response?.toLowerCase().includes('estudo');
        
        console.log(chalk.gray(`Relevant: ${hasRelevantContent ? 'Yes' : 'No'}`));
      } else {
        console.log(chalk.red('❌ Failed'));
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.log(chalk.red('❌ Error:', error.message));
    }
  }
}

async function main() {
  console.log(chalk.bold.cyan('🚀 SINGLE QUERY TEST\n'));
  
  await testSingleQuery();
  await testSimpleQueries();
  
  console.log(chalk.bold.green('\n✅ Test completed!'));
}

main().catch(console.error);