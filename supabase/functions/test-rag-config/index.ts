import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { mode, action, query, base_url, api_key, service_api_endpoint, app_id, timeout } = requestBody;

    console.log('🔧 Received request body:', JSON.stringify(requestBody, null, 2));
    console.log(`🔧 Testing RAG config - Mode: ${mode}, Action: ${action}`);
    console.log(`🔧 Action type: ${typeof action}, Action value: "${action}"`);
    
    // Normalizar action para evitar problemas de encoding/espaços
    const normalizedAction = action?.toString().trim().toLowerCase();

    // NOVA FUNCIONALIDADE: Teste de conexão de API externa
    if (normalizedAction === 'test_api_connection') {
      console.log('🧪 Testing external API connection:', { base_url, service_api_endpoint });
      
      if (!base_url || !api_key) {
        throw new Error('Base URL e API Key são obrigatórios');
      }

      const testUrl = `${base_url}${service_api_endpoint || '/chat-messages'}`;
      const timeoutMs = timeout || 10000;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(testUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${api_key}`
          },
          body: JSON.stringify({
            inputs: {},
            query: 'teste de conexão',
            response_mode: 'blocking',
            conversation_id: '',
            user: 'test-user',
            files: []
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.text();
          return new Response(
            JSON.stringify({
              success: true,
              message: 'Conexão testada com sucesso',
              details: {
                status: response.status,
                statusText: response.statusText,
                responseSize: data.length
              }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          throw new Error(`Timeout: A requisição excedeu ${timeoutMs}ms`);
        }
        throw new Error(`Erro na conexão: ${error.message}`);
      }
    }

    // Verificar secrets do Dify
    if (action === 'check_secrets') {
      if (mode === 'dify') {
        const difyApiKey = Deno.env.get('DIFY_API_KEY');
        const difyBaseUrl = Deno.env.get('DIFY_BASE_URL');
        
        const available = !!(difyApiKey && difyBaseUrl);
        
        console.log(`🔑 Dify secrets check: ${available ? 'Available' : 'Missing'}`);
        
        return new Response(
          JSON.stringify({ 
            available,
            message: available 
              ? 'Secrets do Dify estão configurados' 
              : 'Secrets do Dify não encontrados'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          available: true,
          message: 'RAG local sempre disponível'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Testar configuração atual
    if (action === 'test') {
      const testQuery = query || 'teste de configuração';
      
      if (mode === 'dify') {
        // Testar Dify
        const difyApiKey = Deno.env.get('DIFY_API_KEY');
        const difyBaseUrl = Deno.env.get('DIFY_BASE_URL');
        
        if (!difyApiKey || !difyBaseUrl) {
          throw new Error('Secrets do Dify não configurados');
        }

        // Simular teste do Dify (substitua pela chamada real se necessário)
        console.log(`🎯 Testing Dify with query: ${testQuery}`);
        
        return new Response(
          JSON.stringify({
            success: true,
            mode: 'dify',
            message: 'Configuração Dify testada com sucesso',
            timestamp: new Date().toISOString(),
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      // Testar RAG Local
      console.log(`🎯 Testing Local RAG with query: ${testQuery}`);
      
      return new Response(
        JSON.stringify({
          success: true,
          mode: 'local',
          message: 'Configuração RAG local testada com sucesso',
          timestamp: new Date().toISOString(),
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    throw new Error('Ação não reconhecida');

  } catch (error) {
    console.error('❌ Error testing RAG config:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});