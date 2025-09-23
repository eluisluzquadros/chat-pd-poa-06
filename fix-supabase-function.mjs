import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ngrqwmvuhvjkeohesbxs.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fixSupabaseFunction() {
  console.log('🔧 === RECRIANDO FUNÇÃO delete_chat_session_atomic ===\n');
  
  try {
    // Função SQL limpa e correta
    const functionSQL = `
CREATE OR REPLACE FUNCTION delete_chat_session_atomic(session_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY definer
AS $$
DECLARE
    result json;
    deleted_messages_count integer;
    deleted_session boolean := false;
BEGIN
    -- Verificar se a sessão existe
    IF NOT EXISTS (SELECT 1 FROM chat_sessions WHERE id = session_id) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Session not found',
            'session_id', session_id
        );
    END IF;

    -- Deletar mensagens primeiro (devido a foreign key)
    DELETE FROM chat_history WHERE session_id = delete_chat_session_atomic.session_id;
    GET DIAGNOSTICS deleted_messages_count = ROW_COUNT;

    -- Deletar a sessão
    DELETE FROM chat_sessions WHERE id = delete_chat_session_atomic.session_id;
    GET DIAGNOSTICS deleted_session = FOUND;

    -- Retornar resultado
    IF deleted_session THEN
        RETURN json_build_object(
            'success', true,
            'session_id', session_id,
            'deleted_messages', deleted_messages_count,
            'message', 'Session deleted successfully'
        );
    ELSE
        RETURN json_build_object(
            'success', false,
            'error', 'Failed to delete session',
            'session_id', session_id
        );
    END IF;

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'error_code', SQLSTATE,
        'session_id', session_id,
        'message', 'Failed to delete session due to database error'
    );
END;
$$;
`;

    console.log('🚀 Executando SQL para recriar função...');
    
    // Usar query SQL direta para recriar a função
    const { data, error } = await supabase.rpc('query', { 
      query: functionSQL 
    });
    
    if (error) {
      console.log('❌ Erro ao recriar função via RPC:', error);
      
      // Tentar abordagem alternativa: usando SQL editor
      console.log('\n🔄 Tentando executar SQL diretamente...');
      
      // Para debug: mostrar o SQL que deveria ser executado
      console.log('\n📋 SQL que deve ser executado no Supabase SQL Editor:');
      console.log('----------------------------------------------------');
      console.log(functionSQL);
      console.log('----------------------------------------------------');
      
      console.log('\n🚨 AÇÃO NECESSÁRIA:');
      console.log('1. Copie o SQL acima');
      console.log('2. Vá para o Supabase SQL Editor');
      console.log('3. Cole e execute o SQL');
      console.log('4. Teste a funcionalidade de deletar novamente');
      
    } else {
      console.log('✅ Função recriada com sucesso!');
      console.log('🧪 Resultado:', data);
    }
    
    // Testar a função nova
    console.log('\n🧪 Testando função corrigida...');
    
    // Criar uma sessão de teste para deletar
    const testSession = {
      id: crypto.randomUUID(),
      title: 'Teste de exclusão',
      user_id: 'd430b2b5-130a-4e02-a8aa-35ee4e8362d5'
    };
    
    console.log(`📝 Criando sessão de teste: ${testSession.id}`);
    
    const { error: createError } = await supabase
      .from('chat_sessions')
      .insert(testSession);
    
    if (createError) {
      console.log('❌ Erro ao criar sessão de teste:', createError);
    } else {
      console.log('✅ Sessão de teste criada');
      
      // Testar exclusão
      const { data: deleteResult, error: deleteError } = await supabase
        .rpc('delete_chat_session_atomic', { session_id: testSession.id });
      
      if (deleteError) {
        console.log('❌ Erro na função delete:', deleteError);
      } else {
        console.log('✅ Teste de exclusão funcionou!', deleteResult);
      }
    }
    
  } catch (error) {
    console.log('❌ Erro geral:', error);
  }
}

fixSupabaseFunction();