import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

const supabase = createClient(supabaseUrl, anonKey);

async function testSimple() {
  console.log('=== Teste Simples de Construção ===\n');

  const { data, error } = await supabase.functions.invoke('agentic-rag', {
    body: {
      message: 'o que pode ser construído no bairro petrópolis?',
      userRole: 'user',
      sessionId: 'simple-test',
      bypassCache: true
    }
  });

  if (error) {
    console.log('Erro:', error);
    return;
  }

  console.log('Resposta completa:');
  console.log(data.response);
  
  // Verificar se tem tabela
  if (data.response.includes('|')) {
    console.log('\n✓ Tem tabela');
    
    // Extrair linhas da tabela
    const lines = data.response.split('\n');
    const tableLines = lines.filter(line => line.includes('|') && !line.match(/^[\s-|]+$/));
    
    console.log('\nLinhas da tabela:');
    tableLines.forEach(line => console.log(line));
  } else {
    console.log('\n❌ NÃO tem tabela!');
  }
}

testSimple().catch(console.error);