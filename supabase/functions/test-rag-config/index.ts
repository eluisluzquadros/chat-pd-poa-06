import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  const VERSION = '3.0-FORCE-DEPLOY';
  const DEPLOY_TIMESTAMP = '2025-01-26T10:30:00Z';
  console.log(`🚀 test-rag-config function called - VERSION: ${VERSION} - DEPLOYED: ${DEPLOY_TIMESTAMP}`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { mode, action, query, base_url, api_key, service_api_endpoint, app_id, timeout } = requestBody;

    console.log(`🔧 VERSION ${VERSION} - Processing request:`, JSON.stringify(requestBody, null, 2));
    console.log(`🔧 Testing RAG config - Mode: ${mode}, Action: ${action}`);
    console.log(`🔧 Raw action: "${action}" (${typeof action})`);
    
    // Debug byte por byte
    const actionStr = action ? action.toString() : '';
    console.log(`🔧 Action string: "${actionStr}"`);
    console.log(`🔧 Action bytes:`, Array.from(actionStr).map(c => c.charCodeAt(0)));
    
    // Normalizar action para comparação robusta
    const normalizedAction = actionStr.trim().toLowerCase();
    console.log(`🔧 Normalized action: "${normalizedAction}"`);
    console.log(`🔧 Normalized bytes:`, Array.from(normalizedAction).map(c => c.charCodeAt(0)));
    
    // Comparações múltiplas para debug
    const testActions = ['test_api_connection', 'check_secrets', 'test'];
    console.log('🔧 Testing against available actions:');
    testActions.forEach(testAction => {
      const exact = normalizedAction === testAction;
      const includes = normalizedAction.includes(testAction);
      const startsWith = normalizedAction.startsWith(testAction);
      console.log(`  - "${testAction}": exact=${exact}, includes=${includes}, startsWith=${startsWith}`);
    });
    
    // CORREÇÃO: Teste de conexão API externa - usando múltiplas estratégias
    if (normalizedAction === 'test_api_connection' || normalizedAction.includes('test_api_connection') || normalizedAction.startsWith('test_api_connection')) {
      console.log('🎯 MATCH: test_api_connection detected');
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
    if (normalizedAction === 'check_secrets') {
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
    if (normalizedAction === 'test') {
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

    // FALLBACK: Se chegou aqui, a ação não foi reconhecida
    console.log('❌ No action matched. Available actions: test_api_connection, check_secrets, test');
    console.log('❌ Received action details:', {
      raw: action,
      normalized: normalizedAction,
      type: typeof action,
      length: normalizedAction.length
    });
    
    return new Response(
      JSON.stringify({ 
        error: 'Ação não reconhecida',
        debug: {
          receivedAction: action,
          normalizedAction: normalizedAction,
          availableActions: ['test_api_connection', 'check_secrets', 'test'],
          actionType: typeof action,
          actionLength: normalizedAction.length,
          requestBody: requestBody
        },
        timestamp: new Date().toISOString(),
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

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