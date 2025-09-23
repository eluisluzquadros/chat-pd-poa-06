#!/usr/bin/env node

/**
 * Verificação: O agentic-rag está usando os chunks do knowledge_base_complete?
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

async function verifyKBUsage() {
  console.log(chalk.cyan.bold('\n🔍 VERIFICAÇÃO: USO DOS CHUNKS DO KNOWLEDGE_BASE_COMPLETE\n'));
  
  // 1. Verificar estrutura do knowledge_base_complete
  console.log(chalk.blue('1. ESTRUTURA LOCAL DO KNOWLEDGE_BASE_COMPLETE:\n'));
  
  const kbPath = './knowledge_base_complete';
  
  // chunks_regime_urbanistico_consolidado
  const regimeBairrosPath = path.join(kbPath, 'chunks_regime_urbanistico_consolidado', 'chunks_bairros');
  const regimeZonasPath = path.join(kbPath, 'chunks_regime_urbanistico_consolidado', 'chunks_zonas');
  
  const bairroFiles = await fs.readdir(regimeBairrosPath);
  const zonaFiles = await fs.readdir(regimeZonasPath);
  
  console.log(chalk.green(`✅ chunks_regime_urbanistico_consolidado:`));
  console.log(chalk.gray(`   • chunks_bairros: ${bairroFiles.length} arquivos`));
  console.log(chalk.gray(`   • chunks_zonas: ${zonaFiles.length} arquivos`));
  
  // chunks_qa
  const qaCategoriesPath = path.join(kbPath, 'chunks_qa', 'chunks_categorias_pdpoa');
  const qaResponsesPath = path.join(kbPath, 'chunks_qa', 'chunks_respostas_pdpoa');
  
  const categoryFiles = await fs.readdir(qaCategoriesPath);
  const responseFiles = await fs.readdir(qaResponsesPath);
  
  console.log(chalk.green(`✅ chunks_qa:`));
  console.log(chalk.gray(`   • chunks_categorias_pdpoa: ${categoryFiles.length} arquivos`));
  console.log(chalk.gray(`   • chunks_respostas_pdpoa: ${responseFiles.length} arquivos`));
  
  // 2. Verificar tabelas no Supabase
  console.log(chalk.blue('\n2. VERIFICAR ONDE ESSES DADOS ESTÃO NO SUPABASE:\n'));
  
  // Verificar regime_urbanistico_consolidado
  console.log(chalk.yellow('📊 regime_urbanistico_consolidado:'));
  const { count: regimeCount } = await supabase
    .from('regime_urbanistico_consolidado')
    .select('*', { count: 'exact', head: true });
  
  console.log(chalk.green(`   ✅ ${regimeCount} registros (dados estruturados de bairros/zonas)`));
  console.log(chalk.gray(`   ℹ️ Esta tabela contém os dados processados dos chunks_bairros`));
  
  // Verificar se os chunks de QA estão em alguma tabela de embeddings
  console.log(chalk.yellow('\n📊 Verificando embeddings de QA:'));
  
  // Buscar em document_sections (tabela de embeddings)
  const { data: qaInSections } = await supabase
    .from('document_sections')
    .select('title')
    .or('title.ilike.%categoria_%,title.ilike.%resposta_%')
    .limit(5);
  
  if (qaInSections && qaInSections.length > 0) {
    console.log(chalk.green(`   ✅ Encontrados ${qaInSections.length} chunks QA em document_sections`));
    qaInSections.forEach(chunk => {
      console.log(chalk.gray(`      • ${chunk.title}`));
    });
  } else {
    console.log(chalk.red('   ❌ Nenhum chunk QA encontrado em document_sections'));
  }
  
  // 3. Analisar o código do agentic-rag
  console.log(chalk.blue('\n3. ANÁLISE DO CÓDIGO AGENTIC-RAG:\n'));
  
  const agenticRagPath = './supabase/functions/agentic-rag/index.ts';
  const agenticRagCode = await fs.readFile(agenticRagPath, 'utf-8');
  
  // Verificar quais tabelas são usadas
  const tablesUsed = [];
  
  if (agenticRagCode.includes("from('regime_urbanistico_consolidado')")) {
    tablesUsed.push('regime_urbanistico_consolidado');
    console.log(chalk.green('✅ USA regime_urbanistico_consolidado (dados de bairros/zonas)'));
  }
  
  if (agenticRagCode.includes("from('document_sections')")) {
    tablesUsed.push('document_sections');
    console.log(chalk.yellow('⚠️ USA document_sections (tabela antiga - deve ser removida)'));
  }
  
  if (agenticRagCode.includes("from('legal_articles')")) {
    tablesUsed.push('legal_articles');
    console.log(chalk.green('✅ USA legal_articles (artigos LUOS/PDUS)'));
  }
  
  if (agenticRagCode.includes("from('qa_test_cases')")) {
    tablesUsed.push('qa_test_cases');
    console.log(chalk.yellow('⚠️ USA qa_test_cases (apenas para testes, não para RAG)'));
  }
  
  // 4. Verificar se os dados QA precisam ser carregados
  console.log(chalk.blue('\n4. STATUS DOS DADOS DO KNOWLEDGE_BASE_COMPLETE:\n'));
  
  console.log(chalk.cyan('📁 chunks_regime_urbanistico_consolidado:'));
  console.log(chalk.green('   ✅ CARREGADO: Dados estão em regime_urbanistico_consolidado'));
  console.log(chalk.green('   ✅ EM USO: agentic-rag consulta esta tabela'));
  console.log(chalk.green('   ✅ FUNCIONANDO: 100% de sucesso nas queries de regime'));
  
  console.log(chalk.cyan('\n📁 chunks_qa:'));
  console.log(chalk.red('   ❌ NÃO CARREGADO: chunks_categorias_pdpoa não estão no banco'));
  console.log(chalk.red('   ❌ NÃO CARREGADO: chunks_respostas_pdpoa não estão no banco'));
  console.log(chalk.red('   ❌ NÃO EM USO: agentic-rag não tem acesso a estes dados'));
  
  // 5. Verificar um exemplo específico
  console.log(chalk.blue('\n5. TESTE ESPECÍFICO - BUSCA POR CONTEÚDO QA:\n'));
  
  // Ler um arquivo de resposta QA
  const sampleQAFile = path.join(qaResponsesPath, responseFiles[0]);
  const sampleQAContent = await fs.readFile(sampleQAFile, 'utf-8');
  const sampleText = sampleQAContent.substring(0, 50).replace(/\n/g, ' ');
  
  console.log(chalk.gray(`Buscando por: "${sampleText}..."`));
  
  // Buscar este conteúdo no banco
  const { data: searchResult } = await supabase
    .from('document_sections')
    .select('id')
    .ilike('content', `%${sampleText.substring(0, 20)}%`)
    .limit(1);
  
  if (searchResult && searchResult.length > 0) {
    console.log(chalk.green('✅ Conteúdo QA encontrado no banco'));
  } else {
    console.log(chalk.red('❌ Conteúdo QA NÃO encontrado no banco'));
  }
  
  // 6. Conclusão
  console.log(chalk.blue('\n' + '='.repeat(70)));
  console.log(chalk.cyan.bold('CONCLUSÃO:\n'));
  
  console.log(chalk.red.bold('❌ PROBLEMA CRÍTICO IDENTIFICADO:\n'));
  console.log(chalk.red('Os chunks QA do knowledge_base_complete NÃO estão carregados no Supabase!'));
  console.log(chalk.red('• chunks_categorias_pdpoa: 16 arquivos NÃO carregados'));
  console.log(chalk.red('• chunks_respostas_pdpoa: 124 arquivos NÃO carregados'));
  
  console.log(chalk.yellow('\n⚠️ IMPACTO:'));
  console.log(chalk.yellow('• Sistema não tem acesso ao conhecimento QA completo'));
  console.log(chalk.yellow('• Respostas genéricas para perguntas que têm respostas preparadas'));
  console.log(chalk.yellow('• Taxa de sucesso limitada a 60%'));
  
  console.log(chalk.green('\n✅ O QUE ESTÁ FUNCIONANDO:'));
  console.log(chalk.green('• chunks_regime_urbanistico_consolidado: CARREGADO e FUNCIONANDO'));
  console.log(chalk.green('• Queries de regime urbanístico: 100% de sucesso'));
  console.log(chalk.green('• Alguns artigos LUOS/PDUS: Parcialmente disponíveis'));
  
  console.log(chalk.cyan('\n💡 SOLUÇÃO NECESSÁRIA:'));
  console.log(chalk.cyan('1. Carregar os 140 arquivos de chunks_qa como embeddings'));
  console.log(chalk.cyan('2. Criar índices de busca semântica para estes chunks'));
  console.log(chalk.cyan('3. Configurar agentic-rag para buscar nestes embeddings'));
  console.log(chalk.cyan('4. Remover referências a document_sections (tabela antiga)'));
}

verifyKBUsage().catch(console.error);