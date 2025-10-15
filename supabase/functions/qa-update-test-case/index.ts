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

    const {
      id,
      question,
      expected_answer,
      category,
      difficulty,
      tags,
      is_active,
      is_sql_related,
      expected_sql,
      sql_complexity,
      expected_keywords,
      min_response_length
    } = await req.json();

    // Validar ID
    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Missing test case ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar versão atual
    const { data: currentCase, error: fetchError } = await supabaseClient
      .from('qa_test_cases')
      .select('version')
      .eq('id', id)
      .single();

    if (fetchError || !currentCase) {
      return new Response(
        JSON.stringify({ error: 'Test case not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Preparar dados de atualização
    const updateData: any = {
      updated_at: new Date().toISOString(),
      version: (currentCase.version || 1) + 1
    };

    if (question !== undefined) updateData.question = question;
    if (expected_answer !== undefined) updateData.expected_answer = expected_answer;
    if (category !== undefined) updateData.category = category;
    if (difficulty !== undefined) updateData.difficulty = difficulty;
    if (tags !== undefined) updateData.tags = tags;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (is_sql_related !== undefined) updateData.is_sql_related = is_sql_related;
    if (expected_sql !== undefined) updateData.expected_sql = expected_sql;
    if (sql_complexity !== undefined) updateData.sql_complexity = sql_complexity;
    if (expected_keywords !== undefined) updateData.expected_keywords = expected_keywords;
    if (min_response_length !== undefined) updateData.min_response_length = min_response_length;

    // Atualizar caso de teste
    const { data: updatedTestCase, error: updateError } = await supabaseClient
      .from('qa_test_cases')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update test case', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Test case updated:', id, 'New version:', updateData.version);

    return new Response(
      JSON.stringify({ success: true, data: updatedTestCase }),
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
