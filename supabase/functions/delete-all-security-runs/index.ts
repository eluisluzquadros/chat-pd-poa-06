import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Cliente para autenticação do usuário
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Autorização necessária');
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ Authentication error:', authError);
      throw new Error('Usuário não autenticado');
    }

    console.log('✅ User authenticated:', user.id);

    // Verificar se usuário é admin usando service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || userRole?.role !== 'admin') {
      console.error('❌ Authorization failed - not admin');
      throw new Error('Acesso negado. Apenas administradores podem limpar o histórico.');
    }

    console.log('✅ Admin verified, proceeding with deletion...');

    // Deletar TODOS os resultados de teste (primeiro, por causa da FK)
    const { error: resultsError, count: resultsCount } = await supabaseAdmin
      .from('security_test_results')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Deletar tudo

    if (resultsError) {
      console.error('❌ Error deleting test results:', resultsError);
      throw new Error(`Erro ao deletar resultados: ${resultsError.message}`);
    }

    console.log(`✅ Deleted ${resultsCount || 0} test results`);

    // Deletar TODAS as runs
    const { error: runsError, count: runsCount } = await supabaseAdmin
      .from('security_validation_runs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Deletar tudo

    if (runsError) {
      console.error('❌ Error deleting runs:', runsError);
      throw new Error(`Erro ao deletar runs: ${runsError.message}`);
    }

    console.log(`✅ Deleted ${runsCount || 0} validation runs`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Todo o histórico foi limpo com sucesso',
        deleted: {
          testResults: resultsCount || 0,
          validationRuns: runsCount || 0,
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Error in delete-all-security-runs:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
