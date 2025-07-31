#!/usr/bin/env node
// Script para reprocessar toda a base de conhecimento com o novo sistema de chunking
// Execute com: npx ts-node scripts/reprocess-knowledge-base.ts

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Carrega variáveis de ambiente
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não configuradas');
  console.error('Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Configuração
const KNOWLEDGE_BASE_PATH = path.join(process.cwd(), 'knowledgebase');
const STORAGE_BUCKET = 'documents';

interface ProcessingResult {
  file: string;
  documentId?: string;
  success: boolean;
  error?: string;
  chunksProcessed?: number;
  processingType?: string;
}

async function clearExistingData() {
  console.log('🗑️ Limpando dados existentes...');
  
  // Limpa embeddings
  const { error: embeddingsError } = await supabase
    .from('document_embeddings')
    .delete()
    .neq('id', 0);
  
  if (embeddingsError) {
    console.error('❌ Erro ao limpar embeddings:', embeddingsError);
  }
  
  // Limpa documentos
  const { error: docsError } = await supabase
    .from('documents')
    .delete()
    .neq('id', 0);
  
  if (docsError) {
    console.error('❌ Erro ao limpar documentos:', docsError);
  }
  
  console.log('✅ Dados existentes limpos');
}

async function uploadToStorage(filePath: string, fileName: string): Promise<string> {
  const fileBuffer = await fs.promises.readFile(filePath);
  const storagePath = `knowledge-base/${fileName}`;
  
  // Remove arquivo existente se houver
  await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([storagePath]);
  
  // Faz upload do novo arquivo
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: getContentType(fileName),
      upsert: true
    });
  
  if (error) {
    throw new Error(`Erro no upload: ${error.message}`);
  }
  
  return storagePath;
}

function getContentType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  switch (ext) {
    case '.docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case '.xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case '.pdf': return 'application/pdf';
    case '.txt': return 'text/plain';
    default: return 'application/octet-stream';
  }
}

async function createDocument(fileName: string, storagePath: string): Promise<string> {
  const title = fileName.replace(/\.(docx|xlsx|pdf|txt)$/i, '').replace(/[-_]/g, ' ');
  
  const { data, error } = await supabase
    .from('documents')
    .insert({
      title,
      file_name: fileName,
      file_path: storagePath,
      type: path.extname(fileName).substring(1).toUpperCase(),
      is_public: true,
      is_processed: false
    })
    .select('id')
    .single();
  
  if (error) {
    throw new Error(`Erro ao criar documento: ${error.message}`);
  }
  
  return data.id;
}

async function processDocument(documentId: string): Promise<{ chunksProcessed: number; processingType: string }> {
  console.log(`⚙️ Processando documento ID: ${documentId}`);
  
  const { data, error } = await supabase.functions.invoke('process-document', {
    body: { documentId }
  });
  
  if (error) {
    throw new Error(`Erro no processamento: ${error.message}`);
  }
  
  return {
    chunksProcessed: data?.chunks_processed || 0,
    processingType: data?.processing_type || 'unknown'
  };
}

async function processRiskData(): Promise<void> {
  console.log('\n📊 Processando dados de risco de desastre...');
  
  try {
    // Executa script de importação
    const { stdout, stderr } = await execAsync('npx ts-node scripts/import-disaster-risk-data.ts');
    
    if (stderr && !stderr.includes('warning')) {
      console.error('⚠️ Avisos durante importação:', stderr);
    }
    
    console.log(stdout);
    console.log('✅ Dados de risco importados com sucesso');
  } catch (error) {
    console.error('❌ Erro ao importar dados de risco:', error);
    console.log('ℹ️ Execute manualmente: npx ts-node scripts/import-disaster-risk-data.ts');
  }
}

async function processKnowledgeBase() {
  console.log('🚀 Iniciando reprocessamento da base de conhecimento...\n');
  
  // Pergunta se deve limpar dados existentes
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const clearData = await new Promise<boolean>((resolve) => {
    readline.question('Limpar dados existentes? (s/n): ', (answer) => {
      readline.close();
      resolve(answer.toLowerCase() === 's');
    });
  });
  
  if (clearData) {
    await clearExistingData();
  }
  
  // Lista arquivos da knowledge base
  const files = await fs.promises.readdir(KNOWLEDGE_BASE_PATH);
  const supportedFiles = files.filter(f => 
    /\.(docx|xlsx|pdf|txt)$/i.test(f) && 
    !f.includes('Risco_Desastre') // Processa separadamente
  );
  
  console.log(`\n📁 ${supportedFiles.length} arquivos encontrados para processar`);
  
  const results: ProcessingResult[] = [];
  
  // Processa cada arquivo
  for (const file of supportedFiles) {
    console.log(`\n📄 Processando: ${file}`);
    const result: ProcessingResult = { file, success: false };
    
    try {
      // 1. Upload para storage
      console.log('  📤 Fazendo upload...');
      const storagePath = await uploadToStorage(
        path.join(KNOWLEDGE_BASE_PATH, file),
        file
      );
      
      // 2. Cria registro do documento
      console.log('  📝 Criando documento...');
      const documentId = await createDocument(file, storagePath);
      result.documentId = documentId;
      
      // 3. Processa documento (chunking + embeddings)
      console.log('  🔄 Processando chunks e embeddings...');
      const { chunksProcessed, processingType } = await processDocument(documentId);
      
      result.success = true;
      result.chunksProcessed = chunksProcessed;
      result.processingType = processingType;
      
      console.log(`  ✅ Sucesso! ${chunksProcessed} chunks criados (${processingType})`);
      
    } catch (error) {
      result.success = false;
      result.error = error instanceof Error ? error.message : String(error);
      console.error(`  ❌ Erro: ${result.error}`);
    }
    
    results.push(result);
  }
  
  // Processa dados de risco
  await processRiskData();
  
  // Resumo final
  console.log('\n📊 RESUMO DO PROCESSAMENTO:');
  console.log('================================');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Processados com sucesso: ${successful.length}`);
  console.log(`❌ Falhas: ${failed.length}`);
  
  if (successful.length > 0) {
    console.log('\nDocumentos processados:');
    successful.forEach(r => {
      console.log(`  - ${r.file}: ${r.chunksProcessed} chunks (${r.processingType})`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\nFalhas:');
    failed.forEach(r => {
      console.log(`  - ${r.file}: ${r.error}`);
    });
  }
  
  // Estatísticas finais
  const totalChunks = successful.reduce((sum, r) => sum + (r.chunksProcessed || 0), 0);
  console.log(`\n📈 Total de chunks criados: ${totalChunks}`);
  
  // Verifica chunks hierárquicos
  const { count: hierarchicalCount } = await supabase
    .from('document_embeddings')
    .select('id', { count: 'exact' })
    .not('chunk_metadata', 'is', null);
  
  console.log(`🏗️ Chunks hierárquicos: ${hierarchicalCount || 0}`);
  
  console.log('\n✨ Reprocessamento concluído!');
  console.log('ℹ️ O sistema RAG agora está otimizado com:');
  console.log('  - Chunking hierárquico para documentos legais');
  console.log('  - Sistema de keywords inteligente');
  console.log('  - Scoring contextual');
  console.log('  - Dados de risco de desastre integrados');
}

// Executa o processamento
processKnowledgeBase().catch(console.error);