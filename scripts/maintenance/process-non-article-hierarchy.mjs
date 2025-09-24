#!/usr/bin/env node
/**
 * Processador para elementos NÃO-ARTIGO da hierarquia
 * 
 * Processa apenas:
 * - Partes
 * - Títulos  
 * - Capítulos
 * - Seções
 * - Parágrafos
 * - Incisos
 * - Alíneas
 * 
 * (Artigos já foram processados - não reprocessar!)
 */

import fs from 'fs/promises';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class NonArticleProcessor {
  constructor() {
    this.stats = {
      partes: 0,
      titulos: 0,
      capitulos: 0,
      secoes: 0,
      paragrafos: 0,
      incisos: 0,
      alineas: 0,
      total: 0
    };
  }

  async loadHierarchyFromJSON() {
    console.log('📂 Carregando hierarquia dos arquivos JSON...\n');
    
    const allElements = [];
    
    // Carregar PDUS
    try {
      const pdusData = await fs.readFile('hierarchy_PDUS.json', 'utf-8');
      const pdus = JSON.parse(pdusData);
      console.log(`📚 PDUS carregado: ${pdus.items.length} elementos`);
      
      // Filtrar APENAS elementos não-artigo
      const nonArticles = pdus.items.filter(item => item.type !== 'artigo');
      console.log(`  → ${nonArticles.length} elementos não-artigo`);
      allElements.push(...nonArticles);
      
    } catch (error) {
      console.error('❌ Erro carregando PDUS:', error.message);
    }
    
    // Carregar LUOS
    try {
      const luosData = await fs.readFile('hierarchy_LUOS.json', 'utf-8');
      const luos = JSON.parse(luosData);
      console.log(`📚 LUOS carregado: ${luos.items.length} elementos`);
      
      // Filtrar APENAS elementos não-artigo
      const nonArticles = luos.items.filter(item => item.type !== 'artigo');
      console.log(`  → ${nonArticles.length} elementos não-artigo`);
      allElements.push(...nonArticles);
      
    } catch (error) {
      console.error('❌ Erro carregando LUOS:', error.message);
    }
    
    // Contar por tipo
    const counts = {};
    allElements.forEach(el => {
      counts[el.type] = (counts[el.type] || 0) + 1;
    });
    
    console.log('\n📊 Elementos a processar:');
    Object.entries(counts).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count}`);
    });
    
    return allElements;
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

  mapElementToTableFormat(element) {
    // Mapear para o formato da tabela legal_hierarchy
    const mapped = {
      element_type: element.type,
      document_type: element.document_type,
      full_content: element.full_content || '',
      metadata: {}
    };
    
    // Definir hierarchy_level baseado no tipo
    const levelMap = {
      'parte': 1,
      'titulo': 2,
      'capitulo': 3,
      'secao': 4,
      'subsecao': 4,
      'artigo': 5, // não será processado
      'paragrafo': 6,
      'paragrafo_unico': 6,
      'inciso': 7,
      'alinea': 8
    };
    mapped.hierarchy_level = levelMap[element.type] || 9;
    
    // Número/identificador do elemento
    if (element.numero) {
      mapped.element_number = String(element.numero);
    } else if (element.letra) {
      mapped.element_number = element.letra;
    }
    
    // Título do elemento
    if (element.titulo) {
      mapped.element_title = element.titulo;
    } else if (element.content) {
      mapped.element_title = element.content.substring(0, 100);
    }
    
    // Referências hierárquicas
    if (element.parte) mapped.parte_ref = element.parte;
    if (element.titulo_pai) mapped.titulo_ref = element.titulo_pai;
    if (element.capitulo) mapped.capitulo_ref = element.capitulo;
    if (element.secao) mapped.secao_ref = element.secao;
    if (element.artigo) mapped.artigo_ref = element.artigo;
    
    // Keywords
    mapped.keywords = [
      element.document_type,
      element.type,
      element.numero,
      element.titulo
    ].filter(Boolean);
    
    // Metadata adicional
    mapped.metadata = {
      type: element.type,
      level: element.level,
      original_content: element.content,
      processed_at: new Date().toISOString()
    };
    
    // Conteúdo completo para embedding
    if (!mapped.full_content) {
      const parts = [
        element.type.toUpperCase(),
        element.numero,
        element.titulo,
        element.content
      ].filter(Boolean);
      mapped.full_content = parts.join(' - ');
    }
    
    return mapped;
  }

  async processElements(elements) {
    console.log(`\n💾 Processando ${elements.length} elementos não-artigo...\n`);
    
    const batchSize = 5;
    let processedCount = 0;
    let savedCount = 0;
    
    for (let i = 0; i < elements.length; i += batchSize) {
      const batch = elements.slice(i, i + batchSize);
      const itemsToSave = [];
      
      for (const element of batch) {
        processedCount++;
        
        // Mapear para formato da tabela
        const mapped = this.mapElementToTableFormat(element);
        
        // Log de progresso
        console.log(`🔄 [${processedCount}/${elements.length}] ${element.type}: ${element.numero || element.letra || ''} ${element.titulo || element.content?.substring(0, 50) || ''}`);
        
        // Gerar embedding
        const embedding = await this.generateEmbedding(mapped.full_content);
        
        if (embedding) {
          mapped.embedding = embedding;
          itemsToSave.push(mapped);
          
          // Atualizar estatísticas
          this.stats[element.type] = (this.stats[element.type] || 0) + 1;
          this.stats.total++;
        }
      }
      
      // Salvar lote no Supabase
      if (itemsToSave.length > 0) {
        const { error } = await supabase
          .from('legal_hierarchy')
          .insert(itemsToSave);
        
        if (error) {
          console.error(`❌ Erro salvando lote:`, error.message);
        } else {
          savedCount += itemsToSave.length;
          console.log(`✅ Lote salvo: ${savedCount} elementos`);
        }
      }
      
      // Pausa entre lotes
      if (i + batchSize < elements.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`\n✅ Processamento completo: ${savedCount} elementos salvos`);
  }

  printStats() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 ESTATÍSTICAS FINAIS');
    console.log('='.repeat(60));
    
    console.log('\nElementos processados:');
    console.log(`  - Partes: ${this.stats.partes || 0}`);
    console.log(`  - Títulos: ${this.stats.titulos || 0}`);
    console.log(`  - Capítulos: ${this.stats.capitulos || 0}`);
    console.log(`  - Seções: ${this.stats.secoes || 0}`);
    console.log(`  - Parágrafos: ${this.stats.paragrafos || 0}`);
    console.log(`  - Incisos: ${this.stats.incisos || 0}`);
    console.log(`  - Alíneas: ${this.stats.alineas || 0}`);
    console.log(`\n  TOTAL: ${this.stats.total} elementos`);
    
    console.log('\n✅ Artigos já estavam processados (não reprocessados)');
    console.log('='.repeat(60));
  }
}

async function main() {
  console.log('🚀 Processador de Elementos Não-Artigo');
  console.log('Processando: Partes, Títulos, Capítulos, Seções, Parágrafos, Incisos, Alíneas');
  console.log('(Artigos já processados - serão ignorados)\n');
  
  const processor = new NonArticleProcessor();
  
  try {
    // Carregar elementos dos JSONs
    const elements = await processor.loadHierarchyFromJSON();
    
    if (elements.length === 0) {
      console.log('⚠️ Nenhum elemento não-artigo encontrado para processar');
      console.log('Certifique-se de que os arquivos hierarchy_PDUS.json e hierarchy_LUOS.json existem');
      return;
    }
    
    // Processar e salvar com embeddings
    await processor.processElements(elements);
    
    // Estatísticas
    processor.printStats();
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

main().catch(console.error);