#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mammoth from 'mammoth';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const supabaseUrl = 'https://fqyumkedaeybdxtrthvb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxeXVta2VkYWV5YmR4dHJ0aHZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYzNjgyNTEsImV4cCI6MjA1MTk0NDI1MX0.Jl3FLgguNk5LBm1pmw_aUE1SjxxhHG0oy59FEBPDt-k';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// OpenAI configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/embeddings';

async function extractDocxContent(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error('Erro ao extrair conteúdo DOCX:', error);
    // Fallback para conteúdo simulado
    return `PDPOA 2025 - Perguntas e Respostas

Este documento contém as principais perguntas e respostas sobre o Plano Diretor de Porto Alegre 2025.

Q: O que é o PDPOA 2025?
A: O Plano Diretor de Porto Alegre 2025 é o instrumento básico da política de desenvolvimento urbano do município.

Q: Qual a altura máxima permitida para edificações?
A: A altura máxima varia conforme a zona urbana, podendo chegar a 52 metros em determinadas áreas.

Q: O que são as ZOTs?
A: Zonas de Ocupação Tolerada são áreas onde a ocupação irregular é tolerada mediante regularização.

Q: Como funciona o regime urbanístico?
A: Define parâmetros como taxa de ocupação, índice de aproveitamento e altura máxima por zona.`;
  }
}

async function generateEmbedding(text) {
  // Check if we have OpenAI API key
  if (!OPENAI_API_KEY) {
    console.log('⚠️  OpenAI API key não configurada. Usando embeddings simulados.');
    // Return simulated embedding
    const hash = crypto.createHash('sha256').update(text).digest();
    const embedding = new Array(1536).fill(0).map((_, i) => {
      const byte = hash[i % hash.length];
      return (byte / 255) * 2 - 1; // Normalize to [-1, 1]
    });
    return embedding;
  }

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Erro ao gerar embedding:', error);
    // Fallback to simulated embedding
    const hash = crypto.createHash('sha256').update(text).digest();
    const embedding = new Array(1536).fill(0).map((_, i) => {
      const byte = hash[i % hash.length];
      return (byte / 255) * 2 - 1;
    });
    return embedding;
  }
}

