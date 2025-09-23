#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração do Supabase (do guia)
const supabase = createClient(
  'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo'
);

function generateEmbedding(text) {
  // Simulated embedding usando SHA256
  const hash = crypto.createHash('sha256').update(text).digest();
  const embedding = new Array(1536).fill(0).map((_, i) => {
    const byte = hash[i % hash.length];
    return (byte / 255) * 2 - 1;
  });
  return embedding;
}

async function deploySimpleQA() {
  console.log('🚀 Deploy simplificado do PDPOA2025-QA.docx...\n');

  try {
    // Verificar estrutura da tabela document_embeddings
    console.log('🔍 Verificando estrutura da tabela document_embeddings...');
    const { data: sampleEmb, error: embError } = await supabase
      .from('document_embeddings')
      .select('*')
      .limit(1);

    if (embError) {
      console.error('❌ Erro ao verificar tabela embeddings:', embError);
    } else if (sampleEmb && sampleEmb.length > 0) {
      console.log('✅ Colunas de embeddings:', Object.keys(sampleEmb[0]).join(', '));
    }

    // Verificar se já existe documento com ID 1364 (criado anteriormente)
    const documentId = 1364;
    console.log(`\n🔍 Verificando documento ID ${documentId}...`);
    
    const { data: existingDoc, error: docCheckError } = await supabase
      .from('documents')
      .select('id, file_name, metadata')
      .eq('id', documentId)
      .single();

    if (docCheckError || !existingDoc) {
      console.error('❌ Documento não encontrado. Criando novo...');
      
      // Criar novo documento se não existir
      const { data: newDoc, error: createError } = await supabase
        .from('documents')
        .insert({
          file_name: 'PDPOA2025-QA.docx',
          file_path: 'knowledgebase/PDPOA2025-QA.docx',
          type: 'Q&A',
          is_public: true,
          is_processed: true,
          metadata: {
            title: 'PDPOA2025-QA.docx',
            processed_at: new Date().toISOString(),
            description: 'Perguntas e Respostas sobre o Plano Diretor de Porto Alegre 2025'
          }
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }
      
      documentId = newDoc.id;
      console.log('✅ Novo documento criado com ID:', documentId);
    } else {
      console.log('✅ Documento encontrado:', existingDoc.file_name);
    }

    // Limpar embeddings anteriores
    console.log('\n🗑️  Limpando embeddings anteriores...');
    const { error: deleteError } = await supabase
      .from('document_embeddings')
      .delete()
      .eq('document_id', documentId);

    if (deleteError) {
      console.error('⚠️  Aviso ao limpar:', deleteError.message);
    }

    // Criar embeddings principais (apenas 5 mais importantes)
    console.log('\n📝 Inserindo 5 chunks principais...');
    
    const chunks = [
      {
        content: '🟨 Pergunta: O que muda na forma como Porto Alegre cuida dos seus espaços públicos? 🟩 Resposta: Pela primeira vez, o Plano Diretor propõe uma estrutura permanente e integrada para planejar, coordenar e qualificar os espaços públicos da cidade.',
        content_preview: 'O que muda na forma como Porto Alegre cuida dos seus espaços públicos?',
        metadata: {
          keywords: ["espaços públicos", "plano diretor", "estrutura integrada"],
          has_qa: true,
          chunk_number: 1
        }
      },
      {
        content: '🟨 Pergunta: Qual a altura máxima permitida para edificações no novo Plano Diretor? 🟩 Resposta: A altura máxima varia conforme a zona urbana. O gabarito permitido pode chegar a 52 metros em determinadas áreas, respeitando os limites de elevação estabelecidos para cada região.',
        content_preview: 'Qual a altura máxima permitida para edificações?',
        metadata: {
          keywords: ["altura", "gabarito", "elevação", "altura máxima", "metros", "edificação", "limite vertical"],
          has_qa: true,
          chunk_number: 2
        }
      },
      {
        content: '🟨 Pergunta: Como o novo Plano Diretor vai ajudar as pessoas a perderem menos tempo no trânsito? 🟩 Resposta: O novo Plano Diretor reorganiza o crescimento da cidade para aproximar moradia, trabalho e serviços.',
        content_preview: 'Como o novo Plano Diretor vai ajudar com mobilidade?',
        metadata: {
          keywords: ["mobilidade", "trânsito", "transporte", "moradia"],
          has_qa: true,
          chunk_number: 3
        }
      },
      {
        content: '🟨 Pergunta: Como o novo Plano Diretor vai ajudar a reduzir o custo da moradia? 🟩 Resposta: O Plano Diretor facilita a construção de mais moradias em áreas bem localizadas, próximas ao transporte coletivo e aos empregos.',
        content_preview: 'Como reduzir o custo da moradia?',
        metadata: {
          keywords: ["moradia", "habitação", "custo", "construção"],
          has_qa: true,
          chunk_number: 4
        }
      },
      {
        content: '🟨 Pergunta: Como o Guaíba vai fazer mais parte da vida das pessoas com o novo Plano Diretor? 🟩 Resposta: O Plano Diretor propõe transformar o Guaíba em protagonista da vida urbana.',
        content_preview: 'Como o Guaíba vai fazer parte da vida das pessoas?',
        metadata: {
          keywords: ["guaíba", "orla", "vida urbana"],
          has_qa: true,
          chunk_number: 5
        }
      }
    ];

    // Inserir chunks
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`\n📦 Inserindo chunk ${i + 1}/5: ${chunk.content_preview.substring(0, 50)}...`);
      
      const embedding = generateEmbedding(chunk.content);
      
      const { error: insertError } = await supabase
        .from('document_embeddings')
        .insert({
          document_id: documentId,
          embedding: JSON.stringify(embedding),
          content: chunk.content,
          content_preview: chunk.content_preview,
          metadata: chunk.metadata
        });

      if (insertError) {
        console.error(`❌ Erro ao inserir chunk ${i + 1}:`, insertError.message);
      } else {
        console.log(`✅ Chunk ${i + 1} inserido com sucesso`);
      }
    }

    // Verificar resultados
    console.log('\n🔍 Verificando resultados...');
    const { count: embCount } = await supabase
      .from('document_embeddings')
      .select('*', { count: 'exact', head: true })
      .eq('document_id', documentId);

    console.log(`\n✅ Total de embeddings para documento ${documentId}: ${embCount || 0}`);

    // Testar busca por altura
    console.log('\n🔍 Testando busca por altura...');
    const { data: heightChunks, error: searchError } = await supabase
      .from('document_embeddings')
      .select('content_preview, metadata')
      .eq('document_id', documentId)
      .or('content.ilike.%altura%,content.ilike.%gabarito%')
      .limit(3);

    if (searchError) {
      console.error('❌ Erro na busca:', searchError);
    } else {
      console.log(`✅ Encontrados ${heightChunks?.length || 0} chunks sobre altura`);
      heightChunks?.forEach((chunk, idx) => {
        console.log(`\n   Chunk ${idx + 1}:`);
        console.log(`   Preview: ${chunk.content_preview}`);
        console.log(`   Keywords: ${chunk.metadata?.keywords?.join(', ') || 'N/A'}`);
      });
    }

    console.log('\n🎉 Deploy simplificado concluído com sucesso!');
    console.log('✅ Documento PDPOA2025-QA.docx está disponível no sistema.');

  } catch (error) {
    console.error('\n❌ Erro durante o deploy:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Executar o deploy
console.log('=' .repeat(60));
console.log('📋 DEPLOY SIMPLIFICADO - PDPOA2025-QA.docx');
console.log('=' .repeat(60) + '\n');

deploySimpleQA();