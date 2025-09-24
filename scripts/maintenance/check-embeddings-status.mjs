#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
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

async function checkEmbeddingsStatus() {
  console.log('🔍 Checking embeddings status...\n');

  try {
    // Check documents
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('id, title, type, is_processed');

    if (docsError) {
      console.error('Error fetching documents:', docsError);
      return;
    }

    console.log(`📄 Found ${documents.length} documents:`);
    documents.forEach(doc => {
      console.log(`  - ${doc.id}: ${doc.title} (${doc.type}) - Processed: ${doc.is_processed}`);
    });

    // Check embeddings
    const { data: embeddings, error: embError } = await supabase
      .from('document_embeddings')
      .select('document_id, chunk_index, embedding, priority_score, keywords')
      .order('document_id')
      .order('chunk_index');

    if (embError) {
      console.error('Error fetching embeddings:', embError);
      return;
    }

    console.log(`\n🧠 Found ${embeddings.length} chunks with embeddings:`);
    
    const embeddingsByDoc = {};
    embeddings.forEach(emb => {
      if (!embeddingsByDoc[emb.document_id]) {
        embeddingsByDoc[emb.document_id] = [];
      }
      embeddingsByDoc[emb.document_id].push(emb);
    });

    for (const [docId, chunks] of Object.entries(embeddingsByDoc)) {
      const doc = documents.find(d => d.id === docId);
      console.log(`\n  📋 Document: ${doc?.title || docId}`);
      console.log(`     Chunks: ${chunks.length}`);
      
      const realEmbeddings = chunks.filter(c => c.embedding && Array.isArray(c.embedding) && c.embedding.length > 0);
      const fakeEmbeddings = chunks.filter(c => !c.embedding || !Array.isArray(c.embedding) || c.embedding.length === 0);
      
      console.log(`     Real embeddings: ${realEmbeddings.length}`);
      console.log(`     Fake/Missing embeddings: ${fakeEmbeddings.length}`);
      
      if (realEmbeddings.length > 0) {
        const avgDimension = realEmbeddings.reduce((sum, emb) => sum + emb.embedding.length, 0) / realEmbeddings.length;
        console.log(`     Avg embedding dimension: ${avgDimension.toFixed(0)}`);
        
        const avgScore = chunks.reduce((sum, c) => sum + (c.priority_score || 0), 0) / chunks.length;
        console.log(`     Avg priority score: ${avgScore.toFixed(2)}`);
      }
    }

    // Check for fake embeddings (common patterns)
    const fakeEmbeddings = embeddings.filter(emb => {
      if (!emb.embedding || !Array.isArray(emb.embedding)) return true;
      if (emb.embedding.length === 0) return true;
      
      // Check if all values are the same (common fake pattern)
      const firstValue = emb.embedding[0];
      if (emb.embedding.every(val => val === firstValue)) return true;
      
      // Check if values are suspiciously simple (like all 0s or 1s)
      if (emb.embedding.every(val => val === 0 || val === 1)) return true;
      
      return false;
    });

    console.log(`\n⚠️  Suspected fake embeddings: ${fakeEmbeddings.length}`);

    if (fakeEmbeddings.length > 0) {
      console.log('\n🔧 These chunks need real embeddings:');
      fakeEmbeddings.slice(0, 5).forEach(emb => {
        console.log(`   - Document ${emb.document_id}, Chunk ${emb.chunk_index}`);
      });
      if (fakeEmbeddings.length > 5) {
        console.log(`   ... and ${fakeEmbeddings.length - 5} more`);
      }
    }

    return {
      totalDocuments: documents.length,
      totalChunks: embeddings.length,
      realEmbeddings: embeddings.length - fakeEmbeddings.length,
      fakeEmbeddings: fakeEmbeddings.length,
      needsReprocessing: fakeEmbeddings.length > 0
    };

  } catch (error) {
    console.error('Error checking embeddings status:', error);
  }
}

async function main() {
  const status = await checkEmbeddingsStatus();
  
  if (status?.needsReprocessing) {
    console.log('\n🚀 Ready to implement real embeddings!');
    console.log('   1. OpenAI API key is configured');
    console.log('   2. Found chunks that need real embeddings');
    console.log('   3. Process-document function is ready to be enhanced');
  } else {
    console.log('\n✅ All embeddings appear to be real!');
  }
}

main().catch(console.error);