#!/usr/bin/env node

/**
 * Deploy functions directly using Supabase Management API
 * Alternative method when CLI auth is not working
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const PROJECT_REF = 'ngrqwmvuhvjkeohesbxs';
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo';

console.log('🚀 Starting function deployment...\n');

// Deploy using Supabase CLI with environment variables
async function deployWithCLI(functionName) {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);
  
  console.log(`📦 Deploying ${functionName}...`);
  
  try {
    // Set environment variables for the command
    const env = {
      ...process.env,
      SUPABASE_URL: SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE_KEY,
      SUPABASE_PROJECT_ID: PROJECT_REF
    };
    
    // Try to deploy without login by using project-ref directly
    const command = `npx supabase functions deploy ${functionName} --project-ref ${PROJECT_REF} --no-verify-jwt`;
    
    console.log(`  Executing: ${command}`);
    const { stdout, stderr } = await execAsync(command, { env });
    
    if (stderr && !stderr.includes('WARNING')) {
      console.error(`  ⚠️ Warnings: ${stderr}`);
    }
    
    if (stdout) {
      console.log(`  ✅ ${functionName} deployed successfully`);
      console.log(`  Response: ${stdout}`);
    }
    
    return true;
  } catch (error) {
    console.error(`  ❌ Failed to deploy ${functionName}:`, error.message);
    
    // Try alternative approach
    console.log(`  🔄 Trying alternative deployment method...`);
    return await deployWithAPI(functionName);
  }
}

// Alternative: Deploy using Management API directly
async function deployWithAPI(functionName) {
  console.log(`  📡 Using Management API for ${functionName}...`);
  
  try {
    // Read function code
    const functionPath = path.join(__dirname, 'backend', 'supabase', 'functions', functionName, 'index.ts');
    
    if (!fs.existsSync(functionPath)) {
      console.error(`  ❌ Function file not found: ${functionPath}`);
      return false;
    }
    
    const functionCode = fs.readFileSync(functionPath, 'utf8');
    
    // Deploy using fetch to management API
    const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: functionName,
        verify_jwt: true,
        import_map: true,
        body: functionCode
      })
    });
    
    if (response.ok) {
      console.log(`  ✅ ${functionName} deployed via API`);
      return true;
    } else {
      const error = await response.text();
      console.error(`  ❌ API deployment failed: ${error}`);
      return false;
    }
  } catch (error) {
    console.error(`  ❌ API deployment error:`, error.message);
    return false;
  }
}

// Test deployed function
async function testFunction(functionName, testQuery) {
  console.log(`\n🧪 Testing ${functionName}...`);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: testQuery,
        sessionId: `deploy-test-${Date.now()}`
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log(`  ✅ Function responding correctly`);
      
      // Show response preview
      if (result.response) {
        const preview = result.response.substring(0, 100);
        console.log(`  📝 Response preview: "${preview}..."`);
      }
      
      return true;
    } else {
      console.log(`  ❌ Function returned error: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`  ❌ Test failed:`, error.message);
    return false;
  }
}

// Main deployment process
async function main() {
  console.log('='.repeat(60));
  console.log('    SUPABASE FUNCTION DEPLOYMENT');
  console.log('='.repeat(60));
  
  const functions = [
    {
      name: 'agentic-rag',
      test: 'qual é a altura máxima do aberta dos morros'
    },
    {
      name: 'response-synthesizer',
      test: null // This function needs specific agent results format
    }
  ];
  
  const results = {
    deployed: [],
    failed: []
  };
  
  // Deploy each function
  for (const func of functions) {
    const success = await deployWithCLI(func.name);
    
    if (success) {
      results.deployed.push(func.name);
      
      // Test if specified
      if (func.test) {
        await testFunction(func.name, func.test);
      }
    } else {
      results.failed.push(func.name);
    }
    
    // Small delay between deployments
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('    DEPLOYMENT SUMMARY');
  console.log('='.repeat(60));
  
  if (results.deployed.length > 0) {
    console.log('\n✅ Successfully deployed:');
    results.deployed.forEach(name => console.log(`  - ${name}`));
  }
  
  if (results.failed.length > 0) {
    console.log('\n❌ Failed to deploy:');
    results.failed.forEach(name => console.log(`  - ${name}`));
  }
  
  const successRate = (results.deployed.length / functions.length) * 100;
  console.log(`\n📊 Success rate: ${successRate.toFixed(0)}%`);
  
  if (successRate === 100) {
    console.log('\n🎉 All functions deployed successfully!');
    console.log('⏳ Wait 30 seconds for propagation...');
    
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    console.log('\n🧪 Running final test with REGIME_FALLBACK data...');
    await testFunction('agentic-rag', 'o que posso construir no bairro Petrópolis');
  } else {
    console.log('\n⚠️ Some deployments failed. Check the errors above.');
    console.log('\n📋 Alternative: Manual deployment via Supabase Dashboard');
    console.log('1. Go to: https://supabase.com/dashboard/project/' + PROJECT_REF);
    console.log('2. Navigate to Functions section');
    console.log('3. Update each function with the code from:');
    console.log('   - backend/supabase/functions/agentic-rag/index.ts');
    console.log('   - backend/supabase/functions/response-synthesizer/index.ts');
  }
  
  console.log('\n' + '='.repeat(60));
}

// Run deployment
main().catch(console.error);