import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  interest: {
    id: string
    email: string
    full_name: string
    cpf?: string
    city?: string
    organization?: string
    organization_size?: string
    newsletter_opt_in?: boolean
  }
  password: string
  role: string
}

serve(async (req) => {
  // Handle CORS preflight requests
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
    const { interest, password, role } = requestData

    console.log('Creating user from interest:', interest.id)

    // Check if user already exists in auth system
    const { data: authUsersData, error: authCheckError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (authCheckError) {
      console.error('Error checking auth system:', authCheckError)
    } else {
      const existingAuthUser = authUsersData?.users?.find((user: any) => 
        user && typeof user === 'object' && 'email' in user && user.email === interest.email
      )
      if (existingAuthUser) {
        throw new Error('Este email já está registrado no sistema de autenticação')
      }
    }

    // Check if user already exists in user accounts
    const { data: existingUsers, error: checkError } = await supabaseAdmin
      .from('user_accounts')
      .select('email')
      .eq('email', interest.email)
      .limit(1)

    if (checkError) {
      console.error('Error checking existing user:', checkError)
    } else if (existingUsers && existingUsers.length > 0) {
      throw new Error('Este email já está registrado no sistema')
    }

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: interest.email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: interest.full_name,
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
        email: interest.email,
        full_name: interest.full_name,
        role: role,
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
        full_name: interest.full_name,
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

    // Update interest manifestation to mark as account created
    const { error: updateError } = await supabaseAdmin
      .from('interest_manifestations')
      .update({
        account_created: true,
        status: 'converted'
      })
      .eq('id', interest.id)

    if (updateError) {
      console.error('Error updating interest:', updateError)
      // Continue anyway - user was created successfully
    }

    console.log('User creation from interest complete!')

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
    console.error('Error creating user from interest:', error)
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
