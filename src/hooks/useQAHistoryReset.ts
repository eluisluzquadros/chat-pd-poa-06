import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ResetStats {
  runs: number;
  results: number;
  tokens?: number;
  reports?: number;
  insights?: number;
}

interface ResetResult {
  success: boolean;
  message?: string;
  initialStats?: ResetStats;
  finalStats?: ResetStats;
  deletedStats?: ResetStats;
  error?: string;
}

export function useQAHistoryReset() {
  const [loading, setLoading] = useState(false);

  const getCurrentStats = async (): Promise<ResetStats | null> => {
    try {
      const [runsResult, resultsResult, tokensResult] = await Promise.all([
        supabase.from('qa_validation_runs').select('id', { count: 'exact' }),
        supabase.from('qa_validation_results').select('id', { count: 'exact' }),
        supabase.from('qa_token_usage').select('id', { count: 'exact' })
      ]);

      return {
        runs: runsResult.count || 0,
        results: resultsResult.count || 0,
        tokens: tokensResult.count || 0
      };
    } catch (error) {
      console.error('Error fetching current stats:', error);
      return null;
    }
  };

  const resetHistory = async (): Promise<ResetResult> => {
    setLoading(true);
    
    try {
      console.log('🧹 Starting QA history reset...');
      
      // Call the reset edge function
      const { data, error } = await supabase.functions.invoke('qa-reset-history', {
        body: {}
      });

      if (error) {
        console.error('❌ Reset error:', error);
        throw new Error(error.message || 'Erro ao resetar histórico');
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro desconhecido durante o reset');
      }

      console.log('✅ Reset completed:', data);

      // Show success toast
      toast.success('Histórico QA resetado com sucesso', {
        description: `${data.deletedStats?.runs || 0} execuções e ${data.deletedStats?.results || 0} resultados foram deletados.`,
        duration: 5000
      });

      return data;

    } catch (error: any) {
      console.error('❌ Reset failed:', error);
      
      const errorMessage = error.message || 'Erro desconhecido ao resetar histórico';
      
      // Show error toast
      toast.error('Erro ao resetar histórico QA', {
        description: errorMessage,
        duration: 5000
      });

      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    resetHistory,
    getCurrentStats
  };
}