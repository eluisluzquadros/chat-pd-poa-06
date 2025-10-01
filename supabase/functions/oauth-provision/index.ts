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
    console.log('🔐 OAuth Provision - Initializing...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('❌ Missing environment variables');
      throw new Error('Missing Supabase configuration');
    }
    
    console.log('✅ Supabase config OK, creating client...');
    
    const supabaseClient = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('✅ Client created, parsing request body...');
    const { email, userId, fullName } = await req.json();

    console.log('🔐 OAuth Provision Request:', { 
      email, 
      userId, 
      fullName,
      requestMethod: req.method,
      requestHeaders: Object.fromEntries(req.headers.entries())
    });

    // Verificar se já existe
    console.log('🔍 Checking if account already exists...');
    const { data: existingAccount, error: checkError } = await supabaseClient
      .from('user_accounts')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (checkError) {
      console.error('❌ Error checking existing account:', checkError);
      console.error('❌ Error details:', {
        message: checkError.message,
        code: checkError.code,
        details: checkError.details,
        hint: checkError.hint
      });
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
    
    console.log('ℹ️ Account does not exist, proceeding with creation...');

    // Criar nova conta usando service role (bypassa RLS)
    console.log('🚀 Creating new account with data:', {
      user_id: userId,
      email: email,
      full_name: fullName || email.split('@')[0],
      auth_provider: 'google',
      email_verified: true
    });
    
    const { data: newAccount, error: insertError } = await supabaseClient
      .from('user_accounts')
      .insert({
        user_id: userId,
        email: email,
        full_name: fullName || email.split('@')[0],
        auth_provider: 'google',
        is_active: true,
        email_verified: true
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error creating account:', insertError);
      console.error('❌ Insert error details:', {
        message: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint
      });
      throw insertError;
    }

    console.log('✅ Account created successfully!');
    console.log('✅ New account:', newAccount);

    // Criar role padrão de 'user'
    console.log('🔐 Creating default user role...');
    const { error: roleError } = await supabaseClient
      .from('user_roles')
      .insert({
        user_id: userId,
        role: 'user'
      });

    if (roleError) {
      console.error('⚠️ Error creating default role:', roleError);
      console.error('⚠️ Role error details:', {
        message: roleError.message,
        code: roleError.code
      });
      // Não falhar se a role já existe
      if (!roleError.message?.includes('duplicate key')) {
        console.error('⚠️ Unexpected role creation error, but continuing...');
      }
    } else {
      console.log('✅ Default role created successfully');
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
