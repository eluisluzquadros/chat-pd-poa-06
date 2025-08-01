import fetch from 'node-fetch';

const SUPABASE_URL = 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg';

console.log('🧪 Testando acesso aos dados do sistema...\n');

async function testRegimeUrbanistico() {
  console.log('📊 Verificando dados de regime urbanístico...');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/regime_urbanistico?select=*&limit=5`, {
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY,
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Regime urbanístico: ${data.length} registros encontrados`);
      if (data.length > 0) {
        console.log('   Exemplo:', data[0].bairro, '-', data[0].zona);
      }
    } else {
      console.error('❌ Erro ao buscar regime:', response.status);
    }
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

async function testDocumentEmbeddings() {
  console.log('\n📄 Verificando embeddings de documentos...');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/document_embeddings?select=id,document_id,created_at&limit=5`, {
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY,
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Document embeddings: ${data.length} registros encontrados`);
    } else {
      console.error('❌ Erro ao buscar embeddings:', response.status);
    }
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

async function testEdgeFunctionDirect() {
  console.log('\n🚀 Testando Edge Function query-analyzer diretamente...');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/query-analyzer`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'teste simples',
        sessionId: 'test-123'
      })
    });
    
    console.log('   Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Query analyzer respondeu:', data);
    } else {
      const error = await response.text();
      console.error('❌ Erro:', error.substring(0, 200));
    }
  } catch (error) {
    console.error('❌ Erro ao chamar função:', error.message);
  }
}

async function main() {
  await testRegimeUrbanistico();
  await testDocumentEmbeddings();
  await testEdgeFunctionDirect();
  
  console.log('\n\n💡 CONCLUSÃO:');
  console.log('- Se os dados existem mas as Edge Functions falham, o problema está nas funções');
  console.log('- Se query-analyzer falha com "API key not configured", as secrets não estão configuradas nas Edge Functions');
}

main().catch(console.error);