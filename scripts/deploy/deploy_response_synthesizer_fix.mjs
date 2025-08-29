import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🚀 Iniciando deploy do fix do response-synthesizer...\n');

try {
  // Ler o arquivo da função
  const functionCode = readFileSync('./supabase/functions/response-synthesizer/index.ts', 'utf8');
  
  console.log('📝 Código lido com sucesso');
  console.log('📏 Tamanho do código:', functionCode.length, 'caracteres');
  
  // Verificar se o fix está presente
  if (!functionCode.includes('isGenericPortoAlegreQuery')) {
    console.error('❌ ERRO: O código não contém o fix necessário!');
    process.exit(1);
  }
  
  console.log('✅ Fix verificado no código');
  
  // Deploy via API do Supabase
  const deployResponse = await fetch(`${supabaseUrl}/functions/v1/response-synthesizer`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      verify_jwt: false,
      import_map: false,
      body: functionCode
    })
  });

  if (!deployResponse.ok) {
    const error = await deployResponse.text();
    console.error('❌ Erro no deploy:', error);
    
    console.log('\n📋 INSTRUÇÕES PARA DEPLOY MANUAL:');
    console.log('1. Acesse: https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/functions');
    console.log('2. Encontre a função "response-synthesizer"');
    console.log('3. Clique em "Edit"');
    console.log('4. Cole o código atualizado de: supabase/functions/response-synthesizer/index.ts');
    console.log('5. Clique em "Save and Deploy"');
    console.log('\n⚠️  IMPORTANTE: O código já está corrigido localmente!');
  } else {
    console.log('✅ Deploy realizado com sucesso!');
  }

} catch (error) {
  console.error('❌ Erro durante o deploy:', error);
  
  console.log('\n📋 INSTRUÇÕES PARA DEPLOY MANUAL:');
  console.log('1. Acesse: https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/functions');
  console.log('2. Encontre a função "response-synthesizer"');
  console.log('3. Clique em "Edit"');
  console.log('4. Cole o código atualizado de: supabase/functions/response-synthesizer/index.ts');
  console.log('5. Clique em "Save and Deploy"');
}