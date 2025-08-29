import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CrossValidationRequest {
  testQueries?: string[];
  model?: string;
  alertThreshold?: number; // Percentage divergence to trigger alert
}

interface ValidationResult {
  query: string;
  chatResponse: any;
  qaResponse: any;
  divergenceScore: number;
  status: 'CONSISTENT' | 'DIVERGENT' | 'ERROR';
  details: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { 
      testQueries = [
        "Qual é a altura máxima da ZOT 07?",
        "Quais ZOTs contemplam o bairro Boa Vista?",
        "Quantos bairros tem Porto Alegre?",
        "O que pode ser construído no bairro Três Figueiras?"
      ],
      model = "anthropic/claude-opus-4-1-20250805",
      alertThreshold = 15
    }: CrossValidationRequest = await req.json();

    console.log(`[CROSS-VALIDATION] Starting validation with ${testQueries.length} queries using model ${model}`);

    const results: ValidationResult[] = [];
    const sessionId = `cross-val-${Date.now()}`;

    for (const query of testQueries) {
      console.log(`[CROSS-VALIDATION] Testing query: ${query}`);
      
      try {
        // Test via chat endpoint (agentic-rag)
        const chatStartTime = Date.now();
        const chatResponse = await fetch(`${supabaseUrl}/functions/v1/agentic-rag`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query,
            sessionId: `${sessionId}-chat`,
            model,
            userRole: 'citizen'
          }),
        });
        const chatResult = await chatResponse.json();
        const chatTime = Date.now() - chatStartTime;

        // Simulate QA validation (get test case if available)
        const { data: testCases } = await supabase
          .from('qa_test_cases')
          .select('*')
          .or(`question.ilike.%${query.substring(0, 20)}%,query.ilike.%${query.substring(0, 20)}%`)
          .limit(1);

        const testCase = testCases?.[0];
        let qaResult = null;
        let qaTime = 0;

        if (testCase) {
          // Run QA validation on this specific test case
          const qaStartTime = Date.now();
          const qaResponse = await fetch(`${supabaseUrl}/functions/v1/qa-execute-validation-v2`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              mode: 'selected',
              selectedIds: [testCase.test_id],
              models: [model],
              includeSQL: false,
              excludeSQL: true
            }),
          });
          qaResult = await qaResponse.json();
          qaTime = Date.now() - qaStartTime;
        }

        // Calculate divergence
        let divergenceScore = 0;
        let status: 'CONSISTENT' | 'DIVERGENT' | 'ERROR' = 'CONSISTENT';
        let details = '';

        if (chatResult.response && qaResult?.results?.length > 0) {
          const qaAccuracy = qaResult.results[0].overallAccuracy || 0;
          const chatConfidence = chatResult.confidence || 0;
          
          // Compare response times (should be within reasonable range)
          const timeDivergence = Math.abs(chatTime - qaTime) / Math.max(chatTime, qaTime) * 100;
          
          // Compare confidence/accuracy scores
          const scoreDivergence = Math.abs(chatConfidence - qaAccuracy) * 100;
          
          divergenceScore = Math.max(timeDivergence, scoreDivergence);
          
          if (divergenceScore > alertThreshold) {
            status = 'DIVERGENT';
            details = `Time divergence: ${timeDivergence.toFixed(1)}%, Score divergence: ${scoreDivergence.toFixed(1)}%`;
          } else {
            details = `Systems consistent - Time diff: ${timeDivergence.toFixed(1)}%, Score diff: ${scoreDivergence.toFixed(1)}%`;
          }
        } else {
          status = 'ERROR';
          details = 'Unable to compare - missing responses';
        }

        results.push({
          query,
          chatResponse: {
            response: chatResult.response?.substring(0, 200) + '...',
            confidence: chatResult.confidence,
            executionTime: chatTime
          },
          qaResponse: qaResult ? {
            accuracy: qaResult.results?.[0]?.overallAccuracy,
            executionTime: qaTime,
            testCaseFound: !!testCase
          } : null,
          divergenceScore,
          status,
          details
        });

        console.log(`[CROSS-VALIDATION] Query "${query}" - Status: ${status}, Divergence: ${divergenceScore.toFixed(1)}%`);

      } catch (error) {
        console.error(`[CROSS-VALIDATION] Error testing query "${query}":`, error);
        results.push({
          query,
          chatResponse: null,
          qaResponse: null,
          divergenceScore: 100,
          status: 'ERROR',
          details: `Error: ${error.message}`
        });
      }

      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Generate summary
    const divergentCount = results.filter(r => r.status === 'DIVERGENT').length;
    const errorCount = results.filter(r => r.status === 'ERROR').length;
    const avgDivergence = results.reduce((sum, r) => sum + r.divergenceScore, 0) / results.length;

    const summary = {
      totalQueries: results.length,
      consistentQueries: results.length - divergentCount - errorCount,
      divergentQueries: divergentCount,
      errorQueries: errorCount,
      averageDivergence: Math.round(avgDivergence * 10) / 10,
      alertTriggered: divergentCount > 0 || errorCount > 0,
      model,
      timestamp: new Date().toISOString()
    };

    // Store quality alert if needed
    if (summary.alertTriggered) {
      try {
        await supabase.from('quality_alerts').insert({
          level: divergentCount > 1 ? 'critical' : 'warning',
          issues: [
            `Cross-validation detected ${divergentCount} divergent responses`,
            `${errorCount} queries failed during validation`,
            `Average divergence: ${summary.averageDivergence}%`
          ],
          metrics: {
            model,
            divergentQueries: divergentCount,
            avgDivergence: summary.averageDivergence,
            threshold: alertThreshold
          }
        });
        console.log(`[CROSS-VALIDATION] Quality alert created for ${divergentCount} divergent cases`);
      } catch (alertError) {
        console.error('[CROSS-VALIDATION] Failed to create quality alert:', alertError);
      }
    }

    console.log(`[CROSS-VALIDATION] Completed. Summary:`, summary);

    return new Response(JSON.stringify({
      success: true,
      summary,
      results,
      recommendations: divergentCount > 0 ? [
        'Review divergent queries for system inconsistencies',
        'Consider adjusting evaluation thresholds',
        'Check for model-specific optimizations needed'
      ] : ['Systems are operating consistently']
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[CROSS-VALIDATION] Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});