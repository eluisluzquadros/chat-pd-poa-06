import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ngrqwmvuhvjkeohesbxs.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function investigateRealData() {
  console.log('🔍 === INVESTIGAÇÃO REAL DOS DADOS ===\n');
  
  try {
    // 1. Contar dados reais
    console.log('1. 📊 Contando dados REAIS...');
    
    const { count: sessionsCount, error: sessionsCountError } = await supabase
      .from('chat_sessions')
      .select('*', { count: 'exact', head: true });
    
    const { count: messagesCount, error: messagesCountError } = await supabase
      .from('chat_history')
      .select('*', { count: 'exact', head: true });
    
    console.log(`   💾 Sessões REAIS: ${sessionsCount || 'erro'}`);
    console.log(`   💾 Mensagens REAIS: ${messagesCount || 'erro'}`);
    
    if (sessionsCountError) console.log('   ❌ Erro ao contar sessões:', sessionsCountError);
    if (messagesCountError) console.log('   ❌ Erro ao contar mensagens:', messagesCountError);
    
    // 2. Buscar algumas sessões específicas
    console.log('\n2. 🔍 Buscando amostras de sessões...');
    
    const { data: sampleSessions, error: sampleError } = await supabase
      .from('chat_sessions')
      .select('id, title, user_id, created_at')
      .limit(5);
    
    if (sampleError) {
      console.log('   ❌ Erro ao buscar amostras:', sampleError);
    } else {
      console.log(`   📋 Amostras de sessões (${sampleSessions?.length || 0}):`);
      sampleSessions?.forEach((session, i) => {
        console.log(`     ${i+1}. ${session.id} - "${session.title || 'Sem título'}" (${session.user_id})`);
      });
    }
    
    // 3. Procurar o UUID corrompido específico
    console.log('\n3. 🚨 Procurando UUID corrompido "test-V3-1755613978934"...');
    
    // Tentar encontrar em chat_sessions
    const { data: corruptedSessions, error: corruptedSessionsError } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', 'test-V3-1755613978934');
    
    console.log(`   🔍 Sessões com UUID corrompido: ${corruptedSessions?.length || 0}`);
    if (corruptedSessionsError) {
      console.log('   ⚠️ Erro ao buscar sessão corrompida:', corruptedSessionsError);
    }
    
    // Tentar encontrar em chat_history
    const { data: corruptedMessages, error: corruptedMessagesError } = await supabase
      .from('chat_history')
      .select('*')
      .eq('session_id', 'test-V3-1755613978934');
    
    console.log(`   🔍 Mensagens com session_id corrompido: ${corruptedMessages?.length || 0}`);
    if (corruptedMessagesError) {
      console.log('   ⚠️ Erro ao buscar mensagens corrompidas:', corruptedMessagesError);
    }
    
    // 4. Tentar entender por que a função delete_chat_session_atomic falha
    console.log('\n4. 🔬 Testando function delete_chat_session_atomic diretamente...');
    
    // Pegar um ID de sessão válido para testar
    if (sampleSessions && sampleSessions.length > 0) {
      const testSessionId = sampleSessions[0].id;
      console.log(`   🧪 Testando exclusão da sessão: ${testSessionId}`);
      
      const { data: deleteResult, error: deleteError } = await supabase
        .rpc('delete_chat_session_atomic', { session_id: testSessionId });
      
      if (deleteError) {
        console.log('   ❌ Erro na função delete:', deleteError);
      } else {
        console.log('   ✅ Resultado da função delete:', deleteResult);
      }
    }
    
    console.log('\n📊 === RESUMO DA INVESTIGAÇÃO ===');
    console.log(`📈 Total de sessões: ${sessionsCount || '?'}`);
    console.log(`📈 Total de mensagens: ${messagesCount || '?'}`);
    console.log('💡 Agora sabemos o estado REAL dos dados!');
    
  } catch (error) {
    console.log('❌ Erro geral na investigação:', error);
  }
}

investigateRealData();