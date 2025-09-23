#!/usr/bin/env node
/**
 * Processador COMPLETO da Hierarquia Legal
 * 
 * Processa e salva TODOS os níveis:
 * - Partes
 * - Títulos  
 * - Capítulos
 * - Seções
 * - Artigos (216 PDUS + 122 LUOS = 338 total)
 * - Parágrafos
 * - Incisos
 * - Alíneas
 */

import fs from 'fs/promises';
import path from 'path';
import mammoth from 'mammoth';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class CompleteHierarchyProcessor {
  constructor() {
    this.stats = {
      pdus: { artigos: 0, expected: 216 },
      luos: { artigos: 0, expected: 122 },
      total: { 
        partes: 0,
        titulos: 0,
        capitulos: 0,
        secoes: 0,
        artigos: 0,
        paragrafos: 0,
        incisos: 0,
        alineas: 0
      }
    };
  }

  async extractTextFromDocx(docxPath) {
    console.log(`📖 Extraindo texto de: ${path.basename(docxPath)}`);
    const buffer = await fs.readFile(docxPath);
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  processFullHierarchy(text, docType) {
    console.log(`\n🔍 Processando hierarquia completa do ${docType}...`);
    
    const allItems = [];
    const lines = text.split('\n');
    
    // Context tracking
    let currentParte = null;
    let currentTitulo = null;
    let currentCapitulo = null;
    let currentSecao = null;
    let currentSubsecao = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // PARTE
      if (line.match(/^PARTE\s+[IVX]+/)) {
        const match = line.match(/^PARTE\s+([IVX]+)\s*[-–]?\s*(.*)$/);
        if (match) {
          currentParte = {
            type: 'parte',
            level: 1,
            numero: match[1],
            titulo: match[2].trim() || lines[i+1]?.trim() || '',
            document_type: docType,
            full_content: `PARTE ${match[1]} - ${match[2].trim() || lines[i+1]?.trim() || ''}`
          };
          allItems.push(currentParte);
          this.stats.total.partes++;
          console.log(`  📚 PARTE ${match[1]}`);
        }
      }
      
      // TÍTULO
      else if (line.match(/^Título\s+[IVX]+/i)) {
        const match = line.match(/^Título\s+([IVX]+)\s*[-–]?\s*(.*)$/i);
        if (match) {
          currentTitulo = {
            type: 'titulo',
            level: 2,
            numero: match[1],
            titulo: match[2].trim() || lines[i+1]?.trim() || '',
            parte: currentParte?.numero,
            document_type: docType,
            full_content: `Título ${match[1]} - ${match[2].trim() || lines[i+1]?.trim() || ''}`
          };
          allItems.push(currentTitulo);
          this.stats.total.titulos++;
        }
      }
      
      // CAPÍTULO
      else if (line.match(/^(CAPÍTULO|Capítulo)\s+[IVX]+/)) {
        const match = line.match(/^(?:CAPÍTULO|Capítulo)\s+([IVX]+)\s*[-–]?\s*(.*)$/);
        if (match) {
          currentCapitulo = {
            type: 'capitulo',
            level: 3,
            numero: match[1],
            titulo: match[2].trim() || lines[i+1]?.trim() || '',
            parte: currentParte?.numero,
            titulo_pai: currentTitulo?.numero,
            document_type: docType,
            full_content: `Capítulo ${match[1]} - ${match[2].trim() || lines[i+1]?.trim() || ''}`
          };
          allItems.push(currentCapitulo);
          this.stats.total.capitulos++;
        }
      }
      
      // SEÇÃO
      else if (line.match(/^(SEÇÃO|Seção)\s+[IVX]+/)) {
        const match = line.match(/^(?:SEÇÃO|Seção)\s+([IVX]+)\s*[-–]?\s*(.*)$/);
        if (match) {
          currentSecao = {
            type: 'secao',
            level: 4,
            numero: match[1],
            titulo: match[2].trim() || lines[i+1]?.trim() || '',
            capitulo: currentCapitulo?.numero,
            document_type: docType,
            full_content: `Seção ${match[1]} - ${match[2].trim() || lines[i+1]?.trim() || ''}`
          };
          allItems.push(currentSecao);
          this.stats.total.secoes++;
        }
      }
      
      // SUBSEÇÃO
      else if (line.match(/^(SUBSEÇÃO|Subseção)\s+[IVX]+/)) {
        const match = line.match(/^(?:SUBSEÇÃO|Subseção)\s+([IVX]+)\s*[-–]?\s*(.*)$/);
        if (match) {
          currentSubsecao = {
            type: 'subsecao',
            level: 5,
            numero: match[1],
            titulo: match[2].trim() || lines[i+1]?.trim() || '',
            secao: currentSecao?.numero,
            document_type: docType,
            full_content: `Subseção ${match[1]} - ${match[2].trim() || lines[i+1]?.trim() || ''}`
          };
          allItems.push(currentSubsecao);
        }
      }
      
      // ARTIGO - Pattern mais flexível
      else if (line.match(/^Art\.\s*\d+/)) {
        const match = line.match(/^Art\.\s*(\d+)[ºª]?\.?\s*(.*)/);
        if (match) {
          const articleNum = parseInt(match[1]);
          
          // Coletar conteúdo completo do artigo
          let content = match[2] || '';
          let j = i + 1;
          let paragrafos = [];
          let incisos = [];
          
          // Continue coletando até próximo artigo ou seção
          while (j < lines.length) {
            const nextLine = lines[j].trim();
            
            // Para no próximo artigo ou seção hierárquica
            if (nextLine.match(/^Art\.\s*\d+/) || 
                nextLine.match(/^(PARTE|Título|CAPÍTULO|Capítulo|SEÇÃO|Seção)/)) {
              break;
            }
            
            // Parágrafo
            if (nextLine.match(/^§\s*\d+[ºª]?/)) {
              const paraMatch = nextLine.match(/^§\s*(\d+)[ºª]?\.?\s*(.*)/);
              if (paraMatch) {
                paragrafos.push({
                  type: 'paragrafo',
                  numero: parseInt(paraMatch[1]),
                  content: paraMatch[2],
                  artigo: articleNum,
                  document_type: docType
                });
                this.stats.total.paragrafos++;
              }
            }
            // Parágrafo único
            else if (nextLine.match(/^Parágrafo único/)) {
              paragrafos.push({
                type: 'paragrafo_unico',
                content: nextLine.replace(/^Parágrafo único\.?\s*/, ''),
                artigo: articleNum,
                document_type: docType
              });
              this.stats.total.paragrafos++;
            }
            // Inciso (números romanos)
            else if (nextLine.match(/^[IVX]+\s*[-–]/)) {
              const incisoMatch = nextLine.match(/^([IVX]+)\s*[-–]\s*(.*)/);
              if (incisoMatch) {
                incisos.push({
                  type: 'inciso',
                  numero: incisoMatch[1],
                  content: incisoMatch[2],
                  artigo: articleNum,
                  document_type: docType
                });
                this.stats.total.incisos++;
              }
            }
            // Alínea (letras)
            else if (nextLine.match(/^[a-z]\)/)) {
              const alineaMatch = nextLine.match(/^([a-z])\)\s*(.*)/);
              if (alineaMatch) {
                allItems.push({
                  type: 'alinea',
                  letra: alineaMatch[1],
                  content: alineaMatch[2],
                  artigo: articleNum,
                  document_type: docType,
                  full_content: `${alineaMatch[1]}) ${alineaMatch[2]}`
                });
                this.stats.total.alineas++;
              }
            }
            else if (nextLine) {
              content += ' ' + nextLine;
            }
            
            j++;
          }
          
          // Salvar artigo
          const artigo = {
            type: 'artigo',
            article_number: articleNum,
            document_type: docType,
            full_content: `Art. ${articleNum}º ${content}`.trim(),
            article_text: content.trim(),
            keywords: [
              docType,
              `Art. ${articleNum}`,
              currentParte?.titulo,
              currentTitulo?.titulo,
              currentCapitulo?.titulo,
              currentSecao?.titulo
            ].filter(Boolean)
          };
          
          allItems.push(artigo);
          
          // Adicionar parágrafos e incisos
          allItems.push(...paragrafos);
          allItems.push(...incisos);
          
          // Atualizar contadores
          this.stats.total.artigos++;
          if (docType === 'PDUS') {
            this.stats.pdus.artigos++;
          } else {
            this.stats.luos.artigos++;
          }
          
          i = j - 1; // Pular linhas processadas
        }
      }
    }
    
    return allItems;
  }

  async generateEmbedding(text) {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'text-embedding-ada-002',
          input: text.substring(0, 8000)
        })
      });

      if (!response.ok) {
        console.error('Embedding error:', response.statusText);
        return null;
      }

      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.error('Embedding error:', error.message);
      return null;
    }
  }

  async saveToSupabase(items, docType) {
    console.log(`\n💾 Salvando ${items.length} itens do ${docType}...`);
    
    // Filtrar apenas artigos para a tabela legal_articles
    const artigos = items.filter(item => item.type === 'artigo');
    
    console.log(`  📋 ${artigos.length} artigos para processar`);
    
    // Processar em lotes de 5
    const batchSize = 5;
    let savedCount = 0;
    
    for (let i = 0; i < artigos.length; i += batchSize) {
      const batch = artigos.slice(i, i + batchSize);
      const itemsToSave = [];
      
      for (const artigo of batch) {
        console.log(`  🔄 Processando Art. ${artigo.article_number}...`);
        const embedding = await this.generateEmbedding(artigo.full_content);
        
        if (embedding) {
          itemsToSave.push({
            document_type: artigo.document_type,
            article_number: artigo.article_number,
            full_content: artigo.full_content,
            article_text: artigo.article_text,
            keywords: artigo.keywords,
            embedding
          });
        }
      }
      
      if (itemsToSave.length > 0) {
        const { error } = await supabase
          .from('legal_articles')
          .upsert(itemsToSave, { 
            onConflict: 'document_type,article_number',
            ignoreDuplicates: false 
          });
        
        if (error) {
          console.error(`  ❌ Erro no lote:`, error.message);
        } else {
          savedCount += itemsToSave.length;
          console.log(`  ✅ Lote salvo: ${savedCount}/${artigos.length}`);
        }
      }
      
      // Pequena pausa entre lotes
      if (i + batchSize < artigos.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`✅ Total salvo: ${savedCount} artigos`);
    
    // TODO: Salvar outros elementos hierárquicos em tabelas apropriadas
    // Por enquanto, vamos salvar em arquivo JSON local
    const jsonPath = `hierarchy_${docType}.json`;
    await fs.writeFile(jsonPath, JSON.stringify({
      docType,
      stats: {
        partes: items.filter(i => i.type === 'parte').length,
        titulos: items.filter(i => i.type === 'titulo').length,
        capitulos: items.filter(i => i.type === 'capitulo').length,
        secoes: items.filter(i => i.type === 'secao').length,
        artigos: artigos.length,
        paragrafos: items.filter(i => i.type === 'paragrafo' || i.type === 'paragrafo_unico').length,
        incisos: items.filter(i => i.type === 'inciso').length,
        alineas: items.filter(i => i.type === 'alinea').length
      },
      items: items
    }, null, 2));
    
    console.log(`📊 Hierarquia completa salva em: ${jsonPath}`);
  }

  async processDocument(docxPath) {
    const filename = path.basename(docxPath);
    const docType = filename.includes('PLANO_DIRETOR') ? 'PDUS' : 'LUOS';
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📄 Processando ${docType}: ${filename}`);
    console.log('='.repeat(60));
    
    // Extrair texto
    const text = await this.extractTextFromDocx(docxPath);
    console.log(`📝 Texto extraído: ${text.length} caracteres`);
    
    // Processar hierarquia
    const items = this.processFullHierarchy(text, docType);
    
    // Salvar no Supabase
    await this.saveToSupabase(items, docType);
    
    return items.length;
  }

  printStats() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 ESTATÍSTICAS FINAIS');
    console.log('='.repeat(60));
    
    console.log('\n📚 PDUS:');
    console.log(`  Artigos: ${this.stats.pdus.artigos}/${this.stats.pdus.expected}`);
    if (this.stats.pdus.artigos !== this.stats.pdus.expected) {
      console.log(`  ⚠️ ATENÇÃO: Faltam ${this.stats.pdus.expected - this.stats.pdus.artigos} artigos!`);
    }
    
    console.log('\n📚 LUOS:');
    console.log(`  Artigos: ${this.stats.luos.artigos}/${this.stats.luos.expected}`);
    if (this.stats.luos.artigos !== this.stats.luos.expected) {
      console.log(`  ⚠️ ATENÇÃO: Faltam ${this.stats.luos.expected - this.stats.luos.artigos} artigos!`);
    }
    
    console.log('\n📊 TOTAIS:');
    console.log(`  Partes: ${this.stats.total.partes}`);
    console.log(`  Títulos: ${this.stats.total.titulos}`);
    console.log(`  Capítulos: ${this.stats.total.capitulos}`);
    console.log(`  Seções: ${this.stats.total.secoes}`);
    console.log(`  Artigos: ${this.stats.total.artigos} (esperado: 338)`);
    console.log(`  Parágrafos: ${this.stats.total.paragrafos}`);
    console.log(`  Incisos: ${this.stats.total.incisos}`);
    console.log(`  Alíneas: ${this.stats.total.alineas}`);
    
    const totalItems = Object.values(this.stats.total).reduce((a, b) => a + b, 0);
    console.log(`\n  TOTAL DE ELEMENTOS: ${totalItems}`);
    
    console.log('='.repeat(60));
  }
}

async function main() {
  console.log('🚀 Processador de Hierarquia Completa');
  console.log('Objetivo: 216 artigos PDUS + 122 artigos LUOS = 338 total\n');
  
  const processor = new CompleteHierarchyProcessor();
  
  try {
    // Processar PDUS
    await processor.processDocument('knowledgebase/PDPOA2025-Minuta_Preliminar_PLANO_DIRETOR.docx');
    
    // Processar LUOS
    await processor.processDocument('knowledgebase/PDPOA2025-Minuta_Preliminar_LUOS.docx');
    
    // Estatísticas finais
    processor.printStats();
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

main().catch(console.error);