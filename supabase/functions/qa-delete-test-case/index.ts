import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteTestCaseRequest {
  id: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestData: DeleteTestCaseRequest = await req.json();
    console.log('Deleting test case:', requestData.id);

    // Validação básica
    if (!requestData.id) {
      throw new Error('ID do caso de teste é obrigatório');
    }

    // Verificar se o caso existe
    const { data: existingCase, error: fetchError } = await supabase
      .from('qa_test_cases')
      .select('id, question')
      .eq('id', requestData.id)
      .single();

    if (fetchError || !existingCase) {
      console.error('Test case not found:', fetchError);
      throw new Error('Caso de teste não encontrado');
    }

    console.log('Found test case to delete:', existingCase.question);

    // Deletar o caso de teste usando service role key (bypassa RLS)
    const { error } = await supabase
      .from('qa_test_cases')
      .delete()
      .eq('id', requestData.id);

    if (error) {
      console.error('Database error:', error);
      throw new Error(`Erro ao excluir caso de teste: ${error.message}`);
    }

    console.log('Test case deleted successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Caso de teste excluído com sucesso!',
        deletedId: requestData.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in qa-delete-test-case:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});