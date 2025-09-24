#!/usr/bin/env node

/**
 * Script para importar a base de conhecimento completa do PDPOA 2025
 * Importa dados de chunks hierárquicos, regime urbanístico e QA
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import ora from 'ora';
import chalk from 'chalk';

// Load environment variables
dotenv.config({ path: '.env' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configuração de paths
const KNOWLEDGE_BASE_PATH = path.join(__dirname, '..', 'knowledge_base_complete');

/**
 * Importa artigos LUOS e PDUS
 */
async function importLegalArticles() {
  const spinner = ora('Importando artigos jurídicos...').start();
  
  try {
    const articlesPath = path.join(KNOWLEDGE_BASE_PATH, 'chunks_juridico', 'artigos');
    const files = await fs.readdir(articlesPath);
    
    let imported = 0;
    let errors = 0;
    
    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      
      try {
        const content = await fs.readFile(path.join(articlesPath, file), 'utf-8');
        const [source, artNum] = file.replace('.md', '').split('_art_');
        
        // Extrai o título e conteúdo
        const lines = content.split('\n');
        const title = lines[0]?.replace('#', '').trim() || '';
        const articleContent = lines.slice(1).join('\n').trim();
        
        // Insere no banco
        const { error } = await supabase
          .from('legal_articles')
          .upsert({
            source: source.toUpperCase(),
            article_number: parseInt(artNum) || 0,
            title,
            content: articleContent,
            metadata: {
              file_name: file,
              imported_at: new Date().toISOString()
            }
          }, {
            onConflict: 'source,article_number'
          });
        
        if (error) {
          console.error(chalk.red(`Erro ao importar ${file}:`, error.message));
          errors++;
        } else {
          imported++;
        }
      } catch (err) {
        console.error(chalk.red(`Erro ao processar ${file}:`, err.message));
        errors++;
      }
    }
    
    spinner.succeed(chalk.green(`✅ Artigos jurídicos importados: ${imported} sucesso, ${errors} erros`));
  } catch (error) {
    spinner.fail(chalk.red('Erro ao importar artigos jurídicos:', error.message));
  }
}

/**
 * Importa dados do regime urbanístico
 */
async function importRegimeUrbanistico() {
  const spinner = ora('Importando regime urbanístico...').start();
  
  try {
    const bairrosPath = path.join(KNOWLEDGE_BASE_PATH, 'chunks_regime_urbanistico_consolidado', 'chunks_bairros');
    const files = await fs.readdir(bairrosPath);
    
    let imported = 0;
    let errors = 0;
    
    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      
      try {
        const content = await fs.readFile(path.join(bairrosPath, file), 'utf-8');
        const bairroName = file.replace('.md', '').replace(/-/g, ' ').toUpperCase();
        
        // Parse do conteúdo MD para extrair zonas e parâmetros
        const zones = parseRegimeContent(content, bairroName);
        
        for (const zone of zones) {
          const { error } = await supabase
            .from('regime_urbanistico_consolidado')
            .upsert({
              bairro: zone.bairro,
              zona: zone.zona,
              categoria_risco: zone.categoria_risco,
              altura_maxima: zone.altura_maxima,
              coeficiente_basico: zone.coeficiente_basico,
              coeficiente_maximo: zone.coeficiente_maximo,
              area_minima_lote: zone.area_minima_lote,
              testada_minima: zone.testada_minima,
              taxa_permeabilidade_acima_1500: zone.taxa_permeabilidade_acima_1500,
              taxa_permeabilidade_ate_1500: zone.taxa_permeabilidade_ate_1500,
              recuo_jardim: zone.recuo_jardim,
              metadata: {
                file_name: file,
                imported_at: new Date().toISOString(),
                ...zone.metadata
              }
            }, {
              onConflict: 'bairro,zona'
            });
          
          if (error) {
            console.error(chalk.red(`Erro ao importar zona ${zone.zona} de ${bairroName}:`, error.message));
            errors++;
          } else {
            imported++;
          }
        }
      } catch (err) {
        console.error(chalk.red(`Erro ao processar ${file}:`, err.message));
        errors++;
      }
    }
    
    spinner.succeed(chalk.green(`✅ Regime urbanístico importado: ${imported} zonas, ${errors} erros`));
  } catch (error) {
    spinner.fail(chalk.red('Erro ao importar regime urbanístico:', error.message));
  }
}

