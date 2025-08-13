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
  'agentic-rag'
];

// Temporarily rename .env.local to bypass the parsing issue
function bypassEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const backupPath = path.join(__dirname, '..', '.env.local.backup');
  
  if (fs.existsSync(envPath)) {
    console.log(chalk.yellow('📦 Temporarily renaming .env.local to bypass parsing issue...'));
    fs.renameSync(envPath, backupPath);
    return backupPath;
  }
  return null;
}

// Restore .env.local
function restoreEnvLocal(backupPath) {
  if (backupPath && fs.existsSync(backupPath)) {
    const envPath = path.join(__dirname, '..', '.env.local');
    console.log(chalk.yellow('📦 Restoring .env.local...'));
    fs.renameSync(backupPath, envPath);
  }
}

// Execute deployment command
function deployFunction(functionName) {
  try {
    console.log(chalk.blue(`📦 Deploying ${functionName}...`));
    
    const command = `npx supabase functions deploy ${functionName} --project-ref ${PROJECT_REF} --no-verify-jwt`;
    
    execSync(command, {
      encoding: 'utf8',
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      env: {
        ...process.env,
        // Clear any environment variables that might interfere
        SUPABASE_ENV_FILE: '',
        NODE_ENV: 'production'
      }
    });
    
    console.log(chalk.green(`✅ ${functionName} deployed successfully!`));
    return true;
  } catch (error) {
    console.error(chalk.red(`❌ Failed to deploy ${functionName}: ${error.message}`));
    return false;
  }
}

// Main deployment function
async function main() {
  console.log(chalk.cyan.bold('\n🚀 DEPLOYING EDGE FUNCTIONS (BYPASS ENV MODE)\n'));
  
  // Check if we have access token
  if (!process.env.SUPABASE_ACCESS_TOKEN) {
    console.log(chalk.yellow('⚠️  No SUPABASE_ACCESS_TOKEN found'));
    console.log(chalk.yellow('   Please set it or login with: npx supabase login'));
  }
  
  // Backup .env.local
  const backupPath = bypassEnvLocal();
  
  const results = {
    successful: [],
    failed: []
  };
  
  try {
    // Deploy each function
    for (const functionName of FUNCTIONS_TO_DEPLOY) {
      console.log(chalk.gray('\n' + '─'.repeat(50)));
      
      const success = deployFunction(functionName);
      
      if (success) {
        results.successful.push(functionName);
      } else {
        results.failed.push(functionName);
      }
      
      // Add delay between deployments
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  } finally {
    // Always restore .env.local
    restoreEnvLocal(backupPath);
  }
  
  // Print summary
  console.log(chalk.cyan('\n' + '═'.repeat(60)));
  console.log(chalk.cyan.bold('📊 DEPLOYMENT SUMMARY'));
  console.log(chalk.cyan('═'.repeat(60) + '\n'));
  
  if (results.successful.length > 0) {
    console.log(chalk.green('✅ Successfully deployed:'));
    results.successful.forEach(fn => {
      console.log(chalk.green(`   • ${fn}`));
    });
  }
  
  if (results.failed.length > 0) {
    console.log(chalk.red('\n❌ Failed to deploy:'));
    results.failed.forEach(fn => {
      console.log(chalk.red(`   • ${fn}`));
    });
  }
  
  // Final message
  if (results.failed.length === 0) {
    console.log(chalk.green.bold('\n🎉 All functions deployed successfully!'));
    console.log(chalk.cyan('\nNext steps:'));
    console.log(chalk.gray('1. Run: npm run test:integration'));
    console.log(chalk.gray('2. Check Supabase Dashboard for function logs'));
  } else if (results.successful.length > 0) {
    console.log(chalk.yellow.bold('\n⚠️  Partial deployment completed'));
  } else {
    console.log(chalk.red.bold('\n❌ Deployment failed'));
    console.log(chalk.yellow('\nTroubleshooting:'));
    console.log(chalk.gray('1. Check if you are logged in: npx supabase login'));
    console.log(chalk.gray('2. Verify project reference is correct'));
    console.log(chalk.gray('3. Check Supabase Dashboard and deploy manually'));
  }
}

// Run deployment
main().catch(error => {
  console.error(chalk.red('\n💥 Fatal error:'), error);
  process.exit(1);
});