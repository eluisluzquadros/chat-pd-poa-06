// Deploy da função query-analyzer via Management API
import fs from 'fs/promises';
import fetch from 'node-fetch';

const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT_REF = 'ngrqwmvuhvjkeohesbxs';

async function deployFunction() {
  console.log('🚀 Iniciando deploy da função query-analyzer...\n');
  
  // Ler o código da função
  const functionCode = await fs.readFile('./supabase/functions/query-analyzer/index.ts', 'utf-8');
  
  console.log('📄 Código da função carregado');
  console.log(`📏 Tamanho: ${functionCode.length} caracteres\n`);
  
  // Verificar se temos o token
  if (!SUPABASE_ACCESS_TOKEN) {
    console.error('❌ ERRO: SUPABASE_ACCESS_TOKEN não encontrado');
    console.log('\n📋 Instruções para deploy manual:\n');
    console.log('1. Acesse: https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/functions');
    console.log('2. Encontre a função "query-analyzer"');
    console.log('3. Clique em "Edit"');
    console.log('4. Cole o código do arquivo: supabase/functions/query-analyzer/index.ts');
    console.log('5. Clique em "Save and Deploy"\n');
    
    // Criar um arquivo com o código pronto para copiar
    await fs.writeFile('query-analyzer-to-deploy.ts', functionCode);
    console.log('✅ Código salvo em: query-analyzer-to-deploy.ts (pronto para copiar/colar)');
    
    return;
  }
  
  try {
    // Fazer deploy via API
    const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/query-analyzer`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'query-analyzer',
        slug: 'query-analyzer',
        body: functionCode,
        verify_jwt: false
      })
    });
    
    if (response.ok) {
      console.log('✅ Deploy realizado com sucesso!');
      const result = await response.json();
      console.log('📊 Detalhes:', result);
    } else {
      const error = await response.text();
      console.error('❌ Erro no deploy:', error);
      throw new Error(error);
    }
  } catch (error) {
    console.error('❌ Falha no deploy:', error.message);
    console.log('\n📋 Use o método manual descrito acima.');
  }
}

// Alternativa: Verificar se podemos usar o Supabase CLI local
async function checkSupabaseCLI() {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    console.log('\n🔍 Verificando Supabase CLI local...');
    
    // Tentar encontrar supabase.exe no Windows
    const possiblePaths = [
      'C:\\Program Files\\Supabase\\bin\\supabase.exe',
      'C:\\Users\\User\\AppData\\Local\\supabase\\bin\\supabase.exe',
      'C:\\Users\\User\\scoop\\apps\\supabase\\current\\supabase.exe'
    ];
    
    for (const path of possiblePaths) {
      try {
        await fs.access(path);
        console.log(`✅ Supabase CLI encontrado em: ${path}`);
        
        // Tentar fazer deploy usando o caminho completo
        const { stdout, stderr } = await execAsync(`"${path}" functions deploy query-analyzer --project-ref ${PROJECT_REF}`);
        
        if (stdout) console.log('📋 Output:', stdout);
        if (stderr) console.log('⚠️  Avisos:', stderr);
        
        return true;
      } catch (e) {
        // Continuar procurando
      }
    }
    
    console.log('❌ Supabase CLI não encontrado nos caminhos padrão');
    return false;
  } catch (error) {
    console.error('❌ Erro ao verificar CLI:', error.message);
    return false;
  }
}

// Executar
(async () => {
  // Primeiro tentar via API
  await deployFunction();
  
  // Se falhar, tentar via CLI local
  const cliSuccess = await checkSupabaseCLI();
  
  if (!cliSuccess) {
    console.log('\n📌 IMPORTANTE: O deploy precisa ser feito manualmente via dashboard Supabase');
    console.log('   O código atualizado está em: query-analyzer-to-deploy.ts');
  }
})();