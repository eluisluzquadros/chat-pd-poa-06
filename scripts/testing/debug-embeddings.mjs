#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load environment
const envContent = readFileSync('.env.local', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});
Object.assign(process.env, envVars);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugEmbeddings() {
  console.log('🔍 Debugging embeddings storage...\n');

  try {
    // Get one chunk to inspect
    const { data: chunks, error } = await supabase
      .from('document_embeddings')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error:', error);
      return;
    }

    if (chunks.length === 0) {
      console.log('No chunks found');
      return;
    }

    const chunk = chunks[0];
    console.log('📊 Chunk details:');
    console.log(`   ID: ${chunk.id}`);
    console.log(`   Content: "${chunk.content_chunk.substring(0, 50)}..."`);
    console.log(`   Embedding type: ${typeof chunk.embedding}`);
    console.log(`   Embedding length: ${chunk.embedding?.length || 'N/A'}`);
    
    if (typeof chunk.embedding === 'string') {
      console.log(`   Embedding preview: "${chunk.embedding.substring(0, 100)}..."`);
      
      // Try to parse as JSON
      try {
        const parsed = JSON.parse(chunk.embedding);
        console.log(`   Parsed as JSON: ${Array.isArray(parsed) ? 'Array' : typeof parsed}`);
        if (Array.isArray(parsed)) {
          console.log(`   Parsed array length: ${parsed.length}`);
          console.log(`   First 3 values: [${parsed.slice(0, 3).join(', ')}]`);
        }
      } catch (e) {
        console.log(`   JSON parse failed: ${e.message}`);
      }
    }

    console.log('\n🔧 Testing correct update...');
    
    // Generate a test embedding
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: 'test text',
        model: 'text-embedding-3-small'
      })
    });

    const data = await response.json();
    const testEmbedding = data.data[0].embedding;
    
    console.log(`✅ Generated test embedding: ${testEmbedding.length}D`);
    console.log(`   Type: ${typeof testEmbedding}, Array: ${Array.isArray(testEmbedding)}`);
    console.log(`   First 3 values: [${testEmbedding.slice(0, 3).map(v => v.toFixed(4)).join(', ')}]`);

    // Try to update with proper type
    const { data: updateResult, error: updateError } = await supabase
      .from('document_embeddings')
      .update({
        embedding: testEmbedding  // This should be an array, not stringified
      })
      .eq('id', chunk.id)
      .select();

    if (updateError) {
      console.error('❌ Update failed:', updateError);
    } else {
      console.log('✅ Update successful');
      console.log(`   Updated type: ${typeof updateResult[0].embedding}`);
      console.log(`   Is array: ${Array.isArray(updateResult[0].embedding)}`);
    }

  } catch (error) {
    console.error('Debug error:', error);
  }
}

debugEmbeddings();