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

    console.log('🚀 Creating user from interest:', {
      interestId: interest.id,
      email: interest.email,
      fullName: interest.full_name,
      timestamp: new Date().toISOString()
    })

    // Check if this interest manifestation has already been converted
    console.log('🔍 Checking if interest manifestation was already converted...')
    const { data: existingInterest, error: interestLookupError } = await supabaseAdmin
      .from('interest_manifestations')
      .select('account_created, status')
      .eq('id', interest.id)
      .single()

    if (interestLookupError) {
      console.error('❌ Error checking interest manifestation:', interestLookupError)
      throw new Error('Manifestação de interesse não encontrada')
    }

    console.log('📋 Interest manifestation status:', existingInterest)

    if (existingInterest?.account_created === true) {
      console.log('⚠️ Interest manifestation already converted:', interest.id)
      throw new Error('Esta manifestação de interesse já foi convertida em conta de usuário')
    }

    // Check if user already exists in auth system
    console.log('🔍 Checking if user exists in auth system...')
    const { data: authUsersData, error: authCheckError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (authCheckError) {
      console.error('❌ Error checking auth users:', authCheckError)
      throw new Error('Erro ao verificar usuários existentes')
    }

    console.log('📊 Total auth users found:', authUsersData?.users?.length || 0)
    const existingAuthUser = authUsersData?.users?.find((user: any) => 
      user && typeof user === 'object' && 'email' in user && user.email === interest.email
    )
    
    if (existingAuthUser) {
      console.log('⚠️ User already exists in auth:', interest.email)
      console.log('🔍 Checking if user exists in user_accounts...')
      
      // Check if user exists in user_accounts
      const { data: existingAccount, error: accountCheckError } = await supabaseAdmin
        .from('user_accounts')
        .select('id')
        .eq('email', interest.email)
        .single()
      
      if (accountCheckError && accountCheckError.code !== 'PGRST116') {
        console.error('❌ Error checking user_accounts:', accountCheckError)
      }
      
      if (existingAccount) {
        console.log('✅ User exists in user_accounts, complete account detected')
        throw new Error('Este email já está registrado no sistema de autenticação e tem conta de usuário')
      } else {
        console.log('⚠️ Orphaned auth user detected (exists in auth but not in user_accounts)')
        throw new Error('Este email já está registrado no sistema de autenticação mas não tem conta completa. Entre em contato com o suporte.')
      }
    }
    
    console.log('✅ User does not exist in auth, proceeding with creation')

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
