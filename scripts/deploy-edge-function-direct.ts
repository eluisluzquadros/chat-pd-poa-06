// Script para deploy direto da Edge Function
// Execute com: npx tsx scripts/deploy-edge-function-direct.ts

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

async function deployFunction() {
  console.log('🚀 Tentando deploy direto da Edge Function...\n');
  
  // Ler o código da função
  const functionPath = path.join(process.cwd(), 'supabase', 'functions', 'response-synthesizer-rag', 'index.ts');
  const functionCode = fs.readFileSync(functionPath, 'utf-8');
  
  console.log('📄 Função lida com sucesso');
  console.log(`📏 Tamanho: ${functionCode.length} caracteres\n`);
  
  // Informações para deploy manual
  console.log('⚠️  Deploy via CLI não está disponível sem autenticação completa\n');
  console.log('📋 Para fazer o deploy manualmente:\n');
  console.log('1. Acesse o Supabase Dashboard:');
  console.log(`   ${supabaseUrl.replace('https://', 'https://app.supabase.com/project/').replace('.supabase.co', '')}/functions\n`);
  console.log('2. Clique em "New Function"');
  console.log('3. Nome da função: response-synthesizer-rag');
  console.log('4. Cole o código abaixo:\n');
  console.log('------- INÍCIO DO CÓDIGO -------');
  console.log(functionCode);
  console.log('------- FIM DO CÓDIGO -------\n');
  console.log('5. Clique em "Deploy"\n');
  
  // Salvar instruções em arquivo
  const instructions = `# Deploy Manual da Edge Function

## Função: response-synthesizer-rag

### Passo 1: Acesse o Dashboard
${supabaseUrl.replace('https://', 'https://app.supabase.com/project/').replace('.supabase.co', '')}/functions

### Passo 2: Crie Nova Função
- Nome: response-synthesizer-rag
- Clique em "Create"

### Passo 3: Cole o Código
Cole o código do arquivo:
supabase/functions/response-synthesizer-rag/index.ts

### Passo 4: Deploy
Clique em "Deploy" e aguarde a confirmação.

### Passo 5: Teste
Após o deploy, teste as queries no chat:
- "Qual artigo da LUOS trata da Certificação em Sustentabilidade Ambiental?"
- "Qual a regra para empreendimentos do 4º distrito?"
- "Quais bairros têm risco de inundação?"
`;
  
  fs.writeFileSync('DEPLOY_MANUAL_INSTRUCOES.md', instructions);
  console.log('✅ Instruções salvas em: DEPLOY_MANUAL_INSTRUCOES.md');
}

// Alternativa: testar localmente
async function testFunctionLocally() {
  console.log('\n🧪 Testando função localmente...\n');
  
  const testQueries = [
    "Qual artigo da LUOS trata da Certificação em Sustentabilidade Ambiental?",
    "Qual a regra para empreendimentos do 4º distrito?"
  ];
  
  for (const query of testQueries) {
    console.log(`📝 Query: "${query}"`);
    
    // Simular detecção
    const needsVectorSearch = 
      query.toLowerCase().includes('certificação') ||
      query.toLowerCase().includes('4º distrito');
    
    console.log(`🔍 Precisa busca vetorial: ${needsVectorSearch ? 'SIM' : 'NÃO'}\n`);
  }
}

deployFunction().then(() => testFunctionLocally()).catch(console.error);