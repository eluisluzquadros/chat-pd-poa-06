import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { email, userId, fullName } = await req.json();

    console.log('🔐 OAuth Provision Request:', { email, userId, fullName });

    // Verificar se já existe
    const { data: existingAccount, error: checkError } = await supabaseClient
      .from('user_accounts')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (checkError) {
      console.error('❌ Error checking existing account:', checkError);
      throw checkError;
    }

    if (existingAccount) {
      console.log('✅ Account already exists:', existingAccount.email);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Account already exists',
          account: existingAccount 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar nova conta usando service role (bypassa RLS)
    const { data: newAccount, error: insertError } = await supabaseClient
      .from('user_accounts')
      .insert({
        user_id: userId,
        email: email,
        full_name: fullName || email.split('@')[0],
        auth_provider: 'google',
        status: 'active',
        email_verified: true
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error creating account:', insertError);
      throw insertError;
    }

    console.log('✅ Account created successfully:', newAccount);

    // Criar role padrão de 'user'
    const { error: roleError } = await supabaseClient
      .from('user_roles')
      .insert({
        user_id: userId,
        role: 'user'
      });

    if (roleError) {
      console.error('⚠️ Error creating default role:', roleError);
      // Não falhar se a role já existe
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Account provisioned successfully',
        account: newAccount 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ OAuth Provision Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
