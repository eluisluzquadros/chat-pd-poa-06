import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { agentId } = await req.json();

    if (!agentId) {
      throw new Error('Agent ID is required');
    }

    // Remove default from all agents
    await supabaseClient
      .from('dify_agents')
      .update({ is_default: false })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all rows

    // Set the specified agent as default
    const { data, error } = await supabaseClient
      .from('dify_agents')
      .update({ is_default: true })
      .eq('id', agentId)
      .select();

    if (error) {
      throw error;
    }

    console.log('✅ Default agent updated successfully:', data);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Default agent updated successfully',
      agent: data[0]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error setting default agent:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});