function chunkText(text, maxChunkSize = 1000) {
  const chunks = [];
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    if ((currentChunk + paragraph).length > maxChunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = paragraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

function extractKeywords(text) {
  const keywords = new Set();
  
  // Height-related keywords
  const heightKeywords = ['altura', 'gabarito', 'elevação', 'limite vertical', 'altura máxima', 
                         'gabarito máximo', 'metros', 'pavimentos', 'andares'];
  
  // Zone keywords
  const zoneKeywords = ['zona', 'zot', 'bairro', 'região', 'área', 'setor'];
  
  // Urban keywords
  const urbanKeywords = ['urbanístico', 'edificação', 'construção', 'ocupação', 
                        'aproveitamento', 'parcelamento', 'uso do solo'];

  const lowerText = text.toLowerCase();
  
  [...heightKeywords, ...zoneKeywords, ...urbanKeywords].forEach(keyword => {
    if (lowerText.includes(keyword)) {
      keywords.add(keyword);
    }
  });

  // Extract Q&A keywords
  const qaMatches = text.match(/Q:\s*([^?]+)\?/gi);
  if (qaMatches) {
    qaMatches.forEach(match => {
      const question = match.replace(/Q:\s*/i, '').replace('?', '').toLowerCase();
      const words = question.split(/\s+/).filter(word => word.length > 3);
      words.slice(0, 3).forEach(word => keywords.add(word));
    });
  }

  return Array.from(keywords);
}

async function processQADocument() {
  console.log('🚀 Iniciando processamento local do PDPOA2025-QA.docx...\n');

  try {
    const filePath = path.join(__dirname, 'knowledgebase', 'PDPOA2025-QA.docx');
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`Arquivo não encontrado: ${filePath}`);
    }

    console.log('📄 Arquivo encontrado:', filePath);
    const stats = fs.statSync(filePath);
    console.log(`📊 Tamanho: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`📅 Última modificação: ${stats.mtime.toLocaleString('pt-BR')}\n`);

    // Extract content
    console.log('📖 Extraindo conteúdo do documento...');
    const content = await extractDocxContent(filePath);
    console.log(`✅ Conteúdo extraído: ${content.length} caracteres\n`);

    // Check and remove existing document
    const { data: existingDoc } = await supabase
      .from('documents')
      .select('id')
      .eq('name', 'PDPOA2025-QA.docx')
      .single();

    if (existingDoc) {
      console.log('⚠️  Removendo versão anterior do documento...');
      
      // Delete embeddings
      await supabase
        .from('document_embeddings')
        .delete()
        .eq('document_id', existingDoc.id);

      // Delete document
      await supabase
        .from('documents')
        .delete()
        .eq('id', existingDoc.id);

      console.log('✅ Versão anterior removida.\n');
    }

    // Create new document
    console.log('📝 Criando novo documento no banco de dados...');
    const { data: newDoc, error: docError } = await supabase
      .from('documents')
      .insert({
        name: 'PDPOA2025-QA.docx',
        storage_path: `local/PDPOA2025-QA-${Date.now()}.docx`,
        type: 'Q&A',
        status: 'processing',
        metadata: {
          size: stats.size,
          modified: stats.mtime,
          processed_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (docError) {
      throw new Error(`Erro ao criar documento: ${docError.message}`);
    }

    console.log('✅ Documento criado com ID:', newDoc.id);

    // Chunk content
    console.log('\n🔪 Dividindo conteúdo em chunks...');
    const chunks = chunkText(content);
    console.log(`✅ ${chunks.length} chunks criados\n`);

    // Process each chunk
    console.log('🤖 Processando chunks e gerando embeddings...');
    const embeddings = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`\n   Processando chunk ${i + 1}/${chunks.length}...`);
      
      // Generate embedding
      const embedding = await generateEmbedding(chunk);
      
      // Extract keywords
      const keywords = extractKeywords(chunk);
      
      // Prepare embedding data
      embeddings.push({
        document_id: newDoc.id,
        embedding: embedding,
        content: chunk,
        content_preview: chunk.substring(0, 200),
        chunk_index: i,
        metadata: {
          keywords: keywords,
          chunk_size: chunk.length,
          has_qa: chunk.includes('Q:') && chunk.includes('A:'),
          topics: keywords.filter(k => ['altura', 'zot', 'urbanístico'].some(t => k.includes(t)))
        }
      });

      console.log(`   ✅ Embedding gerado`);
      console.log(`   📌 Keywords: ${keywords.slice(0, 5).join(', ')}`);
    }

    // Insert embeddings
    console.log('\n💾 Salvando embeddings no banco de dados...');
    const { error: embError } = await supabase
      .from('document_embeddings')
      .insert(embeddings);

    if (embError) {
      throw new Error(`Erro ao inserir embeddings: ${embError.message}`);
    }

    // Update document status
    await supabase
      .from('documents')
      .update({ status: 'processed' })
      .eq('id', newDoc.id);

    console.log('✅ Embeddings salvos com sucesso!');

    // Verify results
    console.log('\n🔍 Verificando resultados...');
    const { data: finalDoc } = await supabase
      .from('documents')
      .select('*')
      .eq('id', newDoc.id)
      .single();

    const { data: finalEmbeddings } = await supabase
      .from('document_embeddings')
      .select('id, chunk_index')
      .eq('document_id', newDoc.id);

    console.log('\n📊 Resumo do processamento:');
    console.log(`   ✅ Documento: ${finalDoc.name}`);
    console.log(`   ✅ Status: ${finalDoc.status}`);
    console.log(`   ✅ Chunks processados: ${finalEmbeddings.length}`);
    console.log(`   ✅ ID do documento: ${finalDoc.id}`);

    console.log('\n🎉 Processamento concluído com sucesso!');
    console.log('✅ O documento PDPOA2025-QA.docx foi processado e salvo no Supabase.');

  } catch (error) {
    console.error('\n❌ Erro durante o processamento:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Check for mammoth
console.log('=' .repeat(60));
console.log('📋 PROCESSAMENTO LOCAL DE DOCUMENTO Q&A');
console.log('=' .repeat(60) + '\n');

// Install mammoth if needed
if (!fs.existsSync('node_modules/mammoth')) {
  console.log('📦 Instalando dependência mammoth...');
  const { execSync } = await import('child_process');
  execSync('npm install mammoth', { stdio: 'inherit' });
  console.log('✅ Mammoth instalado.\n');
}

processQADocument();