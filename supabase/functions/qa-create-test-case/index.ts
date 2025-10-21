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

    // Gerar test_id único
    const test_id = `TC-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    // Usar question como query
    const query_text = question;

    // Garantir expected_keywords como array
    const keywords = Array.isArray(expected_keywords) ? expected_keywords : [];

    // Validar campos obrigatórios
    if (!question || !expected_answer || !category) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: question, expected_answer, category' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Inserir novo caso de teste
    const { data: newTestCase, error: insertError } = await supabaseClient
      .from('qa_test_cases')
      .insert({
        test_id,
        query: query_text,
        question,
        expected_answer,
        category,
        difficulty: difficulty || 'medium',
        complexity: difficulty || 'medium',
        tags: tags || [],
        is_active: is_active !== undefined ? is_active : true,
        is_sql_related: is_sql_related || false,
        expected_sql: expected_sql || null,
        sql_complexity: sql_complexity || null,
        expected_keywords: keywords,
        min_response_length: min_response_length || null,
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create test case', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Test case created:', newTestCase.id);

    return new Response(
      JSON.stringify({ success: true, data: newTestCase }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
