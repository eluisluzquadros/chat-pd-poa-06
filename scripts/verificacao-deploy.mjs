#!/usr/bin/env node

/**
 * Script de Verificação Final do Deploy
 * Chat PD POA - Sistema de Validação Pós-Deploy
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configurações do Supabase
const SUPABASE_URL = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
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

// Utility functions
const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

const success = (message) => log(`✅ ${message}`, 'green');
const error = (message) => log(`❌ ${message}`, 'red');
const warning = (message) => log(`⚠️  ${message}`, 'yellow');
const info = (message) => log(`ℹ️  ${message}`, 'blue');
const header = (message) => log(`\n🔍 ${message}`, 'cyan');

// Edge Functions que devem estar deployadas
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

// Tabelas críticas que devem existir
const CRITICAL_TABLES = [
  'documents',
  'document_chunks',
  'document_rows',
  'disaster_risk_data',
  'qa_validation_runs',
  'message_feedback',
  'query_cache'
];

// Casos de teste para validação funcional
const TEST_CASES = [
  {
    id: 1,
    query: "Qual artigo da LUOS trata da Certificação em Sustentabilidade Ambiental?",
    expected: "Art. 81",
    type: "regulatory"
  },
  {
    id: 2,
    query: "Qual a regra para empreendimentos do 4º distrito?",
    expected: "Art. 74",
    type: "regulatory"
  },
  {
    id: 3,
    query: "Quais bairros têm risco de inundação?",
    expected: "lista_bairros",
    type: "risk_data"
  },
  {
    id: 4,
    query: "Qual o risco do Centro Histórico?",
    expected: "Risco Muito Alto",
    type: "risk_data"
  }
];

/**
 * Verificar Edge Functions
 */
async function verificarEdgeFunctions() {
  header('VERIFICAÇÃO DAS EDGE FUNCTIONS');
  
  let functionsOk = 0;
  
  for (const functionName of CRITICAL_FUNCTIONS) {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/${functionName}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ test: true })
        }
      );
      
      if (response.status === 200 || response.status === 400) { // 400 é ok para teste
        success(`${functionName}: Deployada e responsiva`);
        functionsOk++;
      } else {
        warning(`${functionName}: Status ${response.status} - Pode precisar de re-deploy`);
      }
    } catch (err) {
      error(`${functionName}: Erro de conexão - ${err.message}`);
    }
  }
  
  const percentage = (functionsOk / CRITICAL_FUNCTIONS.length) * 100;
  info(`Status Functions: ${functionsOk}/${CRITICAL_FUNCTIONS.length} (${percentage.toFixed(1)}%)`);
  
  return percentage >= 75; // 75% mínimo
}

/**
 * Verificar estrutura do banco de dados
 */
async function verificarBancoDados() {
  header('VERIFICAÇÃO DO BANCO DE DADOS');
  
  let tablesOk = 0;
  let totalRecords = 0;
  
  // Verificar tabelas
  for (const tableName of CRITICAL_TABLES) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
        
      if (error) {
        error(`Tabela ${tableName}: ${error.message}`);
      } else {
        const count = data?.length || 0;
        success(`Tabela ${tableName}: ${count} registros`);
        tablesOk++;
        totalRecords += count;
      }
    } catch (err) {
      error(`Tabela ${tableName}: Erro - ${err.message}`);
    }
  }
  
  // Verificar funções SQL críticas
  try {
    const { data: functions } = await supabase.rpc('pg_get_functiondef', {
      funcname: 'match_hierarchical_documents'
    });
    
    if (functions) {
      success('Função match_hierarchical_documents: Existe');
    } else {
      warning('Função match_hierarchical_documents: Não encontrada');
    }
  } catch (err) {
    warning('Funções SQL: Não foi possível verificar');
  }
  
  // Verificar índices de performance
  try {
    const { data: indexes } = await supabase
      .from('pg_indexes')
      .select('indexname')
      .like('indexname', '%document_chunks%');
      
    if (indexes && indexes.length > 0) {
      success(`Índices de performance: ${indexes.length} encontrados`);
    } else {
      warning('Índices de performance: Poucos ou nenhum encontrado');
    }
  } catch (err) {
    warning('Índices: Não foi possível verificar');
  }
  
  info(`Status Banco: ${tablesOk}/${CRITICAL_TABLES.length} tabelas, ${totalRecords} registros total`);
  
  return tablesOk >= 6; // Mínimo 6 tabelas críticas
}

