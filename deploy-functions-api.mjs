import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read environment variables manually since we can't use dotenv easily
const envContent = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL || envVars.VITE_SUPABASE_URL;
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
  console.log('1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/' + projectId);
  console.log('2. Navigate to Functions');
  console.log('3. For each function, click Edit and paste the code from:');
  functionsToUpdate.forEach(func => {
    console.log(`   - deploy/${func}.ts`);
  });
  console.log('4. Click Deploy for each function\n');
}

main().catch(console.error);