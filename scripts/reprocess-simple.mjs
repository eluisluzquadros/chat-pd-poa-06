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

async function quickReprocess() {
  console.log('🚀 Quick reprocessing of embeddings...\n');

  try {
    // Get all chunks
    const { data: chunks, error } = await supabase
      .from('document_embeddings')
      .select('*');

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log(`Found ${chunks.length} chunks`);

    // Test OpenAI connection with first chunk
    const testChunk = chunks[0];
    if (testChunk) {
      console.log(`\nTesting with: "${testChunk.content_chunk.substring(0, 50)}..."`);
      
      try {
        const response = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: testChunk.content_chunk,
            model: 'text-embedding-3-small'
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('OpenAI API Error:', response.status, errorText);
          return;
        }

        const data = await response.json();
        const embedding = data.data[0].embedding;
        
        console.log(`✅ Generated test embedding: ${embedding.length}D`);
        console.log(`   First few values: [${embedding.slice(0, 3).map(v => v.toFixed(4)).join(', ')}...]`);

        // Update the test chunk
        const { error: updateError } = await supabase
          .from('document_embeddings')
          .update({
            embedding: embedding,
            chunk_metadata: {
              ...testChunk.chunk_metadata,
              embedding_model: 'text-embedding-3-small',
              reprocessed_at: new Date().toISOString()
            }
          })
          .eq('id', testChunk.id);

        if (updateError) {
          console.error('Update error:', updateError);
        } else {
          console.log('✅ Test chunk updated successfully!');
        }

      } catch (error) {
        console.error('Test failed:', error.message);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

quickReprocess();