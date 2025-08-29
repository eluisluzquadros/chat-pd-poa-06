#!/usr/bin/env node

/**
 * Script Completo de Reprocessamento da Base de Conhecimento
 * Com ExcelJS e mammoth para processamento real
 */

import { createClient } from '@supabase/supabase-js';
import ExcelJS from 'exceljs';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from '@langchain/openai';
import mammoth from 'mammoth';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

console.log('🚀 === REPROCESSAMENTO COMPLETO DA BASE DE CONHECIMENTO ===');
console.log(`📅 Data/Hora: ${new Date().toLocaleString('pt-BR')}`);
console.log('');

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !OPENAI_API_KEY) {
  console.error('❌ Variáveis de ambiente não configuradas!');
  process.exit(1);
}

console.log('✅ Configuração verificada');
console.log(`🔗 Supabase: ${SUPABASE_URL}`);
console.log('');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

class KnowledgeBaseProcessor {
  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: OPENAI_API_KEY,
      modelName: 'text-embedding-3-small'
    });
    
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ["\n\n", "\n", ".", ";", ",", " ", ""]
    });
    
    this.stats = {
      regime: { processed: 0, failed: 0, total: 0 },
      documents: { processed: 0, failed: 0, total: 0 },
      embeddings: { generated: 0, failed: 0 },
      startTime: new Date()
    };
  }

  /**
   * 1. PROCESSAR REGIME URBANÍSTICO DO EXCEL
   */
  async processRegimeUrbanistico() {
    console.log('📊 === PROCESSANDO REGIME URBANÍSTICO ===\n');
    
    const excelPath = path.join(__dirname, '..', 'knowledgebase', 'PDPOA2025-Regime_Urbanistico.xlsx');
    
    try {
      // Verificar arquivo
      await fs.access(excelPath);
      console.log(`✅ Arquivo Excel encontrado`);
      
      // Carregar workbook
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(excelPath);
      
      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) {
        console.error('❌ Planilha não encontrada');
        return;
      }
      
      console.log(`📋 Planilha carregada: ${worksheet.rowCount} linhas`);
      
      // Obter headers
      const headers = [];
      worksheet.getRow(1).eachCell((cell, colNumber) => {
        const header = cell.value?.toString()
          .toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[^\w_]/g, '');
        headers[colNumber - 1] = header || `col_${colNumber}`;
      });
      
      console.log(`📋 Colunas identificadas: ${headers.length}`);
      console.log(`   Principais: ${headers.slice(0, 6).join(', ')}`);
      
      // Limpar tabela existente
      console.log('\n🗑️ Limpando tabela regime_urbanistico...');
      const { error: deleteError } = await supabase
        .from('regime_urbanistico')
        .delete()
        .gte('id', 0); // Delete all
      
      if (deleteError && !deleteError.message.includes('no rows')) {
        console.error('⚠️ Erro ao limpar:', deleteError.message);
      }
      
      // Processar linhas
      const records = [];
      let rowNum = 0;
      
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header
        
        const record = {};
        let hasData = false;
        
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber - 1];
          if (header && cell.value !== null && cell.value !== undefined) {
            let value = cell.value;
            
            // Tratar valores de fórmula
            if (typeof value === 'object' && value.result !== undefined) {
              value = value.result;
            }
            
            // Converter para string se necessário
            if (typeof value === 'number') {
              value = value.toString();
            }
            
            record[header] = value;
            hasData = true;
          }
        });
        
        if (hasData) {
          // Adicionar campos obrigatórios
          if (!record.id) {
            record.id = rowNum++;
          }
          records.push(record);
        }
      });
      
      console.log(`\n📊 Total de registros processados: ${records.length}`);
      this.stats.regime.total = records.length;
      
      // Inserir em lotes
      const batchSize = 50;
      console.log(`📦 Inserindo em lotes de ${batchSize}...`);
      
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        
        const { error } = await supabase
          .from('regime_urbanistico')
          .insert(batch);
        
        if (error) {
          console.error(`❌ Erro no lote ${Math.floor(i/batchSize) + 1}:`, error.message);
          this.stats.regime.failed += batch.length;
        } else {
          this.stats.regime.processed += batch.length;
          console.log(`✅ Lote ${Math.floor(i/batchSize) + 1}/${Math.ceil(records.length/batchSize)} inserido (${this.stats.regime.processed}/${records.length})`);
        }
      }
      
      console.log(`\n✅ Regime urbanístico: ${this.stats.regime.processed}/${this.stats.regime.total} registros processados`);
      
    } catch (error) {
      console.error('❌ Erro ao processar Excel:', error.message);
    }
  }

  /**
   * 2. PROCESSAR DOCUMENTOS DOCX
   */
  async processDocuments() {
    console.log('\n📄 === PROCESSANDO DOCUMENTOS DOCX ===\n');
    
    const docFiles = [
      'PDPOA2025-Minuta_Preliminar_LUOS.docx',
      'PDPOA2025-Minuta_Preliminar_PLANO_DIRETOR.docx',
      'PDPOA2025-Objetivos_Previstos.docx',
      'PDPOA2025-QA.docx'
    ];
    
    // Limpar embeddings existentes
    console.log('🗑️ Limpando document_sections existentes...');
    for (const file of docFiles) {
      const { error } = await supabase
        .from('document_sections')
        .delete()
        .eq('metadata->source_file', file);
      
      if (error && !error.message.includes('no rows')) {
        console.error(`⚠️ Erro ao limpar ${file}:`, error.message);
      }
    }
    
    this.stats.documents.total = docFiles.length;
    
    // Processar cada documento
    for (const fileName of docFiles) {
      console.log(`\n📖 Processando ${fileName}...`);
      
      const filePath = path.join(__dirname, '..', 'knowledgebase', fileName);
      
      try {
        // Verificar arquivo
        const stats = await fs.stat(filePath);
        console.log(`   📁 Tamanho: ${(stats.size / 1024).toFixed(1)} KB`);
        
        // Ler arquivo DOCX
        const buffer = await fs.readFile(filePath);
        
        // Extrair texto com mammoth
        console.log('   📝 Extraindo texto...');
        const result = await mammoth.extractRawText({ buffer });
        const text = result.value;
        
        if (!text || text.length === 0) {
          console.error(`   ❌ Documento vazio`);
          this.stats.documents.failed++;
          continue;
        }
        
        console.log(`   📝 Texto extraído: ${text.length} caracteres`);
        
        // Criar chunks
        console.log('   🔪 Criando chunks...');
        const chunks = await this.createChunks(text, fileName);
        console.log(`   📦 ${chunks.length} chunks criados`);
        
        // Gerar embeddings
        console.log('   🧮 Gerando embeddings...');
        const embeddings = await this.generateEmbeddings(chunks);
        console.log(`   ✅ ${embeddings.length} embeddings gerados`);
        
        // Salvar no banco
        console.log('   💾 Salvando no banco...');
        await this.saveEmbeddings(chunks, embeddings, fileName);
        
        this.stats.documents.processed++;
        console.log(`   ✅ ${fileName} processado com sucesso!`);
        
      } catch (error) {
        console.error(`   ❌ Erro ao processar ${fileName}:`, error.message);
        this.stats.documents.failed++;
      }
    }
    
    console.log(`\n✅ Documentos: ${this.stats.documents.processed}/${this.stats.documents.total} processados`);
  }

  /**
   * 3. CRIAR CHUNKS INTELIGENTES
   */
  async createChunks(text, filename) {
    const chunks = [];
    
    // Detectar tipo de documento
    const isLegalDoc = filename.includes('LUOS') || filename.includes('PLANO_DIRETOR');
    const isQADoc = filename.includes('QA');
    
    if (isLegalDoc) {
      // Processar por artigos
      const articlePattern = /(?:ARTIGO|Art\.?|Artigo)\s+(\d+)[º°]?\s*[-–—]?\s*(.+?)(?=(?:ARTIGO|Art\.?|Artigo)\s+\d+|$)/gis;
      const matches = [...text.matchAll(articlePattern)];
      
      if (matches.length > 0) {
        console.log(`      📜 ${matches.length} artigos encontrados`);
        
        for (const match of matches) {
          const articleNum = match[1];
          const articleContent = match[0];
          
          if (articleContent.length < 1500) {
            chunks.push({
              content: articleContent,
              metadata: {
                type: 'article',
                article_number: parseInt(articleNum)
              }
            });
          } else {
            // Dividir artigos grandes
            const subChunks = await this.splitter.splitText(articleContent);
            subChunks.forEach((chunk, idx) => {
              chunks.push({
                content: chunk,
                metadata: {
                  type: 'article_part',
                  article_number: parseInt(articleNum),
                  part: idx + 1
                }
              });
            });
          }
        }
      }
    } else if (isQADoc) {
      // Processar Q&A preservando pares
      const qaPattern = /(?:Pergunta|P|Question)[\s:]*(.+?)(?:Resposta|R|Answer)[\s:]*(.+?)(?=(?:Pergunta|P|Question)|$)/gis;
      const matches = [...text.matchAll(qaPattern)];
      
      if (matches.length > 0) {
        console.log(`      ❓ ${matches.length} pares Q&A encontrados`);
        
        for (const match of matches) {
          const question = match[1].trim();
          const answer = match[2].trim();
          chunks.push({
            content: `Pergunta: ${question}\n\nResposta: ${answer}`,
            metadata: {
              type: 'qa_pair',
              question: question.substring(0, 200)
            }
          });
        }
      }
    }
    
    // Se não encontrou padrões específicos, usar chunking padrão
    if (chunks.length === 0) {
      console.log('      📄 Usando chunking padrão');
      const textChunks = await this.splitter.splitText(text);
      textChunks.forEach((chunk, idx) => {
        chunks.push({
          content: chunk,
          metadata: {
            type: 'standard',
            chunk_index: idx
          }
        });
      });
    }
    
    return chunks;
  }

  /**
   * 4. GERAR EMBEDDINGS
   */
  async generateEmbeddings(chunks) {
    const embeddings = [];
    const batchSize = 20;
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const texts = batch.map(c => c.content);
      
      try {
        const batchEmbeddings = await this.embeddings.embedDocuments(texts);
        embeddings.push(...batchEmbeddings);
        this.stats.embeddings.generated += batchEmbeddings.length;
        
        console.log(`      🔄 Embeddings: ${embeddings.length}/${chunks.length}`);
        
        // Rate limiting
        if (i + batchSize < chunks.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`      ❌ Erro em embeddings:`, error.message);
        this.stats.embeddings.failed += batch.length;
        
        // Adicionar embeddings vazios
        for (let j = 0; j < batch.length; j++) {
          embeddings.push(new Array(1536).fill(0));
        }
      }
    }
    
    return embeddings;
  }

  /**
   * 5. SALVAR EMBEDDINGS
   */
  async saveEmbeddings(chunks, embeddings, sourceFile) {
    const records = chunks.map((chunk, idx) => ({
      content: chunk.content,
      embedding: `[${embeddings[idx].join(',')}]`,
      metadata: {
        ...chunk.metadata,
        source_file: sourceFile,
        created_at: new Date().toISOString(),
        chunk_method: 'hierarchical',
        embedding_model: 'text-embedding-3-small'
      }
    }));
    
    // Inserir em lotes
    const batchSize = 50;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('document_sections')
        .insert(batch);
      
      if (error) {
        console.error(`      ❌ Erro ao salvar:`, error.message);
      } else {
        console.log(`      💾 Salvos ${i + batch.length}/${records.length} chunks`);
      }
    }
  }

  /**
   * EXECUTAR PROCESSO COMPLETO
   */
  async run() {
    try {
      // 1. Processar regime urbanístico
      await this.processRegimeUrbanistico();
      
      // 2. Processar documentos
      await this.processDocuments();
      
      // 3. Estatísticas finais
      console.log('\n📊 === ESTATÍSTICAS FINAIS ===\n');
      
      const { count: regimeCount } = await supabase
        .from('regime_urbanistico')
        .select('*', { count: 'exact', head: true });
      
      const { count: sectionsCount } = await supabase
        .from('document_sections')
        .select('*', { count: 'exact', head: true });
      
      console.log(`✅ Regime urbanístico: ${regimeCount || 0} registros`);
      console.log(`✅ Document sections: ${sectionsCount || 0} chunks`);
      
      console.log('\n📈 Resumo de processamento:');
      console.log(`   Regime: ${this.stats.regime.processed}/${this.stats.regime.total} processados`);
      console.log(`   Documentos: ${this.stats.documents.processed}/${this.stats.documents.total} processados`);
      console.log(`   Embeddings: ${this.stats.embeddings.generated} gerados, ${this.stats.embeddings.failed} falharam`);
      
      const duration = (new Date() - this.stats.startTime) / 1000;
      console.log(`\n⏱️ Tempo total: ${duration.toFixed(2)} segundos`);
      
      if (regimeCount > 300 && sectionsCount > 50) {
        console.log('\n✅ === REPROCESSAMENTO COMPLETO BEM-SUCEDIDO! ===');
      } else {
        console.log('\n⚠️ === REPROCESSAMENTO PARCIAL ===');
        console.log('Alguns dados podem estar faltando. Verifique os logs acima.');
      }
      
    } catch (error) {
      console.error('\n❌ Erro fatal:', error);
      process.exit(1);
    }
  }
}

// Executar
const processor = new KnowledgeBaseProcessor();
processor.run().catch(console.error);