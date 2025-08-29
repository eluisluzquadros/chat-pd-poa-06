#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
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
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

class RealEmbeddingGenerator {
  constructor() {
    this.model = 'text-embedding-3-small';
    this.maxRetries = 3;
    this.retryDelay = 1000; // Start with 1 second
  }

  async generateRealEmbedding(text, retryCount = 0) {
    try {
      console.log(`🔄 Generating embedding (attempt ${retryCount + 1}/${this.maxRetries})...`);
      
      // Clean text
      const cleanText = text.trim().replace(/\s+/g, ' ');
      if (!cleanText) {
        throw new Error('Empty text after cleaning');
      }

      const response = await openai.embeddings.create({
        model: this.model,
        input: cleanText,
      });

      const embedding = response.data[0].embedding;

      if (!Array.isArray(embedding) || embedding.length === 0) {
        throw new Error('Invalid embedding format');
      }

      // Validate embedding quality
      const mean = embedding.reduce((sum, val) => sum + val, 0) / embedding.length;
      const variance = embedding.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / embedding.length;
      
      if (variance < 0.001) {
        throw new Error('Embedding has suspiciously low variance');
      }

      console.log(`✅ Generated real embedding: ${embedding.length}D, variance: ${variance.toFixed(6)}`);
      return embedding;

    } catch (error) {
      console.error(`❌ Embedding generation failed: ${error.message}`);
      
      if (retryCount < this.maxRetries - 1) {
        const delay = this.retryDelay * Math.pow(2, retryCount);
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.generateRealEmbedding(text, retryCount + 1);
      }
      
      throw error;
    }
  }

  calculateVariance(embedding) {
    if (!embedding || embedding.length === 0) return 0;
    const mean = embedding.reduce((sum, val) => sum + val, 0) / embedding.length;
    return embedding.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / embedding.length;
  }
}

async function reprocessAllEmbeddings() {
  console.log('🚀 Starting real embeddings reprocessing...\n');

  const generator = new RealEmbeddingGenerator();
  
  try {
    // Get all existing embeddings
    const { data: existingEmbeddings, error } = await supabase
      .from('document_embeddings')
      .select('*')
      .order('document_id')
      .order('id');

    if (error) {
      console.error('Error fetching existing embeddings:', error);
      return;
    }

    console.log(`📊 Found ${existingEmbeddings.length} chunks to reprocess\n`);

    let processed = 0;
    let successful = 0;
    let failed = 0;
    const results = [];

    for (const chunk of existingEmbeddings) {
      processed++;
      console.log(`\n📝 Processing chunk ${processed}/${existingEmbeddings.length}`);
      console.log(`   Document: ${chunk.document_id}`);
      console.log(`   Content: "${chunk.content_chunk.substring(0, 100)}..."`);

      try {
        // Generate real embedding
        const realEmbedding = await generator.generateRealEmbedding(chunk.content_chunk);
        
        // Prepare updated metadata
        const existingMetadata = chunk.chunk_metadata || {};
        const updatedMetadata = {
          ...existingMetadata,
          embedding_model: generator.model,
          embedding_dimension: realEmbedding.length,
          embedding_variance: generator.calculateVariance(realEmbedding),
          reprocessed_at: new Date().toISOString(),
          previous_embedding_fake: true
        };

        // Update the chunk with real embedding
        const { error: updateError } = await supabase
          .from('document_embeddings')
          .update({
            embedding: realEmbedding,
            chunk_metadata: updatedMetadata
          })
          .eq('id', chunk.id);

        if (updateError) {
          throw updateError;
        }

        successful++;
        console.log(`✅ Successfully updated chunk ${chunk.id}`);
        console.log(`   New embedding: ${realEmbedding.length}D, variance: ${generator.calculateVariance(realEmbedding).toFixed(6)}`);

        results.push({
          chunkId: chunk.id,
          documentId: chunk.document_id,
          status: 'success',
          embeddingDimension: realEmbedding.length,
          variance: generator.calculateVariance(realEmbedding)
        });

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        failed++;
        console.error(`❌ Failed to process chunk ${chunk.id}: ${error.message}`);
        
        results.push({
          chunkId: chunk.id,
          documentId: chunk.document_id,
          status: 'failed',
          error: error.message
        });
        
        // Continue with next chunk
        continue;
      }
    }

    // Summary
    console.log('\n📊 REPROCESSING COMPLETE');
    console.log('==========================');
    console.log(`Total chunks: ${existingEmbeddings.length}`);
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success rate: ${((successful / existingEmbeddings.length) * 100).toFixed(1)}%`);

    // Group results by document
    const resultsByDoc = {};
    results.forEach(result => {
      if (!resultsByDoc[result.documentId]) {
        resultsByDoc[result.documentId] = { successful: 0, failed: 0 };
      }
      if (result.status === 'success') {
        resultsByDoc[result.documentId].successful++;
      } else {
        resultsByDoc[result.documentId].failed++;
      }
    });

    console.log('\n📋 Results by document:');
    Object.entries(resultsByDoc).forEach(([docId, stats]) => {
      console.log(`  Document ${docId}: ${stats.successful} success, ${stats.failed} failed`);
    });

    if (successful > 0) {
      console.log('\n🎉 Real embeddings successfully implemented!');
      console.log('   All chunks now have high-quality OpenAI embeddings');
      console.log('   RAG system should now provide much better results');
    }

    if (failed > 0) {
      console.log('\n⚠️  Some chunks failed to process');
      console.log('   Consider investigating failed chunks manually');
      console.log('   Check OpenAI API limits and connection');
    }

    return {
      total: existingEmbeddings.length,
      successful,
      failed,
      results
    };

  } catch (error) {
    console.error('Error in reprocessing:', error);
    throw error;
  }
}

// Verification function
async function verifyEmbeddingQuality() {
  console.log('\n🔍 Verifying embedding quality...');
  
  const { data: embeddings, error } = await supabase
    .from('document_embeddings')
    .select('embedding, chunk_metadata')
    .limit(5);

  if (error) {
    console.error('Error verifying embeddings:', error);
    return;
  }

  console.log('📊 Sample verification:');
  embeddings.forEach((emb, index) => {
    if (emb.embedding && Array.isArray(emb.embedding)) {
      const variance = emb.embedding.reduce((sum, val, _, arr) => {
        const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
        return sum + Math.pow(val - mean, 2);
      }, 0) / emb.embedding.length;
      
      console.log(`  Sample ${index + 1}: ${emb.embedding.length}D, variance: ${variance.toFixed(6)}`);
    }
  });
}

// Main execution
async function main() {
  try {
    const result = await reprocessAllEmbeddings();
    await verifyEmbeddingQuality();
    
    console.log('\n✅ Embeddings reprocessing completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Reprocessing failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}