import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CleanupRequest {
  confirmCleanup?: boolean;
  preserveDays?: number; // Optional: preserve last N days of data
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!; // Need service role for deletions
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Safely parse JSON with defaults
    let cleanupRequest: CleanupRequest = { confirmCleanup: false, preserveDays: 0 };
    
    try {
      const contentType = req.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const text = await req.text();
        if (text.trim()) {
          cleanupRequest = JSON.parse(text);
        }
      }
    } catch (jsonError) {
      console.log('[QA-CLEANUP] Invalid JSON, using defaults:', jsonError.message);
    }

    const { 
      confirmCleanup = false,
      preserveDays = 0 
    } = cleanupRequest;

    if (!confirmCleanup) {
      return new Response(JSON.stringify({
        error: 'Cleanup not confirmed. Set confirmCleanup: true to proceed.'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[QA-CLEANUP] Starting cleanup of QA validation history...');

    // Calculate cutoff date if preserving recent data
    let cutoffDate = null;
    if (preserveDays > 0) {
      cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - preserveDays);
      console.log(`[QA-CLEANUP] Preserving data from last ${preserveDays} days (after ${cutoffDate.toISOString()})`);
    }

    const stats = {
      validationRuns: 0,
      validationResults: 0,
      tokenUsage: 0,
      qualityMonitoring: 0,
      qualityAlerts: 0,
      errors: []
    };

    // 1. Clean qa_validation_results first (has foreign key to qa_validation_runs)
    try {
      let deleteQuery = supabase.from('qa_validation_results').delete();
      
      if (cutoffDate) {
        deleteQuery = deleteQuery.lt('created_at', cutoffDate.toISOString());
      } else {
        deleteQuery = deleteQuery.neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      }

      const { count: resultsCount, error: resultsError } = await deleteQuery.select('id', { count: 'exact' });
      
      if (resultsError) {
        throw new Error(`Failed to delete validation results: ${resultsError.message}`);
      }
      
      stats.validationResults = resultsCount || 0;
      console.log(`[QA-CLEANUP] Deleted ${stats.validationResults} validation results`);
    } catch (error) {
      stats.errors.push(`Validation results: ${error.message}`);
      console.error('[QA-CLEANUP] Error cleaning validation results:', error);
    }

    // 2. Clean qa_validation_runs
    try {
      let deleteQuery = supabase.from('qa_validation_runs').delete();
      
      if (cutoffDate) {
        deleteQuery = deleteQuery.lt('started_at', cutoffDate.toISOString());
      } else {
        deleteQuery = deleteQuery.neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      }

      const { count: runsCount, error: runsError } = await deleteQuery.select('id', { count: 'exact' });
      
      if (runsError) {
        throw new Error(`Failed to delete validation runs: ${runsError.message}`);
      }
      
      stats.validationRuns = runsCount || 0;
      console.log(`[QA-CLEANUP] Deleted ${stats.validationRuns} validation runs`);
    } catch (error) {
      stats.errors.push(`Validation runs: ${error.message}`);
      console.error('[QA-CLEANUP] Error cleaning validation runs:', error);
    }

    // 3. Clean qa_token_usage
    try {
      let deleteQuery = supabase.from('qa_token_usage').delete();
      
      if (cutoffDate) {
        deleteQuery = deleteQuery.lt('created_at', cutoffDate.toISOString());
      } else {
        deleteQuery = deleteQuery.neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      }

      const { count: tokenCount, error: tokenError } = await deleteQuery.select('id', { count: 'exact' });
      
      if (tokenError) {
        throw new Error(`Failed to delete token usage: ${tokenError.message}`);
      }
      
      stats.tokenUsage = tokenCount || 0;
      console.log(`[QA-CLEANUP] Deleted ${stats.tokenUsage} token usage records`);
    } catch (error) {
      stats.errors.push(`Token usage: ${error.message}`);
      console.error('[QA-CLEANUP] Error cleaning token usage:', error);
    }

    // 4. Clean qa_quality_monitoring
    try {
      let deleteQuery = supabase.from('qa_quality_monitoring').delete();
      
      if (cutoffDate) {
        deleteQuery = deleteQuery.lt('hour', cutoffDate.toISOString());
      } else {
        deleteQuery = deleteQuery.neq('hour', '1970-01-01T00:00:00Z'); // Delete all
      }

      const { count: monitoringCount, error: monitoringError } = await deleteQuery.select('hour', { count: 'exact' });
      
      if (monitoringError) {
        throw new Error(`Failed to delete quality monitoring: ${monitoringError.message}`);
      }
      
      stats.qualityMonitoring = monitoringCount || 0;
      console.log(`[QA-CLEANUP] Deleted ${stats.qualityMonitoring} quality monitoring records`);
    } catch (error) {
      stats.errors.push(`Quality monitoring: ${error.message}`);
      console.error('[QA-CLEANUP] Error cleaning quality monitoring:', error);
    }

    // 5. Clean old quality alerts related to QA
    try {
      let deleteQuery = supabase.from('quality_alerts').delete();
      
      if (cutoffDate) {
        deleteQuery = deleteQuery.lt('created_at', cutoffDate.toISOString());
      } else {
        deleteQuery = deleteQuery.neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      }

      const { count: alertsCount, error: alertsError } = await deleteQuery.select('id', { count: 'exact' });
      
      if (alertsError) {
        throw new Error(`Failed to delete quality alerts: ${alertsError.message}`);
      }
      
      stats.qualityAlerts = alertsCount || 0;
      console.log(`[QA-CLEANUP] Deleted ${stats.qualityAlerts} quality alerts`);
    } catch (error) {
      stats.errors.push(`Quality alerts: ${error.message}`);
      console.error('[QA-CLEANUP] Error cleaning quality alerts:', error);
    }

    // Summary
    const totalDeleted = stats.validationRuns + stats.validationResults + stats.tokenUsage + stats.qualityMonitoring + stats.qualityAlerts;
    
    console.log(`[QA-CLEANUP] Cleanup completed. Total records deleted: ${totalDeleted}`);
    
    const response = {
      success: true,
      message: 'QA history cleanup completed successfully',
      stats,
      totalRecordsDeleted: totalDeleted,
      preservedDays: preserveDays,
      timestamp: new Date().toISOString(),
      recommendations: [
        'Baseline limpa estabelecida',
        'Execute novos testes QA para avaliar melhorias',
        'Monitore métricas de acurácia com novo sistema LLM',
        'Use thresholds otimizados por categoria implementados'
      ]
    };

    if (stats.errors.length > 0) {
      response.success = false;
      response.message = 'Cleanup completed with some errors';
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[QA-CLEANUP] Fatal error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});