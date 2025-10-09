import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  fullName: string
  email: string
  role: string
}

function generateSecurePassword(): string {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  const crypto = globalThis.crypto;
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    password += charset[array[i] % charset.length];
  }
  return password;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
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
    )

    const requestData: RequestBody = await req.json()
    const { fullName, role } = requestData
    const email = requestData.email.toLowerCase().trim() // Normalize email
    const password = generateSecurePassword() // Generate secure random password
    console.log('🔐 Generated secure password for user')

    console.log('Creating new user:', email)

    // Check if user already exists in auth system
    const { data: authUsersData, error: authCheckError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (authCheckError) {
      console.error('Error checking auth system:', authCheckError)
    } else {
      const existingAuthUser = authUsersData?.users?.find((user: any) => 
        user && typeof user === 'object' && 'email' in user && user.email?.toLowerCase() === email
      )
      if (existingAuthUser) {
        console.log('Found existing auth user, checking if orphaned...')
        // Check if this is an orphaned user (exists in auth but not in user_accounts)
        const { data: existingAccount } = await supabaseAdmin
          .from('user_accounts')
          .select('id')
          .eq('email', email)
          .maybeSingle()
        
        if (!existingAccount) {
          console.log('Orphaned auth user detected, cleaning up...')
          // Delete the orphaned auth user
          const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(existingAuthUser.id)
          if (deleteError) {
            console.error('Error deleting orphaned user:', deleteError)
            throw new Error('Erro ao limpar usuário órfão do sistema')
          }
          console.log('Orphaned user cleaned up, proceeding with creation')
        } else {
          throw new Error('Este email já está registrado no sistema de autenticação')
        }
      }
    }

    // Check if user already exists in user accounts
    const { data: existingUsers, error: checkError } = await supabaseAdmin
      .from('user_accounts')
      .select('email')
      .eq('email', email)
      .limit(1)

    if (checkError) {
      console.error('Error checking existing user:', checkError)
    } else if (existingUsers && existingUsers.length > 0) {
      throw new Error('Este email já está registrado no sistema')
    }

    // Check if user already exists in interest manifestations
    const { data: existingInterests, error: interestCheckError } = await supabaseAdmin
      .from('interest_manifestations')
      .select('email')
      .eq('email', email)
      .limit(1)
      
    if (interestCheckError) {
      console.error('Error checking existing interest:', interestCheckError)
    } else if (existingInterests && existingInterests.length > 0) {
      throw new Error('Este email já possui uma manifestação de interesse registrada')
    }

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      }
    })

    if (authError) {
      console.error('Auth error:', authError)
      throw authError
    }

    if (!authData?.user) {
      throw new Error('Falha ao criar usuário de autenticação')
    }

    console.log('Auth user created, ID:', authData.user.id)

    // Create user account with the auth user's ID
    const { error: accountError } = await supabaseAdmin
      .from('user_accounts')
      .insert({
        user_id: authData.user.id,
        email: email,
        full_name: fullName,
        is_active: true
      })

    if (accountError) {
      console.error('Error creating account:', accountError)
      throw accountError
    }

    console.log('User account created')

    // Create profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        full_name: fullName,
      })

    if (profileError) {
      console.error('Error creating profile:', profileError)
      // Continue anyway - profile might be created by trigger
    }

    // Set user role
    const { error: userRoleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: role as any
      })

    if (userRoleError) {
      console.error('Error setting role:', userRoleError)
      throw userRoleError
    }

    console.log('User role set')
    console.log('User creation complete!')

    // Send welcome email with credentials
    console.log('📧 Sending welcome email with credentials...')
    try {
      const { data: emailData, error: emailError } = await supabaseAdmin.functions.invoke('send-welcome-email', {
        body: {
          email: email,
          fullName: fullName,
          password: password
        }
      })
      
      if (emailError) {
        console.error('⚠️ Error sending welcome email:', emailError)
        // Don't throw - user was created successfully, just log the email error
      } else {
        console.log('✅ Welcome email sent successfully')
      }
    } catch (emailError) {
      console.error('⚠️ Exception sending welcome email:', emailError)
      // Don't throw - user was created successfully
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user_id: authData.user.id,
        message: 'Usuário criado com sucesso'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error: any) {
    console.error('Error creating user:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro desconhecido ao criar usuário',
        details: error
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
