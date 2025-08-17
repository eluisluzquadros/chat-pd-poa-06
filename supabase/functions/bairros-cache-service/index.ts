import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getBairrosList, refreshBairrosCache, getCacheStats } from '../_shared/dynamic-bairros.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'get';

    switch (action) {
      case 'get':
        const bairros = await getBairrosList();
        return new Response(JSON.stringify({
          success: true,
          data: bairros,
          cache: getCacheStats()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'refresh':
        await refreshBairrosCache();
        const freshBairros = await getBairrosList();
        return new Response(JSON.stringify({
          success: true,
          message: 'Cache atualizado com sucesso',
          data: freshBairros,
          cache: getCacheStats()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'stats':
        return new Response(JSON.stringify({
          success: true,
          cache: getCacheStats()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      default:
        return new Response(JSON.stringify({
          success: false,
          error: 'Ação inválida. Use: get, refresh, stats'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

  } catch (error) {
    console.error('Erro no serviço de cache de bairros:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});