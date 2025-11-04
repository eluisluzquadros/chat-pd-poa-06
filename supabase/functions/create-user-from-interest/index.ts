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
    const { role } = requestData
    const interest = {
      ...requestData.interest,
      email: requestData.interest.email.toLowerCase().trim()
    }
    const password = generateSecurePassword()
    console.log('🔐 Generated secure password for user')

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
      user && typeof user === 'object' && 'email' in user && user.email?.toLowerCase() === interest.email
    )

    if (existingAuthUser) {
      console.log('⚠️ User already exists in auth:', interest.email)
      console.log('🔄 Reusing existing auth user instead of deleting...')
      
      // FASE 3: Reutilizar auth.users existente
      // Check if user exists in user_accounts
      const { data: existingAccount, error: accountCheckError } = await supabaseAdmin
        .from('user_accounts')
        .select('id, user_id')
        .eq('email', interest.email)
        .maybeSingle()

      if (accountCheckError) {
        console.error('❌ Error checking user_accounts:', accountCheckError)
        throw new Error('Erro ao verificar conta de usuário existente')
      }

      if (existingAccount) {
        console.log('✅ User exists in user_accounts, checking completeness...')
        
        // Check profile
        const { data: existingProfile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('id', existingAccount.user_id)
          .maybeSingle()
        
        // Check role
        const { data: existingRole } = await supabaseAdmin
          .from('user_roles')
          .select('role')
          .eq('user_id', existingAccount.user_id)
          .maybeSingle()

        // Complete missing parts
        if (!existingProfile) {
          console.log('➕ Adding missing profile...')
          await supabaseAdmin.from('profiles').insert({
            id: existingAccount.user_id,
            full_name: interest.full_name,
          })
        }

        if (!existingRole) {
          console.log('➕ Adding missing role...')
          await supabaseAdmin.from('user_roles').insert({ 
            user_id: existingAccount.user_id, 
            role: role as any 
          })
        }

        // Update interest manifestation
        await supabaseAdmin
          .from('interest_manifestations')
          .update({ account_created: true, status: 'converted' })
          .eq('id', interest.id)

        console.log('✅ Account verified/completed successfully')
        return new Response(
          JSON.stringify({ 
            success: true, 
            user_id: existingAccount.user_id,
            message: 'Conta já existente foi verificada e completada'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        )
      } else {
        console.log('⚠️ Orphaned auth user detected, completing registration...')
        
        // Create complete account using existing auth user
        const authUserId = existingAuthUser.id
        
        // Create user account
        const { error: accountError } = await supabaseAdmin
          .from('user_accounts')
          .insert({
            user_id: authUserId,
            email: interest.email,
            full_name: interest.full_name,
            is_active: true
          })

        if (accountError) {
          console.error('❌ Error creating account:', accountError)
          throw accountError
        }

        console.log('✅ User account created')

        // Create profile
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: authUserId,
            full_name: interest.full_name,
          })

        if (profileError) {
          console.error('⚠️ Error creating profile:', profileError)
          // Continue anyway
        }

        // Set user role
        const { error: userRoleError } = await supabaseAdmin
          .from('user_roles')
          .insert({
            user_id: authUserId,
            role: role as any
          })

        if (userRoleError) {
          console.error('❌ Error setting role:', userRoleError)
          throw userRoleError
        }

        console.log('✅ User role set')

        // Update interest manifestation
        await supabaseAdmin
          .from('interest_manifestations')
          .update({ account_created: true, status: 'converted' })
          .eq('id', interest.id)

        console.log('✅ Orphaned auth user completed successfully')
        
        // Send welcome email
        try {
          await supabaseAdmin.functions.invoke('send-welcome-email', {
            body: {
              email: interest.email,
              fullName: interest.full_name,
              password: '(senha já configurada)'
            }
          })
          console.log('✅ Welcome email sent')
        } catch (emailError) {
          console.error('⚠️ Email error:', emailError)
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            user_id: authUserId,
            message: 'Usuário órfão foi completado com sucesso'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        )
      }
    } else {
      console.log('✅ User does not exist in auth, proceeding with creation')
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

    // Send welcome email with credentials
    console.log('📧 Sending welcome email with credentials...')
    try {
      const { data: emailData, error: emailError } = await supabaseAdmin.functions.invoke('send-welcome-email', {
        body: {
          email: interest.email,
          fullName: interest.full_name,
          password: password
        }
      })
      
      if (emailError) {
        console.error('⚠️ Error sending welcome email:', emailError)
      } else {
        console.log('✅ Welcome email sent successfully')
      }
    } catch (emailError) {
      console.error('⚠️ Exception sending welcome email:', emailError)
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
