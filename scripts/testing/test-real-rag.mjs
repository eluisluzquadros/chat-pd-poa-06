#!/usr/bin/env node

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Load environment variables
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !supabaseKey || !openaiApiKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const openai = new OpenAI({ apiKey: openaiApiKey });

// Test queries
const testQueries = [
  "O que diz o artigo 75?",
  "Qual a altura máxima em Petrópolis?",
  "Quais bairros têm proteção contra enchentes?",
  "O que é certificação em sustentabilidade ambiental?",
  "Qual o regime urbanístico do bairro Centro?",
  "O que diz o artigo 1 da LUOS?",
  "Quais são os parâmetros da ZOT-04?",
  "O que é concessão urbanística?"
];

async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return null;
  }
}

async function searchWithEmbeddings(query) {
  console.log(`\n🔍 Testing: "${query}"`);
  
  // Generate embedding
  const embedding = await generateEmbedding(query);
  if (!embedding) {
    console.log('❌ Failed to generate embedding');
    return null;
  }
  
  console.log('✅ Embedding generated');
  
  // Search in document_sections
  const { data: sectionResults, error: sectionError } = await supabase
    .rpc('match_document_sections', {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: 3
    });
  
  if (sectionError) {
    console.log('⚠️ Error searching document_sections:', sectionError.message);
  } else if (sectionResults && sectionResults.length > 0) {
    console.log(`📄 Found ${sectionResults.length} results in document_sections`);
    console.log('Top result similarity:', sectionResults[0].similarity);
    console.log('Preview:', sectionResults[0].content.substring(0, 200) + '...');
  } else {
    console.log('⚠️ No results from document_sections');
  }
  
  // Search in document_chunks (if exists)
  const { data: chunkResults, error: chunkError } = await supabase
    .rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: 3
    });
  
  if (chunkError) {
    console.log('⚠️ Error searching document_chunks:', chunkError.message);
  } else if (chunkResults && chunkResults.length > 0) {
    console.log(`📄 Found ${chunkResults.length} results in document_chunks`);
  }
  
  // Fallback to text search if no vector results
  if ((!sectionResults || sectionResults.length === 0) && (!chunkResults || chunkResults.length === 0)) {
    console.log('⚠️ No vector search results, trying text search...');
    
    const { data: textResults, error: textError } = await supabase
      .from('document_sections')
      .select('*')
      .textSearch('content', query)
      .limit(3);
    
    if (textResults && textResults.length > 0) {
      console.log(`📝 Found ${textResults.length} results via text search`);
      console.log('Preview:', textResults[0].content.substring(0, 200) + '...');
    } else {
      console.log('❌ No results found at all');
    }
  }
  
  // Combine all results
  const allResults = [...(sectionResults || []), ...(chunkResults || [])];
  return allResults;
}

async function generateResponse(query, documents) {
  if (!documents || documents.length === 0) {
    return "Não encontrei informações sobre isso na base de conhecimento.";
  }
  
  const context = documents.map(doc => doc.content).join('\n\n---\n\n');
  
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `Você é um assistente especializado no Plano Diretor de Porto Alegre.
          Use o contexto fornecido para responder a pergunta.
          Seja preciso e cite artigos quando relevante.
          
          CONTEXTO:
          ${context.substring(0, 3000)}`
        },
        { role: 'user', content: query }
      ],
      temperature: 0.3,
      max_tokens: 500
    });
    
    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Error generating response:', error);
    return "Erro ao gerar resposta.";
  }
}

async function testRAGPipeline() {
  console.log('🚀 Starting Real RAG Pipeline Test');
  console.log('=' .repeat(50));
  
  // Test database connection
  const { data: testData, error: testError } = await supabase
    .from('document_sections')
    .select('count')
    .limit(1);
  
  if (testError) {
    console.error('❌ Database connection failed:', testError);
    return;
  }
  
  console.log('✅ Database connected');
  
  // Test each query
  for (const query of testQueries) {
    const documents = await searchWithEmbeddings(query);
    
    if (documents && documents.length > 0) {
      console.log('🤖 Generating GPT response...');
      const response = await generateResponse(query, documents);
      console.log('📝 Response:', response.substring(0, 300) + '...');
    }
    
    console.log('-'.repeat(50));
  }
  
  console.log('\n✅ Test completed!');
}

// Run the test
testRAGPipeline().catch(console.error);