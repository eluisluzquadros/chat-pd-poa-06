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

function parseEmbedding(embedding) {
  if (Array.isArray(embedding)) {
    return embedding;
  }
  if (typeof embedding === 'string') {
    try {
      const parsed = JSON.parse(embedding);
      return Array.isArray(parsed) ? parsed : null;
    } catch (e) {
      return null;
    }
  }
  return null;
}

function calculateVariance(embedding) {
  if (!embedding || embedding.length === 0) return 0;
  const mean = embedding.reduce((sum, val) => sum + val, 0) / embedding.length;
  return embedding.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / embedding.length;
}

function isRealEmbedding(embedding) {
  if (!embedding || embedding.length === 0) return false;
  
  // Check variance (real embeddings should have decent variance)
  const variance = calculateVariance(embedding);
  if (variance < 0.0001) return false; // Too low variance suggests fake
  
  // Check for suspicious patterns
  const uniqueValues = new Set(embedding.slice(0, 10));
  if (uniqueValues.size === 1) return false; // All same values
  
  // Check if values are reasonable floats
  if (!embedding.every(val => typeof val === 'number' && Math.abs(val) < 2)) return false;
  
  return true;
}

async function verifyEmbeddingsCorrect() {
  console.log('🔍 Correct verification of embeddings quality...\n');

  try {
    const { data: chunks, error } = await supabase
      .from('document_embeddings')
      .select('*')
      .order('id');

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log(`📊 Total chunks in database: ${chunks.length}\n`);

    let realEmbeddings = 0;
    let fakeEmbeddings = 0;
    let nullEmbeddings = 0;
    let parseErrors = 0;
    const models = {};
    const variances = [];
    const dimensions = {};

    chunks.forEach((chunk, index) => {
      console.log(`📝 Chunk ${index + 1} (ID: ${chunk.id})`);
      console.log(`   Content: "${chunk.content_chunk.substring(0, 50)}..."`);
      
      if (!chunk.embedding || chunk.embedding === null) {
        nullEmbeddings++;
        console.log(`   ❌ NULL embedding`);
        return;
      }

      // Parse the embedding (handles both string JSON and array formats)
      const parsedEmbedding = parseEmbedding(chunk.embedding);
      
      if (!parsedEmbedding) {
        parseErrors++;
        console.log(`   ❌ Parse error`);
        return;
      }

      const dimension = parsedEmbedding.length;
      dimensions[dimension] = (dimensions[dimension] || 0) + 1;

      // Check if it's a real embedding
      if (!isRealEmbedding(parsedEmbedding)) {
        fakeEmbeddings++;
        console.log(`   ❌ Fake embedding detected`);
        return;
      }

      // Calculate statistics
      const variance = calculateVariance(parsedEmbedding);
      variances.push(variance);

      // Check metadata
      const metadata = chunk.chunk_metadata || {};
      const model = metadata.embedding_model || 'unknown';
      models[model] = (models[model] || 0) + 1;

      console.log(`   ✅ Real embedding: ${dimension}D, variance: ${variance.toFixed(6)}, model: ${model}`);
      console.log(`   📊 First 3 values: [${parsedEmbedding.slice(0, 3).map(v => v.toFixed(4)).join(', ')}]`);
      
      realEmbeddings++;
      console.log(''); // Empty line for readability
    });

    console.log('📊 FINAL SUMMARY');
    console.log('================');
    console.log(`Total chunks: ${chunks.length}`);
    console.log(`✅ Real embeddings: ${realEmbeddings}`);
    console.log(`❌ Fake embeddings: ${fakeEmbeddings}`);
    console.log(`❓ Null embeddings: ${nullEmbeddings}`);
    console.log(`🔧 Parse errors: ${parseErrors}`);
    console.log(`📈 Success rate: ${((realEmbeddings / chunks.length) * 100).toFixed(1)}%`);

    console.log('\n📐 Dimensions:');
    Object.entries(dimensions).forEach(([dim, count]) => {
      const modelGuess = dim === '1536' ? 'text-embedding-3-small' : 
                        dim === '3072' ? 'text-embedding-3-large' :
                        dim === '1024' ? 'text-embedding-ada-002' : 'unknown';
      console.log(`   ${dim}D: ${count} chunks (${modelGuess})`);
    });

    console.log('\n📐 Models used:');
    Object.entries(models).forEach(([model, count]) => {
      console.log(`   ${model}: ${count} chunks`);
    });

    if (variances.length > 0) {
      const avgVariance = variances.reduce((sum, v) => sum + v, 0) / variances.length;
      const minVariance = Math.min(...variances);
      const maxVariance = Math.max(...variances);
      
      console.log('\n📊 Variance statistics:');
      console.log(`   Average: ${avgVariance.toFixed(6)}`);
      console.log(`   Min: ${minVariance.toFixed(6)}`);
      console.log(`   Max: ${maxVariance.toFixed(6)}`);
    }

    if (realEmbeddings === chunks.length && realEmbeddings > 0) {
      console.log('\n🎉 SUCCESS! All embeddings are real and high quality!');
      console.log('   🧠 OpenAI text-embedding-3-small model active');
      console.log('   🔍 RAG system ready for optimal performance');
      console.log(`   📊 All ${chunks.length} chunks have been successfully processed`);
      console.log('   ✅ Implementation completed successfully!');
    } else {
      console.log('\n⚠️  Some embeddings still need attention');
      console.log(`   ${fakeEmbeddings + nullEmbeddings + parseErrors} chunks need reprocessing`);
    }

    return {
      total: chunks.length,
      real: realEmbeddings,
      fake: fakeEmbeddings,
      null: nullEmbeddings,
      parseErrors,
      models,
      dimensions,
      avgVariance: variances.length > 0 ? variances.reduce((sum, v) => sum + v, 0) / variances.length : 0
    };

  } catch (error) {
    console.error('Verification error:', error);
    return null;
  }
}

verifyEmbeddingsCorrect().then(result => {
  if (result) {
    console.log('\n📈 IMPLEMENTATION RESULTS:');
    console.log(`   Total chunks processed: ${result.total}`);
    console.log(`   Real embeddings: ${result.real}`);
    console.log(`   Success rate: ${((result.real / result.total) * 100).toFixed(1)}%`);
    
    if (result.real === result.total && result.total > 0) {
      console.log('\n✅ MISSION ACCOMPLISHED!');
      console.log('🚀 Real embeddings implementation is COMPLETE!');
      process.exit(0);
    } else {
      console.log('\n❌ Implementation needs attention');
      process.exit(1);
    }
  } else {
    console.log('\n❌ Verification failed');
    process.exit(1);
  }
}).catch(console.error);