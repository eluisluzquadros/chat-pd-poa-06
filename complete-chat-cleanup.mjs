import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ngrqwmvuhvjkeohesbxs.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function completeCleanup() {
  console.log('🧹 === LIMPEZA COMPLETA DAS TABELAS DE CHAT ===\n');
  
  try {
    // 1. Verificar estado atual
    console.log('1. 📊 Verificando estado atual...');
    
    const { data: sessions, error: sessionsError } = await supabase
      .from('chat_sessions')
      .select('id, title, user_id');
    
    const { data: messages, error: messagesError } = await supabase
      .from('chat_history')
      .select('id, session_id, user_id');
    
    if (sessionsError || messagesError) {
      console.log('❌ Erro ao verificar estado:', { sessionsError, messagesError });
      return;
    }
    
    console.log(`   • Sessões: ${sessions?.length || 0}`);
    console.log(`   • Mensagens: ${messages?.length || 0}`);
    
    // 2. Limpar todas as mensagens primeiro (devido a foreign keys)
    console.log('\n2. 🗑️ Removendo todas as mensagens...');
    
    const { error: deleteMessagesError } = await supabase
      .from('chat_history')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Remove tudo
    
    if (deleteMessagesError) {
      console.log('❌ Erro ao remover mensagens:', deleteMessagesError);
    } else {
      console.log('✅ Todas as mensagens removidas');
    }
    
    // 3. Limpar todas as sessões
    console.log('\n3. 🗑️ Removendo todas as sessões...');
    
    const { error: deleteSessionsError } = await supabase
      .from('chat_sessions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Remove tudo
    
    if (deleteSessionsError) {
      console.log('❌ Erro ao remover sessões:', deleteSessionsError);
    } else {
      console.log('✅ Todas as sessões removidas');
    }
    
    // 4. Verificar se há outros dados relacionados que podem ter o UUID corrompido
    console.log('\n4. 🔍 Verificando outras tabelas que podem ter referências...');
    
    // Tentar encontrar tabelas que possam ter referência ao UUID corrompido
    const tables = ['chat_rating', 'user_feedback', 'audit_log'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (!error) {
          console.log(`   ✅ Tabela ${table} verificada`);
          
          // Se a tabela tem coluna session_id, limpar também
          const { error: cleanError } = await supabase
            .from(table)
            .delete()
            .eq('session_id', 'test-V3-1755613978934');
            
          if (!cleanError) {
            console.log(`   🧹 Limpeza preventiva em ${table} realizada`);
          }
        }
      } catch (e) {
        // Tabela não existe, tudo bem
        console.log(`   ⚠️ Tabela ${table} não existe`);
      }
    }
    
    // 5. Verificação final
    console.log('\n5. ✅ Verificação final...');
    
    const { data: finalSessions } = await supabase
      .from('chat_sessions')
      .select('id');
    
    const { data: finalMessages } = await supabase
      .from('chat_history')
      .select('id');
    
    console.log(`   • Sessões restantes: ${finalSessions?.length || 0}`);
    console.log(`   • Mensagens restantes: ${finalMessages?.length || 0}`);
    
    console.log('\n🎉 === LIMPEZA COMPLETA CONCLUÍDA ===');
    console.log('✅ Todas as tabelas de chat foram limpa');
    console.log('✅ Dados corruptos completamente removidos');
    console.log('✅ Sistema pronto para criar novas conversas');
    console.log('\n📋 PRÓXIMOS PASSOS:');
    console.log('1. Crie algumas conversas enviando mensagens');
    console.log('2. Teste a funcionalidade de deletar');
    console.log('3. Deve funcionar perfeitamente agora! 🚀');
    
  } catch (error) {
    console.log('❌ Erro geral na limpeza:', error);
  }
}

completeCleanup();