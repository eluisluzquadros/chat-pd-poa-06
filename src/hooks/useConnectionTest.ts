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

      console.log('🔧 Chamando função test-api-connection com params:', {
        base_url: params.base_url,
        service_api_endpoint: params.service_api_endpoint || '/chat-messages',
        api_key: params.api_key ? '***' + params.api_key.slice(-4) : 'não informada',
        timeout: params.timeout || 10000,
      });

      const { data, error } = await supabase.functions.invoke('test-api-connection', {
        body: {
          base_url: params.base_url,
          api_key: params.api_key,
          service_api_endpoint: params.service_api_endpoint || '/chat-messages',
          app_id: params.app_id,
          timeout: params.timeout || 10000,
        }
      });

      if (error) {
        console.error('❌ Erro na função test-api-connection:', error);
        
        let errorMessage = error.message;
        if (error.message?.includes('Failed to send a request')) {
          errorMessage = 'Função test-api-connection não encontrada ou indisponível. Verifique se a função foi implantada corretamente.';
        }
        
        const result = {
          success: false,
          message: `Erro na função: ${errorMessage}`,
          details: error
        };
        setLastResult(result);
        toast.error(result.message, { id: 'connection-test' });
        return result;
      }

      const result = data as TestResult;
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