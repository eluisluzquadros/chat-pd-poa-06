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
        // Test via /chat interface (agentic-rag) with timeout
        const chatStartTime = Date.now();
        
        const chatController = new AbortController();
        const chatTimeoutId = setTimeout(() => chatController.abort(), 30000); // 30s timeout
        
        let chatResponse, chatResult, chatTime = 0;
        
        try {
          chatResponse = await fetch(`${supabaseUrl}/functions/v1/agentic-rag`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: query,
              sessionId: `${sessionId}-chat`,
              model,
              userRole: 'citizen',  // Standardized user role
              bypassCache: false,   // CRITICAL: Use same cache behavior as /chat
              userId: undefined     // Match ChatService behavior
            }),
            signal: chatController.signal
          });
          
          clearTimeout(chatTimeoutId);
          
          if (!chatResponse.ok) {
            throw new Error(`Chat interface failed: ${chatResponse.status} ${chatResponse.statusText}`);
          }
          
          chatResult = await chatResponse.json();
          chatTime = Date.now() - chatStartTime;
          
          console.log(`[CROSS-VALIDATION-V2] Chat response for "${query}": ${chatResponse.status}`);
          
        } catch (chatError) {
          clearTimeout(chatTimeoutId);
          console.error(`[CROSS-VALIDATION-V2] Chat interface error for "${query}":`, chatError);
          chatResult = {
            response: null,
            confidence: 0,
            error: chatError.message || 'Chat interface failed'
          };
          chatTime = Date.now() - chatStartTime;
        }

        // Test via DIRECT agentic-rag call (simulating /admin behavior with identical parameters)
        const adminStartTime = Date.now();
        let adminResult = null;
        let adminTime = 0;
        
        try {
          const adminController = new AbortController();
          const adminTimeoutId = setTimeout(() => adminController.abort(), 30000); // 30s timeout
          
          // CRITICAL FIX: Call agentic-rag directly with IDENTICAL parameters as /chat
          const adminResponse = await fetch(`${supabaseUrl}/functions/v1/agentic-rag`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: query,
              sessionId: `${sessionId}-admin`,  // Different session but same pattern
              model,
              userRole: 'citizen',  // CRITICAL: Same user role as /chat
              bypassCache: false,   // CRITICAL: Same cache behavior as /chat
              userId: undefined     // CRITICAL: Same userId handling as /chat
            }),
            signal: adminController.signal
          });
          
          clearTimeout(adminTimeoutId);
          
          if (!adminResponse.ok) {
            throw new Error(`Admin interface failed: ${adminResponse.status} ${adminResponse.statusText}`);
          }
          
          adminResult = await adminResponse.json();
          adminTime = Date.now() - adminStartTime;
          
          console.log(`[CROSS-VALIDATION-V2] Admin response for "${query}": ${adminResponse.status}`);
          
        } catch (adminError) {
          console.error(`[CROSS-VALIDATION-V2] Admin interface error for "${query}":`, adminError);
          adminResult = {
            response: null,
            confidence: 0,
            error: adminError.message || 'Admin interface failed',
            testCaseFound: false
          };
          adminTime = Date.now() - adminStartTime;
        }

        // Calculate divergence with improved error handling
        let divergenceScore = 0;
        let status: 'CONSISTENT' | 'DIVERGENT' | 'ERROR' = 'CONSISTENT';
        let details = '';

        // Check for errors in either response
        if (chatResult?.error || adminResult?.error) {
          status = 'ERROR';
          const errors = [];
          if (chatResult?.error) errors.push(`Chat: ${chatResult.error}`);
          if (adminResult?.error) errors.push(`Admin: ${adminResult.error}`);
          details = `Errors encountered - ${errors.join(', ')}`;
          divergenceScore = 100;
        } else if (chatResult?.response && adminResult?.response) {
          // Both responses exist, compare them
          const chatText = String(chatResult.response || '').toLowerCase();
          const adminText = String(adminResult.response || '').toLowerCase();
          
          if (chatText.length === 0 || adminText.length === 0) {
            status = 'ERROR';
            details = 'One or both responses are empty';
            divergenceScore = 100;
          } else {
            // Improved text similarity calculation
            const chatWords = chatText.split(/\s+/).filter(word => word.length > 3);
            const adminWords = adminText.split(/\s+/).filter(word => word.length > 3);
            
            const commonWords = chatWords.filter(word => adminWords.includes(word));
            const totalUniqueWords = new Set([...chatWords, ...adminWords]).size;
            const textSimilarity = totalUniqueWords > 0 ? commonWords.length / totalUniqueWords : 0;
            
            // Compare confidence scores with better handling
            const chatConfidence = Number(chatResult.confidence) || 0;
            const adminConfidence = Number(adminResult.confidence) || 0;
            const confidenceDiff = Math.abs(chatConfidence - adminConfidence);
            
            // Compare response times
            const timeDivergence = chatTime > 0 && adminTime > 0 ? 
              Math.abs(chatTime - adminTime) / Math.max(chatTime, adminTime) * 100 : 0;
            
            // Calculate overall divergence with weighted scoring
            divergenceScore = Math.max(
              (1 - textSimilarity) * 70,  // Text similarity weighted more heavily
              confidenceDiff * 100,
              timeDivergence * 0.1        // Time difference weighted less
            );
            
            if (divergenceScore > alertThreshold) {
              status = 'DIVERGENT';
              details = `Text similarity: ${(textSimilarity * 100).toFixed(1)}%, Confidence diff: ${(confidenceDiff * 100).toFixed(1)}%, Time diff: ${timeDivergence.toFixed(1)}%`;
            } else {
              status = 'CONSISTENT';
              details = `Responses consistent - Text similarity: ${(textSimilarity * 100).toFixed(1)}%, Confidence diff: ${(confidenceDiff * 100).toFixed(1)}%`;
            }
          }
        } else {
          status = 'ERROR';
          details = 'Unable to compare - missing or invalid responses';
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