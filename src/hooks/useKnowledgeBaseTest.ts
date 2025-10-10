import { useState } from 'react';
import { toast } from 'sonner';
import { LlamaCloudAdapter } from '@/services/knowledgeBase/adapters/llamacloud';

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

      if (params.provider !== 'llamacloud') {
        throw new Error('Apenas LlamaCloud suportado por enquanto');
      }

      // Criar adapter temporário
      const adapter = new LlamaCloudAdapter(
        { index_id: params.index_id },
        {
          top_k: params.top_k || 3,
          score_threshold: params.score_threshold || 0.3, // Threshold mais baixo para teste
        },
        params.api_key
      );

      // Testar com query simples
      const testQuery = 'regulamento urbanístico teste';
      console.log('📤 Test query:', testQuery);

      const results = await adapter.retrieve({
        query: testQuery,
        topK: 3,
        scoreThreshold: 0.3,
      });

      console.log('📥 Test results:', {
        nodesRetrieved: results.length,
        scores: results.map(r => r.score),
      });

      if (results.length === 0) {
        const result: TestResult = {
          success: true, // Conexão OK, mas sem resultados
          message: '⚠️ Conexão OK, mas nenhum documento encontrado. Verifique se o index tem documentos.',
          details: {
            nodesRetrieved: 0,
            query: testQuery,
          },
        };
        setLastResult(result);
        toast.warning(result.message, { id: 'kb-test' });
        return result;
      }

      const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
      const result: TestResult = {
        success: true,
        message: `✅ Conexão OK! ${results.length} documento(s) encontrado(s)`,
        details: {
          nodesRetrieved: results.length,
          avgScore,
          topScores: results.map(r => r.score),
          query: testQuery,
        },
      };

      setLastResult(result);
      toast.success(result.message, { id: 'kb-test' });
      return result;
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
