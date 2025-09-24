#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
try {
  const envContent = readFileSync(join(__dirname, '.env.local'), 'utf8');
  const envVars = {};
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      envVars[key.trim()] = value.trim();
    }
  });
  
  Object.assign(process.env, envVars);
} catch (error) {
  console.error('Error loading .env.local:', error.message);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkEmbeddingsQuality() {
  console.log('🔍 Checking embeddings quality...\n');

  try {
    // Get all embeddings
    const { data: embeddings, error } = await supabase
      .from('document_embeddings')
      .select('*')
      .order('document_id');

    if (error) {
      console.error('Error fetching embeddings:', error);
      return;
    }

    console.log(`📊 Total chunks: ${embeddings.length}`);

    if (embeddings.length === 0) {
      console.log('❌ No embeddings found in database!');
      return { needsImplementation: true, totalChunks: 0 };
    }

    // Analyze embedding quality
    let realEmbeddings = 0;
    let fakeEmbeddings = 0;
    let nullEmbeddings = 0;
    let dimensionCounts = {};

    embeddings.forEach(emb => {
      if (!emb.embedding || emb.embedding === null) {
        nullEmbeddings++;
        return;
      }

      if (!Array.isArray(emb.embedding)) {
        fakeEmbeddings++;
        return;
      }

      const dimension = emb.embedding.length;
      dimensionCounts[dimension] = (dimensionCounts[dimension] || 0) + 1;

      // Check for suspicious patterns
      if (dimension === 0) {
        fakeEmbeddings++;
        return;
      }

      // Check if all values are the same (common fake pattern)
      const firstValue = emb.embedding[0];
      if (emb.embedding.every(val => val === firstValue)) {
        fakeEmbeddings++;
        return;
      }

      // Check if values are suspiciously simple
      if (emb.embedding.every(val => val === 0 || val === 1 || val === -1)) {
        fakeEmbeddings++;
        return;
      }

      // Calculate variance to detect fake embeddings
      const mean = emb.embedding.reduce((sum, val) => sum + val, 0) / emb.embedding.length;
      const variance = emb.embedding.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / emb.embedding.length;
      
      if (variance < 0.001) { // Very low variance suggests fake embedding
        fakeEmbeddings++;
        return;
      }

      realEmbeddings++;
    });

    console.log(`✅ Real embeddings: ${realEmbeddings}`);
    console.log(`❌ Fake embeddings: ${fakeEmbeddings}`);
    console.log(`❓ Null embeddings: ${nullEmbeddings}`);

    console.log('\n📐 Embedding dimensions:');
    Object.entries(dimensionCounts).forEach(([dim, count]) => {
      const modelGuess = dim === '1536' ? 'text-embedding-3-small' : 
                        dim === '3072' ? 'text-embedding-3-large' :
                        dim === '1024' ? 'text-embedding-ada-002' : 'unknown';
      console.log(`  ${dim}D: ${count} chunks (${modelGuess})`);
    });

    // Show sample embeddings
    console.log('\n🔍 Sample analysis:');
    const sampleReal = embeddings.find(emb => 
      emb.embedding && 
      Array.isArray(emb.embedding) && 
      emb.embedding.length > 0 &&
      emb.embedding.some(val => val !== emb.embedding[0])
    );

    if (sampleReal) {
      console.log(`  Real embedding sample: Document ${sampleReal.document_id}`);
      console.log(`    Dimension: ${sampleReal.embedding.length}`);
      console.log(`    First 5 values: [${sampleReal.embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
      const mean = sampleReal.embedding.reduce((sum, val) => sum + val, 0) / sampleReal.embedding.length;
      const variance = sampleReal.embedding.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / sampleReal.embedding.length;
      console.log(`    Mean: ${mean.toFixed(4)}, Variance: ${variance.toFixed(4)}`);
    }

    const sampleFake = embeddings.find(emb => 
      emb.embedding && 
      Array.isArray(emb.embedding) && 
      emb.embedding.length > 0 &&
      emb.embedding.every(val => val === emb.embedding[0])
    );

    if (sampleFake) {
      console.log(`  Fake embedding sample: Document ${sampleFake.document_id}`);
      console.log(`    All values are: ${sampleFake.embedding[0]}`);
    }

    const needsReprocessing = fakeEmbeddings > 0 || nullEmbeddings > 0;
    
    if (needsReprocessing) {
      console.log('\n🚀 RECOMMENDATION: Implement real embeddings!');
      console.log(`  - ${fakeEmbeddings + nullEmbeddings} chunks need real embeddings`);
      console.log(`  - OpenAI API key is configured`);
      console.log(`  - Ready to enhance process-document function`);
    } else {
      console.log('\n✅ All embeddings appear to be high quality!');
    }

    return {
      totalChunks: embeddings.length,
      realEmbeddings,
      fakeEmbeddings,
      nullEmbeddings,
      needsReprocessing,
      dimensionCounts
    };

  } catch (error) {
    console.error('Error checking embeddings quality:', error);
    return { error: error.message };
  }
}

checkEmbeddingsQuality().then(result => {
  if (result?.error) {
    console.error('Check failed:', result.error);
  } else if (result?.needsReprocessing) {
    console.log('\n💡 Next steps:');
    console.log('1. Update process-document function with real OpenAI embeddings');
    console.log('2. Add fallback to local Sentence Transformers');
    console.log('3. Re-process all chunks with fake/null embeddings');
  }
}).catch(console.error);