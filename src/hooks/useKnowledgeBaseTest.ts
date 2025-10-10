import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface TestKBParams {
  provider: string;
  index_id: string;
  api_key: string;
  top_k?: number;
  score_threshold?: number;
}

interface TestResult {
  success: boolean;
  message: string;
  details?: {
    nodesRetrieved: number;
    avgScore?: number;
    topScores?: number[];
    query: string;
  };
}

export const useKnowledgeBaseTest = () => {
  const [testing, setTesting] = useState(false);
  const [lastResult, setLastResult] = useState<TestResult | null>(null);

  const testKnowledgeBase = async (params: TestKBParams): Promise<TestResult> => {
    if (testing) {
      toast.warning('Teste em andamento...');
      return { success: false, message: 'Teste já em andamento' };
    }

    if (!params.index_id || !params.api_key) {
      const error = { success: false, message: 'Index ID e API Key são obrigatórios' };
      setLastResult(error);
      toast.error(error.message);
      return error;
    }

    try {
      setTesting(true);
      toast.loading('Testando conexão com LlamaCloud...', { id: 'kb-test' });

      console.log('🧪 Testing KB:', {
        provider: params.provider,
        index_id: params.index_id,
        api_key: params.api_key.substring(0, 10) + '...',
      });

      console.log('🧪 Calling edge function test-knowledge-base...');

      const { data, error } = await supabase.functions.invoke('test-knowledge-base', {
        body: {
          provider: params.provider,
          index_id: params.index_id,
          api_key: params.api_key,
          top_k: params.top_k || 3,
          score_threshold: params.score_threshold || 0.3,
        },
      });

      if (error) {
        throw new Error(error.message || 'Erro ao chamar edge function');
      }

      if (!data) {
        throw new Error('Resposta vazia da edge function');
      }

      console.log('📥 Edge function response:', data);

      setLastResult(data);
      if (data.success) {
        toast.success(data.message, { id: 'kb-test' });
      } else {
        toast.error(data.message, { id: 'kb-test' });
      }
      return data;
    } catch (error: any) {
      console.error('❌ KB test failed:', error);
      const result: TestResult = {
        success: false,
        message: `❌ Erro: ${error.message || 'Falha na conexão'}`,
      };
      setLastResult(result);
      toast.error(result.message, { id: 'kb-test' });
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
    testKnowledgeBase,
    clearResult,
  };
};
