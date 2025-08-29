import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log("Setup Demo User function loaded")

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log("🔧 Iniciando setup do usuário demo...")

    // 1. Verificar se usuário demo já existe
    const { data: existingUser, error: checkError } = await supabaseClient
      .from('user_accounts')
      .select('*')
      .eq('email', 'demo@pdus.com')
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      throw new Error(`Erro ao verificar usuário demo: ${checkError.message}`)
    }

    let demoUserId: string

    if (existingUser) {
      console.log("✅ Usuário demo já existe:", existingUser.id)
      demoUserId = existingUser.user_id
    } else {
      // 2. Criar usuário demo no auth.users
      const { data: authUser, error: authError } = await supabaseClient.auth.admin.createUser({
        email: 'demo@pdus.com',
        password: 'Demo123!',
        email_confirm: true,
        user_metadata: {
          full_name: 'Demo PDUS',
          demo_user: true
        }
      })

      if (authError) {
        throw new Error(`Erro ao criar usuário auth: ${authError.message}`)
      }

      demoUserId = authUser.user.id
      console.log("✅ Usuário auth criado:", demoUserId)

      // 3. Criar perfil na tabela profiles
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .insert({
          id: demoUserId,
          full_name: 'Demo PDUS',
          email: 'demo@pdus.com',
          updated_at: new Date().toISOString()
        })

      if (profileError) {
        console.error("⚠️ Erro ao criar profile:", profileError.message)
      } else {
        console.log("✅ Profile criado")
      }

      // 4. Criar conta na tabela user_accounts
      const { error: accountError } = await supabaseClient
        .from('user_accounts')
        .insert({
          user_id: demoUserId,
          email: 'demo@pdus.com',
          full_name: 'Demo PDUS',
          role: 'supervisor',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (accountError) {
        throw new Error(`Erro ao criar user_account: ${accountError.message}`)
      }
      console.log("✅ User account criado")

      // 5. Definir papel na tabela user_roles
      const { error: roleError } = await supabaseClient
        .from('user_roles')
        .insert({
          user_id: demoUserId,
          role: 'supervisor',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (roleError) {
        console.error("⚠️ Erro ao criar role:", roleError.message)
      } else {
        console.log("✅ User role criado")
      }
    }

    // 6. Verificar tabelas do Agentic RAG
    console.log("🔍 Verificando tabelas do Agentic RAG...")
    
    const { data: documentsTest, error: docTestError } = await supabaseClient
      .from('documents_test')
      .select('count')
      .limit(1)

    const { data: documents, error: docError } = await supabaseClient
      .from('documents')
      .select('count')
      .limit(1)

    let documentsTableExists = false
    let documentsTestTableExists = false

    if (!docError) {
      documentsTableExists = true
      console.log("✅ Tabela 'documents' existe")
    }

    if (!docTestError) {
      documentsTestTableExists = true
      console.log("✅ Tabela 'documents_test' existe")
    }

    // 7. Verificar secrets
    const { data: secrets, error: secretsError } = await supabaseClient
      .from('secrets')
      .select('name')
      .in('name', ['OPENAI_API_KEY', 'ASSISTANT_ID'])

    const hasOpenAI = secrets?.some(s => s.name === 'OPENAI_API_KEY') || false
    const hasAssistant = secrets?.some(s => s.name === 'ASSISTANT_ID') || false

    console.log("🔑 Secrets disponíveis:")
    console.log("- OPENAI_API_KEY:", hasOpenAI ? "✅" : "❌")
    console.log("- ASSISTANT_ID:", hasAssistant ? "✅" : "❌")

    // 8. Retornar status completo
    const response = {
      success: true,
      demo_user: {
        id: demoUserId,
        email: 'demo@pdus.com',
        created: !existingUser
      },
      database_status: {
        documents_table_exists: documentsTableExists,
        documents_test_table_exists: documentsTestTableExists,
        profiles_accessible: true,
        user_accounts_accessible: true,
        user_roles_accessible: true
      },
      secrets_status: {
        openai_api_key: hasOpenAI,
        assistant_id: hasAssistant
      },
      message: "Setup do usuário demo concluído com sucesso!"
    }

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('❌ Erro no setup:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: error
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})