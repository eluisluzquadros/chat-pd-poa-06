const fs = require('fs');
const path = require('path');
const https = require('https');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables');
  process.exit(1);
}

// Extract project ID from URL
const projectId = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)[1];

console.log('Project ID:', projectId);

// Functions to deploy
const functionsToUpdate = [
  'query-analyzer',
  'sql-generator',
  'agentic-rag',
  'multiLLMService'
];

async function deployFunction(functionName) {
  console.log(`\nDeploying ${functionName}...`);
  
  try {
    // Read function code
    const functionPath = path.join(__dirname, 'supabase', 'functions', functionName, 'index.ts');
    const functionCode = fs.readFileSync(functionPath, 'utf8');
    
    console.log(`- Read function code (${functionCode.length} chars)`);
    
    // Note: Supabase doesn't provide a public API for deploying functions
    // You need to use the Supabase CLI or dashboard
    console.log(`✅ ${functionName} code is ready for manual deployment`);
    
    // Save to a deployment file for easy copy-paste
    const deploymentPath = path.join(__dirname, 'deploy', `${functionName}.ts`);
    fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
    fs.writeFileSync(deploymentPath, functionCode);
    console.log(`- Saved to deploy/${functionName}.ts`);
    
  } catch (error) {
    console.error(`❌ Error processing ${functionName}:`, error.message);
  }
}

async function main() {
  console.log('=== Preparing Edge Functions for Deployment ===\n');
  
  console.log('Since Supabase doesn\'t provide a public API for function deployment,');
  console.log('the updated functions have been saved to the "deploy" folder.\n');
  
  for (const func of functionsToUpdate) {
    await deployFunction(func);
  }
  
  console.log('\n=== Next Steps ===');
  console.log('1. Go to your Supabase Dashboard');
  console.log('2. Navigate to Functions');
  console.log('3. For each function, click Edit and paste the code from:');
  functionsToUpdate.forEach(func => {
    console.log(`   - deploy/${func}.ts`);
  });
  console.log('4. Click Deploy for each function\n');
  
  console.log('Alternatively, you can use the Supabase CLI:');
  console.log('1. Install Supabase CLI: https://supabase.com/docs/guides/cli');
  console.log('2. Run: supabase login');
  console.log('3. Run: supabase link --project-ref', projectId);
  console.log('4. Run: supabase functions deploy');
}

main().catch(console.error);