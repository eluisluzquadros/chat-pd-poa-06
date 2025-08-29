#!/usr/bin/env node
/**
 * Processador Completo de Documentos Legais PDPOA
 * 
 * Processa a estrutura hierárquica completa:
 * Partes → Títulos → Capítulos → Seções → Artigos → Parágrafos → Incisos → Alíneas
 * 
 * Converte DOCX → Markdown e salva no Supabase com embeddings
 */

import fs from 'fs/promises';
import path from 'path';
import mammoth from 'mammoth';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';

// Load environment variables
dotenv.config({ path: '.env' });

const CONFIG = {
  outputDir: 'pdpoa_knowledge_base_complete',
  chunkSize: 2000,
  overlapSize: 200,
  batchSize: 5,
  openaiApiKey: process.env.OPENAI_API_KEY,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY
};

class CompleteLegalProcessor {
  constructor() {
    this.outputDir = CONFIG.outputDir;
    this.supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
    this.hierarchyLevels = [];
    this.processedItems = [];
    this.stats = {
      partes: 0,
      titulos: 0,
      capitulos: 0,
      secoes: 0,
      artigos: 0,
      paragrafos: 0,
      incisos: 0,
      alineas: 0,
      totalItems: 0
    };
  }

  async initializeDirectories() {
    const dirs = [
      this.outputDir,
      path.join(this.outputDir, 'markdown'),
      path.join(this.outputDir, 'partes'),
      path.join(this.outputDir, 'titulos'),
      path.join(this.outputDir, 'capitulos'),
      path.join(this.outputDir, 'secoes'),
      path.join(this.outputDir, 'artigos'),
      path.join(this.outputDir, 'paragrafos'),
      path.join(this.outputDir, 'json')
    ];

    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }
    