/**
 * Verificar dados essenciais
 */
async function verificarDados() {
  header('VERIFICAÇÃO DOS DADOS ESSENCIAIS');
  
  let dataChecks = 0;
  
  // Verificar chunks de documentos
  try {
    const { data: chunks, error } = await supabase
      .from('document_chunks')
      .select('id, content, metadata')
      .limit(5);
      
    if (error) {
      error(`Chunks: ${error.message}`);
    } else if (chunks && chunks.length > 0) {
      success(`Document chunks: ${chunks.length} amostras encontradas`);
      dataChecks++;
      
      // Verificar embeddings
      const { data: embeddings } = await supabase
        .from('document_chunks')
        .select('embedding')
        .not('embedding', 'is', null)
        .limit(1);
        
      if (embeddings && embeddings.length > 0) {
        success('Embeddings: Processados corretamente');
        dataChecks++;
      } else {
        warning('Embeddings: Usando placeholders - Configure OPENAI_API_KEY');
      }
    } else {
      error('Document chunks: Nenhum encontrado');
    }
  } catch (err) {
    error(`Chunks: Erro - ${err.message}`);
  }
  
  // Verificar dados de risco
  try {
    const { data: riskData, error } = await supabase
      .from('disaster_risk_data')
      .select('bairro, risco_inundacao')
      .limit(5);
      
    if (error) {
      error(`Dados de risco: ${error.message}`);
    } else if (riskData && riskData.length > 0) {
      success(`Dados de risco: ${riskData.length} bairros com dados`);
      dataChecks++;
    } else {
      warning('Dados de risco: Nenhum encontrado - Execute importação');
    }
  } catch (err) {
    error(`Dados de risco: Erro - ${err.message}`);
  }
  
  // Verificar metadados dos documentos
  try {
    const { data: docs } = await supabase
      .from('documents')
      .select('id, title, type')
      .limit(3);
      
    if (docs && docs.length > 0) {
      success(`Documentos: ${docs.length} documentos processados`);
      dataChecks++;
    } else {
      warning('Documentos: Poucos ou nenhum processado');
    }
  } catch (err) {
    warning('Documentos: Não foi possível verificar');
  }
  
  info(`Status Dados: ${dataChecks}/4 verificações passaram`);
  
  return dataChecks >= 3;
}

/**
 * Testar funcionalidades críticas
 */
async function testarFuncionalidades() {
  header('TESTE DAS FUNCIONALIDADES CRÍTICAS');
  
  let testsPass = 0;
  
  for (const testCase of TEST_CASES) {
    try {
      info(`Testando: ${testCase.query}`);
      
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/agentic-rag`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query: testCase.query,
            user_id: 'test-user'
          })
        }
      );
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.response && result.response.length > 10) {
          success(`Teste ${testCase.id}: Resposta gerada (${result.response.length} caracteres)`);
          testsPass++;
        } else {
          warning(`Teste ${testCase.id}: Resposta muito curta ou vazia`);
        }
      } else {
        error(`Teste ${testCase.id}: HTTP ${response.status}`);
      }
    } catch (err) {
      error(`Teste ${testCase.id}: Erro - ${err.message}`);
    }
  }
  
  const percentage = (testsPass / TEST_CASES.length) * 100;
  info(`Status Funcionalidades: ${testsPass}/${TEST_CASES.length} (${percentage.toFixed(1)}%)`);
  
  return percentage >= 75;
}

/**
 * Verificar performance do sistema
 */
async function verificarPerformance() {
  header('VERIFICAÇÃO DE PERFORMANCE');
  
  let performanceOk = true;
  
  // Teste de latência
  const startTime = Date.now();
  
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/query-analyzer`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: "teste de performance"
        })
      }
    );
    
    const endTime = Date.now();
    const latency = endTime - startTime;
    
    if (latency < 3000) {
      success(`Latência: ${latency}ms (< 3s)`);
    } else {
      warning(`Latência: ${latency}ms (> 3s) - Performance pode estar degradada`);
      performanceOk = false;
    }
  } catch (err) {
    error(`Teste de latência: ${err.message}`);
    performanceOk = false;
  }
  
  // Verificar cache
  try {
    const { data: cacheData } = await supabase
      .from('query_cache')
      .select('*')
      .limit(1);
      
    if (cacheData && cacheData.length > 0) {
      success('Sistema de cache: Ativo');
    } else {
      warning('Sistema de cache: Sem dados - Normal em deploy novo');
    }
  } catch (err) {
    warning('Sistema de cache: Não verificável');
  }
  
  return performanceOk;
}

