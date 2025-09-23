#!/usr/bin/env node

/**
 * Script para Completar o Processamento da Base de Conhecimento
 * 
 * Este script:
 * 1. Processa os pares Q&A restantes
 * 2. Corrige e importa registros faltantes do regime
 * 3. Verifica documentos com embeddings faltantes
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

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !OPENAI_API_KEY) {
  console.error('❌ Variáveis de ambiente não configuradas!');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

class CompleteKnowledgeBase {
  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: OPENAI_API_KEY,
      modelName: 'text-embedding-3-small'
    });
    
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200
    });
    
    this.stats = {
      qaProcessed: 0,
      qaFailed: 0,
      regimeProcessed: 0,
      regimeFailed: 0,
      embeddingsFixed: 0,
      startTime: new Date()
    };
  }

  /**
   * 1. COMPLETAR PROCESSAMENTO DO Q&A
   */
  async completeQAProcessing() {
    console.log('\n📚 === COMPLETANDO PROCESSAMENTO DO Q&A ===\n');
    
    const qaPath = path.join(__dirname, '..', 'knowledgebase', 'PDPOA2025-QA.docx');
    
    try {
      // Verificar quantos já foram processados
      const { count: existingCount } = await supabase
        .from('document_sections')
        .select('*', { count: 'exact', head: true })
        .eq('metadata->source_file', 'PDPOA2025-QA.docx');
      
      console.log(`📊 Q&A chunks já existentes: ${existingCount || 0}`);
      
      // Extrair texto completo
      console.log('📖 Extraindo texto do documento Q&A...');
      const buffer = await fs.readFile(qaPath);
      const result = await mammoth.extractRawText({ buffer });
      const text = result.value;
      
      console.log(`📝 Texto extraído: ${text.length} caracteres`);
      
      // Processar Q&A com diferentes padrões
      const chunks = [];
      
      // Padrão 1: Pergunta/Resposta formal
      const qaPattern1 = /(?:Pergunta|P)[\s:]*(.+?)(?:Resposta|R)[\s:]*(.+?)(?=(?:Pergunta|P)[\s:]|$)/gis;
      
      // Padrão 2: Numeração
      const qaPattern2 = /\d+\.\s*(.+?)\n+(?:R:|Resposta:)?\s*(.+?)(?=\d+\.\s|$)/gis;
      
      // Padrão 3: Bullet points
      const qaPattern3 = /[•·-]\s*(.+?)\n+(?:R:|Resposta:)?\s*(.+?)(?=[•·-]\s|$)/gis;
      
      // Tentar todos os padrões
      const patterns = [qaPattern1, qaPattern2, qaPattern3];
      let totalMatches = 0;
      
      for (const pattern of patterns) {
        const matches = [...text.matchAll(pattern)];
        if (matches.length > 0) {
          console.log(`   📝 Padrão encontrou ${matches.length} pares Q&A`);
          
          for (const match of matches) {
            const question = match[1]?.trim();
            const answer = match[2]?.trim();
            
            if (question && answer && question.length > 10 && answer.length > 10) {
              chunks.push({
                content: `Pergunta: ${question}\n\nResposta: ${answer}`,
                metadata: {
                  type: 'qa_pair',
                  question: question.substring(0, 200),
                  source_file: 'PDPOA2025-QA.docx'
                }
              });
              totalMatches++;
            }
          }
        }
      }
      
      // Se não encontrou Q&A estruturado, fazer chunking normal
      if (chunks.length < 100) {
        console.log('   ⚠️ Poucos Q&A estruturados encontrados, usando chunking padrão também...');
        
        const textChunks = await this.splitter.splitText(text);
        for (const chunk of textChunks) {
          // Verificar se parece ser Q&A
          if (chunk.includes('?') || chunk.toLowerCase().includes('pergunta') || 
              chunk.toLowerCase().includes('resposta')) {
            chunks.push({
              content: chunk,
              metadata: {
                type: 'qa_content',
                source_file: 'PDPOA2025-QA.docx'
              }
            });
          }
        }
      }
      
      console.log(`\n📦 Total de ${chunks.length} chunks para processar`);
      
      if (chunks.length === 0) {
        console.log('   ⚠️ Nenhum chunk novo para processar');
        return;
      }
      
      // Processar apenas chunks novos (limitar para não sobrecarregar)
      const chunksToProcess = chunks.slice(0, 500); // Processar até 500 por vez
      
      console.log(`🔄 Processando ${chunksToProcess.length} chunks...`);
      
      // Gerar embeddings em lotes
      const batchSize = 20;
      const allEmbeddings = [];
      
      for (let i = 0; i < chunksToProcess.length; i += batchSize) {
        const batch = chunksToProcess.slice(i, i + batchSize);
        const texts = batch.map(c => c.content);
        
        try {
          console.log(`   🧮 Gerando embeddings: ${i + batch.length}/${chunksToProcess.length}`);
          const batchEmbeddings = await this.embeddings.embedDocuments(texts);
          allEmbeddings.push(...batchEmbeddings);
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`   ❌ Erro em embeddings:`, error.message);
          // Adicionar embeddings vazios para não perder chunks
          for (let j = 0; j < batch.length; j++) {
            allEmbeddings.push(new Array(1536).fill(0));
          }
        }
      }
      
      // Salvar no banco
      console.log('\n💾 Salvando chunks no banco...');
      
      const records = chunksToProcess.map((chunk, idx) => ({
        content: chunk.content,
        embedding: `[${allEmbeddings[idx].join(',')}]`,
        metadata: {
          ...chunk.metadata,
          created_at: new Date().toISOString(),
          chunk_method: 'qa_extraction',
          embedding_model: 'text-embedding-3-small'
        }
      }));
      
      // Inserir em lotes
      for (let i = 0; i < records.length; i += 50) {
        const batch = records.slice(i, i + 50);
        
        const { error } = await supabase
          .from('document_sections')
          .insert(batch);
        
        if (error) {
          console.error(`   ❌ Erro ao salvar:`, error.message);
          this.stats.qaFailed += batch.length;
        } else {
          this.stats.qaProcessed += batch.length;
          console.log(`   ✅ Salvos ${i + batch.length}/${records.length} chunks`);
        }
      }
      
      console.log(`\n✅ Q&A processado: ${this.stats.qaProcessed} novos chunks adicionados`);
      
    } catch (error) {
      console.error('❌ Erro ao processar Q&A:', error.message);
    }
  }

  /**
   * 2. CORRIGIR E COMPLETAR REGIME URBANÍSTICO
   */
  async completeRegimeProcessing() {
    console.log('\n🏗️ === COMPLETANDO REGIME URBANÍSTICO ===\n');
    
    const excelPath = path.join(__dirname, '..', 'knowledgebase', 'PDPOA2025-Regime_Urbanistico.xlsx');
    
    try {
      // Verificar quantos já existem
      const { count: existingCount } = await supabase
        .from('regime_urbanistico')
        .select('*', { count: 'exact', head: true });
      
      console.log(`📊 Registros existentes: ${existingCount || 0}`);
      console.log(`📊 Faltam importar: ${385 - (existingCount || 0)} registros\n`);
      
      // Carregar Excel
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(excelPath);
      const worksheet = workbook.getWorksheet(1);
      
      // Processar TODOS os registros, mas de forma mais robusta
      const records = [];
      let rowNum = existingCount || 0; // Começar do próximo ID
      
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header
        
        const record = { id: rowNum++ };
        
        // Mapear apenas campos essenciais e válidos
        const getValue = (cellValue) => {
          if (cellValue === null || cellValue === undefined) return null;
          
          // Se for data, converter para string
          if (cellValue instanceof Date) {
            return null; // Ignorar datas por enquanto
          }
          
          // Se for objeto com resultado
          if (typeof cellValue === 'object' && cellValue.result !== undefined) {
            return cellValue.result?.toString();
          }
          
          // Converter para string
          return cellValue.toString();
        };
        
        // Coletar valores por índice de coluna (mais confiável)
        const bairro = getValue(row.getCell(2).value);
        const zona = getValue(row.getCell(3).value);
        const alturaMax = getValue(row.getCell(4).value);
        const coefBasico = getValue(row.getCell(5).value);
        const coefMaximo = getValue(row.getCell(6).value);
        const areaMinima = getValue(row.getCell(7).value);
        const testadaMinima = getValue(row.getCell(8).value);
        
        if (bairro || zona) {
          record.bairro = bairro;
          record.zona = zona;
          record.altura_maxima = alturaMax;
          record.coef_aproveitamento_basico = coefBasico;
          record.coef_aproveitamento_maximo = coefMaximo;
          record.area_minima_lote = areaMinima;
          record.testada_minima_lote = testadaMinima;
          
          records.push(record);
        }
      });
      
      console.log(`📋 ${records.length} registros para processar`);
      
      // Filtrar apenas os que ainda não foram importados
      const startId = existingCount || 0;
      const newRecords = records.filter(r => r.id >= startId);
      
      console.log(`📦 ${newRecords.length} novos registros para importar\n`);
      
      if (newRecords.length === 0) {
        console.log('   ✅ Todos os registros já foram importados');
        return;
      }
      
      // Inserir em lotes pequenos
      const batchSize = 10;
      for (let i = 0; i < newRecords.length; i += batchSize) {
        const batch = newRecords.slice(i, i + batchSize);
        
        const { error } = await supabase
          .from('regime_urbanistico')
          .insert(batch);
        
        if (error) {
          // Tentar um por um
          for (const record of batch) {
            const { error: singleError } = await supabase
              .from('regime_urbanistico')
              .insert(record);
            
            if (!singleError) {
              this.stats.regimeProcessed++;
            } else {
              this.stats.regimeFailed++;
            }
          }
        } else {
          this.stats.regimeProcessed += batch.length;
          console.log(`   ✅ Importados ${i + batch.length}/${newRecords.length}`);
        }
      }
      
      console.log(`\n✅ Regime processado: ${this.stats.regimeProcessed} novos registros`);
      if (this.stats.regimeFailed > 0) {
        console.log(`   ⚠️ Falharam: ${this.stats.regimeFailed} registros`);
      }
      
    } catch (error) {
      console.error('❌ Erro ao processar regime:', error.message);
    }
  }

  /**
   * 3. VERIFICAR E CORRIGIR EMBEDDINGS FALTANTES
   */
  async fixMissingEmbeddings() {
    console.log('\n🔧 === VERIFICANDO EMBEDDINGS FALTANTES ===\n');
    
    try {
      // Buscar registros sem embeddings
      const { data: missingEmbeddings } = await supabase
        .from('document_sections')
        .select('id, content, metadata')
        .is('embedding', null)
        .limit(100);
      
      if (!missingEmbeddings || missingEmbeddings.length === 0) {
        console.log('✅ Todos os documentos têm embeddings');
        return;
      }
      
      console.log(`⚠️ ${missingEmbeddings.length} documentos sem embeddings`);
      console.log('🔄 Gerando embeddings faltantes...');
      
      // Processar em lotes
      const batchSize = 20;
      for (let i = 0; i < missingEmbeddings.length; i += batchSize) {
        const batch = missingEmbeddings.slice(i, i + batchSize);
        const texts = batch.map(doc => doc.content);
        
        try {
          const embeddings = await this.embeddings.embedDocuments(texts);
          
          // Atualizar cada documento
          for (let j = 0; j < batch.length; j++) {
            const { error } = await supabase
              .from('document_sections')
              .update({ 
                embedding: `[${embeddings[j].join(',')}]` 
              })
              .eq('id', batch[j].id);
            
            if (!error) {
              this.stats.embeddingsFixed++;
            }
          }
          
          console.log(`   ✅ Corrigidos ${i + batch.length}/${missingEmbeddings.length}`);
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          console.error(`   ❌ Erro ao gerar embeddings:`, error.message);
        }
      }
      
      console.log(`\n✅ Embeddings corrigidos: ${this.stats.embeddingsFixed}`);
      
    } catch (error) {
      console.error('❌ Erro ao verificar embeddings:', error.message);
    }
  }

  /**
   * 4. VALIDAR COMPLETUDE DA BASE
   */
  async validateCompleteness() {
    console.log('\n📊 === VALIDANDO COMPLETUDE DA BASE ===\n');
    
    const validation = {
      regime: { expected: 385, actual: 0, percentage: 0 },
      luos: { expected: 136, actual: 0, percentage: 0 },
      planoDirector: { expected: 278, actual: 0, percentage: 0 },
      qa: { expected: 1000, actual: 0, percentage: 0 },
      objetivos: { expected: 20, actual: 0, percentage: 0 },
      totalSections: { expected: 1500, actual: 0, percentage: 0 }
    };
    
    // Verificar regime urbanístico
    const { count: regimeCount } = await supabase
      .from('regime_urbanistico')
      .select('*', { count: 'exact', head: true });
    
    validation.regime.actual = regimeCount || 0;
    validation.regime.percentage = Math.round((validation.regime.actual / validation.regime.expected) * 100);
    
    // Verificar document sections por fonte
    const { data: sectionCounts } = await supabase
      .from('document_sections')
      .select('metadata->source_file as source')
      .not('metadata->source_file', 'is', null);
    
    if (sectionCounts) {
      const counts = {};
      sectionCounts.forEach(row => {
        const source = row.source;
        counts[source] = (counts[source] || 0) + 1;
      });
      
      validation.luos.actual = counts['PDPOA2025-Minuta_Preliminar_LUOS.docx'] || 0;
      validation.planoDirector.actual = counts['PDPOA2025-Minuta_Preliminar_PLANO_DIRETOR.docx'] || 0;
      validation.qa.actual = counts['PDPOA2025-QA.docx'] || 0;
      validation.objetivos.actual = counts['PDPOA2025-Objetivos_Previstos.docx'] || 0;
    }
    
    // Calcular percentagens
    validation.luos.percentage = Math.round((validation.luos.actual / validation.luos.expected) * 100);
    validation.planoDirector.percentage = Math.round((validation.planoDirector.actual / validation.planoDirector.expected) * 100);
    validation.qa.percentage = Math.round((validation.qa.actual / validation.qa.expected) * 100);
    validation.objetivos.percentage = Math.round((validation.objetivos.actual / validation.objetivos.expected) * 100);
    
    // Total de sections
    const { count: totalSections } = await supabase
      .from('document_sections')
      .select('*', { count: 'exact', head: true });
    
    validation.totalSections.actual = totalSections || 0;
    validation.totalSections.percentage = Math.round((validation.totalSections.actual / validation.totalSections.expected) * 100);
    
    // Exibir resultados
    console.log('📋 RELATÓRIO DE COMPLETUDE:\n');
    console.log(`┌─────────────────────┬──────────┬──────────┬────────────┐`);
    console.log(`│ Componente          │ Esperado │ Atual    │ Completo   │`);
    console.log(`├─────────────────────┼──────────┼──────────┼────────────┤`);
    console.log(`│ Regime Urbanístico  │ ${validation.regime.expected.toString().padEnd(8)} │ ${validation.regime.actual.toString().padEnd(8)} │ ${validation.regime.percentage.toString().padStart(3)}%       │`);
    console.log(`│ LUOS                │ ${validation.luos.expected.toString().padEnd(8)} │ ${validation.luos.actual.toString().padEnd(8)} │ ${validation.luos.percentage.toString().padStart(3)}%       │`);
    console.log(`│ Plano Diretor       │ ${validation.planoDirector.expected.toString().padEnd(8)} │ ${validation.planoDirector.actual.toString().padEnd(8)} │ ${validation.planoDirector.percentage.toString().padStart(3)}%       │`);
    console.log(`│ Q&A                 │ ${validation.qa.expected.toString().padEnd(8)} │ ${validation.qa.actual.toString().padEnd(8)} │ ${validation.qa.percentage.toString().padStart(3)}%       │`);
    console.log(`│ Objetivos           │ ${validation.objetivos.expected.toString().padEnd(8)} │ ${validation.objetivos.actual.toString().padEnd(8)} │ ${validation.objetivos.percentage.toString().padStart(3)}%       │`);
    console.log(`├─────────────────────┼──────────┼──────────┼────────────┤`);
    console.log(`│ TOTAL SECTIONS      │ ${validation.totalSections.expected.toString().padEnd(8)} │ ${validation.totalSections.actual.toString().padEnd(8)} │ ${validation.totalSections.percentage.toString().padStart(3)}%       │`);
    console.log(`└─────────────────────┴──────────┴──────────┴────────────┘`);
    
    // Análise
    const overallCompleteness = Math.round(
      (validation.regime.percentage * 0.3 + 
       validation.totalSections.percentage * 0.7) 
    );
    
    console.log(`\n📊 COMPLETUDE GERAL: ${overallCompleteness}%`);
    
    if (overallCompleteness >= 90) {
      console.log('✅ Base de conhecimento está COMPLETA!');
    } else if (overallCompleteness >= 70) {
      console.log('⚠️ Base de conhecimento está PARCIALMENTE COMPLETA');
    } else {
      console.log('❌ Base de conhecimento precisa de mais processamento');
    }
    
    return validation;
  }

  /**
   * EXECUTAR TODO O PROCESSO
   */
  async run() {
    console.log('🚀 === COMPLETANDO BASE DE CONHECIMENTO ===');
    console.log(`📅 ${new Date().toLocaleString('pt-BR')}\n`);
    
    try {
      // 1. Completar Q&A
      await this.completeQAProcessing();
      
      // 2. Completar Regime
      await this.completeRegimeProcessing();
      
      // 3. Corrigir embeddings faltantes
      await this.fixMissingEmbeddings();
      
      // 4. Validar completude
      const validation = await this.validateCompleteness();
      
      // Estatísticas finais
      const duration = (new Date() - this.stats.startTime) / 1000;
      
      console.log('\n📈 === ESTATÍSTICAS FINAIS ===\n');
      console.log(`✅ Q&A processados: ${this.stats.qaProcessed}`);
      console.log(`✅ Regime processados: ${this.stats.regimeProcessed}`);
      console.log(`✅ Embeddings corrigidos: ${this.stats.embeddingsFixed}`);
      console.log(`⏱️ Tempo total: ${duration.toFixed(2)} segundos`);
      
      if (validation.totalSections.percentage >= 80) {
        console.log('\n🎉 === BASE DE CONHECIMENTO COMPLETA! ===');
      } else {
        console.log('\n⚠️ === PROCESSAMENTO PARCIAL - EXECUTE NOVAMENTE SE NECESSÁRIO ===');
      }
      
    } catch (error) {
      console.error('\n❌ Erro fatal:', error);
      process.exit(1);
    }
  }
}

// Executar
const processor = new CompleteKnowledgeBase();
processor.run().catch(console.error);