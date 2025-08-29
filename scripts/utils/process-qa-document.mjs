#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const supabaseUrl = 'https://fqyumkedaeybdxtrthvb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxeXVta2VkYWV5YmR4dHJ0aHZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYzNjgyNTEsImV4cCI6MjA1MTk0NDI1MX0.Jl3FLgguNk5LBm1pmw_aUE1SjxxhHG0oy59FEBPDt-k';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function processQADocument() {
  console.log('🚀 Iniciando processamento do PDPOA2025-QA.docx atualizado...\n');

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

    // First, check if document already exists in database
    const { data: existingDoc, error: checkError } = await supabase
      .from('documents')
      .select('id, name, updated_at')
      .eq('name', 'PDPOA2025-QA.docx')
      .single();

    if (existingDoc) {
      console.log('⚠️  Documento já existe no banco. Removendo versão anterior...');
      
      // Delete existing embeddings
      const { error: deleteEmbeddingsError } = await supabase
        .from('document_embeddings')
        .delete()
        .eq('document_id', existingDoc.id);

      if (deleteEmbeddingsError) {
        console.error('❌ Erro ao deletar embeddings:', deleteEmbeddingsError);
      }

      // Delete existing document
      const { error: deleteDocError } = await supabase
        .from('documents')
        .delete()
        .eq('id', existingDoc.id);

      if (deleteDocError) {
        console.error('❌ Erro ao deletar documento:', deleteDocError);
      }

      console.log('✅ Versão anterior removida.\n');
    }

    // Upload file to storage
    console.log('📤 Fazendo upload do arquivo para o storage...');
    const fileContent = await readFile(filePath);
    const fileName = `PDPOA2025-QA-${Date.now()}.docx`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, fileContent, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Erro no upload: ${uploadError.message}`);
    }

    console.log('✅ Upload concluído:', uploadData.path);

    // Process document using Edge Function
    console.log('\n🔄 Processando documento com Edge Function...');
    
    const formData = new FormData();
    formData.append('file', fileContent, {
      filename: 'PDPOA2025-QA.docx',
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
    formData.append('storage_path', uploadData.path);
    formData.append('use_hierarchical_chunking', 'true');
    formData.append('extract_keywords', 'true');

    const response = await fetch(`${supabaseUrl}/functions/v1/process-document`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        ...formData.getHeaders()
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Edge Function error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Documento processado com sucesso!');
    console.log(`📊 Chunks criados: ${result.chunks_created || 'N/A'}`);
    console.log(`🔑 Keywords extraídas: ${result.keywords_extracted || 'N/A'}`);

    // Verify processing results
    console.log('\n🔍 Verificando resultados do processamento...');
    
    // Check document in database
    const { data: newDoc, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('name', 'PDPOA2025-QA.docx')
      .single();

    if (docError) {
      console.error('❌ Erro ao verificar documento:', docError);
    } else {
      console.log('\n✅ Documento no banco de dados:');
      console.log(`   ID: ${newDoc.id}`);
      console.log(`   Nome: ${newDoc.name}`);
      console.log(`   Tipo: ${newDoc.type || 'Q&A'}`);
      console.log(`   Status: ${newDoc.status || 'processed'}`);
    }

    // Check embeddings
    if (newDoc) {
      const { data: embeddings, error: embError } = await supabase
        .from('document_embeddings')
        .select('id, chunk_index, content_preview, metadata')
        .eq('document_id', newDoc.id)
        .order('chunk_index');

      if (embError) {
        console.error('❌ Erro ao verificar embeddings:', embError);
      } else {
        console.log(`\n📚 Embeddings criados: ${embeddings.length}`);
        embeddings.forEach((emb, idx) => {
          console.log(`\n   Chunk ${emb.chunk_index}:`);
          console.log(`   Preview: ${emb.content_preview?.substring(0, 100)}...`);
          if (emb.metadata?.keywords) {
            console.log(`   Keywords: ${emb.metadata.keywords.slice(0, 5).join(', ')}`);
          }
        });
      }
    }

    console.log('\n🎉 Processamento e deploy concluídos com sucesso!');
    console.log('✅ O documento PDPOA2025-QA.docx foi atualizado no Supabase.');

  } catch (error) {
    console.error('\n❌ Erro durante o processamento:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the processing
console.log('=' .repeat(60));
console.log('📋 PROCESSAMENTO DE DOCUMENTO Q&A - CHAT PD POA');
console.log('=' .repeat(60) + '\n');

processQADocument();