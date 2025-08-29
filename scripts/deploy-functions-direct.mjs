#!/usr/bin/env node

import { execSync } from 'child_process';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PROJECT_REF = 'ngrqwmvuhvjkeohesbxs';
const FUNCTIONS_TO_DEPLOY = [
  'query-analyzer',
  'response-synthesizer',
  'sql-generator-v2',
  'agentic-rag',
  'enhanced-vector-search'
];

// Helper function to execute command
function executeCommand(command, functionName) {
  try {
    console.log(chalk.blue(`   Executing: ${command}`));
    const output = execSync(command, {
      encoding: 'utf8',
      stdio: 'pipe',
      env: {
        ...process.env,
        // Skip .env.local file
        SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN || ''
      }
    });
    console.log(chalk.green(`   ✅ ${functionName} deployed successfully!`));
    return { success: true, output };
  } catch (error) {
    console.log(chalk.red(`   ❌ Failed to deploy ${functionName}`));
    console.error(chalk.red(`   Error: ${error.message}`));
    return { success: false, error: error.message };
  }
}

// Main deployment function
async function deployFunctions() {
  console.log(chalk.cyan('\n════════════════════════════════════════════════════════════════'));
  console.log(chalk.cyan.bold('     🚀 DIRECT DEPLOYMENT TO SUPABASE EDGE FUNCTIONS'));
  console.log(chalk.cyan('════════════════════════════════════════════════════════════════\n'));
  
  const results = {
    total: FUNCTIONS_TO_DEPLOY.length,
    successful: [],
    failed: []
  };
  
  // Check if we're in the right directory
  const functionsDir = path.join(__dirname, '..', 'supabase', 'functions');
  if (!fs.existsSync(functionsDir)) {
    console.error(chalk.red('❌ Supabase functions directory not found!'));
    console.error(chalk.red(`   Expected at: ${functionsDir}`));
    process.exit(1);
  }
  
  console.log(chalk.yellow('📋 Functions to deploy:'));
  FUNCTIONS_TO_DEPLOY.forEach(fn => {
    console.log(chalk.gray(`   • ${fn}`));
  });
  console.log();
  
  // Deploy each function
  for (const functionName of FUNCTIONS_TO_DEPLOY) {
    console.log(chalk.yellow(`\n📦 Deploying: ${functionName}`));
    console.log(chalk.gray('─'.repeat(50)));
    
    const functionPath = path.join(functionsDir, functionName);
    
    // Check if function exists
    if (!fs.existsSync(functionPath)) {
      console.log(chalk.red(`   ⚠️  Function directory not found: ${functionPath}`));
      results.failed.push(functionName);
      continue;
    }
    
    // Build deployment command
    // Using curl directly to avoid .env.local issues
    const deployCommand = `npx supabase@latest functions deploy ${functionName} --project-ref ${PROJECT_REF} --no-verify-jwt --legacy-bundle`;
    
    const result = executeCommand(deployCommand, functionName);
    
    if (result.success) {
      results.successful.push(functionName);
    } else {
      results.failed.push(functionName);
    }
    
    // Add delay between deployments
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Print summary
  console.log(chalk.cyan('\n════════════════════════════════════════════════════════════════'));
  console.log(chalk.cyan.bold('                     📊 DEPLOYMENT SUMMARY'));
  console.log(chalk.cyan('════════════════════════════════════════════════════════════════\n'));
  
  console.log(chalk.bold('📈 Results:'));
  console.log(`   Total: ${results.total}`);
  console.log(`   ✅ Successful: ${results.successful.length} (${chalk.green((results.successful.length/results.total*100).toFixed(0) + '%')})`);
  console.log(`   ❌ Failed: ${results.failed.length} (${chalk.red((results.failed.length/results.total*100).toFixed(0) + '%')})`);
  
  if (results.successful.length > 0) {
    console.log(chalk.green('\n✅ Successfully deployed:'));
    results.successful.forEach(fn => {
      console.log(chalk.green(`   • ${fn}`));
    });
  }
  
  if (results.failed.length > 0) {
    console.log(chalk.red('\n❌ Failed to deploy:'));
    results.failed.forEach(fn => {
      console.log(chalk.red(`   • ${fn}`));
    });
    
    console.log(chalk.yellow('\n💡 Troubleshooting tips:'));
    console.log(chalk.gray('   1. Make sure you are logged in: npx supabase login'));
    console.log(chalk.gray('   2. Check your internet connection'));
    console.log(chalk.gray('   3. Verify project reference is correct'));
    console.log(chalk.gray('   4. Try deploying individually with --debug flag'));
  }
  
  // Final status
  if (results.failed.length === 0) {
    console.log(chalk.green.bold('\n🎉 All functions deployed successfully!'));
  } else if (results.successful.length > 0) {
    console.log(chalk.yellow.bold('\n⚠️  Partial deployment completed'));
  } else {
    console.log(chalk.red.bold('\n❌ Deployment failed'));
  }
  
  // Save deployment log
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const logPath = path.join(__dirname, '..', 'deployment-logs', `deploy-${timestamp}.json`);
  
  try {
    const logDir = path.dirname(logPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    fs.writeFileSync(logPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      projectRef: PROJECT_REF,
      results
    }, null, 2));
    
    console.log(chalk.gray(`\n📁 Deployment log saved to: ${logPath}`));
  } catch (error) {
    console.error(chalk.red(`Failed to save log: ${error.message}`));
  }
}

// Run deployment
console.log(chalk.cyan('🚀 Starting direct deployment process...'));
console.log(chalk.gray('   This will deploy functions without using .env.local\n'));

deployFunctions().catch(error => {
  console.error(chalk.red('\n💥 Fatal error during deployment:'), error);
  process.exit(1);
});