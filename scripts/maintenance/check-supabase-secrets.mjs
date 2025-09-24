// Script para verificar se as secrets estão configuradas no Supabase

console.log('🔍 Verificando secrets do Supabase...\n');

const secrets = [
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'GEMINI_API_KEY',
  'DEEPSEEK_API_KEY',
  'ZHIPUAI_API_KEY'
];

console.log('📋 Secrets necessárias para o chat funcionar:\n');

secrets.forEach(secret => {
  console.log(`- ${secret}`);
});

console.log('\n📝 Para definir as secrets, use os comandos:\n');

// Ler as chaves do .env.local
import { readFileSync } from 'fs';

try {
  const envContent = readFileSync('.env.local', 'utf8');
  const lines = envContent.split('\n');
  
  const keys = {};
  lines.forEach(line => {
    if (line.includes('_API_KEY=')) {
      const [key, value] = line.split('=');
      if (key && value && value.trim()) {
        keys[key.trim()] = value.trim();
      }
    }
  });

  console.log('🔑 Comandos para configurar as secrets:\n');
  
  if (keys.OPENAI_API_KEY) {
    console.log(`npx supabase secrets set OPENAI_API_KEY="${keys.OPENAI_API_KEY}" --project-ref ngrqwmvuhvjkeohesbxs`);
  }
  
  if (keys.ANTHROPIC_API_KEY) {
    console.log(`\nnpx supabase secrets set ANTHROPIC_API_KEY="${keys.ANTHROPIC_API_KEY}" --project-ref ngrqwmvuhvjkeohesbxs`);
  }
  
  if (keys.GEMINI_API_KEY) {
    console.log(`\nnpx supabase secrets set GEMINI_API_KEY="${keys.GEMINI_API_KEY}" --project-ref ngrqwmvuhvjkeohesbxs`);
  }
  
  if (keys.DEEPSEEK_API_KEY) {
    console.log(`\nnpx supabase secrets set DEEPSEEK_API_KEY="${keys.DEEPSEEK_API_KEY}" --project-ref ngrqwmvuhvjkeohesbxs`);
  }
  
  if (keys.ZHIPUAI_API_KEY) {
    console.log(`\nnpx supabase secrets set ZHIPUAI_API_KEY="${keys.ZHIPUAI_API_KEY}" --project-ref ngrqwmvuhvjkeohesbxs`);
  }

  console.log('\n✅ Execute os comandos acima para configurar as secrets no Supabase.');
  
} catch (error) {
  console.error('❌ Erro ao ler .env.local:', error.message);
  console.log('\nCertifique-se de que o arquivo .env.local existe e contém as chaves de API.');
}