/**
 * Parser para extrair dados do regime urbanístico do formato MD
 */
function parseRegimeContent(content, bairroName) {
  const zones = [];
  const sections = content.split('### Zona:');
  
  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];
    const lines = section.split('\n');
    
    const zone = {
      bairro: bairroName,
      zona: lines[0]?.trim() || '',
      categoria_risco: '',
      altura_maxima: null,
      coeficiente_basico: null,
      coeficiente_maximo: null,
      area_minima_lote: null,
      testada_minima: null,
      taxa_permeabilidade_acima_1500: null,
      taxa_permeabilidade_ate_1500: null,
      recuo_jardim: null,
      metadata: {}
    };
    
    // Extrai dados usando regex
    for (const line of lines) {
      if (line.includes('Categoria de Risco:')) {
        zone.categoria_risco = line.split(':')[1]?.trim() || '';
      }
      if (line.includes('Altura Máxima (Edificação Isolada):')) {
        const value = line.match(/(\d+(?:\.\d+)?)/);
        zone.altura_maxima = value ? parseFloat(value[1]) : null;
      }
      if (line.includes('Coeficiente de Aproveitamento Básico:') && !line.includes('+4D')) {
        const value = line.match(/(\d+(?:[,\.]\d+)?)/);
        zone.coeficiente_basico = value ? parseFloat(value[1].replace(',', '.')) : null;
      }
      if (line.includes('Coeficiente de Aproveitamento Máximo:') && !line.includes('+4D')) {
        const value = line.match(/(\d+(?:[,\.]\d+)?)/);
        zone.coeficiente_maximo = value ? parseFloat(value[1].replace(',', '.')) : null;
      }
      if (line.includes('Área Mínima do Lote:')) {
        const value = line.match(/(\d+(?:\.\d+)?)/);
        zone.area_minima_lote = value ? parseFloat(value[1]) : null;
      }
      if (line.includes('Testada Mínima do Lote:')) {
        const value = line.match(/(\d+(?:\.\d+)?)/);
        zone.testada_minima = value ? parseFloat(value[1]) : null;
      }
      if (line.includes('Acima de 1.500 m²:')) {
        const value = line.match(/(\d+)/);
        zone.taxa_permeabilidade_acima_1500 = value ? parseInt(value[1]) : null;
      }
      if (line.includes('Até 1.500 m²:')) {
        const value = line.match(/(\d+)/);
        zone.taxa_permeabilidade_ate_1500 = value ? parseInt(value[1]) : null;
      }
      if (line.includes('Recuo de Jardim:')) {
        const value = line.match(/(\d+(?:\.\d+)?)/);
        zone.recuo_jardim = value ? parseFloat(value[1]) : null;
      }
    }
    
    zones.push(zone);
  }
  
  return zones;
}

/**
 * Importa casos de QA
 */
async function importQACases() {
  const spinner = ora('Importando casos de QA...').start();
  
  try {
    const qaPath = path.join(KNOWLEDGE_BASE_PATH, 'chunks_qa', 'pdpoa_qa_knowledge_base.md');
    const content = await fs.readFile(qaPath, 'utf-8');
    
    // Parse do conteúdo QA
    const cases = parseQAContent(content);
    
    let imported = 0;
    let errors = 0;
    
    for (const testCase of cases) {
      const { error } = await supabase
        .from('qa_test_cases')
        .upsert({
          id: testCase.id,
          category: testCase.category,
          question: testCase.question || `Caso QA #${testCase.id}`,
          expected_answer: testCase.content,
          difficulty: testCase.difficulty,
          tags: testCase.tags,
          version: testCase.version || 1,
          metadata: {
            imported_at: new Date().toISOString(),
            source: 'knowledge_base_complete'
          }
        }, {
          onConflict: 'id'
        });
      
      if (error) {
        console.error(chalk.red(`Erro ao importar caso #${testCase.id}:`, error.message));
        errors++;
      } else {
        imported++;
      }
    }
    
    spinner.succeed(chalk.green(`✅ Casos de QA importados: ${imported} sucesso, ${errors} erros`));
  } catch (error) {
    spinner.fail(chalk.red('Erro ao importar casos de QA:', error.message));
  }
}

