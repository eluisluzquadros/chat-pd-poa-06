import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestConnectionRequest {
  base_url: string;
  api_key: string;
  service_api_endpoint?: string;
  app_id?: string;
  timeout?: number;
}

async function testAPIConnection(config: TestConnectionRequest): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    const { base_url, api_key, service_api_endpoint = '/v1/chat-messages', timeout = 10000 } = config;
    
    // Validar campos obrigatórios
    if (!base_url || !api_key) {
      return {
        success: false,
        message: 'Base URL e API Key são obrigatórios'
      };
    }

    // Construir URL de teste
    const testUrl = new URL(service_api_endpoint, base_url).toString();
    
    console.log(`Testando conexão com: ${testUrl}`);
    
    // Fazer requisição de teste
    const response = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {},
        query: 'teste de conexão',
        response_mode: 'blocking',
        user: 'test-connection'
      }),
      signal: AbortSignal.timeout(timeout)
    });

    const responseText = await response.text();
    
    // Verificar resposta
    if (response.ok) {
      return {
        success: true,
        message: 'Conexão estabelecida com sucesso',
        details: {
          status: response.status,
          statusText: response.statusText,
          hasResponse: responseText.length > 0
        }
      };
    } else {
      // Tentar fazer parse do erro se for JSON
      let errorDetails;
      try {
        errorDetails = JSON.parse(responseText);
      } catch {
        errorDetails = { message: responseText };
      }

      return {
        success: false,
        message: `Erro na API: ${response.status} ${response.statusText}`,
        details: errorDetails
      };
    }
    
  } catch (error) {
    console.error('Erro no teste de conexão:', error);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          message: 'Timeout na conexão - verifique a URL e conectividade'
        };
      }
      
      return {
        success: false,
        message: `Erro de conexão: ${error.message}`
      };
    }
    
    return {
      success: false,
      message: 'Erro desconhecido na conexão'
    };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método não permitido' }),
        { 
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const body = await req.json();
    console.log('Requisição de teste de conexão:', body);

    const result = await testAPIConnection(body);
    
    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Erro no edge function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Erro interno no servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});