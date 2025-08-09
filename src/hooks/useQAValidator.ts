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
      console.log('[useQAValidator] Starting smart validation with enhanced methodology');
      
      // Use SmartQAValidator for enhanced evaluation
      const validator = SmartQAValidator.getInstance();
      const runId = await validator.runValidation({
        model: options.model,
        mode: options.mode,
        categories: options.categories,
        difficulties: options.difficulties,
        randomCount: options.randomCount,
        includeSQL: options.includeSQL,
        excludeSQL: options.excludeSQL
      });
      
      setCurrentRunId(runId);
      
      console.log(`[useQAValidator] Smart validation run created: ${runId}`);
      
      // Monitor progress with enhanced tracking
      const interval = setInterval(async () => {
        const { data: run } = await supabase
          .from('qa_validation_runs')
          .select('status, total_tests, passed_tests')
          .eq('id', runId)
          .single();

        if (!run) {
          clearInterval(interval);
          return;
        }

        // Count completed tests
        const { count } = await supabase
          .from('qa_validation_results')
          .select('*', { count: 'exact', head: true })
          .eq('validation_run_id', runId);

        const completed = count || 0;
        
        setProgress({
          current: completed,
          total: run.total_tests,
          percentage: Math.round((completed / run.total_tests) * 100)
        });

        if (run.status !== 'running') {
          clearInterval(interval);
          setIsRunning(false);
          setProgress(null);
          setCurrentRunId(null);
          
          if (run.status === 'completed') {
            toast.success('Validação QA inteligente concluída com sucesso!');
          } else if (run.status === 'failed') {
            toast.error('Validação QA falhou - verifique os logs');
          }
        }
      }, 1000);

    } catch (error) {
      console.error('[useQAValidator] Smart validation error:', error);
      toast.error('Erro ao executar validação inteligente');
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