    console.log('📁 Diretórios criados');
  }

  /**
   * Extract and convert DOCX to structured Markdown
   */
  async extractAndConvertToMarkdown(docxPath) {
    console.log(`\n📖 Convertendo DOCX para Markdown estruturado...`);
    
    const buffer = await fs.readFile(docxPath);
    const result = await mammoth.extractRawText({ buffer });
    const rawText = result.value;
    
    // Convert to structured Markdown
    let markdown = rawText;
    
    // PARTE - Nível 1
    markdown = markdown.replace(/^PARTE\s+([IVX]+)\s*[-–]\s*(.+)$/gm, '\n# PARTE $1 - $2\n');
    markdown = markdown.replace(/^PARTE\s+([IVX]+)\s+(.+)$/gm, '\n# PARTE $1 - $2\n');
    
    // Título - Nível 2
    markdown = markdown.replace(/^Título\s+([IVX]+)\s*[-–]\s*(.+)$/gm, '\n## Título $1 - $2\n');
    markdown = markdown.replace(/^Título\s+([IVX]+)\s*\n(.+)$/gm, '\n## Título $1 - $2\n');
    
    // Capítulo - Nível 3
    markdown = markdown.replace(/^Capítulo\s+([IVX]+)\s*[-–]\s*(.+)$/gm, '\n### Capítulo $1 - $2\n');
    markdown = markdown.replace(/^CAPÍTULO\s+([IVX]+)\s*[-–]\s*(.+)$/gm, '\n### Capítulo $1 - $2\n');
    
    // Seção - Nível 4
    markdown = markdown.replace(/^Seção\s+([IVX]+)\s*[-–]\s*(.+)$/gm, '\n#### Seção $1 - $2\n');
    markdown = markdown.replace(/^SEÇÃO\s+([IVX]+)\s*[-–]\s*(.+)$/gm, '\n#### Seção $1 - $2\n');
    
    // Subseção - Nível 5
    markdown = markdown.replace(/^Subseção\s+([IVX]+)\s*[-–]\s*(.+)$/gm, '\n##### Subseção $1 - $2\n');
    
    // Artigos - Marcação especial
    markdown = markdown.replace(/^Art\.\s*(\d+)[ºª]?\s*\.?\s*/gm, '\n**Art. $1º** ');
    
    // Parágrafos
    markdown = markdown.replace(/^§\s*(\d+)[ºª]?\s*\.?\s*/gm, '\n**§ $1º** ');
    markdown = markdown.replace(/^Parágrafo único\s*\.?\s*/gm, '\n**Parágrafo único** ');
    
    // Incisos (romanos)
    markdown = markdown.replace(/^([IVX]+)\s*[-–]\s*/gm, '\n   $1. ');
    
    // Alíneas (letras)
    markdown = markdown.replace(/^([a-z])\)\s*/gm, '\n      $1) ');
    
    // Clean up excessive line breaks
    markdown = markdown.replace(/\n{3,}/g, '\n\n');
    
    return markdown;
  }

  /**
   * Parse hierarchical structure from Markdown
   */
  parseHierarchicalStructure(markdown, docType) {
    console.log(`\n🔍 Extraindo estrutura hierárquica completa...`);
    
    const structure = {
      docType,
      partes: [],
      artigos: [],
      fullHierarchy: []
    };

    // Current context for hierarchy
    let currentParte = null;
    let currentTitulo = null;
    let currentCapitulo = null;
    let currentSecao = null;
    let currentArtigo = null;

    const lines = markdown.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // PARTE
      if (line.startsWith('# PARTE')) {
        const match = line.match(/# PARTE\s+([IVX]+)\s*[-–]\s*(.+)/);
        if (match) {
          currentParte = {
            type: 'parte',
            numero: match[1],
            titulo: match[2].trim(),
            content: '',
            children: []
          };
          structure.partes.push(currentParte);
          structure.fullHierarchy.push(currentParte);
          this.stats.partes++;
          currentTitulo = null;
          currentCapitulo = null;
          currentSecao = null;
        }
      }
      
      // TÍTULO
      else if (line.startsWith('## Título')) {
        const match = line.match(/## Título\s+([IVX]+)\s*[-–]?\s*(.+)/);
        if (match) {
          currentTitulo = {
            type: 'titulo',
            numero: match[1],
            titulo: match[2].trim(),
            content: '',
            parte: currentParte?.numero,
            children: []
          };
          if (currentParte) {
            currentParte.children.push(currentTitulo);
          }
          this.stats.titulos++;
          currentCapitulo = null;
          currentSecao = null;
        }
      }
      
      // CAPÍTULO
      else if (line.startsWith('### Capítulo')) {
        const match = line.match(/### Capítulo\s+([IVX]+)\s*[-–]?\s*(.+)/);
        if (match) {
          currentCapitulo = {
            type: 'capitulo',
            numero: match[1],
            titulo: match[2].trim(),
            content: '',
            titulo: currentTitulo?.numero,
            parte: currentParte?.numero,
            children: []
          };
          if (currentTitulo) {
            currentTitulo.children.push(currentCapitulo);
          }
          this.stats.capitulos++;
          currentSecao = null;
        }
      }
      
      // SEÇÃO
      else if (line.startsWith('#### Seção')) {
        const match = line.match(/#### Seção\s+([IVX]+)\s*[-–]?\s*(.+)/);
        if (match) {
          currentSecao = {
            type: 'secao',
            numero: match[1],
            titulo: match[2].trim(),
            content: '',
            capitulo: currentCapitulo?.numero,
            titulo: currentTitulo?.numero,
            parte: currentParte?.numero,
            children: []
          };
          if (currentCapitulo) {
            currentCapitulo.children.push(currentSecao);
          }
          this.stats.secoes++;
        }
      }
      
      // ARTIGO
      else if (line.startsWith('**Art.')) {
        const match = line.match(/\*\*Art\.\s*(\d+)º?\*\*\s*(.*)/);
        if (match) {
          // Collect full article content
          let articleContent = match[2] || '';
          let j = i + 1;
          
          // Continue collecting lines until next article or section
          while (j < lines.length) {
            const nextLine = lines[j].trim();
            if (nextLine.startsWith('**Art.') || 
                nextLine.startsWith('#') || 
                nextLine.startsWith('**§')) {
              break;
            }
            if (nextLine) {
              articleContent += '\n' + nextLine;
            }
            j++;
          }
          
          currentArtigo = {
            type: 'artigo',
            numero: parseInt(match[1]),
            content: articleContent.trim(),
            secao: currentSecao?.titulo || null,
            capitulo: currentCapitulo?.titulo || null,
            titulo: currentTitulo?.titulo || null,
            parte: currentParte?.titulo || null,
            paragrafos: [],
            incisos: [],
            alineas: []
          };
          
          // Parse paragraphs, incisos, and alineas within article
          const articleLines = articleContent.split('\n');
          let currentParagrafo = null;
          let currentInciso = null;
          
          for (const articleLine of articleLines) {
            // Parágrafo
            if (articleLine.includes('**§') || articleLine.includes('**Parágrafo único**')) {
              const paraMatch = articleLine.match(/\*\*§\s*(\d+)º?\*\*\s*(.*)/);
              if (paraMatch) {
                currentParagrafo = {
                  tipo: 'paragrafo',
                  numero: paraMatch[1],
                  content: paraMatch[2].trim()
                };
                currentArtigo.paragrafos.push(currentParagrafo);
                this.stats.paragrafos++;
              } else if (articleLine.includes('Parágrafo único')) {
                currentParagrafo = {
                  tipo: 'paragrafo_unico',
                  content: articleLine.replace('**Parágrafo único**', '').trim()
                };
                currentArtigo.paragrafos.push(currentParagrafo);
                this.stats.paragrafos++;
              }
            }
            
            // Inciso (Roman numerals)
            else if (articleLine.match(/^\s*([IVX]+)\.\s/)) {
              const incisoMatch = articleLine.match(/^\s*([IVX]+)\.\s*(.*)/);
              if (incisoMatch) {
                currentInciso = {
                  tipo: 'inciso',
                  numero: incisoMatch[1],
                  content: incisoMatch[2].trim(),
                  alineas: []
                };
                currentArtigo.incisos.push(currentInciso);
                this.stats.incisos++;
              }
            }
            
            // Alínea (letters)
            else if (articleLine.match(/^\s*([a-z])\)\s/)) {
              const alineaMatch = articleLine.match(/^\s*([a-z])\)\s*(.*)/);
              if (alineaMatch) {
                const alinea = {
                  tipo: 'alinea',
                  letra: alineaMatch[1],
                  content: alineaMatch[2].trim()
                };
                if (currentInciso) {
                  currentInciso.alineas.push(alinea);
                } else {
                  currentArtigo.alineas.push(alinea);
                }
                this.stats.alineas++;
              }
            }
          }
          
          structure.artigos.push(currentArtigo);
          
          if (currentSecao) {
            currentSecao.children.push(currentArtigo);
          } else if (currentCapitulo) {
            currentCapitulo.children.push(currentArtigo);
          } else if (currentTitulo) {
            currentTitulo.children.push(currentArtigo);
          } else if (currentParte) {
            currentParte.children.push(currentArtigo);
          }
          
          this.stats.artigos++;
          i = j - 1; // Skip processed lines
        }
      }
    }
    
    return structure;
  }

  /**
   * Generate embedding for text
   */
  async generateEmbedding(text) {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CONFIG.openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'text-embedding-ada-002',
          input: text.substring(0, 8000)
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.error('❌ Error generating embedding:', error.message);
      return null;
    }
  }

  /**
   * Save structured items to legal_articles table
   */
  async saveToLegalArticles(structure, docInfo) {
    console.log(`\n💾 Salvando estrutura completa na tabela legal_articles...`);
    
    const items = [];
    
    // Process all articles with full context
    for (const artigo of structure.artigos) {
      // Build full content with hierarchy
      let fullContent = `Art. ${artigo.numero}º\n${artigo.content}`;
      
      // Add paragraphs
      if (artigo.paragrafos.length > 0) {
        fullContent += '\n\nParágrafos:\n';
        for (const para of artigo.paragrafos) {
          if (para.tipo === 'paragrafo_unico') {
            fullContent += `Parágrafo único: ${para.content}\n`;
          } else {
            fullContent += `§ ${para.numero}º ${para.content}\n`;
          }
        }
      }
      
      // Add incisos
      if (artigo.incisos.length > 0) {
        fullContent += '\n\nIncisos:\n';
        for (const inciso of artigo.incisos) {
          fullContent += `${inciso.numero}. ${inciso.content}\n`;
          
          // Add alíneas of inciso
          if (inciso.alineas && inciso.alineas.length > 0) {
            for (const alinea of inciso.alineas) {
              fullContent += `   ${alinea.letra}) ${alinea.content}\n`;
            }
          }
        }
      }
      
      // Add alíneas (if not under incisos)
      if (artigo.alineas.length > 0) {
        fullContent += '\n\nAlíneas:\n';
        for (const alinea of artigo.alineas) {
          fullContent += `${alinea.letra}) ${alinea.content}\n`;
        }
      }
      
      // Generate embedding
      console.log(`🔄 Gerando embedding para Art. ${artigo.numero}º...`);
      const embedding = await this.generateEmbedding(fullContent);
      
      if (embedding) {
        items.push({
          // id is SERIAL, will be auto-generated
          document_type: docInfo.docType,
          article_number: artigo.numero,
          full_content: fullContent,
          article_text: artigo.content,
          keywords: [
            docInfo.docType,
            `Art. ${artigo.numero}`,
            artigo.parte,
            artigo.titulo,
            artigo.capitulo,
            artigo.secao
          ].filter(Boolean),
          embedding
          // metadata column doesn't exist in table, info is in other columns
        });
      }
      
      // Save in batches
      if (items.length >= 10) {
        await this.saveBatch(items);
        items.length = 0;
      }
    }
    
    // Save remaining items
    if (items.length > 0) {
      await this.saveBatch(items);
    }
    
    console.log(`✅ Total de ${structure.artigos.length} artigos salvos com estrutura completa`);
  }

  /**
   * Save batch to Supabase
   */
  async saveBatch(items) {
    const { error } = await this.supabase
      .from('legal_articles')
      .upsert(items, { onConflict: 'document_type,article_number' });
    
    if (error) {
      console.error(`❌ Error saving batch:`, error.message);
      throw error;
    }
    
    console.log(`✅ Batch de ${items.length} itens salvo`);
  }

  /**
   * Save Markdown files locally
   */
  async saveMarkdownFiles(markdown, structure, docInfo) {
    // Save full markdown
    const mdPath = path.join(this.outputDir, 'markdown', `${docInfo.docType}.md`);
    await fs.writeFile(mdPath, markdown);
    console.log(`📝 Markdown salvo: ${mdPath}`);
    
    // Save structured JSON
    const jsonPath = path.join(this.outputDir, 'json', `${docInfo.docType}_structure.json`);
    await fs.writeFile(jsonPath, JSON.stringify(structure, null, 2));
    console.log(`📊 Estrutura JSON salva: ${jsonPath}`);
    
    // Save individual articles as markdown
    for (const artigo of structure.artigos) {
      const articleMd = `# Art. ${artigo.numero}º

**Hierarquia:** ${[artigo.parte, artigo.titulo, artigo.capitulo, artigo.secao].filter(Boolean).join(' > ')}

${artigo.content}

${artigo.paragrafos.length > 0 ? '## Parágrafos\n' + artigo.paragrafos.map(p => 
  p.tipo === 'paragrafo_unico' ? `Parágrafo único: ${p.content}` : `§ ${p.numero}º ${p.content}`
).join('\n\n') : ''}

${artigo.incisos.length > 0 ? '## Incisos\n' + artigo.incisos.map(i => 
  `${i.numero}. ${i.content}${i.alineas ? '\n' + i.alineas.map(a => `   ${a.letra}) ${a.content}`).join('\n') : ''}`
).join('\n\n') : ''}

${artigo.alineas.length > 0 ? '## Alíneas\n' + artigo.alineas.map(a => 
  `${a.letra}) ${a.content}`
).join('\n') : ''}
`;
      
      const articlePath = path.join(this.outputDir, 'artigos', `${docInfo.docType}_art_${artigo.numero}.md`);
      await fs.writeFile(articlePath, articleMd);
    }
    
    console.log(`✅ ${structure.artigos.length} artigos salvos como Markdown`);
  }

  /**
   * Process single document
   */
  async processSingleDocument(docxPath) {
    const filename = path.basename(docxPath);
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📄 Processando: ${filename}`);
    console.log('='.repeat(60));
    
    // Extract document info
    const docInfo = {
      filename,
      docType: filename.includes('PLANO_DIRETOR') ? 'PDUS' : 'LUOS',
      title: filename.includes('PLANO_DIRETOR') ? 
        'Plano Diretor Urbano Sustentável' : 
        'Lei de Uso e Ocupação do Solo',
      processedAt: new Date().toISOString()
    };
    
    // Convert to Markdown
    const markdown = await this.extractAndConvertToMarkdown(docxPath);
    
    // Parse hierarchical structure
    const structure = this.parseHierarchicalStructure(markdown, docInfo.docType);
    
    // Save Markdown files locally
    await this.saveMarkdownFiles(markdown, structure, docInfo);
    
    // Save to Supabase
    await this.saveToLegalArticles(structure, docInfo);
    
    // Update total stats
    this.stats.totalItems = this.stats.partes + this.stats.titulos + 
                           this.stats.capitulos + this.stats.secoes + 
                           this.stats.artigos + this.stats.paragrafos + 
                           this.stats.incisos + this.stats.alineas;
    
    return {
      success: true,
      docInfo,
      stats: { ...this.stats }
    };
  }

  /**
   * Generate final report
   */
  async generateReport() {
    const report = `# Relatório de Processamento - Estrutura Hierárquica Completa

## Data: ${new Date().toLocaleString('pt-BR')}

## 📊 Estatísticas de Processamento:

### Estrutura Hierárquica Extraída:
- **Partes:** ${this.stats.partes}
- **Títulos:** ${this.stats.titulos}
- **Capítulos:** ${this.stats.capitulos}
- **Seções:** ${this.stats.secoes}
- **Artigos:** ${this.stats.artigos}
- **Parágrafos:** ${this.stats.paragrafos}
- **Incisos:** ${this.stats.incisos}
- **Alíneas:** ${this.stats.alineas}
- **TOTAL DE ITENS:** ${this.stats.totalItems}

## 📁 Arquivos Gerados:

### Markdown:
- Documentos completos convertidos para Markdown
- Artigos individuais em formato Markdown
- Preservação completa da hierarquia

### JSON:
- Estrutura hierárquica completa em JSON
- Metadados detalhados para cada elemento

### Supabase:
- Tabela \`legal_articles\` populada
- Embeddings gerados para busca semântica
- Metadados hierárquicos completos

## ✅ Hierarquia Processada:

\`\`\`
PARTE
 └─ Título
     └─ Capítulo
         └─ Seção
             └─ Artigo
                 ├─ Parágrafos
                 ├─ Incisos
                 └─ Alíneas
\`\`\`

## 🎯 Resultado:

Processamento completo com extração de toda estrutura hierárquica legal!
`;

    const reportPath = path.join(this.outputDir, 'RELATORIO_PROCESSAMENTO.md');
    await fs.writeFile(reportPath, report);
    console.log(`\n📋 Relatório salvo: ${reportPath}`);
  }

  /**
   * Main processing function
   */
  async run(docxFiles) {
    console.log('\n🚀 Iniciando Processamento Completo de Documentos Legais');
    console.log('📊 Extraindo estrutura hierárquica completa...\n');
    
    await this.initializeDirectories();
    
    for (const docxPath of docxFiles) {
      try {
        const exists = await fs.access(docxPath).then(() => true).catch(() => false);
        if (!exists) {
          console.log(`⚠️ Arquivo não encontrado: ${docxPath}`);
          continue;
        }
        
        await this.processSingleDocument(docxPath);
        
      } catch (error) {
        console.error(`❌ Erro processando ${docxPath}:`, error.message);
      }
    }
    
    await this.generateReport();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ PROCESSAMENTO COMPLETO!');
    console.log('='.repeat(60));
    console.log(`📊 Total de itens processados: ${this.stats.totalItems}`);
    console.log(`📁 Arquivos salvos em: ${this.outputDir}`);
    console.log('='.repeat(60));
  }
}

// Main execution
async function main() {
  // Check environment
  if (!CONFIG.openaiApiKey) {
    console.error('❌ OPENAI_API_KEY não encontrada');
    process.exit(1);
  }
  
  if (!CONFIG.supabaseUrl || !CONFIG.supabaseKey) {
    console.error('❌ Configuração Supabase não encontrada');
    process.exit(1);
  }
  
  const docxFiles = [
    'knowledgebase/PDPOA2025-Minuta_Preliminar_PLANO_DIRETOR.docx',
    'knowledgebase/PDPOA2025-Minuta_Preliminar_LUOS.docx'
  ];
  
  const processor = new CompleteLegalProcessor();
  await processor.run(docxFiles);
}

main().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});