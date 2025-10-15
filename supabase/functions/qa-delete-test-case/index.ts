import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se é admin
    const { data: userRoles, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !userRoles) {
      console.log('Role check failed:', roleError);
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { id } = await req.json();

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Missing test case ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se há resultados de validação vinculados
    const { data: linkedResults, error: checkError } = await supabaseClient
      .from('qa_validation_results')
      .select('id')
      .eq('test_case_id', id)
      .limit(1);

    if (checkError) {
      console.error('Error checking linked results:', checkError);
    }

    // Se há resultados vinculados, fazer soft delete (desativar)
    if (linkedResults && linkedResults.length > 0) {
      console.log('🔄 Soft delete: Test case has linked validation results');
      
      const { data: deactivatedCase, error: softDeleteError } = await supabaseClient
        .from('qa_test_cases')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (softDeleteError) {
        console.error('Soft delete error:', softDeleteError);
        return new Response(
          JSON.stringify({ error: 'Failed to deactivate test case', details: softDeleteError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('✅ Test case deactivated (soft delete):', id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          deleted: false,
          deactivated: true,
          message: 'Test case has linked validation results and was deactivated instead of deleted',
          data: deactivatedCase
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Caso contrário, fazer hard delete
    const { error: deleteError } = await supabaseClient
      .from('qa_test_cases')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Hard delete error:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete test case', details: deleteError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Test case permanently deleted:', id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        deleted: true,
        message: 'Test case permanently deleted'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
