#!/usr/bin/env node

/**
 * Script Avançado de Extração de Q&A
 * Usa análise de contexto e segmentação inteligente
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

class AdvancedQAExtractor {
  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: OPENAI_API_KEY,
      modelName: 'text-embedding-3-small'
    });
    
    // Splitter para chunks que podem conter Q&A
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1500,
      chunkOverlap: 300,
      separators: ['\n\n', '\n', '. ', '? ', '! ', '; ', ', ', ' ', '']
    });
    
    this.stats = {
      existingCount: 0,
      extractedPairs: 0,
      processedChunks: 0,
      savedChunks: 0,
      failed: 0,
      startTime: new Date()
    };
  }

  /**
   * Estratégia 1: Análise por segmentos contextuais
   */
  async extractByContextualSegments(text) {
    console.log('\n📝 Estratégia 1: Análise por segmentos contextuais...');
    
    const chunks = [];
    
    // Dividir em segmentos maiores que podem conter Q&A completos
    const segments = await this.splitter.splitText(text);
    console.log(`   📦 ${segments.length} segmentos para análise`);
    
    for (const segment of segments) {
      // Verificar se o segmento contém padrões de Q&A
      if (this.containsQAPattern(segment)) {
        // Extrair Q&A do segmento
        const pairs = this.extractQAFromSegment(segment);
        
        for (const pair of pairs) {
          chunks.push({
            content: `Pergunta: ${pair.question}\n\nResposta: ${pair.answer}`,
            metadata: {
              type: 'qa_pair',
              question: pair.question.substring(0, 500),
              source_file: 'PDPOA2025-QA.docx',
              extraction_method: 'contextual_segments'
            }
          });
        }
      }
      // Se não for Q&A estruturado mas contém informação útil
      else if (this.isUsefulContent(segment)) {
        chunks.push({
          content: segment,
          metadata: {
            type: 'informative_content',
            source_file: 'PDPOA2025-QA.docx',
            extraction_method: 'content_chunk'
          }
        });
      }
    }
    
    return chunks;
  }

  /**
   * Estratégia 2: Extração por padrões flexíveis
   */
  extractByFlexiblePatterns(text) {
    console.log('\n📝 Estratégia 2: Extração por padrões flexíveis...');
    
    const chunks = [];
    const processedContent = new Set();
    
    // Lista expandida de padrões
    const patterns = [
      // Padrão formal Q&A
      /(?:(?:Pergunta|PERGUNTA|P\.|P:|Q\.|Q:)\s*)([^\n]+(?:\n(?![PR][:.])[^\n]+)*)\s*\n+\s*(?:(?:Resposta|RESPOSTA|R\.|R:|A\.|A:)\s*)([^\n]+(?:\n(?!(?:Pergunta|PERGUNTA|P\.|P:|Q\.|Q:))[^\n]+)*)/gis,
      
      // Perguntas terminadas em ? seguidas de texto
      /([^\n.!]+\?)\s*\n+([^?\n][^\n]+(?:\n(?![^\n]+\?)[^\n]+)*)/gis,
      
      // Tópicos com explicação
      /(?:^|\n)([A-Z][^:\n]+):\s*\n+([^:\n]+(?:\n(?![A-Z][^:\n]+:)[^\n]+)*)/gm,
      
      // Definições (O que é X)
      /(?:O que (?:é|são)|Qual (?:é|são)|Como funciona|Para que serve)([^?\n]+\??)\s*\n+([^\n]+(?:\n(?!(?:O que|Qual|Como|Para))[^\n]+)*)/gis,
      
      // Listas numeradas com explicação
      /(\d+\.\s*[^\n]+)\s*\n+(?:[-•]\s*)?([^\d\n][^\n]+(?:\n(?!\d+\.)[^\n]+)*)/gis
    ];
    
    for (const pattern of patterns) {
      const matches = [...text.matchAll(pattern)];
      
      for (const match of matches) {
        const question = this.cleanText(match[1]);
        const answer = this.cleanText(match[2] || match[3] || '');
        
        if (this.isValidQAPair(question, answer)) {
          const contentKey = `${question.substring(0, 50)}`;
          
          if (!processedContent.has(contentKey)) {
            processedContent.add(contentKey);
            chunks.push({
              content: `Pergunta: ${question}\n\nResposta: ${answer}`,
              metadata: {
                type: 'qa_pair',
                question: question.substring(0, 500),
                source_file: 'PDPOA2025-QA.docx',
                extraction_method: 'flexible_patterns'
              }
            });
          }
        }
      }
    }
    
    console.log(`   ✅ ${chunks.length} pares extraídos`);
    return chunks;
  }

  /**
   * Estratégia 3: Análise de estrutura de documento
   */
  extractByDocumentStructure(text) {
    console.log('\n📝 Estratégia 3: Análise de estrutura de documento...');
    
    const chunks = [];
    const lines = text.split('\n');
    
    let currentTopic = null;
    let currentContent = [];
    let inQASection = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const nextLine = i < lines.length - 1 ? lines[i + 1]?.trim() : '';
      
      // Detectar início de seção Q&A
      if (line.match(/^(perguntas|questions|q&a|faq)/i)) {
        inQASection = true;
        continue;
      }
      
      // Detectar tópico/título
      if (this.looksLikeTitle(line, nextLine)) {
        // Salvar conteúdo anterior se existir
        if (currentTopic && currentContent.length > 0) {
          const content = currentContent.join(' ').trim();
          if (content.length > 50) {
            chunks.push({
              content: `Tópico: ${currentTopic}\n\n${content}`,
              metadata: {
                type: 'topic_content',
                topic: currentTopic.substring(0, 200),
                source_file: 'PDPOA2025-QA.docx',
                extraction_method: 'document_structure'
              }
            });
          }
        }
        
        currentTopic = line;
        currentContent = [];
      }
      // Acumular conteúdo
      else if (line.length > 0) {
        currentContent.push(line);
      }
    }
    
    // Salvar último tópico
    if (currentTopic && currentContent.length > 0) {
      const content = currentContent.join(' ').trim();
      if (content.length > 50) {
        chunks.push({
          content: `Tópico: ${currentTopic}\n\n${content}`,
          metadata: {
            type: 'topic_content',
            topic: currentTopic.substring(0, 200),
            source_file: 'PDPOA2025-QA.docx',
            extraction_method: 'document_structure'
          }
        });
      }
    }
    
    console.log(`   ✅ ${chunks.length} seções estruturadas extraídas`);
    return chunks;
  }

  /**
   * Verifica se segmento contém padrão Q&A
   */
  containsQAPattern(segment) {
    const qaIndicators = [
      /pergunta.*resposta/is,
      /\?.*\n+.*[.!]/s,
      /P:\s*.*R:\s*/s,
      /Q:\s*.*A:\s*/s,
      /o que (?:é|são).*\n+/i
    ];
    
    return qaIndicators.some(pattern => pattern.test(segment));
  }

  /**
   * Extrai Q&A de um segmento
   */
  extractQAFromSegment(segment) {
    const pairs = [];
    
    // Tentar diferentes estratégias de extração
    const lines = segment.split('\n');
    let currentQ = null;
    let currentA = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.endsWith('?') || trimmed.match(/^(pergunta|p:|q:)/i)) {
        if (currentQ && currentA.length > 0) {
          pairs.push({
            question: this.cleanText(currentQ),
            answer: this.cleanText(currentA.join(' '))
          });
        }
        currentQ = trimmed;
        currentA = [];
      } else if (currentQ && trimmed.length > 0) {
        currentA.push(trimmed);
      }
    }
    
    // Salvar último par
    if (currentQ && currentA.length > 0) {
      pairs.push({
        question: this.cleanText(currentQ),
        answer: this.cleanText(currentA.join(' '))
      });
    }
    
    return pairs.filter(p => this.isValidQAPair(p.question, p.answer));
  }

  /**
   * Verifica se conteúdo é útil
   */
  isUsefulContent(segment) {
    // Deve ter tamanho mínimo
    if (segment.length < 100) return false;
    
    // Deve conter palavras relevantes
    const relevantKeywords = [
      'plano diretor', 'zona', 'bairro', 'altura', 'coeficiente',
      'urbanístico', 'construção', 'aproveitamento', 'ocupação',
      'porto alegre', 'zeis', 'outorga', 'edificação', 'lote'
    ];
    
    const segmentLower = segment.toLowerCase();
    return relevantKeywords.some(kw => segmentLower.includes(kw));
  }

  /**
   * Verifica se linha parece ser título
   */
  looksLikeTitle(line, nextLine) {
    // Linha curta seguida de linha mais longa
    if (line.length < 100 && line.length > 5 && nextLine.length > line.length * 2) {
      return true;
    }
    
    // Começa com número ou letra maiúscula e é relativamente curto
    if (line.match(/^(\d+\.?|[A-Z])[A-Z\s]{5,80}$/)) {
      return true;
    }
    
    // Termina com dois pontos
    if (line.endsWith(':') && line.length < 100) {
      return true;
    }
    
    return false;
  }

  /**
   * Limpa texto
   */
  cleanText(text) {
    if (!text) return '';
    
    return text
      .replace(/\s+/g, ' ')
      .replace(/^[•·\-\d\.]+\s*/, '')
      .replace(/^(pergunta|resposta|p|r|q|a)[:.\s]+/i, '')
      .trim();
  }

  /**
   * Valida par Q&A
   */
  isValidQAPair(question, answer) {
    if (!question || !answer) return false;
    if (question.length < 10 || answer.length < 20) return false;
    if (question.length > 1000 || answer.length > 5000) return false;
    if (question.split(' ').length < 3 || answer.split(' ').length < 5) return false;
    
    return true;
  }

  /**
   * Processa e salva chunks
   */
  async processChunks(chunks) {
    if (chunks.length === 0) {
      console.log('⚠️ Nenhum chunk para processar');
      return;
    }
    
    console.log(`\n🔄 Processando ${chunks.length} chunks...`);
    
    const batchSize = 20;
    const allEmbeddings = [];
    
    // Gerar embeddings
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const texts = batch.map(c => c.content);
      
      try {
        const progress = Math.round(((i + batch.length) / chunks.length) * 100);
        console.log(`🧮 Gerando embeddings: ${progress}%`);
        
        const embeddings = await this.embeddings.embedDocuments(texts);
        allEmbeddings.push(...embeddings);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`❌ Erro em embeddings:`, error.message);
        for (let j = 0; j < batch.length; j++) {
          allEmbeddings.push(new Array(1536).fill(0));
        }
      }
    }
    
    // Preparar registros
    const records = chunks.map((chunk, idx) => ({
      content: chunk.content,
      embedding: `[${allEmbeddings[idx].join(',')}]`,
      metadata: {
        ...chunk.metadata,
        created_at: new Date().toISOString(),
        embedding_model: 'text-embedding-3-small'
      }
    }));
    
    // Salvar no banco
    console.log('\n💾 Salvando no banco de dados...');
    
    for (let i = 0; i < records.length; i += 50) {
      const batch = records.slice(i, i + 50);
      
      const { error } = await supabase
        .from('document_sections')
        .insert(batch);
      
      if (error) {
        console.error(`❌ Erro ao salvar:`, error.message);
        this.stats.failed += batch.length;
      } else {
        this.stats.savedChunks += batch.length;
        console.log(`✅ Salvos ${this.stats.savedChunks}/${records.length}`);
      }
    }
  }

  /**
   * Executa extração completa
   */
  async run() {
    console.log('🚀 === EXTRAÇÃO AVANÇADA DE Q&A ===');
    console.log(`📅 ${new Date().toLocaleString('pt-BR')}\n`);
    
    try {
      // 1. Verificar estado atual
      const { count: existingCount } = await supabase
        .from('document_sections')
        .select('*', { count: 'exact', head: true })
        .eq('metadata->source_file', 'PDPOA2025-QA.docx');
      
      this.stats.existingCount = existingCount || 0;
      console.log(`📊 Q&A chunks existentes: ${this.stats.existingCount}`);
      
      // 2. Carregar documento
      const qaPath = path.join(__dirname, '..', 'knowledgebase', 'PDPOA2025-QA.docx');
      console.log('📖 Carregando documento...');
      
      const buffer = await fs.readFile(qaPath);
      const result = await mammoth.extractRawText({ buffer });
      const text = result.value;
      
      console.log(`📝 Documento carregado: ${text.length} caracteres`);
      
      // 3. Aplicar múltiplas estratégias de extração
      const allChunks = [];
      
      // Estratégia 1: Segmentos contextuais
      const contextualChunks = await this.extractByContextualSegments(text);
      allChunks.push(...contextualChunks);
      
      // Estratégia 2: Padrões flexíveis
      const patternChunks = this.extractByFlexiblePatterns(text);
      allChunks.push(...patternChunks);
      
      // Estratégia 3: Estrutura do documento
      const structureChunks = this.extractByDocumentStructure(text);
      allChunks.push(...structureChunks);
      
      // Remover duplicatas
      const uniqueChunks = [];
      const seenContent = new Set();
      
      for (const chunk of allChunks) {
        const key = chunk.content.substring(0, 100);
        if (!seenContent.has(key)) {
          seenContent.add(key);
          uniqueChunks.push(chunk);
        }
      }
      
      console.log(`\n📊 Total de chunks únicos extraídos: ${uniqueChunks.length}`);
      
      // 4. Processar e salvar
      await this.processChunks(uniqueChunks);
      
      // 5. Estatísticas finais
      const duration = (new Date() - this.stats.startTime) / 1000;
      
      console.log('\n📈 === ESTATÍSTICAS FINAIS ===\n');
      console.log(`📊 Chunks existentes antes: ${this.stats.existingCount}`);
      console.log(`✅ Novos chunks salvos: ${this.stats.savedChunks}`);
      console.log(`📊 Total agora: ${this.stats.existingCount + this.stats.savedChunks}`);
      
      if (this.stats.failed > 0) {
        console.log(`⚠️ Falhas: ${this.stats.failed}`);
      }
      
      console.log(`⏱️ Tempo total: ${duration.toFixed(2)} segundos`);
      
      // Verificar resultado final
      const { count: finalCount } = await supabase
        .from('document_sections')
        .select('*', { count: 'exact', head: true })
        .eq('metadata->source_file', 'PDPOA2025-QA.docx');
      
      console.log(`\n📊 Total final de Q&A chunks: ${finalCount || 0}`);
      
      if (finalCount >= 1000) {
        console.log('🎉 === META ATINGIDA! 1000+ Q&A PROCESSADOS! ===');
      } else if (finalCount >= 500) {
        console.log('✅ === BOM PROGRESSO! 500+ Q&A PROCESSADOS ===');
      } else {
        console.log('⚠️ === CONTINUAR PROCESSAMENTO ===');
      }
      
    } catch (error) {
      console.error('\n❌ Erro fatal:', error);
      process.exit(1);
    }
  }
}

// Executar
const extractor = new AdvancedQAExtractor();
extractor.run().catch(console.error);