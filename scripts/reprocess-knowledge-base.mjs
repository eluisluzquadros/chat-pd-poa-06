#!/usr/bin/env node

/**
 * Script de Reprocessamento Completo da Base de Conhecimento
 * Chat PD POA - Porto Alegre Urban Development Plan
 * 
 * Este script realiza:
 * 1. Reprocessamento da tabela regime_urbanistico a partir do Excel
 * 2. Reprocessamento unificado de todos os documentos DOCX
 * 3. Geração de embeddings consistentes
 * 4. Criação de índices otimizados
 * 5. Validação automática
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

dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_SERVICE_KEY || !OPENAI_API_KEY) {
  console.error('❌ Variáveis de ambiente não configuradas!');
  console.error('Necessário: SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

class KnowledgeBaseProcessor {
  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: OPENAI_API_KEY,
      modelName: 'text-embedding-3-small',
      dimensions: 1536
    });
    
    // Configuração otimizada para documentos legais em português
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: [
        "\n\n",           // Parágrafos
        "\n",             // Linhas
        ".",              // Sentenças
        ";",              // Ponto e vírgula
        ",",              // Vírgulas
        " ",              // Espaços
        ""                // Caracteres individuais
      ]
    });
    
    this.stats = {
      regime: { processed: 0, failed: 0 },
      documents: { processed: 0, failed: 0 },
      embeddings: { generated: 0, failed: 0 },
      startTime: new Date()
    };
  }

  /**
   * 1. PROCESSAR REGIME URBANÍSTICO
   */
  async processRegimeUrbanistico() {
    console.log('\n📊 === PROCESSANDO REGIME URBANÍSTICO ===\n');
    
    const excelPath = path.join(__dirname, '..', 'knowledgebase', 'PDPOA2025-Regime_Urbanistico.xlsx');
    
    try {
      // Verificar se arquivo existe
      await fs.access(excelPath);
      console.log(`✅ Arquivo encontrado: ${excelPath}`);
    } catch {
      console.error(`❌ Arquivo não encontrado: ${excelPath}`);
      return;
    }
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelPath);
    const worksheet = workbook.getWorksheet(1);
    
    if (!worksheet) {
      console.error('❌ Planilha não encontrada no arquivo Excel');
      return;
    }
    
    // Obter cabeçalhos da primeira linha
    const headers = [];
    worksheet.getRow(1).eachCell((cell, colNumber) => {
      headers[colNumber - 1] = cell.value?.toString().toLowerCase().replace(/\s+/g, '_');
    });
    
    console.log(`📋 Colunas encontradas: ${headers.length}`);
    console.log(`📋 Primeiras colunas: ${headers.slice(0, 10).join(', ')}`);
    
    // Limpar tabela existente
    console.log('🗑️ Limpando tabela regime_urbanistico...');
    const { error: deleteError } = await supabase
      .from('regime_urbanistico')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (deleteError) {
      console.error('❌ Erro ao limpar tabela:', deleteError);
    }
    
    // Processar linhas
    const records = [];
    let rowCount = 0;
    
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      
      const record = {};
      let hasData = false;
      
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1];
        if (header && cell.value !== null && cell.value !== undefined) {
          // Converter valores para o formato correto
          let value = cell.value;
          
          // Se for um objeto de fórmula, pegar o resultado
          if (typeof value === 'object' && value.result !== undefined) {
            value = value.result;
          }
          
          // Converter números para string quando necessário
          if (typeof value === 'number') {
            value = value.toString();
          }
          
          record[header] = value;
          hasData = true;
        }
      });
      
      if (hasData) {
        // Adicionar campos essenciais se não existirem
        record.id = crypto.randomUUID();
        record.created_at = new Date().toISOString();
        records.push(record);
        rowCount++;
      }
    });
    
    console.log(`📊 Total de registros processados: ${rowCount}`);
    
    // Inserir em lotes
    const batchSize = 50;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('regime_urbanistico')
        .insert(batch);
      
      if (error) {
        console.error(`❌ Erro ao inserir lote ${i / batchSize + 1}:`, error.message);
        this.stats.regime.failed += batch.length;
      } else {
        console.log(`✅ Inseridos ${batch.length} registros (${i + batch.length}/${records.length})`);
        this.stats.regime.processed += batch.length;
      }
    }
    
    console.log(`\n✅ Regime urbanístico processado: ${this.stats.regime.processed} registros`);
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
    
    // Limpar embeddings existentes desses documentos
    console.log('🗑️ Limpando embeddings existentes...');
    for (const file of docFiles) {
      const { error } = await supabase
        .from('document_sections')
        .delete()
        .eq('metadata->source_file', file);
      
      if (error) {
        console.error(`❌ Erro ao limpar embeddings de ${file}:`, error.message);
      }
    }
    
    // Processar cada documento
    for (const fileName of docFiles) {
      console.log(`\n📖 Processando ${fileName}...`);
      
      const filePath = path.join(__dirname, '..', 'knowledgebase', fileName);
      
      try {
        await fs.access(filePath);
        const buffer = await fs.readFile(filePath);
        
        // Extrair texto do DOCX
        const result = await mammoth.extractRawText({ buffer });
        const text = result.value;
        
        if (!text || text.length === 0) {
          console.error(`❌ Documento vazio: ${fileName}`);
          this.stats.documents.failed++;
          continue;
        }
        
        console.log(`📝 Texto extraído: ${text.length} caracteres`);
        
        // Aplicar chunking hierárquico
        const chunks = await this.hierarchicalChunking(text, fileName);
        console.log(`🔪 Chunks criados: ${chunks.length}`);
        
        // Gerar embeddings
        const embeddings = await this.generateEmbeddings(chunks);
        console.log(`🧮 Embeddings gerados: ${embeddings.length}`);
        
        // Salvar no banco
        await this.saveEmbeddings(chunks, embeddings, fileName);
        
        this.stats.documents.processed++;
        console.log(`✅ ${fileName} processado com sucesso`);
        
      } catch (error) {
        console.error(`❌ Erro ao processar ${fileName}:`, error.message);
        this.stats.documents.failed++;
      }
    }
  }

  /**
   * 3. CHUNKING HIERÁRQUICO OTIMIZADO
   */
  async hierarchicalChunking(text, filename) {
    const chunks = [];
    
    // Detectar tipo de documento
    const isLegalDoc = filename.includes('LUOS') || filename.includes('PLANO_DIRETOR');
    const isQADoc = filename.includes('QA');
    
    if (isLegalDoc) {
      // Processar documentos legais por artigos
      console.log('⚖️ Aplicando chunking legal (por artigos)...');
      
      // Patterns para detectar artigos
      const articlePatterns = [
        /(?:ARTIGO|Art\.?|Artigo)\s+(\d+)[º°]?\s*[-–—]\s*(.+?)(?=(?:ARTIGO|Art\.?|Artigo)\s+\d+|$)/gis,
        /(?:ARTIGO|Art\.?|Artigo)\s+(\d+)[º°]?\s*\n(.+?)(?=(?:ARTIGO|Art\.?|Artigo)\s+\d+|$)/gis
      ];
      
      let articles = [];
      for (const pattern of articlePatterns) {
        const matches = [...text.matchAll(pattern)];
        if (matches.length > 0) {
          articles = matches;
          break;
        }
      }
      
      if (articles.length > 0) {
        console.log(`📜 Encontrados ${articles.length} artigos`);
        
        for (const match of articles) {
          const articleNum = match[1];
          const articleContent = match[0];
          
          // Se o artigo for pequeno, manter inteiro
          if (articleContent.length < 1500) {
            chunks.push({
              content: articleContent,
              metadata: {
                type: 'article',
                article_number: parseInt(articleNum),
                source: filename,
                chunk_method: 'hierarchical_legal'
              }
            });
          } else {
            // Dividir artigos grandes preservando incisos e parágrafos
            const subChunks = await this.splitter.splitText(articleContent);
            subChunks.forEach((chunk, idx) => {
              chunks.push({
                content: chunk,
                metadata: {
                  type: 'article_part',
                  article_number: parseInt(articleNum),
                  part: idx + 1,
                  total_parts: subChunks.length,
                  source: filename,
                  chunk_method: 'hierarchical_legal'
                }
              });
            });
          }
        }
      } else {
        // Fallback para chunking padrão se não encontrar artigos
        console.log('⚠️ Artigos não detectados, usando chunking padrão');
        const textChunks = await this.splitter.splitText(text);
        textChunks.forEach((chunk, idx) => {
          chunks.push({
            content: chunk,
            metadata: {
              type: 'standard',
              chunk_index: idx,
              source: filename,
              chunk_method: 'standard'
            }
          });
        });
      }
      
    } else if (isQADoc) {
      // Processar documento Q&A preservando pares pergunta-resposta
      console.log('❓ Aplicando chunking Q&A (preservando pares)...');
      
      // Detectar padrão de perguntas e respostas
      const qaPattern = /(?:P:|Pergunta:|Q:)\s*(.+?)(?:R:|Resposta:|A:)\s*(.+?)(?=(?:P:|Pergunta:|Q:)|$)/gis;
      const qaMatches = [...text.matchAll(qaPattern)];
      
      if (qaMatches.length > 0) {
        console.log(`💬 Encontrados ${qaMatches.length} pares Q&A`);
        
        for (const match of qaMatches) {
          const question = match[1].trim();
          const answer = match[2].trim();
          const fullQA = `Pergunta: ${question}\n\nResposta: ${answer}`;
          
          chunks.push({
            content: fullQA,
            metadata: {
              type: 'qa_pair',
              question: question.substring(0, 200),
              source: filename,
              chunk_method: 'qa_preservation'
            }
          });
        }
      } else {
        // Se não encontrar padrão Q&A, usar chunking com overlap maior
        const textChunks = await this.splitter.splitText(text);
        textChunks.forEach((chunk, idx) => {
          chunks.push({
            content: chunk,
            metadata: {
              type: 'qa_content',
              chunk_index: idx,
              source: filename,
              chunk_method: 'standard_qa'
            }
          });
        });
      }
      
    } else {
      // Chunking padrão para outros documentos
      console.log('📄 Aplicando chunking padrão...');
      const textChunks = await this.splitter.splitText(text);
      textChunks.forEach((chunk, idx) => {
        chunks.push({
          content: chunk,
          metadata: {
            type: 'standard',
            chunk_index: idx,
            source: filename,
            chunk_method: 'standard'
          }
        });
      });
    }
    
    return chunks;
  }

  /**
   * 4. GERAR EMBEDDINGS EM LOTE
   */
  async generateEmbeddings(chunks) {
    const embeddings = [];
    const batchSize = 20; // OpenAI recomenda lotes de até 20
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const texts = batch.map(c => c.content);
      
      try {
        const batchEmbeddings = await this.embeddings.embedDocuments(texts);
        embeddings.push(...batchEmbeddings);
        this.stats.embeddings.generated += batchEmbeddings.length;
        
        console.log(`🔄 Embeddings: ${embeddings.length}/${chunks.length}`);
        
        // Rate limiting
        if (i + batchSize < chunks.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`❌ Erro ao gerar embeddings do lote ${i / batchSize + 1}:`, error.message);
        this.stats.embeddings.failed += batch.length;
        
        // Criar embeddings vazios para não perder os chunks
        for (let j = 0; j < batch.length; j++) {
          embeddings.push(new Array(1536).fill(0));
        }
      }
    }
    
    return embeddings;
  }

  /**
   * 5. SALVAR EMBEDDINGS NO BANCO
   */
  async saveEmbeddings(chunks, embeddings, sourceFile) {
    const records = chunks.map((chunk, idx) => ({
      id: crypto.randomUUID(),
      content: chunk.content,
      embedding: `[${embeddings[idx].join(',')}]`, // Formato PostgreSQL
      metadata: {
        ...chunk.metadata,
        source_file: sourceFile,
        created_at: new Date().toISOString(),
        embedding_model: 'text-embedding-3-small',
        embedding_dimensions: 1536
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
        console.error(`❌ Erro ao salvar embeddings:`, error.message);
      } else {
        console.log(`💾 Salvos ${batch.length} chunks (${i + batch.length}/${records.length})`);
      }
    }
  }

  /**
   * 6. CRIAR ÍNDICES OTIMIZADOS
   */
  async createIndexes() {
    console.log('\n🔍 === CRIANDO ÍNDICES OTIMIZADOS ===\n');
    
    const indexes = [
      // Índices para busca textual em português
      {
        name: 'idx_document_sections_content_search',
        sql: `CREATE INDEX IF NOT EXISTS idx_document_sections_content_search 
              ON document_sections USING gin(to_tsvector('portuguese', content))`
      },
      
      // Índice para metadados JSON
      {
        name: 'idx_document_sections_metadata',
        sql: `CREATE INDEX IF NOT EXISTS idx_document_sections_metadata 
              ON document_sections USING gin(metadata jsonb_path_ops)`
      },
      
      // Índice para busca por source_file
      {
        name: 'idx_document_sections_source',
        sql: `CREATE INDEX IF NOT EXISTS idx_document_sections_source 
              ON document_sections((metadata->>'source_file'))`
      },
      
      // Índice para busca por tipo
      {
        name: 'idx_document_sections_type',
        sql: `CREATE INDEX IF NOT EXISTS idx_document_sections_type 
              ON document_sections((metadata->>'type'))`
      },
      
      // Índices para regime urbanístico
      {
        name: 'idx_regime_zona',
        sql: `CREATE INDEX IF NOT EXISTS idx_regime_zona 
              ON regime_urbanistico(zona)`
      },
      
      {
        name: 'idx_regime_bairro',
        sql: `CREATE INDEX IF NOT EXISTS idx_regime_bairro 
              ON regime_urbanistico(bairro)`
      },
      
      {
        name: 'idx_regime_zona_bairro',
        sql: `CREATE INDEX IF NOT EXISTS idx_regime_zona_bairro 
              ON regime_urbanistico(zona, bairro)`
      }
    ];
    
    for (const index of indexes) {
      console.log(`📍 Criando índice: ${index.name}`);
      
      try {
        // Usar SQL direto via HTTP API
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/execute_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
          },
          body: JSON.stringify({ query: index.sql })
        });
        
        if (response.ok) {
          console.log(`✅ Índice criado: ${index.name}`);
        } else {
          // Tentar método alternativo
          console.log(`⚠️ Método alternativo para: ${index.name}`);
        }
      } catch (error) {
        console.error(`❌ Erro ao criar índice ${index.name}:`, error.message);
      }
    }
  }

  /**
   * 7. VALIDAR REPROCESSAMENTO
   */
  async validate() {
    console.log('\n🧪 === VALIDANDO REPROCESSAMENTO ===\n');
    
    // Verificar contagens
    const { count: regimeCount } = await supabase
      .from('regime_urbanistico')
      .select('*', { count: 'exact', head: true });
    
    const { count: sectionsCount } = await supabase
      .from('document_sections')
      .select('*', { count: 'exact', head: true });
    
    // Verificar distribuição por arquivo
    const { data: distribution } = await supabase
      .from('document_sections')
      .select('metadata')
      .limit(1000);
    
    const fileDistribution = {};
    if (distribution) {
      distribution.forEach(row => {
        const source = row.metadata?.source_file || 'unknown';
        fileDistribution[source] = (fileDistribution[source] || 0) + 1;
      });
    }
    
    console.log('📊 === ESTATÍSTICAS FINAIS ===');
    console.log(`\n✅ Regime urbanístico: ${regimeCount || 0} registros`);
    console.log(`✅ Document sections: ${sectionsCount || 0} chunks`);
    console.log('\n📁 Distribuição por arquivo:');
    Object.entries(fileDistribution).forEach(([file, count]) => {
      console.log(`   - ${file}: ${count} chunks`);
    });
    
    console.log('\n📈 === RESUMO DE PROCESSAMENTO ===');
    console.log(`✅ Regime processados: ${this.stats.regime.processed}`);
    console.log(`❌ Regime falhados: ${this.stats.regime.failed}`);
    console.log(`✅ Documentos processados: ${this.stats.documents.processed}`);
    console.log(`❌ Documentos falhados: ${this.stats.documents.failed}`);
    console.log(`✅ Embeddings gerados: ${this.stats.embeddings.generated}`);
    console.log(`❌ Embeddings falhados: ${this.stats.embeddings.failed}`);
    
    const duration = (new Date() - this.stats.startTime) / 1000;
    console.log(`\n⏱️ Tempo total: ${duration.toFixed(2)} segundos`);
    
    // Validação de qualidade
    const expectedRegime = 387;
    const minSections = 1000;
    
    if (regimeCount < expectedRegime * 0.9) {
      console.warn(`\n⚠️ AVISO: Menos registros de regime do que esperado (${regimeCount} < ${expectedRegime})`);
    }
    
    if (sectionsCount < minSections) {
      console.warn(`\n⚠️ AVISO: Menos sections do que esperado (${sectionsCount} < ${minSections})`);
    }
    
    return {
      success: regimeCount > 0 && sectionsCount > 0,
      regime: regimeCount,
      sections: sectionsCount,
      distribution: fileDistribution
    };
  }

  /**
   * EXECUTAR PROCESSO COMPLETO
   */
  async run() {
    console.log('🚀 === INICIANDO REPROCESSAMENTO DA BASE DE CONHECIMENTO ===');
    console.log(`📅 Data/Hora: ${new Date().toLocaleString('pt-BR')}`);
    console.log(`🔗 Supabase URL: ${SUPABASE_URL}`);
    console.log('');
    
    try {
      // 1. Processar regime urbanístico
      await this.processRegimeUrbanistico();
      
      // 2. Processar documentos
      await this.processDocuments();
      
      // 3. Criar índices
      await this.createIndexes();
      
      // 4. Validar
      const validation = await this.validate();
      
      if (validation.success) {
        console.log('\n✅ === REPROCESSAMENTO CONCLUÍDO COM SUCESSO! ===');
      } else {
        console.log('\n⚠️ === REPROCESSAMENTO CONCLUÍDO COM AVISOS ===');
      }
      
    } catch (error) {
      console.error('\n❌ === ERRO FATAL NO REPROCESSAMENTO ===');
      console.error(error);
      process.exit(1);
    }
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const processor = new KnowledgeBaseProcessor();
  processor.run().catch(console.error);
}

export default KnowledgeBaseProcessor;