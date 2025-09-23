// @ts-nocheck
import { useState } from "react";
import { SmartQAValidator } from "@/lib/smartQAValidator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ValidationProgress {
  current: number;
  total: number;
  percentage: number;
}

export function useQAValidator() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<ValidationProgress | null>(null);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);

  const runValidation = async (options: any) => {
    setIsRunning(true);
    setProgress({ current: 0, total: 0, percentage: 0 });

    try {
      console.log('[useQAValidator] Starting validation with SmartQAValidator');
      
      // Use the enhanced SmartQAValidator for better accuracy
      const validator = SmartQAValidator.getInstance();
      const runId = await validator.runValidation({
        models: options.models || [options.model || 'anthropic/claude-3-5-sonnet-20241022'], // Use real model names
        mode: options.mode,
        categories: options.categories,
        difficulties: options.difficulties,
        randomCount: options.randomCount,
        includeSQL: options.includeSQL,
        excludeSQL: options.excludeSQL
      });
      
      console.log('[useQAValidator] Validation started with run ID:', runId);
      setCurrentRunId(runId);
      
      if (!runId) {
        throw new Error('No runId returned from validation');
      }
      
      // Monitor progress with improved polling
      const maxPollingTime = 30 * 60 * 1000; // 30 minutes for full runs
      const pollInterval = 2000; // 2 seconds
      const startPollingTime = Date.now();

      const poll = async () => {
        try {
          console.log('[useQAValidator] Polling validation run:', runId);
          
          const { data: run, error: runError } = await supabase
            .from('qa_validation_runs')
            .select('status, total_tests, passed_tests, error_message, last_heartbeat')
            .eq('id', runId)
            .single();

          if (runError) {
            console.error('[useQAValidator] Error fetching run:', runError);
            setIsRunning(false);
            setProgress(null);
            setCurrentRunId(null);
            return;
          }

          if (!run) {
            console.warn('[useQAValidator] Run not found, stopping polling');
            setIsRunning(false);
            setProgress(null);
            setCurrentRunId(null);
            return;
          }

          // Update heartbeat
          await supabase
            .from('qa_validation_runs')
            .update({ last_heartbeat: new Date().toISOString() })
            .eq('id', runId);

          // Count completed tests
          const { count, error: countError } = await supabase
            .from('qa_validation_results')
            .select('*', { count: 'exact', head: true })
            .eq('validation_run_id', runId);

          if (countError) {
            console.error('[useQAValidator] Error counting results:', countError);
          }

          const completed = count || 0;
          console.log(`[useQAValidator] Progress: ${completed}/${run.total_tests} tests completed`);
          
          setProgress({
            current: completed,
            total: run.total_tests,
            percentage: Math.round((completed / run.total_tests) * 100)
          });

          if (run.status !== 'running') {
            setIsRunning(false);
            setProgress(null);
            setCurrentRunId(null);
            
            if (run.status === 'completed') {
              toast.success(`Validação QA concluída! ${run.passed_tests}/${run.total_tests} casos aprovados`);
            } else if (run.status === 'failed') {
              toast.error(`Validação QA falhou: ${run.error_message || 'Erro desconhecido'}`);
            }
            return;
          }

          // Check for timeout
          if (Date.now() - startPollingTime > maxPollingTime) {
            await supabase
              .from('qa_validation_runs')
              .update({ 
                status: 'failed', 
                error_message: 'Timeout - execução cancelada após 30 minutos',
                completed_at: new Date().toISOString()
              })
              .eq('id', runId);
            
            setIsRunning(false);
            setProgress(null);
            setCurrentRunId(null);
            toast.error('Validação cancelada por timeout');
            return;
          }

          // Continue polling
          setTimeout(poll, pollInterval);

        } catch (error) {
          console.error('[useQAValidator] Polling error:', error);
          setIsRunning(false);
          setProgress(null);
          setCurrentRunId(null);
          toast.error(`Erro durante validação: ${error.message}`);
        }
      };

      // Start polling
      poll();

    } catch (error) {
      console.error('[useQAValidator] Validation error:', error);
      toast.error(`Erro ao executar validação: ${error.message}`);
      setIsRunning(false);
      setProgress(null);
      setCurrentRunId(null);
    }
  };

  return {
    runValidation,
    isRunning,
    progress,
    currentRunId
  };
}