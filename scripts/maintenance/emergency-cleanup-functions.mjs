#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Configuração do projeto
const PROJECT_REF = 'ngrqwmvuhvjkeohesbxs';

// Funções ESSENCIAIS que devem ser mantidas
const ESSENTIAL_FUNCTIONS = [
  'agentic-rag',
  'test-api-connection', 
  'chat',
  'generate-embedding',
  'query-analyzer',
  'response-synthesizer',
  'sql-generator',
  'enhanced-vector-search'
];

// Funções OBSOLETAS para deletar (prioritárias)
const OBSOLETE_FUNCTIONS = [
  // Debug/Test functions
  'agentic-rag-debug',
  'agentic-rag-v2', 
  'agentic-rag-v3',
  'agentic-rag-unified',
  'cache-debug',
  'sql-generator-debug',
  'test-minimal',
  'test-qa-cases',
  
  // QA redundantes (alta prioridade)
  'qa-validator-direct',
  'qa-validator-test',
  'qa-validator-simple',
  'qa-execute-validation-v2',
  'qa-batch-execution',
  'qa-benchmark-unified',
  'qa-cleanup-failed-runs',
  'qa-cleanup-runs',
  'qa-debug-runs',
  'qa-test-fixes',
  'qa-check-results-rls',
  'qa-delete-test-case',
  'qa-ensure-completed-status',
  'qa-fetch-runs',
  'qa-fix-rls',
  'qa-fix-simple',
  'qa-fix-stuck-runs',
  'qa-fix-system',
  'qa-get-run-details',
  'qa-update-test-case',
  'qa-ingest-kb',
  'qa-add-test-case',
  
  // Chat individuais (usar multiLLMService)
  'claude-chat',
  'claude-haiku-chat',
  'claude-sonnet-chat', 
  'claude-opus-chat',
  'deepseek-chat',
  'gemini-chat',
  'gemini-pro-chat',
  'gemini-vision-chat',
  'groq-chat',
  'llama-chat',
  'openai-advanced-chat',
  
  // Agentes redundantes
  'agent-evaluation',
  'agent-legal',
  'agent-rag',
  'agent-reasoning',
  'agent-urban',
  'agent-validator',
  'orchestrator-master',
  'orchestrator-master-fixed',
  'rl-cognitive-agent',
  
  // Utilitárias redundantes
  'create-admin-user',
  'create-admin-account',
  'setup-demo-user',
  'set-user-role',
  'create-user-from-interest',
  'check-processing-status',
  
  // Processamento antigas
  'fix-embeddings',
  'fix-embeddings-batch',
  'kb-reprocess-all',
  'kb-upload',
  'import-structured-kb',
  'process-document',
  'knowledge-updater',
  'feedback-processor',
  
  // Busca redundantes
  'cursor-pagination',
  'paginated-search',
  'match-documents',
  'get_documents',
  'get_list',
  'format-table-response',
  'structured-data-search',
  'legal-article-finder',
  
  // Response redundantes
  'response-synthesizer-v2',
  'response-synthesizer-simple',
  'response-synthesizer-rag',
  'predefined-responses',
  
  // SQL redundantes
  'sql-generator-v2',
  'sql-generator-new',
  
  // Validação redundantes
  'cross-validation',
  'cross-validation-v2',
  'contextual-scoring',
  'gap-detector',
  'table-coverage-monitor',
  'sql-validator',
  'universal-bairro-validator',
  'validate-dynamic-bairros',
  'ux-consistency-validator',
  
  // Outras obsoletas
  'bairros-cache-service',
  'rag-neighborhood-sweep',
  'run-benchmark',
  'generate-text-embedding'
];

