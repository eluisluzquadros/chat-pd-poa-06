#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Configuração do projeto
const PROJECT_REF = 'ngrqwmvuhvjkeohesbxs';

// Lista de Edge Functions críticas para deploy
const CRITICAL_FUNCTIONS = [
  'agentic-rag',
  'query-analyzer',
  'sql-generator',
  'enhanced-vector-search',
  'response-synthesizer'
];

// Outras funções importantes
const OTHER_FUNCTIONS = [
  'knowledge-updater',
  'feedback-processor',
  'gap-detector',
  'cursor-pagination',
  'paginated-search'
];

async function deployFunction(functionName) {
  console.log(`\n🚀 Deploying ${functionName}...`);
  try {
    const command = `npx supabase functions deploy ${functionName} --project-ref ${PROJECT_REF}`;
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr && !stderr.includes('Warning')) {
      console.error(`⚠️  Warning for ${functionName}: ${stderr}`);
    }
    
    console.log(`✅ ${functionName} deployed successfully!`);
    if (stdout) console.log(stdout);
    return true;
  } catch (error) {
    console.error(`❌ Failed to deploy ${functionName}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚨 EMERGENCY EDGE FUNCTIONS DEPLOYMENT');
  console.log('=====================================\n');
  
  console.log('📋 Functions to deploy:');
  console.log('Critical:', CRITICAL_FUNCTIONS.join(', '));
  console.log('Other:', OTHER_FUNCTIONS.join(', '));
  
  // Deploy critical functions first
  console.log('\n🔥 PHASE 1: Deploying critical functions...\n');
  const criticalResults = [];
  
  for (const func of CRITICAL_FUNCTIONS) {
    const success = await deployFunction(func);
    criticalResults.push({ name: func, success });
    
    // Pequena pausa entre deploys para evitar rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Check if all critical functions deployed successfully
  const criticalFailed = criticalResults.filter(r => !r.success);
  if (criticalFailed.length > 0) {
    console.error('\n❌ CRITICAL FUNCTIONS FAILED:', criticalFailed.map(f => f.name).join(', '));
    console.log('\n⚠️  Fix the critical functions before proceeding!');
    process.exit(1);
  }
  
  console.log('\n✅ All critical functions deployed successfully!');
  
  // Deploy other functions
  console.log('\n📦 PHASE 2: Deploying other functions...\n');
  const otherResults = [];
  
  for (const func of OTHER_FUNCTIONS) {
    const success = await deployFunction(func);
    otherResults.push({ name: func, success });
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Summary
  console.log('\n📊 DEPLOYMENT SUMMARY');
  console.log('====================');
  console.log(`✅ Critical functions: ${criticalResults.filter(r => r.success).length}/${CRITICAL_FUNCTIONS.length}`);
  console.log(`✅ Other functions: ${otherResults.filter(r => r.success).length}/${OTHER_FUNCTIONS.length}`);
  
  const allFailed = [...criticalResults, ...otherResults].filter(r => !r.success);
  if (allFailed.length > 0) {
    console.log(`\n⚠️  Failed functions: ${allFailed.map(f => f.name).join(', ')}`);
  } else {
    console.log('\n🎉 All functions deployed successfully!');
  }
  
  console.log('\n📝 Next steps:');
  console.log('1. Go to Supabase Dashboard > Settings > Functions');
  console.log('2. Add Edge Function Secrets:');
  console.log('   - OPENAI_API_KEY');
  console.log('   - ANTHROPIC_API_KEY (if available)');
  console.log('   - GEMINI_API_KEY (if available)');
  console.log('3. Test the functions using test-rag-final.mjs');
}

// Run the deployment
main().catch(console.error);