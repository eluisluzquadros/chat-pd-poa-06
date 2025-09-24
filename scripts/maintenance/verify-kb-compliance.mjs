#!/usr/bin/env node

/**
 * Verificação de Compliance - Knowledge Base Complete no Supabase
 * Verifica se chunks_regime_urbanistico_consolidado e chunks_qa estão no banco
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

async function verifyCompliance() {
  console.log(chalk.cyan.bold('\n🔍 VERIFICAÇÃO DE COMPLIANCE - KNOWLEDGE BASE\n'));
  
  // 1. Verificar arquivos locais
  console.log(chalk.blue('1. VERIFICANDO ARQUIVOS LOCAIS:\n'));
  
  const kbPath = './knowledge_base_complete';
  
  // Verificar chunks de regime urbanístico
  const regimePath = path.join(kbPath, 'chunks_regime_urbanistico_consolidado', 'chunks_bairros');
  const bairroFiles = await fs.readdir(regimePath);
  console.log(chalk.green(`✅ ${bairroFiles.length} arquivos de bairros encontrados localmente`));
  
  // Verificar chunks QA
  const qaPath = path.join(kbPath, 'chunks_qa');
  const qaFiles = await fs.readdir(qaPath);
  console.log(chalk.green(`✅ ${qaFiles.length} arquivos/diretórios QA encontrados localmente`));
  
  // 2. Verificar no Supabase - TABELAS CORRETAS
  console.log(chalk.blue('\n2. VERIFICANDO NO SUPABASE (TABELAS CORRETAS):\n'));
  
  // NÃO usar document_sections (tabela velha)
  console.log(chalk.red('⚠️ IGNORANDO document_sections (tabela velha que deve ser deletada)'));
  
  // Verificar regime_urbanistico_consolidado
  console.log(chalk.yellow('\n📊 Tabela: regime_urbanistico_consolidado'));
  const { count: regimeCount } = await supabase
    .from('regime_urbanistico_consolidado')
    .select('*', { count: 'exact', head: true });
  
  console.log(chalk.green(`  ✅ ${regimeCount} registros na tabela`));
  
  // Verificar se tem dados de Petrópolis (teste crítico)
  const { data: petropolis } = await supabase
    .from('regime_urbanistico_consolidado')
    .select('*')
    .ilike('Bairro', '%PETRÓ%')
    .limit(1);
  
  if (petropolis?.length > 0) {
    console.log(chalk.green(`  ✅ PETRÓPOLIS encontrado: Zona ${petropolis[0].Zona}, Altura: ${petropolis[0].Altura_Maxima___Edificacao_Isolada}m`));
  } else {
    console.log(chalk.red('  ❌ PETRÓPOLIS NÃO encontrado na tabela!'));
  }
  
  // Verificar qa_test_cases
  console.log(chalk.yellow('\n📊 Tabela: qa_test_cases'));
  const { count: qaCount } = await supabase
    .from('qa_test_cases')
    .select('*', { count: 'exact', head: true });
  
  console.log(chalk.green(`  ✅ ${qaCount} casos de teste na tabela`));
  
  // 3. Verificar se existe tabela de chunks processados
  console.log(chalk.blue('\n3. VERIFICANDO TABELAS DE CHUNKS:\n'));
  
  // Verificar se existe tabela de chunks de regime
  const { data: regimeChunks, error: regimeError } = await supabase
    .from('regime_chunks')
    .select('*')
    .limit(1);
  
  if (regimeError && regimeError.message.includes('not exist')) {
    console.log(chalk.red('❌ Tabela regime_chunks NÃO existe'));
    console.log(chalk.yellow('  ℹ️ Os chunks devem estar sendo processados diretamente do regime_urbanistico_consolidado'));
  } else if (regimeChunks) {
    console.log(chalk.green(`✅ Tabela regime_chunks existe com dados`));
  }
  
  // 4. Análise de compliance
  console.log(chalk.blue('\n4. ANÁLISE DE COMPLIANCE:\n'));
  
  const localBairros = bairroFiles.filter(f => f.endsWith('.md')).length;
  
  // Verificar quantos bairros únicos existem no banco
  const { data: uniqueBairros } = await supabase
    .from('regime_urbanistico_consolidado')
    .select('Bairro');
  
  const uniqueCount = [...new Set(uniqueBairros?.map(b => b.Bairro))].length;
  
  console.log(chalk.cyan('📋 Resumo:'));
  console.log(`  • Arquivos locais de bairros: ${localBairros}`);
  console.log(`  • Bairros únicos no banco: ${uniqueCount}`);
  console.log(`  • Registros totais no banco: ${regimeCount}`);
  console.log(`  • Casos de teste QA: ${qaCount}`);
  
  // 5. Verificar alguns bairros específicos
  console.log(chalk.blue('\n5. VERIFICANDO BAIRROS ESPECÍFICOS:\n'));
  
  const testBairros = ['PETRÓPOLIS', 'CENTRO HISTÓRICO', 'AZENHA', 'MENINO DEUS'];
  
  for (const bairro of testBairros) {
    const { data, error } = await supabase
      .from('regime_urbanistico_consolidado')
      .select('Zona, Altura_Maxima___Edificacao_Isolada')
      .ilike('Bairro', `%${bairro}%`)
      .limit(1);
    
    if (data?.length > 0) {
      console.log(chalk.green(`✅ ${bairro}: Zona ${data[0].Zona}, Altura ${data[0].Altura_Maxima___Edificacao_Isolada}m`));
    } else {
      console.log(chalk.red(`❌ ${bairro}: NÃO ENCONTRADO`));
    }
  }
  
  // 6. Verificar se agentic-rag está usando a tabela correta
  console.log(chalk.blue('\n6. VERIFICANDO USO NO AGENTIC-RAG:\n'));
  
  const agenticRagPath = './supabase/functions/agentic-rag/index.ts';
  const agenticRagContent = await fs.readFile(agenticRagPath, 'utf-8');
  
  // Verificar referências às tabelas
  const usesRegimeConsolidado = agenticRagContent.includes('regime_urbanistico_consolidado');
  const usesDocumentSections = agenticRagContent.includes('document_sections');
  
  if (usesRegimeConsolidado) {
    console.log(chalk.green('✅ agentic-rag USA regime_urbanistico_consolidado (correto)'));
  } else {
    console.log(chalk.red('❌ agentic-rag NÃO usa regime_urbanistico_consolidado'));
  }
  
  if (usesDocumentSections) {
    console.log(chalk.red('❌ agentic-rag ainda USA document_sections (DEVE SER REMOVIDO)'));
  } else {
    console.log(chalk.green('✅ agentic-rag NÃO usa document_sections (correto)'));
  }
  
  // 7. Conclusão
  console.log(chalk.blue('\n' + '='.repeat(70)));
  console.log(chalk.cyan.bold('CONCLUSÃO:\n'));
  
  if (regimeCount > 0 && qaCount > 0 && usesRegimeConsolidado) {
    console.log(chalk.green.bold('✅ COMPLIANCE OK - Dados estão no Supabase'));
    console.log(chalk.green('   Os chunks de regime_urbanistico_consolidado estão disponíveis'));
    console.log(chalk.green('   Os casos QA estão carregados'));
    
    if (usesDocumentSections) {
      console.log(chalk.yellow('\n⚠️ ATENÇÃO: Remover referências a document_sections no agentic-rag'));
    }
  } else {
    console.log(chalk.red.bold('❌ COMPLIANCE FALHOU'));
    if (regimeCount === 0) {
      console.log(chalk.red('   • regime_urbanistico_consolidado está vazio'));
    }
    if (qaCount === 0) {
      console.log(chalk.red('   • qa_test_cases está vazio'));
    }
    if (!usesRegimeConsolidado) {
      console.log(chalk.red('   • agentic-rag não está usando regime_urbanistico_consolidado'));
    }
  }
}

verifyCompliance().catch(console.error);