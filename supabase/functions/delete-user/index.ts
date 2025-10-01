import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      console.error('Authentication error:', authError)
      throw new Error('Não autenticado')
    }

    console.log('Authenticated user:', user.id, user.email)

    // Verificar se é admin
    const { data: userRoles, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleError || !userRoles || userRoles.role !== 'admin') {
      console.error('Role check failed:', roleError, userRoles)
      throw new Error('Acesso negado - apenas administradores podem excluir usuários')
    }

    console.log('User is admin, proceeding with deletion')

    const { userId } = await req.json()

    if (!userId) {
      throw new Error('ID do usuário não fornecido')
    }

    console.log('Deleting user:', userId)

    // 1. Buscar user_account para obter o auth user_id
    const { data: userAccount, error: accountError } = await supabaseAdmin
      .from('user_accounts')
      .select('user_id')
      .eq('id', userId)
      .single()

    if (accountError) {
      console.error('Error fetching user account:', accountError)
      throw new Error('Usuário não encontrado')
    }

    console.log('Found user account:', userAccount)

    // 2. Deletar da tabela user_accounts (isso vai cascatear para user_roles)
    const { error: deleteAccountError } = await supabaseAdmin
      .from('user_accounts')
      .delete()
      .eq('id', userId)

    if (deleteAccountError) {
      console.error('Error deleting user account:', deleteAccountError)
      throw new Error('Erro ao excluir conta do usuário')
    }

    console.log('Deleted user account')

    // 3. Deletar do auth se houver user_id
    if (userAccount.user_id) {
      console.log('Deleting auth user:', userAccount.user_id)
      const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(
        userAccount.user_id
      )

      if (deleteAuthError) {
        console.error('Error deleting auth user:', deleteAuthError)
        // Não vamos falhar aqui, pois a conta já foi deletada
        console.warn('Auth user deletion failed but continuing')
      } else {
        console.log('Successfully deleted auth user')
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Usuário excluído com sucesso' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error: any) {
    console.error('Error in delete-user function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
