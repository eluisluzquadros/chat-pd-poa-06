import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create Supabase client with user's authentication
    const authHeader = req.headers.get('Authorization')!
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('❌ Authentication error:', authError)
      throw new Error('Não autenticado')
    }

    // Verify admin role
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    if (!roles) {
      console.error('❌ Access denied for user:', user.id)
      throw new Error('Acesso negado: apenas admins podem deletar runs')
    }

    // Get runId from request body
    const { runId } = await req.json()
    if (!runId) {
      throw new Error('runId é obrigatório')
    }

    console.log('🗑️  Deletando security run:', runId)

    // Delete test results first (foreign key constraint)
    const { error: resultsError } = await supabase
      .from('security_test_results')
      .delete()
      .eq('run_id', runId)

    if (resultsError) {
      console.error('❌ Erro ao deletar resultados:', resultsError)
      throw resultsError
    }

    console.log('✅ Resultados deletados')

    // Delete validation run
    const { error: runError } = await supabase
      .from('security_validation_runs')
      .delete()
      .eq('id', runId)

    if (runError) {
      console.error('❌ Erro ao deletar run:', runError)
      throw runError
    }

    console.log('✅ Run deletado com sucesso')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Validação deletada com sucesso',
        runId 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('❌ Erro geral:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
