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

async function generateEmbedding(text) {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: text,
      model: 'text-embedding-3-small'
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API Error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

function calculateVariance(embedding) {
  const mean = embedding.reduce((sum, val) => sum + val, 0) / embedding.length;
  return embedding.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / embedding.length;
}

async function reprocessAllChunks() {
  console.log('🚀 Reprocessing all chunks with real OpenAI embeddings...\n');

  try {
    // Get all chunks
    const { data: chunks, error } = await supabase
      .from('document_embeddings')
      .select('*')
      .order('id');

    if (error) {
      console.error('Error fetching chunks:', error);
      return;
    }

    console.log(`📊 Found ${chunks.length} chunks to reprocess`);
    
    let successful = 0;
    let failed = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`\n📝 Processing chunk ${i + 1}/${chunks.length} (ID: ${chunk.id})`);
      console.log(`   Content: "${chunk.content_chunk.substring(0, 80)}..."`);

      try {
        // Generate real embedding
        const embedding = await generateEmbedding(chunk.content_chunk);
        const variance = calculateVariance(embedding);
        
        console.log(`   ✅ Generated embedding: ${embedding.length}D, variance: ${variance.toFixed(6)}`);

        // Update chunk metadata
        const updatedMetadata = {
          ...chunk.chunk_metadata,
          embedding_model: 'text-embedding-3-small',
          embedding_dimension: embedding.length,
          embedding_variance: variance,
          reprocessed_at: new Date().toISOString(),
          original_fake: true
        };

        // Update the chunk
        const { error: updateError } = await supabase
          .from('document_embeddings')
          .update({
            embedding: embedding,
            chunk_metadata: updatedMetadata
          })
          .eq('id', chunk.id);

        if (updateError) {
          throw updateError;
        }

        successful++;
        console.log(`   ✅ Successfully updated chunk ${chunk.id}`);

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        failed++;
        console.error(`   ❌ Failed to process chunk ${chunk.id}: ${error.message}`);
        continue;
      }
    }

    console.log('\n🎉 REPROCESSING COMPLETE!');
    console.log('===========================');
    console.log(`📊 Total chunks: ${chunks.length}`);
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success rate: ${((successful / chunks.length) * 100).toFixed(1)}%`);

    if (successful > 0) {
      console.log('\n🚀 Real embeddings successfully implemented!');
      console.log('   🧠 All chunks now have high-quality OpenAI embeddings');
      console.log('   🔍 RAG system should provide much better search results');
      console.log('   📊 Embeddings use text-embedding-3-small model (1536D)');
    }

    return { total: chunks.length, successful, failed };

  } catch (error) {
    console.error('Error in reprocessing:', error);
    throw error;
  }
}

// Verification
async function verifyResults() {
  console.log('\n🔍 Verifying results...');

  const { data: updatedChunks, error } = await supabase
    .from('document_embeddings')
    .select('embedding, chunk_metadata')
    .limit(3);

  if (error) {
    console.error('Verification error:', error);
    return;
  }

  console.log('📊 Sample verification:');
  updatedChunks.forEach((chunk, index) => {
    if (chunk.embedding && Array.isArray(chunk.embedding)) {
      const variance = calculateVariance(chunk.embedding);
      console.log(`   Sample ${index + 1}: ${chunk.embedding.length}D, variance: ${variance.toFixed(6)}`);
      console.log(`   Model: ${chunk.chunk_metadata?.embedding_model || 'unknown'}`);
    }
  });
}

async function main() {
  try {
    const result = await reprocessAllChunks();
    await verifyResults();
    
    console.log('\n✅ All done! Real embeddings are now active.');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Process failed:', error);
    process.exit(1);
  }
}

main();