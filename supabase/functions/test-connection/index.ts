import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { base_url, api_key, service_api_endpoint = '/chat-messages' } = await req.json()
    
    if (!base_url || !api_key) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Base URL e API Key são obrigatórios' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Construir URL de teste
    const endpoint = service_api_endpoint.startsWith('/') 
      ? service_api_endpoint 
      : `/${service_api_endpoint}`
    
    const cleanBaseUrl = base_url.replace(/\/$/, '')
    const testUrl = `${cleanBaseUrl}${endpoint}`
    
    console.log(`🔗 Testando URL: ${testUrl}`)
    
    // Fazer requisição para a API Dify
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
        user: 'connection-test'
      })
    })

    const responseText = await response.text()
    
    console.log('📥 Resposta:', {
      status: response.status,
      statusText: response.statusText,
      bodyPreview: responseText.substring(0, 200)
    })

    let result
    if (response.ok) {
      try {
        const parsedResponse = JSON.parse(responseText)
        result = {
          success: true,
          message: 'Conexão estabelecida com sucesso!',
          details: {
            status: response.status,
            statusText: response.statusText,
            response: parsedResponse
          }
        }
      } catch {
        result = {
          success: true,
          message: 'Conexão estabelecida com sucesso!',
          details: {
            status: response.status,
            statusText: response.statusText,
            response: { raw: responseText }
          }
        }
      }
    } else {
      try {
        const errorDetails = JSON.parse(responseText)
        result = {
          success: false,
          message: `Erro na API: ${response.status} ${response.statusText}`,
          details: errorDetails
        }
      } catch {
        result = {
          success: false,
          message: `Erro na API: ${response.status} ${response.statusText}`,
          details: { message: responseText, raw: responseText }
        }
      }
    }

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Erro no teste de conexão:', error)
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Erro interno no teste de conexão',
        details: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})