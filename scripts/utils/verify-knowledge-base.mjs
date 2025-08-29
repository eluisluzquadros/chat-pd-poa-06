#!/usr/bin/env node
/**
 * Verify Knowledge Base Data in Supabase
 * 
 * Checks if the processed documents were saved correctly
 * and tests vector search functionality
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Check document_sections table
 */
async function checkDocumentSections() {
  console.log('\n📊 Checking document_sections table...');
  
  const { data, count, error } = await supabase
    .from('document_sections')
    .select('id, metadata, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (error) {
    console.error('❌ Error querying document_sections:', error.message);
    return 0;
  }
  
  console.log(`✅ Total chunks in document_sections: ${count}`);
  
  if (data && data.length > 0) {
    console.log('\n📋 Recent chunks:');
    data.forEach((chunk, index) => {
      const metadata = chunk.metadata || {};
      console.log(`  ${index + 1}. Document: ${metadata.document_type || 'Unknown'}`);
      console.log(`     Source: ${metadata.source_file || 'Unknown'}`);
      console.log(`     Created: ${new Date(chunk.created_at).toLocaleString()}`);
    });
  }
  
  return count || 0;
}

/**
 * Check legal_articles table
 */
async function checkLegalArticles() {
  console.log('\n📊 Checking legal_articles table...');
  
  const { data, count, error } = await supabase
    .from('legal_articles')
    .select('id, metadata, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (error) {
    console.error('❌ Error querying legal_articles:', error.message);
    return 0;
  }
  
  console.log(`✅ Total articles in legal_articles: ${count}`);
  
  if (data && data.length > 0) {
    console.log('\n📋 Recent articles:');
    data.forEach((article, index) => {
      const metadata = article.metadata || {};
      console.log(`  ${index + 1}. Article: ${metadata.article_number || 'Unknown'}`);
      console.log(`     Document: ${metadata.document_type || 'Unknown'}`);
      console.log(`     Created: ${new Date(article.created_at).toLocaleString()}`);
    });
  }
  
  return count || 0;
}

/**
 * Test vector search functionality
 */
async function testVectorSearch(query = 'altura máxima de construção') {
  console.log('\n🔍 Testing vector search...');
  console.log(`📝 Query: "${query}"`);
  
  if (!openaiApiKey) {
    console.log('⚠️ OpenAI API key not found, skipping vector search test');
    return;
  }
  
  try {
    // Generate embedding for query
    console.log('🔄 Generating embedding for query...');
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: query
      })
    });
    
    if (!embeddingResponse.ok) {
      throw new Error(`OpenAI API error: ${embeddingResponse.statusText}`);
    }
    
    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;
    
    // Search using vector similarity
    console.log('🔎 Searching for similar documents...');
    
    const { data: results, error } = await supabase.rpc('match_document_sections', {
      query_embedding: queryEmbedding,
      match_threshold: 0.5,
      match_count: 5
    });
    
    if (error) {
      console.error('❌ Error in vector search:', error.message);
      return;
    }
    
    if (results && results.length > 0) {
      console.log(`\n✅ Found ${results.length} similar documents:`);
      results.forEach((result, index) => {
        console.log(`\n  ${index + 1}. Similarity: ${(result.similarity * 100).toFixed(2)}%`);
        console.log(`     Content: ${result.content.substring(0, 150)}...`);
        if (result.metadata) {
          console.log(`     Source: ${result.metadata.source || 'Unknown'}`);
        }
      });
    } else {
      console.log('⚠️ No similar documents found');
    }
    
  } catch (error) {
    console.error('❌ Error testing vector search:', error.message);
  }
}

/**
 * Check if embeddings exist
 */
async function checkEmbeddings() {
  console.log('\n🔍 Checking if embeddings exist...');
  
  const { data, error } = await supabase
    .from('document_sections')
    .select('id, embedding')
    .not('embedding', 'is', null)
    .limit(1);
  
  if (error) {
    console.error('❌ Error checking embeddings:', error.message);
    return false;
  }
  
  if (data && data.length > 0) {
    console.log('✅ Embeddings are present in document_sections');
    return true;
  } else {
    console.log('⚠️ No embeddings found in document_sections');
    return false;
  }
}

/**
 * Main verification function
 */
async function main() {
  console.log('🚀 Knowledge Base Verification');
  console.log('=' .repeat(50));
  
  // Check document_sections
  const sectionsCount = await checkDocumentSections();
  
  // Check legal_articles
  const articlesCount = await checkLegalArticles();
  
  // Check embeddings
  const hasEmbeddings = await checkEmbeddings();
  
  // Test vector search if embeddings exist
  if (hasEmbeddings) {
    await testVectorSearch('altura máxima de construção');
    await testVectorSearch('zoneamento urbano');
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary:');
  console.log(`  - Document Sections: ${sectionsCount} chunks`);
  console.log(`  - Legal Articles: ${articlesCount} articles`);
  console.log(`  - Embeddings: ${hasEmbeddings ? '✅ Present' : '❌ Missing'}`);
  console.log(`  - Vector Search: ${hasEmbeddings ? '✅ Working' : '⚠️ Not tested'}`);
  
  if (sectionsCount > 0 && hasEmbeddings) {
    console.log('\n✅ Knowledge base is ready for use!');
  } else {
    console.log('\n⚠️ Knowledge base needs attention');
    if (sectionsCount === 0) {
      console.log('  - Run: npm run kb:process');
    }
    if (!hasEmbeddings) {
      console.log('  - Embeddings are missing');
    }
  }
}

// Run verification
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});