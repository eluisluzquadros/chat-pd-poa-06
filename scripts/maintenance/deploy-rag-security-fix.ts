#!/usr/bin/env node

import { config } from 'https://deno.land/x/dotenv/mod.ts';

// Carregar variáveis de ambiente
await config({ export: true });

const SUPABASE_PROJECT_ID = 'fqyumkedaeybdxtrthvb';

console.log('🚀 Deploy da correção de segurança do RAG\n');

// Instruções para deploy
console.log('📋 INSTRUÇÕES DE DEPLOY:\n');

console.log('1️⃣ Primeiro, faça login no Supabase CLI:');
console.log('   npx supabase login\n');

console.log('2️⃣ Link o projeto (se ainda não estiver linkado):');
console.log(`   npx supabase link --project-ref ${SUPABASE_PROJECT_ID}\n`);

console.log('3️⃣ Deploy da função response-synthesizer-rag atualizada:');
console.log('   npx supabase functions deploy response-synthesizer-rag\n');

console.log('4️⃣ Verifique o deploy:');
console.log('   npx supabase functions list\n');

console.log('5️⃣ Teste a segurança após o deploy:');
console.log('   deno run --allow-net --allow-env scripts/test-rag-security.ts\n');

console.log('📌 IMPORTANTE:');
console.log('- A função foi atualizada para NUNCA expor conteúdo do arquivo Q&A');
console.log('- Apenas o conteúdo das respostas é extraído e retornado');
console.log('- Toda estrutura de perguntas/respostas é filtrada');
console.log('- Metadados e referências ao arquivo são removidos\n');

console.log('🔒 VALIDAÇÕES IMPLEMENTADAS:');
console.log('✅ Função extractRelevantContent() filtra estrutura Q&A');
console.log('✅ Respostas são reescritas sem expor origem');
console.log('✅ Padrões proibidos são bloqueados');
console.log('✅ Apenas conteúdo relevante é retornado\n');

console.log('⚡ Para deploy automático via API (alternativa):');
console.log('   deno run --allow-net --allow-env --allow-read scripts/deploy-edge-function-direct.ts\n');