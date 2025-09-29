import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CrewAIAdapter } from '@/services/adapters/crewaiAdapter';
import { Agent } from '@/services/agentsService';

interface TestConnectionParams {
  base_url: string;
  api_key: string;
  service_api_endpoint?: string;
  app_id?: string;
  timeout?: number;
  provider?: string; // Adicionar provider para detectar CrewAI
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

      // Detectar se é CrewAI pelo provider ou URL (case-insensitive)
      const isCrewAI = params.provider?.toLowerCase() === 'crewai' || 
                       params.base_url?.toLowerCase().includes('crewai');

      console.log('🔍 Detecção CrewAI:', {
        provider: params.provider,
        baseUrl: params.base_url,
        containsCrewAI: params.base_url?.toLowerCase().includes('crewai'),
        isCrewAI
      });

      if (isCrewAI) {
        console.log('🔧 Teste CrewAI via adapter direto:', {
          base_url: params.base_url,
          api_key: params.api_key ? '***' + params.api_key.slice(-4) : 'não informada',
          provider: 'crewai'
        });

        // Para CrewAI, usar o adapter diretamente
        const crewaiAdapter = new CrewAIAdapter();
        
        // Criar um objeto Agent temporário para o teste
        const testAgent: Agent = {
          id: 'test',
          name: 'test-agent',
          display_name: 'Test Agent',
          description: 'Test connection',
          provider: 'crewai',
          model: 'custom-app',
          is_active: true,
          is_default: false,
          api_config: {
            base_url: params.base_url,
            api_key: params.api_key,
            app_id: params.app_id || undefined,
            service_api_endpoint: undefined, // CrewAI não usa
            server_url: params.base_url
          },
          parameters: {
            temperature: 0.7,
            max_tokens: 4000,
            top_p: 1,
            stream: false
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const connectionResult = await crewaiAdapter.testConnection(testAgent);
        
        const result: TestResult = {
          success: connectionResult.success,
          message: connectionResult.message,
          details: connectionResult
        };

        setLastResult(result);

        if (result.success) {
          toast.success(result.message, { id: 'connection-test' });
        } else {
          toast.error(result.message, { id: 'connection-test' });
        }

        return result;
      } else {
        // Para outros provedores (Dify, Langflow etc.), usar edge function
        console.log('🔧 Teste via edge function com params:', {
          base_url: params.base_url,
          service_api_endpoint: params.service_api_endpoint || '/chat-messages',
          api_key: params.api_key ? '***' + params.api_key.slice(-4) : 'não informada',
          timeout: params.timeout || 10000,
          provider: params.provider || 'unknown'
        });

        const { data, error } = await supabase.functions.invoke('test-connection', {
          body: {
            base_url: params.base_url,
            api_key: params.api_key,
            service_api_endpoint: params.service_api_endpoint || '/chat-messages',
            timeout: params.timeout || 10000,
          }
        });

        if (error) {
          console.error('❌ Erro na função test-connection:', error);
          const result = {
            success: false,
            message: `Erro na função: ${error.message}`,
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
      }

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