async function listFunctions() {
  console.log('📋 Listando Edge Functions atuais...\n');
  try {
    const { stdout } = await execAsync(`npx supabase functions list --project-ref ${PROJECT_REF}`);
    const functions = stdout.split('\n')
      .filter(line => line.trim() && !line.includes('NAME') && !line.includes('---'))
      .map(line => line.trim().split(/\s+/)[0])
      .filter(name => name && name !== '');
    
    console.log(`📊 Total de funções encontradas: ${functions.length}`);
    console.log(`✅ Essenciais: ${ESSENTIAL_FUNCTIONS.length}`);
    console.log(`🗑️ Para deletar: ${OBSOLETE_FUNCTIONS.length}`);
    
    return functions;
  } catch (error) {
    console.error('❌ Erro ao listar funções:', error.message);
    return [];
  }
}

async function deleteFunction(functionName) {
  console.log(`🗑️ Deletando: ${functionName}...`);
  try {
    await execAsync(`npx supabase functions delete ${functionName} --project-ref ${PROJECT_REF}`, {
      timeout: 10000 // 10 segundos timeout
    });
    console.log(`✅ ${functionName} deletada com sucesso!`);
    return true;
  } catch (error) {
    console.log(`⚠️ ${functionName}: ${error.message.includes('not found') ? 'já deletada' : 'erro'}`);
    return false;
  }
}

async function emergencyCleanup() {
  console.log('🚨 LIMPEZA EMERGENCIAL DE EDGE FUNCTIONS');
  console.log('=========================================\n');
  
  // Listar funções atuais
  const currentFunctions = await listFunctions();
  
  if (currentFunctions.length === 0) {
    console.log('❌ Não foi possível listar funções. Verifique a conexão.');
    return;
  }
  
  console.log('\n🎯 ESTRATÉGIA DE LIMPEZA:');
  console.log('1. Manter funções essenciais do sistema');
  console.log('2. Deletar funções de debug e teste');
  console.log('3. Remover QA e validação redundantes');
  console.log('4. Eliminar agentes obsoletos\n');
  
  let deleted = 0;
  let failed = 0;
  let skipped = 0;
  
  // Deletar funções obsoletas em lotes
  console.log('🗑️ INICIANDO DELEÇÃO...\n');
  
  for (const func of OBSOLETE_FUNCTIONS) {
    if (currentFunctions.includes(func)) {
      const success = await deleteFunction(func);
      if (success) {
        deleted++;
      } else {
        failed++;
      }
      
      // Pausa entre deleções para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      console.log(`⏭️ ${func}: não encontrada`);
      skipped++;
    }
  }
  
  // Verificar se há outras funções não essenciais
  const remainingFunctions = currentFunctions.filter(func => 
    !ESSENTIAL_FUNCTIONS.includes(func) && 
    !OBSOLETE_FUNCTIONS.includes(func)
  );
  
  if (remainingFunctions.length > 0) {
    console.log('\n🔍 FUNÇÕES ADICIONAIS ENCONTRADAS:');
    remainingFunctions.forEach(func => {
      console.log(`❓ ${func} - revisar manualmente`);
    });
  }
  
  // Relatório final
  console.log('\n📊 RELATÓRIO DE LIMPEZA');
  console.log('=======================');
  console.log(`✅ Deletadas: ${deleted}`);
  console.log(`❌ Falharam: ${failed}`);
  console.log(`⏭️ Puladas: ${skipped}`);
  console.log(`❓ Adicionais: ${remainingFunctions.length}`);
  
  const estimatedRemaining = ESSENTIAL_FUNCTIONS.length + remainingFunctions.length + failed;
  console.log(`📈 Funções restantes estimadas: ${estimatedRemaining}`);
  
  if (estimatedRemaining <= 20) {
    console.log('\n🎉 LIMPEZA CONCLUÍDA COM SUCESSO!');
    console.log('✅ Agora você pode testar a conexão com Dify novamente.');
  } else {
    console.log('\n⚠️ LIMPEZA PARCIAL - Pode precisar de mais deleções');
    console.log('💡 Execute novamente ou delete manualmente via Dashboard');
  }
  
  console.log('\n📝 PRÓXIMOS PASSOS:');
  console.log('1. Aguardar 1-2 minutos para propagação');
  console.log('2. Testar conexão Dify na interface');
  console.log('3. Se ainda houver erro, deletar funções adicionais via Dashboard');
}

// Executar limpeza
emergencyCleanup().catch(console.error);