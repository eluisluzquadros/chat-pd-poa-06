#!/usr/bin/env node

/**
 * Verificação detalhada dos chunks QA no Supabase
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config({ path: '.env' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function verifyQAChunks() {
  console.log(chalk.cyan.bold('\n🔍 VERIFICAÇÃO DETALHADA - CHUNKS QA\n'));
  
  // 1. Verificar arquivos locais de QA
  console.log(chalk.blue('1. ARQUIVOS LOCAIS DE QA:\n'));
  
  const qaPath = './knowledge_base_complete/chunks_qa';
  
  try {
    // Listar todos os arquivos e diretórios
    const qaItems = await fs.readdir(qaPath);
    console.log(chalk.green(`📁 Encontrados ${qaItems.length} items em chunks_qa:`));
    
    for (const item of qaItems) {
      const itemPath = path.join(qaPath, item);
      const stats = await fs.stat(itemPath);
      
      if (stats.isDirectory()) {
        const subItems = await fs.readdir(itemPath);
        console.log(chalk.yellow(`  📂 ${item}/: ${subItems.length} arquivos`));
        
        // Mostrar alguns exemplos
        for (const subItem of subItems.slice(0, 3)) {
          console.log(chalk.gray(`     • ${subItem}`));
        }
        if (subItems.length > 3) {
          console.log(chalk.gray(`     ... e mais ${subItems.length - 3} arquivos`));
        }
      } else {
        const size = (stats.size / 1024).toFixed(1);
        console.log(chalk.yellow(`  📄 ${item}: ${size} KB`));
      }
    }
    
    // Verificar se existe o arquivo principal
    const mainQAFile = path.join(qaPath, 'pdpoa_qa_knowledge_base.md');
    try {
      const content = await fs.readFile(mainQAFile, 'utf-8');
      const lines = content.split('\n').length;
      console.log(chalk.green(`\n✅ Arquivo principal QA existe: ${lines} linhas`));
      
      // Contar perguntas no arquivo
      const questions = content.match(/##\s+responda:/gi) || [];
      console.log(chalk.green(`   Contém ${questions.length} perguntas documentadas`));
    } catch (err) {
      console.log(chalk.red(`\n❌ Arquivo principal QA não encontrado`));
    }
    
  } catch (err) {
    console.log(chalk.red(`Erro ao ler diretório: ${err.message}`));
  }
  
  // 2. Verificar tabela qa_test_cases no Supabase
  console.log(chalk.blue('\n2. TABELA qa_test_cases NO SUPABASE:\n'));
  
  const { data: qaTests, count } = await supabase
    .from('qa_test_cases')
    .select('*', { count: 'exact' })
    .limit(5);
  
  console.log(chalk.green(`📊 Total de casos de teste: ${count}`));
  
  if (qaTests && qaTests.length > 0) {
    console.log(chalk.yellow('\nExemplos de casos de teste:'));
    qaTests.forEach((test, idx) => {
      console.log(chalk.gray(`\n${idx + 1}. Pergunta: ${test.question?.substring(0, 60)}...`));
      console.log(chalk.gray(`   Resposta esperada: ${test.expected_answer?.substring(0, 60)}...`));
      if (test.category) {
        console.log(chalk.gray(`   Categoria: ${test.category}`));
      }
    });
  }
  
  // 3. Verificar se existem embeddings de QA
  console.log(chalk.blue('\n3. VERIFICAR EMBEDDINGS DE QA:\n'));
  
  // Buscar em document_sections (mesmo sendo tabela velha, vamos verificar)
  const { data: qaEmbeddings } = await supabase
    .from('document_sections')
    .select('title, content')
    .or('title.ilike.%QA%,content.ilike.%responda:%')
    .limit(5);
  
  if (qaEmbeddings && qaEmbeddings.length > 0) {
    console.log(chalk.yellow(`⚠️ Encontrados ${qaEmbeddings.length} chunks QA em document_sections (tabela velha)`));
    qaEmbeddings.forEach(chunk => {
      console.log(chalk.gray(`  • ${chunk.title || chunk.content?.substring(0, 50)}...`));
    });
  } else {
    console.log(chalk.red('❌ Nenhum chunk QA encontrado em document_sections'));
  }
  
  // 4. Verificar se existe tabela específica para QA chunks
  console.log(chalk.blue('\n4. VERIFICAR TABELAS ESPECÍFICAS DE QA:\n'));
  
  const tables = ['qa_chunks', 'qa_embeddings', 'qa_knowledge_base'];
  
  for (const tableName of tables) {
    try {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      if (error && error.message.includes('not exist')) {
        console.log(chalk.red(`❌ Tabela ${tableName} não existe`));
      } else if (count !== null) {
        console.log(chalk.green(`✅ Tabela ${tableName} existe com ${count} registros`));
      }
    } catch (err) {
      console.log(chalk.red(`❌ Tabela ${tableName} não existe`));
    }
  }
  
  // 5. Verificar se legal_articles tem os artigos mencionados
  console.log(chalk.blue('\n5. VERIFICAR ARTIGOS ESPECÍFICOS:\n'));
  
  const testArticles = [
    { law: 'LUOS', article: '1' },
    { law: 'LUOS', article: '38' },
    { law: 'LUOS', article: '75' },
    { law: 'LUOS', article: '119' },
    { law: 'PDUS', article: '1' },
    { law: 'PDUS', article: '3' },
    { law: 'PDUS', article: '5' }
  ];
  
  for (const { law, article } of testArticles) {
    const { data } = await supabase
      .from('legal_articles')
      .select('title, content')
      .ilike('source', `%${law}%`)
      .or(`article_number.eq.${article},title.ilike.%Art. ${article}%,title.ilike.%Artigo ${article}%`)
      .limit(1);
    
    if (data && data.length > 0) {
      console.log(chalk.green(`✅ ${law} Art. ${article}: Encontrado`));
    } else {
      console.log(chalk.red(`❌ ${law} Art. ${article}: NÃO encontrado`));
    }
  }
  
  // 6. Análise final
  console.log(chalk.blue('\n' + '='.repeat(70)));
  console.log(chalk.cyan.bold('ANÁLISE FINAL - CHUNKS QA:\n'));
  
  if (count > 0) {
    console.log(chalk.green(`✅ qa_test_cases tem ${count} casos de teste`));
    console.log(chalk.yellow('   Estes casos podem ser usados para validação mas NÃO para busca semântica'));
  }
  
  console.log(chalk.yellow('\n⚠️ IMPORTANTE:'));
  console.log(chalk.yellow('   Os chunks QA da pasta knowledge_base_complete/chunks_qa'));
  console.log(chalk.yellow('   parecem NÃO estar carregados como embeddings para busca semântica'));
  console.log(chalk.yellow('   Eles existem apenas como casos de teste em qa_test_cases'));
  
  console.log(chalk.red('\n❌ PROBLEMA IDENTIFICADO:'));
  console.log(chalk.red('   Os chunks QA não estão disponíveis para recuperação RAG'));
  console.log(chalk.red('   O sistema só tem acesso aos casos de teste, não ao conhecimento QA completo'));
}

verifyQAChunks().catch(console.error);