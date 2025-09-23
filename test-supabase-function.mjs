import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ngrqwmvuhvjkeohesbxs.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testDeleteFunction() {
  console.log('=== TESTE DA FUNÇÃO DELETE_CHAT_SESSION_ATOMIC ===\n');
  
  try {
    // 1. Primeiro testar se conseguimos conectar ao Supabase
    console.log('1. Testando conexão com Supabase...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('chat_sessions')
      .select('count')
      .limit(1);
    
    if (connectionError) {
      console.log('❌ Erro de conexão:', connectionError);
      return;
    }
    console.log('✅ Conexão OK');
    
    // 2. Testar se a função RPC existe
    console.log('\n2. Testando função delete_chat_session_atomic...');
    
    // Usar UUID de teste que certamente não existe
    const testUuid = '00000000-0000-0000-0000-000000000000';
    
    const { data: result, error } = await supabase
      .rpc('delete_chat_session_atomic', {
        session_id_param: testUuid
      });
    
    if (error) {
      console.log('❌ Erro RPC:', error);
      
      // Verificar se é erro de função não existente
      if (error.code === '42883' || error.message.includes('function') || error.message.includes('does not exist')) {
        console.log('\n🚨 PROBLEMA IDENTIFICADO: A função delete_chat_session_atomic NÃO EXISTE no banco!');
        console.log('\n📋 SOLUÇÃO NECESSÁRIA:');
        console.log('- Aplicar a migration: supabase/migrations/20250909201423_f23cc4de-48bb-4789-b250-e9833f2dbd32.sql');
        console.log('- Ou executar manualmente no SQL Editor do Supabase');
      } else {
        console.log('\n🔍 Erro diferente - função pode existir mas ter outro problema');
      }
    } else {
      console.log('✅ Função respondeu:', result);
      
      // Se retornou resultado, a função existe
      if (result && result.success === false && result.error === 'Session not found') {
        console.log('\n✅ FUNÇÃO EXISTE E FUNCIONA! O erro "Session not found" é esperado para UUID inexistente');
      } else {
        console.log('\n🔍 Resposta inesperada, verificar implementação');
      }
    }
    
    // 3. Listar algumas sessões para contexto
    console.log('\n3. Listando sessões existentes...');
    const { data: sessions, error: sessionsError } = await supabase
      .from('chat_sessions')
      .select('id, title, created_at, user_id')
      .limit(3);
    
    if (sessionsError) {
      console.log('❌ Erro ao listar sessões:', sessionsError);
    } else {
      console.log('✅ Sessões encontradas:', sessions?.length || 0);
      sessions?.forEach((session, index) => {
        console.log(`  ${index + 1}. ${session.id} - ${session.title || 'Sem título'}`);
      });
    }
    
  } catch (error) {
    console.log('❌ Erro geral:', error);
  }
}

testDeleteFunction();