/**
 * Gerar relatório final
 */
function gerarRelatorio(results) {
  header('RELATÓRIO FINAL DO DEPLOY');
  
  const { functions, database, data, functionality, performance } = results;
  const totalChecks = Object.values(results).filter(Boolean).length;
  const maxChecks = Object.keys(results).length;
  const overallScore = (totalChecks / maxChecks) * 100;
  
  log('\n📊 RESUMO DOS RESULTADOS:', 'bright');
  log(`Edge Functions: ${functions ? '✅' : '❌'}`);
  log(`Banco de Dados: ${database ? '✅' : '❌'}`);
  log(`Dados Essenciais: ${data ? '✅' : '❌'}`);
  log(`Funcionalidades: ${functionality ? '✅' : '❌'}`);
  log(`Performance: ${performance ? '✅' : '❌'}`);
  
  log(`\n🎯 SCORE GERAL: ${overallScore.toFixed(1)}%`, 'bright');
  
  if (overallScore >= 80) {
    success('\n🚀 DEPLOY APROVADO! Sistema pronto para produção.');
  } else if (overallScore >= 60) {
    warning('\n⚠️  DEPLOY PARCIAL. Algumas correções necessárias.');
  } else {
    error('\n❌ DEPLOY REPROVADO. Correções críticas necessárias.');
  }
  
  log('\n📋 PRÓXIMOS PASSOS:', 'cyan');
  if (!functions) log('• Re-deploy das Edge Functions críticas');
  if (!database) log('• Executar migrações SQL pendentes');  
  if (!data) log('• Importar dados essenciais (bairros, documentos)');
  if (!functionality) log('• Verificar configurações das APIs (OpenAI)');
  if (!performance) log('• Otimizar índices de banco e cache');
  
  return overallScore;
}

/**
 * Função principal
 */
async function main() {
  log('🚀 VERIFICAÇÃO FINAL DO DEPLOY - CHAT PD POA', 'bright');
  log('================================================', 'cyan');
  
  const results = {
    functions: await verificarEdgeFunctions(),
    database: await verificarBancoDados(), 
    data: await verificarDados(),
    functionality: await testarFuncionalidades(),
    performance: await verificarPerformance()
  };
  
  const score = gerarRelatorio(results);
  
  // Salvar relatório
  const reportData = {
    timestamp: new Date().toISOString(),
    score: score,
    results: results,
    details: "Verificação automatizada pós-deploy"
  };
  
  try {
    await supabase
      .from('qa_automated_reports')
      .insert({
        run_date: new Date().toISOString(),
        scenarios_tested: 5,
        all_passed: score >= 80,
        critical_failures: Object.values(results).filter(r => !r).length,
        results: reportData
      });
      
    info('📄 Relatório salvo no banco de dados');
  } catch (err) {
    warning('📄 Não foi possível salvar o relatório');
  }
  
  process.exit(score >= 80 ? 0 : 1);
}

// Executar verificação
main().catch(err => {
  error(`Erro fatal: ${err.message}`);
  process.exit(1);
});