#!/usr/bin/env node

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config({ path: '.env' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// Read the function code
const functionPath = path.join(process.cwd(), 'supabase', 'functions', 'agentic-rag', 'index.ts');
const functionCode = fs.readFileSync(functionPath, 'utf-8');

console.log('🚀 Attempting to deploy agentic-rag function via API...');
console.log('📦 Function size:', (functionCode.length / 1024).toFixed(2), 'KB');

// Test the deployed function
async function testFunction() {
  console.log('\n🧪 Testing deployed function...');
  
  const testQuery = {
    message: "O que diz o artigo 75?",
    bypassCache: true
  };

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/agentic-rag`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testQuery)
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Function is working!');
      console.log('📝 Response preview:', data.response?.substring(0, 200) + '...');
      console.log('📊 Confidence:', data.confidence);
    } else {
      console.log('⚠️ Function returned error:', response.status);
      const errorText = await response.text();
      console.log('Error:', errorText);
    }
  } catch (error) {
    console.error('❌ Error testing function:', error);
  }
}

// Since we can't deploy via API without proper admin endpoints,
// let's at least test if the current deployed version works
console.log('\n📋 Instructions for manual deployment:');
console.log('=====================================');
console.log('1. Go to: https://app.supabase.com/project/ngrqwmvuhvjkeohesbxs');
console.log('2. Navigate to: Edge Functions → agentic-rag');
console.log('3. Click "Edit Function"');
console.log('4. Replace ALL code with content from:');
console.log('   supabase/functions/agentic-rag/index.ts');
console.log('5. Click "Deploy"');
console.log('=====================================\n');

// Test current deployed version
testFunction().catch(console.error);