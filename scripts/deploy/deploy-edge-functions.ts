// Script para deploy manual das Edge Functions
// Execute com: npx tsx scripts/deploy-edge-functions.ts

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não configuradas');
  process.exit(1);
}

console.log(`
🚀 Deploy Manual das Edge Functions
===================================

⚠️  IMPORTANTE: As Edge Functions precisam ser deployadas pelo Supabase Dashboard!

📝 Instruções:

1. Acesse o Supabase Dashboard:
   ${supabaseUrl.replace('https://', 'https://app.supabase.com/project/').replace('.supabase.co', '')}/functions

2. Para cada função listada abaixo, você precisa:
   a) Clicar em "New Function"
   b) Usar o nome exato da função
   c) Copiar o código do arquivo correspondente
   d) Clicar em "Deploy"

📂 Funções para Deploy:
`);

const functionsDir = path.join(process.cwd(), 'supabase', 'functions');
const functions = [
  'process-document',
  'generate-text-embedding',
  'enhanced-vector-search',
  'chat'
];

functions.forEach((func, index) => {
  const funcPath = path.join(functionsDir, func, 'index.ts');
  const exists = fs.existsSync(funcPath);
  
  console.log(`
${index + 1}. ${func}
   Status: ${exists ? '✅ Arquivo existe' : '❌ Arquivo não encontrado'}
   Caminho: supabase/functions/${func}/index.ts
   ${exists ? `Tamanho: ${fs.statSync(funcPath).size} bytes` : ''}
`);
});

console.log(`
🔧 Alternativamente, você pode usar o Supabase CLI:

1. Instale o Supabase CLI globalmente:
   npm install -g supabase

2. Faça login:
   supabase login

3. Link o projeto:
   supabase link --project-ref ${supabaseUrl.match(/https:\/\/([^.]+)/)?.[1]}

4. Deploy todas as funções:
   supabase functions deploy

📚 Documentação:
https://supabase.com/docs/guides/functions/deploy

⏰ Tempo estimado: 5-10 minutos para deploy manual via Dashboard
`);

// Verificar se as funções já estão deployadas
console.log('\n🔍 Verificando status das funções...\n');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkFunction(name: string) {
  try {
    const { data, error } = await supabase.functions.invoke(name, {
      body: { test: true }
    });
    
    if (error?.message?.includes('not found')) {
      console.log(`❌ ${name}: Não deployada`);
    } else if (error) {
      console.log(`⚠️  ${name}: Deployada mas com erro: ${error.message}`);
    } else {
      console.log(`✅ ${name}: Deployada e funcionando`);
    }
  } catch (e) {
    console.log(`❌ ${name}: Não deployada ou inacessível`);
  }
}

(async () => {
  for (const func of functions) {
    await checkFunction(func);
  }
  
  console.log(`
🎯 Próximos Passos:
==================

1. Se as funções não estão deployadas:
   - Siga as instruções acima para deploy manual via Dashboard
   - Ou configure o Supabase CLI corretamente

2. Após o deploy, execute:
   npx tsx scripts/reprocess-knowledge-base.ts

3. Teste o sistema com queries específicas como:
   - "Qual artigo da LUOS trata da Certificação em Sustentabilidade Ambiental?"
   - "Qual a regra para empreendimentos do 4º distrito?"
`);
})();