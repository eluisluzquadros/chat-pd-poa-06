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
  alertThreshold?: number;
  source?: 'chat' | 'admin';
}

interface ValidationResult {
  query: string;
  chatResponse: any;
  adminResponse: any;
  divergenceScore: number;
  status: 'CONSISTENT' | 'DIVERGENT' | 'ERROR';
  details: string;
  timing: {
    chatTime: number;
    adminTime: number;
  };
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
      alertThreshold = 15,
      source = 'cross-validation'
    }: CrossValidationRequest = await req.json();

    console.log(`[CROSS-VALIDATION-V2] Starting validation with ${testQueries.length} queries using model ${model}`);

    const results: ValidationResult[] = [];
    const sessionId = `cross-val-${Date.now()}`;

    for (const query of testQueries) {
      console.log(`[CROSS-VALIDATION-V2] Testing query: ${query}`);
      
      try {
        // Test via /chat interface (agentic-rag)
        const chatStartTime = Date.now();
        const chatResponse = await fetch(`${supabaseUrl}/functions/v1/agentic-rag`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: query,
            sessionId: `${sessionId}-chat`,
            model,
            userRole: 'citizen',
            bypassCache: true
          }),
        });
        const chatResult = await chatResponse.json();
        const chatTime = Date.now() - chatStartTime;

        // Test via /admin/quality interface (qa-execute-validation-v2)
        const adminStartTime = Date.now();
        
        // First, find a test case that matches this query
        const { data: testCases } = await supabase
          .from('qa_test_cases')
          .select('*')
          .or(`question.ilike.%${query.substring(0, 20)}%,query.ilike.%${query.substring(0, 20)}%`)
          .limit(1);

        let adminResult = null;
        let adminTime = 0;

        if (testCases?.[0]) {
          const adminResponse = await fetch(`${supabaseUrl}/functions/v1/qa-execute-validation-v2`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              mode: 'selected',
              selectedIds: [testCases[0].id],
              models: [model],
              includeSQL: false,
              excludeSQL: true
            }),
          });
          adminResult = await adminResponse.json();
          adminTime = Date.now() - adminStartTime;
        } else {
          // If no test case found, create a temporary one
          adminResult = {
            response: "No test case found for this query",
            confidence: 0,
            executionTime: 0
          };
          adminTime = Date.now() - adminStartTime;
        }

        // Calculate divergence
        let divergenceScore = 0;
        let status: 'CONSISTENT' | 'DIVERGENT' | 'ERROR' = 'CONSISTENT';
        let details = '';

        if (chatResult.response && adminResult) {
          // Compare response content similarity
          const chatText = chatResult.response?.toLowerCase() || '';
          const adminText = adminResult.response?.toLowerCase() || '';
          
          // Simple text similarity calculation
          const commonWords = chatText.split(' ').filter(word => 
            adminText.includes(word) && word.length > 3
          );
          const totalWords = Math.max(
            chatText.split(' ').length, 
            adminText.split(' ').length
          );
          const textSimilarity = commonWords.length / totalWords;
          
          // Compare confidence scores
          const chatConfidence = chatResult.confidence || 0;
          const adminConfidence = adminResult.confidence || 0;
          const confidenceDiff = Math.abs(chatConfidence - adminConfidence);
          
          // Compare response times (should be within reasonable range)
          const timeDivergence = Math.abs(chatTime - adminTime) / Math.max(chatTime, adminTime) * 100;
          
          // Calculate overall divergence
          divergenceScore = Math.max(
            (1 - textSimilarity) * 100,
            confidenceDiff * 100,
            timeDivergence * 0.1 // Weight time less heavily
          );
          
          if (divergenceScore > alertThreshold) {
            status = 'DIVERGENT';
            details = `Text similarity: ${(textSimilarity * 100).toFixed(1)}%, Confidence diff: ${(confidenceDiff * 100).toFixed(1)}%, Time diff: ${timeDivergence.toFixed(1)}%`;
          } else {
            details = `Responses consistent - Text similarity: ${(textSimilarity * 100).toFixed(1)}%, Confidence diff: ${(confidenceDiff * 100).toFixed(1)}%`;
          }
        } else {
          status = 'ERROR';
          details = 'Unable to compare - missing responses';
          divergenceScore = 100;
        }

        results.push({
          query,
          chatResponse: {
            response: chatResult.response?.substring(0, 200) + '...',
            confidence: chatResult.confidence,
            executionTime: chatTime,
            model: chatResult.model,
            agentTrace: chatResult.agentTrace?.length || 0
          },
          adminResponse: {
            response: adminResult.response?.substring(0, 200) + '...',
            confidence: adminResult.confidence,
            executionTime: adminTime,
            testCaseFound: !!testCases?.[0]
          },
          divergenceScore,
          status,
          details,
          timing: {
            chatTime,
            adminTime
          }
        });

        console.log(`[CROSS-VALIDATION-V2] Query "${query}" - Status: ${status}, Divergence: ${divergenceScore.toFixed(1)}%`);

      } catch (error) {
        console.error(`[CROSS-VALIDATION-V2] Error testing query "${query}":`, error);
        results.push({
          query,
          chatResponse: null,
          adminResponse: null,
          divergenceScore: 100,
          status: 'ERROR',
          details: `Error: ${error.message}`,
          timing: {
            chatTime: 0,
            adminTime: 0
          }
        });
      }

      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
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
      timestamp: new Date().toISOString(),
      avgChatTime: results.reduce((sum, r) => sum + r.timing.chatTime, 0) / results.length,
      avgAdminTime: results.reduce((sum, r) => sum + r.timing.adminTime, 0) / results.length
    };

    // Store quality alert if needed
    if (summary.alertTriggered) {
      try {
        await supabase.from('quality_alerts').insert({
          level: divergentCount > 1 ? 'critical' : 'warning',
          issues: [
            `Cross-validation detected ${divergentCount} divergent responses between /chat and /admin/quality`,
            `${errorCount} queries failed during validation`,
            `Average divergence: ${summary.averageDivergence}%`,
            `Chat avg time: ${summary.avgChatTime.toFixed(0)}ms, Admin avg time: ${summary.avgAdminTime.toFixed(0)}ms`
          ],
          metrics: {
            model,
            divergentQueries: divergentCount,
            avgDivergence: summary.averageDivergence,
            threshold: alertThreshold,
            chatVsAdmin: true
          }
        });
        console.log(`[CROSS-VALIDATION-V2] Quality alert created for ${divergentCount} divergent cases`);
      } catch (alertError) {
        console.error('[CROSS-VALIDATION-V2] Failed to create quality alert:', alertError);
      }
    }

    console.log(`[CROSS-VALIDATION-V2] Completed. Summary:`, summary);

    return new Response(JSON.stringify({
      success: true,
      summary,
      results,
      recommendations: divergentCount > 0 ? [
        'Review divergent queries for inconsistencies between /chat and /admin interfaces',
        'Check parameter standardization between interfaces',
        'Verify cache behavior consistency',
        'Consider model-specific optimizations needed'
      ] : ['Both interfaces are operating consistently']
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[CROSS-VALIDATION-V2] Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});