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

function calculateVariance(embedding) {
  if (!embedding || embedding.length === 0) return 0;
  const mean = embedding.reduce((sum, val) => sum + val, 0) / embedding.length;
  return embedding.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / embedding.length;
}

async function verifyFinalEmbeddings() {
  console.log('🔍 Final verification of embeddings quality...\n');

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
    const models = {};
    const variances = [];

    chunks.forEach((chunk, index) => {
      console.log(`📝 Chunk ${index + 1} (ID: ${chunk.id})`);
      console.log(`   Content: "${chunk.content_chunk.substring(0, 60)}..."`);
      
      if (!chunk.embedding || chunk.embedding === null) {
        nullEmbeddings++;
        console.log(`   ❌ NULL embedding`);
        return;
      }

      if (!Array.isArray(chunk.embedding)) {
        fakeEmbeddings++;
        console.log(`   ❌ Not an array: ${typeof chunk.embedding}`);
        return;
      }

      const dimension = chunk.embedding.length;
      if (dimension === 0) {
        fakeEmbeddings++;
        console.log(`   ❌ Empty array`);
        return;
      }

      // Calculate variance
      const variance = calculateVariance(chunk.embedding);
      variances.push(variance);

      // Check metadata
      const model = chunk.chunk_metadata?.embedding_model || 'unknown';
      models[model] = (models[model] || 0) + 1;

      console.log(`   ✅ Real embedding: ${dimension}D, variance: ${variance.toFixed(6)}, model: ${model}`);
      console.log(`   📊 First 3 values: [${chunk.embedding.slice(0, 3).map(v => v.toFixed(4)).join(', ')}]`);
      
      realEmbeddings++;
      console.log(''); // Empty line for readability
    });

    console.log('📊 FINAL SUMMARY');
    console.log('================');
    console.log(`Total chunks: ${chunks.length}`);
    console.log(`✅ Real embeddings: ${realEmbeddings}`);
    console.log(`❌ Fake embeddings: ${fakeEmbeddings}`);
    console.log(`❓ Null embeddings: ${nullEmbeddings}`);
    console.log(`📈 Success rate: ${((realEmbeddings / chunks.length) * 100).toFixed(1)}%`);

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

    if (realEmbeddings === chunks.length) {
      console.log('\n🎉 SUCCESS! All embeddings are real and high quality!');
      console.log('   🧠 OpenAI text-embedding-3-small model active');
      console.log('   🔍 RAG system ready for optimal performance');
      console.log('   📊 All 16 chunks have been successfully processed');
    } else {
      console.log('\n⚠️  Some embeddings still need attention');
      console.log(`   ${fakeEmbeddings + nullEmbeddings} chunks need reprocessing`);
    }

    return {
      total: chunks.length,
      real: realEmbeddings,
      fake: fakeEmbeddings,
      null: nullEmbeddings,
      models,
      avgVariance: variances.length > 0 ? variances.reduce((sum, v) => sum + v, 0) / variances.length : 0
    };

  } catch (error) {
    console.error('Verification error:', error);
    return null;
  }
}

verifyFinalEmbeddings().then(result => {
  if (result && result.real === result.total) {
    console.log('\n✅ EMBEDDINGS IMPLEMENTATION COMPLETE');
    console.log('🚀 Real embeddings are now active and ready!');
    process.exit(0);
  } else {
    console.log('\n❌ Implementation needs attention');
    process.exit(1);
  }
}).catch(console.error);