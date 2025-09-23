#!/usr/bin/env node

/**
 * Script Otimizado para Extrair TODOS os Pares Q&A
 * 
 * Este script usa múltiplas estratégias para garantir que
 * extraímos o máximo possível de pares Q&A do documento
 */

import { createClient } from '@supabase/supabase-js';
import { OpenAIEmbeddings } from '@langchain/openai';
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

class QAExtractor {
  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: OPENAI_API_KEY,
      modelName: 'text-embedding-3-small'
    });
    
    this.stats = {
      existingCount: 0,
      newPairs: 0,
      processed: 0,
      failed: 0,
      startTime: new Date()
    };
  }

  /**
   * Extrai Q&A usando múltiplos padrões regex
   */
  extractQAPairs(text) {
    const pairs = [];
    const processedPairs = new Set(); // Evitar duplicatas
    
    // Padrão 1: Pergunta/P seguido de Resposta/R
    const patterns = [
      // Padrão formal completo
      /(?:Pergunta|PERGUNTA|P\.|P:)\s*(.+?)(?:\n+|\s+)(?:Resposta|RESPOSTA|R\.|R:)\s*(.+?)(?=(?:Pergunta|PERGUNTA|P\.|P:)|$)/gis,
      
      // Padrão numerado (1. Pergunta... Resposta...)
      /(\d+\.?\s*(?:Pergunta|P)[^\n]*:?\s*)([^\n]+)(?:\n+|\s+)(?:Resposta|R)[^\n]*:?\s*([^]*?)(?=\d+\.?\s*(?:Pergunta|P)|$)/gis,
      
      // Padrão simples P: ... R: ...
      /P:\s*([^\n]+)\n+R:\s*([^]*?)(?=P:|$)/gis,
      
      // Padrão com interrogação
      /([^.!?\n]+\?)\s*\n+(?:R:|Resposta:)?\s*([^]*?)(?=[^.!?\n]+\?|$)/gis,
      
      // Padrão bullet points
      /[•·-]\s*([^?\n]+\?)\s*\n+([^•·\-]*?)(?=[•·-]|$)/gis,
      
      // Padrão "O que é..." seguido de explicação
      /(?:O que é|O que são|Como|Quando|Onde|Por que|Qual|Quais)([^?\n]+\?)\s*\n+([^]*?)(?=(?:O que é|O que são|Como|Quando|Onde|Por que|Qual|Quais)|$)/gis
    ];
    
    // Aplicar cada padrão
    for (const pattern of patterns) {
      const matches = [...text.matchAll(pattern)];
      
      for (const match of matches) {
        let question, answer;
        
        // Ajustar baseado no número de grupos capturados
        if (match.length === 4) {
          // Padrão numerado com 3 grupos
          question = (match[1] + match[2]).trim();
          answer = match[3].trim();
        } else if (match.length === 3) {
          // Padrão normal com 2 grupos
          question = match[1].trim();
          answer = match[2].trim();
        } else {
          continue;
        }
        
        // Limpar a pergunta e resposta
        question = this.cleanText(question);
        answer = this.cleanText(answer);
        
        // Validar qualidade
        if (this.isValidQAPair(question, answer)) {
          const pairKey = `${question.substring(0, 50)}|${answer.substring(0, 50)}`;
          
          if (!processedPairs.has(pairKey)) {
            processedPairs.add(pairKey);
            pairs.push({ question, answer });
          }
        }
      }
    }
    
    // Método 2: Análise por blocos de texto
    if (pairs.length < 100) {
      console.log('📝 Usando análise por blocos de texto...');
      const blocks = this.analyzeTextBlocks(text);
      
      for (const block of blocks) {
        const pairKey = `${block.question.substring(0, 50)}|${block.answer.substring(0, 50)}`;
        
        if (!processedPairs.has(pairKey)) {
          processedPairs.add(pairKey);
          pairs.push(block);
        }
      }
    }
    
    return pairs;
  }
  
  /**
   * Limpa e normaliza texto
   */
  cleanText(text) {
    return text
      .replace(/\s+/g, ' ')           // Múltiplos espaços → único espaço
      .replace(/^\d+\.?\s*/, '')      // Remove numeração inicial
      .replace(/^[•·-]\s*/, '')       // Remove bullets
      .replace(/^(Pergunta|P|PERGUNTA|P\.|P:)\s*/i, '') // Remove prefixo pergunta
      .replace(/^(Resposta|R|RESPOSTA|R\.|R:)\s*/i, '') // Remove prefixo resposta
      .trim();
  }
  
  /**
   * Valida se é um par Q&A válido
   */
  isValidQAPair(question, answer) {
    // Verificações básicas
    if (!question || !answer) return false;
    if (question.length < 10 || answer.length < 20) return false;
    if (question.length > 1000 || answer.length > 5000) return false;
    
    // Deve ter conteúdo relevante
    if (question.split(' ').length < 3) return false;
    if (answer.split(' ').length < 5) return false;
    
    // Evitar lixo
    if (question.includes('undefined') || answer.includes('undefined')) return false;
    if (question.includes('null') || answer.includes('null')) return false;
    
    return true;
  }
  
  /**
   * Análise alternativa por blocos de texto
   */
  analyzeTextBlocks(text) {
    const pairs = [];
    const lines = text.split(/\n+/);
    
    let currentQuestion = null;
    let currentAnswer = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Detectar pergunta
      if (this.looksLikeQuestion(line)) {
        // Salvar par anterior se existir
        if (currentQuestion && currentAnswer.length > 0) {
          const answer = currentAnswer.join(' ').trim();
          if (this.isValidQAPair(currentQuestion, answer)) {
            pairs.push({
              question: this.cleanText(currentQuestion),
              answer: this.cleanText(answer)
            });
          }
        }
        
        // Iniciar nova pergunta
        currentQuestion = line;
        currentAnswer = [];
      } 
      // Acumular resposta
      else if (currentQuestion && line.length > 0) {
        currentAnswer.push(line);
      }
    }
    
    // Salvar último par
    if (currentQuestion && currentAnswer.length > 0) {
      const answer = currentAnswer.join(' ').trim();
      if (this.isValidQAPair(currentQuestion, answer)) {
        pairs.push({
          question: this.cleanText(currentQuestion),
          answer: this.cleanText(answer)
        });
      }
    }
    
    return pairs;
  }
  
  /**
   * Detecta se uma linha parece ser uma pergunta
   */
  looksLikeQuestion(line) {
    // Termina com interrogação
    if (line.endsWith('?')) return true;
    
    // Começa com palavra interrogativa
    const interrogatives = [
      'o que', 'qual', 'quais', 'como', 'quando', 'onde', 
      'por que', 'porque', 'quem', 'quanto', 'quantos'
    ];
    
    const lineLower = line.toLowerCase();
    for (const word of interrogatives) {
      if (lineLower.startsWith(word)) return true;
    }
    
    // Padrões de pergunta
    if (/^\d+[\.\)]\s*(o que|qual|como|quando)/i.test(line)) return true;
    if (/^(pergunta|p)[\.:]\s*/i.test(line)) return true;
    
    return false;
  }

  /**
   * Processa e salva os pares Q&A
   */
  async processQAPairs(pairs) {
    console.log(`\n🔄 Processando ${pairs.length} pares Q&A...`);
    
    const chunks = [];
    const batchSize = 20;
    
    // Preparar chunks
    for (const pair of pairs) {
      chunks.push({
        content: `Pergunta: ${pair.question}\n\nResposta: ${pair.answer}`,
        metadata: {
          type: 'qa_pair',
          question: pair.question.substring(0, 500),
          answer_preview: pair.answer.substring(0, 200),
          source_file: 'PDPOA2025-QA.docx',
          extraction_method: 'multi_pattern_v2',
          created_at: new Date().toISOString()
        }
      });
    }
    
    console.log(`📦 ${chunks.length} chunks preparados para embeddings\n`);
    
    // Gerar embeddings em lotes
    const allEmbeddings = [];
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const texts = batch.map(c => c.content);
      
      try {
        const progress = Math.round(((i + batch.length) / chunks.length) * 100);
        console.log(`🧮 Gerando embeddings: ${i + batch.length}/${chunks.length} (${progress}%)`);
        
        const batchEmbeddings = await this.embeddings.embedDocuments(texts);
        allEmbeddings.push(...batchEmbeddings);
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Erro em embeddings:`, error.message);
        // Adicionar embeddings vazios
        for (let j = 0; j < batch.length; j++) {
          allEmbeddings.push(new Array(1536).fill(0));
        }
      }
    }
    
    // Preparar registros para inserção
    const records = chunks.map((chunk, idx) => ({
      content: chunk.content,
      embedding: `[${allEmbeddings[idx].join(',')}]`,
      metadata: chunk.metadata
    }));
    
    // Inserir no banco
    console.log('\n💾 Salvando no banco de dados...');
    
    for (let i = 0; i < records.length; i += 50) {
      const batch = records.slice(i, i + 50);
      
      const { error } = await supabase
        .from('document_sections')
        .insert(batch);
      
      if (error) {
        console.error(`❌ Erro ao salvar batch:`, error.message);
        this.stats.failed += batch.length;
      } else {
        this.stats.processed += batch.length;
        const progress = Math.round((this.stats.processed / records.length) * 100);
        console.log(`✅ Salvos ${this.stats.processed}/${records.length} (${progress}%)`);
      }
    }
    
    this.stats.newPairs = this.stats.processed;
  }

  /**
   * Executa o processo completo
   */
  async run() {
    console.log('🚀 === EXTRAÇÃO COMPLETA DE Q&A ===');
    console.log(`📅 ${new Date().toLocaleString('pt-BR')}\n`);
    
    try {
      // 1. Verificar quantos já existem
      const { count: existingCount } = await supabase
        .from('document_sections')
        .select('*', { count: 'exact', head: true })
        .eq('metadata->source_file', 'PDPOA2025-QA.docx');
      
      this.stats.existingCount = existingCount || 0;
      console.log(`📊 Q&A chunks existentes: ${this.stats.existingCount}`);
      
      // 2. Extrair texto do documento
      const qaPath = path.join(__dirname, '..', 'knowledgebase', 'PDPOA2025-QA.docx');
      console.log('📖 Extraindo texto do documento...');
      
      const buffer = await fs.readFile(qaPath);
      const result = await mammoth.extractRawText({ buffer });
      const text = result.value;
      
      console.log(`📝 Texto extraído: ${text.length} caracteres`);
      
      // 3. Extrair pares Q&A
      console.log('\n🔍 Extraindo pares Q&A com múltiplos padrões...');
      const pairs = this.extractQAPairs(text);
      
      console.log(`✅ ${pairs.length} pares Q&A extraídos`);
      
      if (pairs.length === 0) {
        console.log('⚠️ Nenhum par Q&A novo encontrado');
        return;
      }
      
      // Mostrar amostra
      console.log('\n📋 Amostra dos pares extraídos:');
      pairs.slice(0, 3).forEach((pair, idx) => {
        console.log(`\n${idx + 1}. P: ${pair.question.substring(0, 100)}...`);
        console.log(`   R: ${pair.answer.substring(0, 100)}...`);
      });
      
      // 4. Processar e salvar
      await this.processQAPairs(pairs);
      
      // 5. Estatísticas finais
      const duration = (new Date() - this.stats.startTime) / 1000;
      
      console.log('\n📈 === ESTATÍSTICAS FINAIS ===\n');
      console.log(`📊 Q&A existentes antes: ${this.stats.existingCount}`);
      console.log(`✅ Novos Q&A processados: ${this.stats.newPairs}`);
      console.log(`📊 Total Q&A agora: ${this.stats.existingCount + this.stats.newPairs}`);
      
      if (this.stats.failed > 0) {
        console.log(`⚠️ Falhas: ${this.stats.failed}`);
      }
      
      console.log(`⏱️ Tempo total: ${duration.toFixed(2)} segundos`);
      
      // 6. Verificar completude
      const { count: finalCount } = await supabase
        .from('document_sections')
        .select('*', { count: 'exact', head: true })
        .eq('metadata->source_file', 'PDPOA2025-QA.docx');
      
      console.log(`\n📊 Total final de Q&A chunks: ${finalCount || 0}`);
      
      if (finalCount >= 1000) {
        console.log('🎉 === EXTRAÇÃO COMPLETA! META ATINGIDA! ===');
      } else if (finalCount >= 500) {
        console.log('✅ === BOA EXTRAÇÃO! ACIMA DE 500 Q&A ===');
      } else {
        console.log('⚠️ === EXTRAÇÃO PARCIAL - PODE SER MELHORADA ===');
      }
      
    } catch (error) {
      console.error('\n❌ Erro fatal:', error);
      process.exit(1);
    }
  }
}

// Executar
const extractor = new QAExtractor();
extractor.run().catch(console.error);