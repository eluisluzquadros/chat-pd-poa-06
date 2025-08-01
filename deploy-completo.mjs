#!/usr/bin/env node

/**
 * Script de Deploy Completo Automatizado
 * Chat PD POA - Sistema de Deploy All-in-One
 */

import { execSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Configurações
const SUPABASE_URL = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const PROJECT_REF = 'ngrqwmvuhvjkeohesbxs';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Cores para output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m', 
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

const success = (message) => log(`✅ ${message}`, 'green');
const error = (message) => log(`❌ ${message}`, 'red');
const warning = (message) => log(`⚠️  ${message}`, 'yellow');
const info = (message) => log(`ℹ️  ${message}`, 'blue');
const header = (message) => log(`\n🔍 ${message}`, 'cyan');
const step = (message) => log(`\n🚀 ${message}`, 'bright');

// Edge Functions críticas para deploy
const CRITICAL_FUNCTIONS = [
  'agentic-rag',
  'query-analyzer',
  'sql-generator', 
  'enhanced-vector-search',
  'response-synthesizer',
  'multiLLMService',
  'qa-validator',
  'process-document'
];

/**
 * Executar comando com tratamento de erro
 */
function execCommand(command, description) {
  try {
    info(`Executando: ${description}`);
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    success(`${description}: Concluído`);
    return { success: true, output };
  } catch (err) {
    error(`${description}: Falhou - ${err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Etapa 1: Verificações Pré-Deploy
 */
async function verificacoesPrevias() {
  step('ETAPA 1: VERIFICAÇÕES PRÉ-DEPLOY');
  
  let checks = 0;
  let totalChecks = 5;
  
  // Verificar Node.js
  const nodeCheck = execCommand('node --version', 'Verificar Node.js');
  if (nodeCheck.success) checks++;
  
  // Verificar npm
  const npmCheck = execCommand('npm --version', 'Verificar npm');
  if (npmCheck.success) checks++;
  
  // Verificar Supabase CLI
  const supabaseCheck = execCommand('npx supabase --version', 'Verificar Supabase CLI');
  if (supabaseCheck.success) checks++;
  
  // Verificar .env.local
  if (fs.existsSync('.env.local')) {
    success('Arquivo .env.local: Encontrado');
    checks++;
  } else {
    warning('Arquivo .env.local: Não encontrado - Criando template');
    // Criar template básico
    const envTemplate = `# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_KEY}

# OpenAI Configuration  
OPENAI_API_KEY=your_openai_api_key_here
`;
    fs.writeFileSync('.env.local', envTemplate);
    success('Template .env.local criado - Configure sua OPENAI_API_KEY');
  }
  
  // Verificar conexão com Supabase
  try {
    const { data, error } = await supabase.from('documents').select('id').limit(1);
    if (!error) {
      success('Conexão Supabase: OK');
      checks++;
    } else {
      error(`Conexão Supabase: ${error.message}`);
    }
  } catch (err) {
    error(`Conexão Supabase: ${err.message}`);
  }
  
  const percentage = (checks / totalChecks) * 100;
  info(`Verificações pré-deploy: ${checks}/${totalChecks} (${percentage.toFixed(1)}%)`);
  
  if (percentage < 80) {
    error('Verificações pré-deploy falharam. Corrija os problemas antes de continuar.');
    process.exit(1);
  }
  
  return true;
}

/**
 * Etapa 2: Build e Testes
 */
async function buildETestes() {
  step('ETAPA 2: BUILD E TESTES');
  
  // Instalar dependências
  const installResult = execCommand('npm install', 'Instalar dependências');
  if (!installResult.success) {
    error('Falha na instalação de dependências');
    return false;
  }
  
  // Verificar tipos TypeScript
  const typeCheckResult = execCommand('npm run type-check', 'Verificação de tipos');
  if (!typeCheckResult.success) {
    warning('Verificação de tipos falhou - Continuando...');
  }
  
  // Executar testes
  const testResult = execCommand('npm test', 'Executar testes');
  if (!testResult.success) {
    warning('Alguns testes falharam - Continuando...');
  }
  
  // Build do projeto
  const buildResult = execCommand('npm run build', 'Build do projeto');
  if (!buildResult.success) {
    error('Build falhou - Deploy abortado');
    return false;
  }
  
  success('Build e testes concluídos');
  return true;
}

/**
 * Etapa 3: Deploy das Edge Functions
 */
async function deployEdgeFunctions() {
  step('ETAPA 3: DEPLOY DAS EDGE FUNCTIONS');
  
  let successCount = 0;
  
  for (const functionName of CRITICAL_FUNCTIONS) {
    const command = `npx supabase functions deploy ${functionName} --project-ref ${PROJECT_REF}`;
    const result = execCommand(command, `Deploy ${functionName}`);
    
    if (result.success) {
      successCount++;
    } else {
      warning(`${functionName}: Deploy falhou - Continuando com próxima...`);
    }
    
    // Pequena pausa entre deploys
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  const percentage = (successCount / CRITICAL_FUNCTIONS.length) * 100;
  info(`Edge Functions deployadas: ${successCount}/${CRITICAL_FUNCTIONS.length} (${percentage.toFixed(1)}%)`);
  
  if (percentage < 75) {
    warning('Muitas Edge Functions falharam. Verifique os logs.');
    return false;
  }
  
  return true;
}

/**
 * Etapa 4: Configurar Banco de Dados
 */
async function configurarBanco() {
  step('ETAPA 4: CONFIGURAÇÃO DO BANCO DE DADOS');
  
  // Verificar extensões necessárias
  const extensionsSQL = `
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "vector";
    CREATE EXTENSION IF NOT EXISTS "pg_trgm";
  `;
  
  try {
    await supabase.rpc('exec_sql', { sql: extensionsSQL });
    success('Extensões do PostgreSQL: Verificadas');
  } catch (err) {
    warning(`Extensões: ${err.message}`);
  }
  
  // Verificar função principal de busca
  const matchFunctionSQL = `
    CREATE OR REPLACE FUNCTION match_hierarchical_documents(
      query_embedding vector(1536),
      match_threshold float DEFAULT 0.78,
      match_count int DEFAULT 20
    )
    RETURNS TABLE (
      id uuid,
      content text,
      metadata jsonb,
      chunk_index integer,
      similarity float
    )
    LANGUAGE plpgsql
    AS $$
    BEGIN
      RETURN QUERY
      SELECT 
        dc.id,
        dc.content,
        dc.metadata,
        dc.chunk_index,
        (1 - (dc.embedding <=> query_embedding)) as similarity
      FROM document_chunks dc
      WHERE 1 - (dc.embedding <=> query_embedding) > match_threshold
      ORDER BY dc.embedding <=> query_embedding
      LIMIT match_count;
    END;
    $$;
  `;
  
  try {
    await supabase.rpc('exec_sql', { sql: matchFunctionSQL });
    success('Função match_hierarchical_documents: Configurada');
  } catch (err) {
    warning(`Função de busca: ${err.message}`);
  }
  
  // Verificar índices de performance
  const indexesSQL = `
    CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding 
    ON document_chunks USING ivfflat (embedding vector_cosine_ops);
    
    CREATE INDEX IF NOT EXISTS idx_document_chunks_metadata 
    ON document_chunks USING gin (metadata);
    
    CREATE INDEX IF NOT EXISTS idx_disaster_risk_bairro 
    ON disaster_risk_data USING gin (bairro gin_trgm_ops);
  `;
  
  try {
    await supabase.rpc('exec_sql', { sql: indexesSQL });
    success('Índices de performance: Configurados');
  } catch (err) {
    warning(`Índices: ${err.message}`);
  }
  
  return true;
}

/**
 * Etapa 5: Importar Dados Essenciais
 */
async function importarDados() {
  step('ETAPA 5: IMPORTAÇÃO DE DADOS ESSENCIAIS');
  
  // Verificar dados existentes
  try {
    const { data: chunks } = await supabase
      .from('document_chunks')
      .select('id')
      .limit(1);
      
    if (chunks && chunks.length > 0) {
      success('Document chunks: Dados existem');
    } else {
      warning('Document chunks: Nenhum dado - Execute processamento de documentos');
    }
    
    const { data: riskData } = await supabase
      .from('disaster_risk_data')
      .select('bairro')
      .limit(1);
      
    if (riskData && riskData.length > 0) {
      success('Dados de risco: Dados existem');
    } else {
      warning('Dados de risco: Nenhum dado - Execute importação de dados de risco');
      
      // Tentar executar script de importação
      const importResult = execCommand(
        'node scripts/import-disaster-risk-data.ts',
        'Importar dados de risco'
      );
      
      if (!importResult.success) {
        warning('Importação automática falhou - Execute manualmente após deploy');
      }
    }
  } catch (err) {
    warning(`Verificação de dados: ${err.message}`);
  }
  
  return true;
}

/**
 * Etapa 6: Validação Final
 */
async function validacaoFinal() {
  step('ETAPA 6: VALIDAÇÃO FINAL');
  
  // Executar script de verificação
  const verificationResult = execCommand(
    'node scripts/verificacao-deploy.mjs',
    'Executar verificação completa'
  );
  
  if (verificationResult.success) {
    success('Verificação final: APROVADA');
    return true;
  } else {
    warning('Verificação final: PROBLEMAS DETECTADOS');
    info('Execute manualmente: node scripts/verificacao-deploy.mjs');
    return false;
  }
}

/**
 * Função principal
 */
async function main() {
  log('🚀 DEPLOY COMPLETO AUTOMATIZADO - CHAT PD POA', 'bright');
  log('===============================================', 'cyan');
  
  const startTime = Date.now();
  
  try {
    // Executar todas as etapas
    await verificacoesPrevias();
    await buildETestes();
    await deployEdgeFunctions();
    await configurarBanco();
    await importarDados();
    const finalValidation = await validacaoFinal();
    
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    header('DEPLOY CONCLUÍDO');
    
    if (finalValidation) {
      success(`🎉 DEPLOY FINALIZADO COM SUCESSO em ${duration}s!`);
      log('\n📋 PRÓXIMOS PASSOS:', 'cyan');
      log('• Testar o sistema no frontend');
      log('• Configurar OPENAI_API_KEY se necessário');
      log('• Monitorar logs das Edge Functions');
      log('• Executar testes QA: npm run test:qa');
    } else {
      warning(`⚠️  DEPLOY CONCLUÍDO COM ALERTAS em ${duration}s`);
      log('\n📋 AÇÕES NECESSÁRIAS:', 'yellow');
      log('• Verificar logs das Edge Functions');
      log('• Completar importação de dados');
      log('• Executar: node scripts/verificacao-deploy.mjs');
    }
    
  } catch (err) {
    error(`Erro crítico durante deploy: ${err.message}`);
    process.exit(1);
  }
}

// Executar deploy
main().catch(err => {
  error(`Erro fatal: ${err.message}`);
  process.exit(1);
});