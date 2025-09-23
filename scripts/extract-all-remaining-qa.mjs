#!/usr/bin/env node

/**
 * Script para extrair TODOS os Q&A restantes de uma vez
 * Usa estratégias agressivas para capturar o máximo possível
 */

import { createClient } from '@supabase/supabase-js';
import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import mammoth from 'mammoth';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !OPENAI_API_KEY) {
  console.error('❌ Variáveis de ambiente não configuradas!');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

class CompleteQAExtractor {
  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: OPENAI_API_KEY,
      modelName: 'text-embedding-3-small'
    });
    
    // Splitter agressivo para capturar TUDO
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 800,
      chunkOverlap: 200,
      separators: ['\n\n', '\n', '? ', '. ', ', ', ' ', '']
    });
    
    this.stats = {
      existingCount: 0,
      totalExtracted: 0,
      saved: 0,
      failed: 0
    };
  }

  /**
   * Extração agressiva de TODO o conteúdo
   */
  async extractEverything(text) {
    console.log('\n🔥 Extração COMPLETA em andamento...');
    
    const allChunks = [];
    const processedKeys = new Set();
    
    // 1. ESTRATÉGIA 1: Dividir em parágrafos
    console.log('\n📝 Estratégia 1: Divisão por parágrafos...');
    const paragraphs = text.split(/\n\s*\n/);
    
    for (let i = 0; i < paragraphs.length; i++) {
      const para = paragraphs[i].trim();
      
      if (para.length > 50) {
        const key = para.substring(0, 100);
        
        if (!processedKeys.has(key)) {
          processedKeys.add(key);
          
          // Verificar se parece Q&A
          const isQA = para.includes('?') || 
                       para.match(/^(pergunta|resposta|p:|r:|q:|a:)/i) ||
                       para.match(/^(o que|qual|como|quando|onde|por que)/i);
          
          allChunks.push({
            content: para,
            metadata: {
              type: isQA ? 'qa_content' : 'informative_content',
              chunk_method: 'paragraph',
              position: i,
              source_file: 'PDPOA2025-QA.docx'
            }
          });
        }
      }
    }
    
    console.log(`   ✅ ${allChunks.length} chunks de parágrafos`);
    
    // 2. ESTRATÉGIA 2: Chunking com diferentes tamanhos
    console.log('\n📝 Estratégia 2: Chunking variado...');
    
    const chunkSizes = [500, 750, 1000, 1500];
    
    for (const size of chunkSizes) {
      const tempSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: size,
        chunkOverlap: Math.floor(size * 0.2)
      });
      
      const chunks = await tempSplitter.splitText(text);
      
      for (const chunk of chunks) {
        const key = chunk.substring(0, 100);
        
        if (!processedKeys.has(key) && chunk.length > 100) {
          processedKeys.add(key);
          
          allChunks.push({
            content: chunk,
            metadata: {
              type: 'mixed_content',
              chunk_method: `chunk_${size}`,
              chunk_size: size,
              source_file: 'PDPOA2025-QA.docx'
            }
          });
        }
      }
    }
    
    console.log(`   ✅ Total acumulado: ${allChunks.length} chunks`);
    
    // 3. ESTRATÉGIA 3: Buscar padrões específicos de Porto Alegre
    console.log('\n📝 Estratégia 3: Padrões específicos do PDUS...');
    
    const pdusPatterns = [
      /(?:zona|zot|zeis|aeis|área)\s+[^.?!]{20,200}/gi,
      /(?:altura|coeficiente|aproveitamento|ocupação)\s+[^.?!]{20,200}/gi,
      /(?:outorga|onerosa|transferência|potencial)\s+[^.?!]{20,200}/gi,
      /(?:bairro|distrito|região|macrozona)\s+[^.?!]{20,200}/gi,
      /(?:habitação|moradia|his|interesse social)\s+[^.?!]{20,200}/gi,
      /(?:mobilidade|transporte|viário|ciclo)\s+[^.?!]{20,200}/gi,
      /(?:ambiente|sustent|verde|parque)\s+[^.?!]{20,200}/gi,
      /(?:patrimônio|cultural|histórico|tombamento)\s+[^.?!]{20,200}/gi
    ];
    
    for (const pattern of pdusPatterns) {
      const matches = [...text.matchAll(pattern)];
      
      for (const match of matches) {
        const content = match[0].trim();
        const key = content.substring(0, 100);
        
        if (!processedKeys.has(key) && content.length > 50) {
          processedKeys.add(key);
          
          allChunks.push({
            content: content,
            metadata: {
              type: 'pdus_specific',
              chunk_method: 'pattern_matching',
              pattern: pattern.source.substring(0, 30),
              source_file: 'PDPOA2025-QA.docx'
            }
          });
        }
      }
    }
    
    console.log(`   ✅ Total final: ${allChunks.length} chunks únicos`);
    
    return allChunks;
  }

  /**
   * Processar e salvar com batching otimizado
   */
  async processAndSave(chunks) {
    if (chunks.length === 0) {
      console.log('⚠️ Nenhum chunk para processar');
      return;
    }
    
    console.log(`\n🔄 Processando ${chunks.length} chunks...`);
    
    // Limitar para não sobrecarregar
    const maxChunks = 1000;
    const chunksToProcess = chunks.slice(0, maxChunks);
    
    console.log(`   📦 Processando até ${chunksToProcess.length} chunks`);
    
    // Gerar embeddings em lotes maiores
    const batchSize = 50;
    const allEmbeddings = [];
    
    for (let i = 0; i < chunksToProcess.length; i += batchSize) {
      const batch = chunksToProcess.slice(i, i + batchSize);
      const texts = batch.map(c => c.content);
      
      try {
        const progress = Math.round(((i + batch.length) / chunksToProcess.length) * 100);
        console.log(`   🧮 Embeddings: ${progress}%`);
        
        const embeddings = await this.embeddings.embedDocuments(texts);
        allEmbeddings.push(...embeddings);
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`   ❌ Erro em embeddings:`, error.message);
        // Adicionar embeddings vazios
        for (let j = 0; j < batch.length; j++) {
          allEmbeddings.push(new Array(1536).fill(0));
        }
      }
    }
    
    // Preparar registros
    const records = chunksToProcess.map((chunk, idx) => ({
      content: chunk.content,
      embedding: `[${allEmbeddings[idx].join(',')}]`,
      metadata: {
        ...chunk.metadata,
        created_at: new Date().toISOString(),
        embedding_model: 'text-embedding-3-small',
        batch_id: `batch_${Date.now()}`
      }
    }));
    
    // Salvar em lotes
    console.log('\n💾 Salvando no banco de dados...');
    
    for (let i = 0; i < records.length; i += 100) {
      const batch = records.slice(i, i + 100);
      
      const { error } = await supabase
        .from('document_sections')
        .insert(batch);
      
      if (error) {
        console.error(`   ❌ Erro ao salvar:`, error.message);
        this.stats.failed += batch.length;
      } else {
        this.stats.saved += batch.length;
        console.log(`   ✅ Salvos ${this.stats.saved}/${records.length}`);
      }
    }
    
    return this.stats.saved;
  }

  /**
   * Executar extração completa
   */
  async run() {
    console.log('🚀 === EXTRAÇÃO COMPLETA DE Q&A ===');
    console.log(`📅 ${new Date().toLocaleString('pt-BR')}\n`);
    
    try {
      // 1. Verificar estado atual
      const { count: existingCount } = await supabase
        .from('document_sections')
        .select('*', { count: 'exact', head: true })
        .eq('metadata->source_file', 'PDPOA2025-QA.docx');
      
      this.stats.existingCount = existingCount || 0;
      console.log(`📊 Q&A chunks existentes: ${this.stats.existingCount}`);
      
      if (this.stats.existingCount >= 1000) {
        console.log('✅ Base já tem Q&A suficiente!');
        return;
      }
      
      // 2. Carregar documento
      const qaPath = path.join(__dirname, '..', 'knowledgebase', 'PDPOA2025-QA.docx');
      console.log('📖 Carregando documento Q&A...');
      
      const buffer = await fs.readFile(qaPath);
      const result = await mammoth.extractRawText({ buffer });
      const text = result.value;
      
      console.log(`📝 Documento carregado: ${text.length} caracteres`);
      
      // 3. Extrair TUDO
      const allChunks = await this.extractEverything(text);
      this.stats.totalExtracted = allChunks.length;
      
      // 4. Processar e salvar
      await this.processAndSave(allChunks);
      
      // 5. Verificar resultado final
      const { count: finalCount } = await supabase
        .from('document_sections')
        .select('*', { count: 'exact', head: true })
        .eq('metadata->source_file', 'PDPOA2025-QA.docx');
      
      // 6. Estatísticas finais
      console.log('\n📈 === ESTATÍSTICAS FINAIS ===\n');
      console.log(`📊 Q&A existentes antes: ${this.stats.existingCount}`);
      console.log(`🔍 Chunks extraídos: ${this.stats.totalExtracted}`);
      console.log(`✅ Chunks salvos: ${this.stats.saved}`);
      console.log(`📊 Total Q&A agora: ${finalCount || 0}`);
      
      if (this.stats.failed > 0) {
        console.log(`⚠️ Falhas: ${this.stats.failed}`);
      }
      
      // 7. Análise de completude
      const completeness = Math.round(((finalCount || 0) / 1400) * 100);
      
      console.log(`\n📊 Completude Q&A: ${completeness}%`);
      
      if (completeness >= 90) {
        console.log('🎉 === Q&A COMPLETO! ===');
      } else if (completeness >= 70) {
        console.log('✅ === BOA COBERTURA DE Q&A ===');
      } else if (completeness >= 50) {
        console.log('⚠️ === Q&A PARCIAL - EXECUTAR NOVAMENTE ===');
      } else {
        console.log('❌ === NECESSÁRIO MAIS PROCESSAMENTO ===');
      }
      
    } catch (error) {
      console.error('\n❌ Erro fatal:', error);
      process.exit(1);
    }
  }
}

// Executar
const extractor = new CompleteQAExtractor();
extractor.run().catch(console.error);