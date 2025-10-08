import { serve } from 'https://deno.land/std@0.131.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0'

interface RequestBody {
  userId: string
  role: string
}

serve(async (req) => {
  try {
    // Create a Supabase client with the Admin key
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

    // SECURITY: Verify that the requesting user is an admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado - Token ausente' }),
        { headers: { 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado - Token inválido' }),
        { headers: { 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Check if requesting user is admin
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()

    if (roleError || !userRole || userRole.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Acesso negado - Apenas administradores' }),
        { headers: { 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    // Parse request body
    const requestData: RequestBody = await req.json()
    const { userId, role } = requestData

    if (!userId || !role) {
      return new Response(
        JSON.stringify({ error: 'userId and role are required' }),
        { headers: { 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // First check if the user already has a role
    const { data: existingRole, error: selectError } = await supabaseAdmin
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (selectError) {
      console.error('Error checking existing role:', selectError)
      return new Response(
        JSON.stringify({ error: 'Failed to check existing role' }),
        { headers: { 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    let result;
    
    // If user already has a role, update it
    if (existingRole) {
      const { data, error } = await supabaseAdmin
        .from('user_roles')
        .update({ role })
        .eq('user_id', userId)
        .select()

      if (error) {
        throw error
      }
      
      result = { updated: true, data }
    } 
    // Otherwise insert a new role
    else {
      const { data, error } = await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: userId, role })
        .select()

      if (error) {
        throw error
      }
      
      result = { inserted: true, data }
    }

    return new Response(
      JSON.stringify(result),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error setting user role:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