/**
 * Parser para extrair casos de QA do formato MD
 */
function parseQAContent(content) {
  const cases = [];
  const sections = content.split('### Caso #');
  
  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];
    const lines = section.split('\n');
    
    const caseId = lines[0]?.trim() || '';
    const testCase = {
      id: parseInt(caseId) || i + 408, // IDs começam em 409 baseado no exemplo
      category: '',
      tags: [],
      difficulty: '',
      version: 1,
      content: '',
      question: ''
    };
    
    let contentStarted = false;
    let contentLines = [];
    
    for (const line of lines) {
      if (line.includes('**Tags:**')) {
        const tags = line.split(':')[1]?.trim() || '';
        testCase.tags = tags.split(',').map(t => t.trim());
        testCase.category = testCase.tags[0] || '';
      }
      if (line.includes('**Dificuldade:**')) {
        testCase.difficulty = line.split(':')[1]?.trim() || '';
      }
      if (line.includes('**Versão:**')) {
        testCase.version = parseInt(line.split(':')[1]?.trim()) || 1;
      }
      if (line.includes('**Conteúdo:**')) {
        contentStarted = true;
        continue;
      }
      if (contentStarted && line !== '---') {
        contentLines.push(line);
      }
    }
    
    testCase.content = contentLines.join('\n').trim();
    cases.push(testCase);
  }
  
  return cases;
}

/**
 * Cria embeddings para os novos dados
 */
async function createEmbeddings() {
  const spinner = ora('Criando embeddings para novos dados...').start();
  
  try {
    // Chama a função de reprocessamento de embeddings
    const { data, error } = await supabase.functions.invoke('generate-embedding', {
      body: { 
        action: 'reprocess_all',
        tables: ['legal_articles', 'regime_urbanistico_consolidado', 'qa_test_cases']
      }
    });
    
    if (error) {
      throw error;
    }
    
    spinner.succeed(chalk.green('✅ Embeddings criados com sucesso'));
  } catch (error) {
    spinner.warn(chalk.yellow('⚠️ Embeddings podem precisar ser criados manualmente:', error.message));
  }
}

/**
 * Função principal
 */
async function main() {
  console.log(chalk.cyan('📚 Importando Base de Conhecimento Completa do PDPOA 2025\n'));
  
  // Verifica conexão com Supabase
  const { data: healthCheck, error: healthError } = await supabase
    .from('legal_articles')
    .select('count')
    .limit(1);
  
  if (healthError) {
    console.error(chalk.red('❌ Erro ao conectar com Supabase:', healthError.message));
    process.exit(1);
  }
  
  console.log(chalk.green('✅ Conexão com Supabase estabelecida\n'));
  
  // Importa dados em sequência
  await importLegalArticles();
  await importRegimeUrbanistico();
  await importQACases();
  await createEmbeddings();
  
  console.log(chalk.cyan('\n✨ Importação completa! Dados disponíveis no Supabase.'));
  console.log(chalk.yellow('\n📝 Próximos passos:'));
  console.log(chalk.yellow('1. Verifique os dados no Supabase Dashboard'));
  console.log(chalk.yellow('2. Execute npm run test:qa para validar a importação'));
  console.log(chalk.yellow('3. Teste as consultas no chat'));
}

// Executa o script
main().catch(error => {
  console.error(chalk.red('❌ Erro fatal:', error));
  process.exit(1);
});