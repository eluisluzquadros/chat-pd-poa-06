#!/usr/bin/env node
/**
 * Salva elementos hierárquicos na tabela legal_articles existente
 * 
 * Adapta Partes, Títulos, Capítulos, Seções, Parágrafos, Incisos e Alíneas
 * para caberem na estrutura da tabela legal_articles
 */

import fs from 'fs/promises';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class HierarchyToArticlesAdapter {
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
    
    // Contador artificial para elementos não-artigo
    this.artificialArticleNumber = 9000; // Começar em 9000 para não conflitar
  }

  async loadHierarchyFromJSON() {
    console.log('📂 Carregando hierarquia dos arquivos JSON...\n');
    
    const allElements = [];
    
    // Carregar PDUS
    try {
      const pdusData = await fs.readFile('hierarchy_PDUS.json', 'utf-8');
      const pdus = JSON.parse(pdusData);
      
      // Filtrar APENAS elementos não-artigo
      const nonArticles = pdus.items.filter(item => item.type !== 'artigo');
      console.log(`📚 PDUS: ${nonArticles.length} elementos não-artigo`);
      
      // Adicionar document_type se não existir
      nonArticles.forEach(el => {
        if (!el.document_type) el.document_type = 'PDUS';
      });
      
      allElements.push(...nonArticles);
      
    } catch (error) {
      console.error('❌ Erro carregando PDUS:', error.message);
    }
    
    // Carregar LUOS
    try {
      const luosData = await fs.readFile('hierarchy_LUOS.json', 'utf-8');
      const luos = JSON.parse(luosData);
      
      // Filtrar APENAS elementos não-artigo
      const nonArticles = luos.items.filter(item => item.type !== 'artigo');
      console.log(`📚 LUOS: ${nonArticles.length} elementos não-artigo`);
      
      // Adicionar document_type se não existir
      nonArticles.forEach(el => {
        if (!el.document_type) el.document_type = 'LUOS';
      });
      
      allElements.push(...nonArticles);
      
    } catch (error) {
      console.error('❌ Erro carregando LUOS:', error.message);
    }
    
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
        return null;
      }

      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      return null;
    }
  }

  adaptToArticleFormat(element) {
    // Gerar um "número de artigo" artificial para elementos não-artigo
    const articleNumber = this.artificialArticleNumber++;
    
    // Construir conteúdo completo
    let fullContent = '';
    let articleText = '';
    
    switch(element.type) {
      case 'parte':
        fullContent = `PARTE ${element.numero} - ${element.titulo || ''}`;
        articleText = `[ELEMENTO HIERÁRQUICO - PARTE]\n${element.titulo || element.full_content || ''}`;
        break;
        
      case 'titulo':
        fullContent = `TÍTULO ${element.numero} - ${element.titulo || ''}`;
        articleText = `[ELEMENTO HIERÁRQUICO - TÍTULO]\n${element.titulo || element.full_content || ''}`;
        break;
        
      case 'capitulo':
        fullContent = `CAPÍTULO ${element.numero} - ${element.titulo || ''}`;
        articleText = `[ELEMENTO HIERÁRQUICO - CAPÍTULO]\n${element.titulo || element.full_content || ''}`;
        break;
        
      case 'secao':
      case 'subsecao':
        fullContent = `SEÇÃO ${element.numero} - ${element.titulo || ''}`;
        articleText = `[ELEMENTO HIERÁRQUICO - SEÇÃO]\n${element.titulo || element.full_content || ''}`;
        break;
        
      case 'paragrafo':
      case 'paragrafo_unico':
        const paraType = element.type === 'paragrafo_unico' ? 'Parágrafo único' : `§ ${element.numero}º`;
        fullContent = `${paraType} do Art. ${element.artigo || '?'}: ${element.content || ''}`;
        articleText = `[PARÁGRAFO]\n${element.content || ''}`;
        break;
        
      case 'inciso':
        fullContent = `Inciso ${element.numero} do Art. ${element.artigo || '?'}: ${element.content || ''}`;
        articleText = `[INCISO]\n${element.content || ''}`;
        break;
        
      case 'alinea':
        fullContent = `Alínea ${element.letra} do Art. ${element.artigo || '?'}: ${element.content || ''}`;
        articleText = `[ALÍNEA]\n${element.content || ''}`;
        break;
        
      default:
        fullContent = element.full_content || element.content || '';
        articleText = element.content || '';
    }
    
    // Criar keywords
    const keywords = [
      element.document_type,
      element.type.toUpperCase(),
      element.numero,
      element.titulo,
      element.parte,
      element.capitulo,
      element.secao
    ].filter(Boolean);
    
    return {
      document_type: element.document_type,
      article_number: articleNumber,
      full_content: fullContent,
      article_text: articleText,
      keywords: keywords
    };
  }

  async processAndSave(elements) {
    console.log(`\n💾 Processando ${elements.length} elementos não-artigo...\n`);
    
    const batchSize = 5;
    let processedCount = 0;
    let savedCount = 0;
    
    // Agrupar por tipo para melhor visualização
    const byType = {};
    elements.forEach(el => {
      byType[el.type] = (byType[el.type] || 0) + 1;
    });
    
    console.log('📊 Elementos a processar:');
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count}`);
    });
    console.log('');
    
    for (let i = 0; i < elements.length; i += batchSize) {
      const batch = elements.slice(i, i + batchSize);
      const itemsToSave = [];
      
      for (const element of batch) {
        processedCount++;
        
        // Adaptar para formato da tabela legal_articles
        const adapted = this.adaptToArticleFormat(element);
        
        // Log de progresso simplificado
        if (processedCount % 10 === 0) {
          console.log(`  📦 Processados: ${processedCount}/${elements.length}`);
        }
        
        // Gerar embedding
        const embedding = await this.generateEmbedding(adapted.full_content);
        
        if (embedding) {
          adapted.embedding = embedding;
          itemsToSave.push(adapted);
          
          // Atualizar estatísticas
          this.stats[element.type] = (this.stats[element.type] || 0) + 1;
          this.stats.total++;
        }
      }
      
      // Salvar lote
      if (itemsToSave.length > 0) {
        try {
          const { error } = await supabase
            .from('legal_articles')
            .upsert(itemsToSave, { 
              onConflict: 'document_type,article_number',
              ignoreDuplicates: false 
            });
          
          if (error) {
            console.error(`  ❌ Erro no lote ${Math.floor(i/batchSize) + 1}:`, error.message);
          } else {
            savedCount += itemsToSave.length;
          }
        } catch (err) {
          console.error(`  ❌ Erro no lote:`, err.message);
        }
      }
      
      // Pequena pausa entre lotes
      if (i + batchSize < elements.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log(`\n✅ Processamento completo: ${savedCount} elementos salvos`);
    return savedCount;
  }

  printReport(savedCount) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 RELATÓRIO FINAL');
    console.log('='.repeat(60));
    
    console.log('\n✅ Elementos processados e salvos:');
    console.log(`  - Partes: ${this.stats.partes || 0}`);
    console.log(`  - Títulos: ${this.stats.titulos || 0}`);
    console.log(`  - Capítulos: ${this.stats.capitulos || 0}`);
    console.log(`  - Seções: ${this.stats.secoes || 0}`);
    console.log(`  - Parágrafos: ${this.stats.paragrafos + this.stats.paragrafo_unico || 0}`);
    console.log(`  - Incisos: ${this.stats.incisos || 0}`);
    console.log(`  - Alíneas: ${this.stats.alineas || 0}`);
    console.log(`\n  TOTAL: ${this.stats.total} elementos`);
    
    console.log('\n📝 Notas:');
    console.log('  - Elementos salvos com article_number >= 9000');
    console.log('  - Artigos reais (1-340) já estavam na tabela');
    console.log('  - Todos elementos têm embeddings para busca semântica');
    
    console.log('='.repeat(60));
  }
}

async function main() {
  console.log('🚀 Adaptador de Hierarquia para Tabela legal_articles');
  console.log('Salvando elementos não-artigo na tabela existente\n');
  
  const adapter = new HierarchyToArticlesAdapter();
  
  try {
    // Carregar elementos
    const elements = await adapter.loadHierarchyFromJSON();
    
    if (elements.length === 0) {
      console.log('⚠️ Nenhum elemento encontrado');
      console.log('Certifique-se de que hierarchy_PDUS.json e hierarchy_LUOS.json existem');
      return;
    }
    
    // Processar e salvar
    const savedCount = await adapter.processAndSave(elements);
    
    // Relatório
    adapter.printReport(savedCount);
    
  } catch (error) {
    console.error('❌ Erro fatal:', error);
  }
}

main().catch(console.error);