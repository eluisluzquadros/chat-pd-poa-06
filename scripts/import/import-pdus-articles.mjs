#!/usr/bin/env node

/**
 * Script para importar todos os artigos do PDUS para a base de conhecimento
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração Supabase
const SUPABASE_URL = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function importPDUSArticles() {
  console.log('🚀 Iniciando importação dos artigos do PDUS...\n');
  
  const articlesDir = path.join(__dirname, 'pdpoa_knowledge_base_complete', 'artigos');
  
  try {
    // Listar todos os arquivos PDUS_art_*.md
    const files = await fs.readdir(articlesDir);
    const pdusFiles = files.filter(f => f.startsWith('PDUS_art_') && f.endsWith('.md'));
    
    console.log(`📁 Encontrados ${pdusFiles.length} arquivos do PDUS\n`);
    
    let imported = 0;
    let errors = 0;
    
    for (const file of pdusFiles) {
      try {
        // Extrair número do artigo do nome do arquivo
        const match = file.match(/PDUS_art_(\d+)\.md/);
        if (!match) {
          console.log(`⚠️  Ignorando arquivo com formato inválido: ${file}`);
          continue;
        }
        
        const articleNumber = parseInt(match[1]);
        
        // Ler conteúdo do arquivo
        const filePath = path.join(articlesDir, file);
        const content = await fs.readFile(filePath, 'utf8');
        
        // Processar conteúdo
        const lines = content.split('\n').filter(l => l.trim());
        
        // Extrair título (primeira linha com #)
        const titleLine = lines.find(l => l.startsWith('#'));
        const title = titleLine ? titleLine.replace(/^#\s*/, '').trim() : `Art. ${articleNumber}º`;
        
        // Extrair hierarquia
        const hierarchyLine = lines.find(l => l.includes('**Hierarquia:**'));
        let hierarchy = '';
        if (hierarchyLine) {
          hierarchy = hierarchyLine.replace('**Hierarquia:**', '').trim();
        }
        
        // Extrair conteúdo do artigo (ignorar linhas de título e hierarquia)
        const contentLines = lines.filter(l => 
          !l.startsWith('#') && 
          !l.includes('**Hierarquia:**') &&
          l.trim() !== ''
        );
        const articleContent = contentLines.join('\n').trim();
        
        if (!articleContent) {
          console.log(`⚠️  Artigo ${articleNumber} sem conteúdo, pulando...`);
          continue;
        }
        
        // Verificar se já existe
        const { data: existing } = await supabase
          .from('legal_articles')
          .select('id')
          .eq('document_type', 'PDUS')
          .eq('article_number', articleNumber)
          .single();
        
        if (existing) {
          // Atualizar existente
          const { error } = await supabase
            .from('legal_articles')
            .update({
              full_content: `${title}\n\n${hierarchy}\n\n${articleContent}`,
              article_text: articleContent,
              keywords: [`PDUS`, `Artigo ${articleNumber}`, hierarchy.split('>')[0]?.trim(), hierarchy.split('>')[1]?.trim()].filter(k => k)
            })
            .eq('id', existing.id);
          
          if (error) {
            console.log(`❌ Erro ao atualizar Art. ${articleNumber}:`, error.message);
            errors++;
          } else {
            console.log(`✅ Atualizado Art. ${articleNumber}`);
            imported++;
          }
        } else {
          // Inserir novo
          const { error } = await supabase
            .from('legal_articles')
            .insert({
              document_type: 'PDUS',
              article_number: articleNumber,
              full_content: `${title}\n\n${hierarchy}\n\n${articleContent}`,
              article_text: articleContent,
              keywords: [`PDUS`, `Artigo ${articleNumber}`, hierarchy.split('>')[0]?.trim(), hierarchy.split('>')[1]?.trim()].filter(k => k)
            });
          
          if (error) {
            console.log(`❌ Erro ao inserir Art. ${articleNumber}:`, error.message);
            errors++;
          } else {
            console.log(`✅ Importado Art. ${articleNumber}`);
            imported++;
          }
        }
        
      } catch (error) {
        console.log(`❌ Erro ao processar ${file}:`, error.message);
        errors++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`✅ Importação concluída!`);
    console.log(`   📊 ${imported} artigos importados/atualizados`);
    console.log(`   ❌ ${errors} erros`);
    console.log('='.repeat(60));
    
    // Verificar total no banco
    const { count } = await supabase
      .from('legal_articles')
      .select('*', { count: 'exact', head: true })
      .eq('document_type', 'PDUS');
    
    console.log(`\n📚 Total de artigos do PDUS no banco: ${count}`);
    
  } catch (error) {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  }
}

// Executar
importPDUSArticles();