import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId é obrigatório' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Atualizar role na tabela user_roles
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .upsert({ 
        user_id: userId, 
        role: 'admin',
        updated_at: new Date().toISOString()
      })
      .select();

    if (roleError) {
      throw roleError;
    }

    // Atualizar role na tabela user_accounts se existir
    const { error: accountError } = await supabaseAdmin
      .from('user_accounts')
      .update({ 
        role: 'admin',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    // Não falhar se a conta não existir ainda
    if (accountError && !accountError.message.includes('No rows found')) {
      console.warn('Aviso ao atualizar user_accounts:', accountError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Usuário promovido a admin com sucesso',
        data: roleData 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro ao criar admin:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});