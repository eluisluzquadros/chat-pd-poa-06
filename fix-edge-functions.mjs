#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

console.log('🔧 Corrigindo Edge Functions...\n');

// Correção 1: agentic-rag/index.ts - mudar 'message' para 'query'
const agenticRagPath = './supabase/functions/agentic-rag/index.ts';
console.log('📝 Corrigindo agentic-rag/index.ts...');

try {
  let content = fs.readFileSync(agenticRagPath, 'utf8');
  
  // Corrigir interface para aceitar 'query' também
  content = content.replace(
    'interface AgenticRAGRequest {',
    'interface AgenticRAGRequest {\n  query?: string; // Support both query and message'
  );
  
  // Adicionar fallback para query/message
  content = content.replace(
    'const { message, userRole, sessionId, userId, bypassCache }',
    'const { message, query, userRole, sessionId, userId, bypassCache }'
  );
  
  // Adicionar linha para usar query ou message
  content = content.replace(
    'console.log(\'📝 User Message:\', message);',
    'const userMessage = message || query || \'\';\n    console.log(\'📝 User Message:\', userMessage);'
  );
  
  // Substituir todas as ocorrências de 'message' por 'userMessage' onde necessário
  content = content.replace(/\.eq\('query', message\)/g, '.eq(\'query\', userMessage)');
  content = content.replace(/const data = encoder\.encode\(message\.toLowerCase/g, 'const data = encoder.encode(userMessage.toLowerCase');
  content = content.replace(/'message': message,/g, '\'message\': userMessage,');
  content = content.replace(/body: JSON\.stringify\({ message, /g, 'body: JSON.stringify({ message: userMessage, ');
  
  fs.writeFileSync(agenticRagPath, content);
  console.log('✅ agentic-rag corrigido!');
} catch (error) {
  console.error('❌ Erro ao corrigir agentic-rag:', error.message);
}

// Correção 2: query-analyzer/index.ts - garantir que query não seja undefined
const queryAnalyzerPath = './supabase/functions/query-analyzer/index.ts';
console.log('\n📝 Corrigindo query-analyzer/index.ts...');

try {
  let content = fs.readFileSync(queryAnalyzerPath, 'utf8');
  
  // Adicionar verificação de query no início
  const bodyParseRegex = /const \{ query, sessionId \} = await req\.json\(\);/;
  if (bodyParseRegex.test(content)) {
    content = content.replace(
      bodyParseRegex,
      'const { query, sessionId } = await req.json();\n    \n    if (!query) {\n      throw new Error(\'Query is required\');\n    }'
    );
  }
  
  // Adicionar trim e verificação antes de toLowerCase
  content = content.replace(
    'const queryLower = query.toLowerCase();',
    'const queryLower = (query || \'\').toString().toLowerCase();'
  );
  
  fs.writeFileSync(queryAnalyzerPath, content);
  console.log('✅ query-analyzer corrigido!');
} catch (error) {
  console.error('❌ Erro ao corrigir query-analyzer:', error.message);
}

// Correção 3: response-synthesizer/index.ts - verificar arrays antes de .length
const responseSynthesizerPath = './supabase/functions/response-synthesizer/index.ts';
console.log('\n📝 Verificando response-synthesizer...');

try {
  if (fs.existsSync(responseSynthesizerPath)) {
    let content = fs.readFileSync(responseSynthesizerPath, 'utf8');
    
    // Adicionar verificações de array antes de usar .length
    content = content.replace(
      /(\w+)\.length/g,
      '(Array.isArray($1) ? $1.length : 0)'
    );
    
    // Reverter para casos onde não é necessário
    content = content.replace(
      /\(Array\.isArray\((\w+)\.length\) \? \1\.length\.length : 0\)/g,
      '$1.length'
    );
    
    fs.writeFileSync(responseSynthesizerPath, content);
    console.log('✅ response-synthesizer verificado!');
  }
} catch (error) {
  console.error('❌ Erro ao verificar response-synthesizer:', error.message);
}

console.log('\n✅ Correções aplicadas!');
console.log('\n📌 Próximos passos:');
console.log('1. Re-deploy as Edge Functions corrigidas:');
console.log('   npx supabase functions deploy agentic-rag --project-ref ngrqwmvuhvjkeohesbxs');
console.log('   npx supabase functions deploy query-analyzer --project-ref ngrqwmvuhvjkeohesbxs');
console.log('   npx supabase functions deploy response-synthesizer --project-ref ngrqwmvuhvjkeohesbxs');
console.log('\n2. Testar novamente com: node test-llm-direct.mjs');