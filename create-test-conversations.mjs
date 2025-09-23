import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ngrqwmvuhvjkeohesbxs.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function createTestConversations() {
  console.log('=== CRIANDO CONVERSAS DE TESTE ===\n');
  
  // ID do usuário admin que vimos nos logs
  const userId = 'd430b2b5-130a-4e02-a8aa-35ee4e8362d5';
  
  const testSessions = [
    {
      title: 'Teste de Conversa 1 - Altura de edificação',
      last_message: 'Qual a altura máxima permitida no centro?',
      user_id: userId
    },
    {
      title: 'Teste de Conversa 2 - Zoneamento',
      last_message: 'Como funciona o zoneamento urbano?',
      user_id: userId
    },
    {
      title: 'Teste de Conversa 3 - Riscos',
      last_message: 'Quais bairros têm risco de inundação?',
      user_id: userId
    }
  ];
  
  try {
    // Criar as sessões de teste
    console.log('Criando sessões de teste...');
    const { data: sessions, error: sessionsError } = await supabase
      .from('chat_sessions')
      .insert(testSessions)
      .select();
    
    if (sessionsError) {
      console.log('❌ Erro ao criar sessões:', sessionsError);
      return;
    }
    
    console.log('✅ Sessões criadas:', sessions.length);
    
    // Criar algumas mensagens para cada sessão
    console.log('\nCriando mensagens de teste...');
    
    for (const session of sessions) {
      const testMessages = [
        {
          session_id: session.id,
          user_id: userId,
          message: session.last_message,
          created_at: new Date().toISOString()
        },
        {
          session_id: session.id,
          user_id: userId,
          message: `Resposta para: ${session.last_message}`,
          created_at: new Date().toISOString()
        }
      ];
      
      const { error: messagesError } = await supabase
        .from('chat_history')
        .insert(testMessages);
      
      if (messagesError) {
        console.log(`❌ Erro ao criar mensagens para sessão ${session.id}:`, messagesError);
      } else {
        console.log(`✅ Mensagens criadas para: ${session.title}`);
      }
    }
    
    console.log('\n=== RESUMO ===');
    console.log('✅ Conversas de teste criadas com sucesso!');
    console.log('🔍 Agora você pode testar a funcionalidade de deletar conversas');
    console.log('📱 Vá para o chat e veja as conversas na sidebar');
    console.log('🗑️ Tente deletar algumas conversas para testar a funcionalidade');
    
    // Verificar resultado final
    const { data: finalSessions, error: finalError } = await supabase
      .from('chat_sessions')
      .select('id, title, created_at')
      .eq('user_id', userId);
    
    if (!finalError && finalSessions) {
      console.log(`\n📊 Total de conversas agora: ${finalSessions.length}`);
      finalSessions.forEach((session, index) => {
        console.log(`  ${index + 1}. ${session.title} (${session.id})`);
      });
    }
    
  } catch (error) {
    console.log('❌ Erro geral:', error);
  }
}

createTestConversations();