import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TestConnectionParams {
  base_url: string;
  api_key: string;
  service_api_endpoint?: string;
  app_id?: string;
  timeout?: number;
}

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
}

export const useConnectionTest = () => {
  const [testing, setTesting] = useState(false);
  const [lastResult, setLastResult] = useState<TestResult | null>(null);

  const testConnection = async (params: TestConnectionParams): Promise<TestResult> => {
    if (testing) {
      toast.warning('Teste em andamento...');
      return { success: false, message: 'Teste já em andamento' };
    }

    // Validação básica
    if (!params.base_url || !params.api_key) {
      const error = { success: false, message: 'Base URL e API Key são obrigatórios' };
      setLastResult(error);
      toast.error(error.message);
      return error;
    }

    try {
      setTesting(true);
      toast.loading('Testando conexão...', { id: 'connection-test' });

      console.log('🔧 Teste direto no frontend com params:', {
        base_url: params.base_url,
        service_api_endpoint: params.service_api_endpoint || '/chat-messages',
        api_key: params.api_key ? '***' + params.api_key.slice(-4) : 'não informada',
        timeout: params.timeout || 10000,
      });

      // Construir URL de teste
      const endpoint = params.service_api_endpoint?.startsWith('/') 
        ? params.service_api_endpoint 
        : `/${params.service_api_endpoint || 'chat-messages'}`;
      
      const cleanBaseUrl = params.base_url.replace(/\/$/, '');
      const testUrl = `${cleanBaseUrl}${endpoint}`;
      
      console.log(`🔗 URL de teste: ${testUrl}`);
      
      // Fazer requisição direta para a API Dify
      const requestBody = {
        inputs: {},
        query: 'teste de conexão',
        response_mode: 'blocking',
        user: 'connection-test'
      };

      const headers = {
        'Authorization': `Bearer ${params.api_key}`,
        'Content-Type': 'application/json',
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), params.timeout || 10000);

      const response = await fetch(testUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const responseText = await response.text();
      
      console.log('📥 Resposta recebida:', {
        status: response.status,
        statusText: response.statusText,
        bodyLength: responseText.length,
        bodyPreview: responseText.substring(0, 200)
      });

      let result: TestResult;

      if (response.ok) {
        let parsedResponse;
        try {
          parsedResponse = JSON.parse(responseText);
        } catch {
          parsedResponse = { raw: responseText };
        }
        
        result = {
          success: true,
          message: 'Conexão estabelecida com sucesso!',
          details: {
            status: response.status,
            statusText: response.statusText,
            hasResponse: responseText.length > 0,
            response: parsedResponse
          }
        };
      } else {
        let errorDetails;
        try {
          errorDetails = JSON.parse(responseText);
        } catch {
          errorDetails = { message: responseText, raw: responseText };
        }

        result = {
          success: false,
          message: `Erro na API: ${response.status} ${response.statusText}`,
          details: errorDetails
        };
      }

      setLastResult(result);

      if (result.success) {
        toast.success(result.message, { id: 'connection-test' });
      } else {
        toast.error(result.message, { id: 'connection-test' });
      }

      return result;

    } catch (error) {
      console.error('Erro no teste de conexão:', error);
      const result = {
        success: false,
        message: 'Erro interno no teste de conexão',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      setLastResult(result);
      toast.error(result.message, { id: 'connection-test' });
      return result;
    } finally {
      setTesting(false);
    }
  };

  const clearResult = () => {
    setLastResult(null);
  };

  return {
    testing,
    lastResult,
    testConnection,
    clearResult,
  };
};