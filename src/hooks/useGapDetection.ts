import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface GapDetectionResult {
  gapDetected: boolean;
  gapId?: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  category?: string;
  topic?: string;
  suggestions?: string[];
  shouldEscalate?: boolean;
}

export interface GapDetectionRequest {
  query: string;
  response?: string;
  confidence: number;
  category?: string;
  sessionId?: string;
  userId?: string;
  modelUsed?: string;
  responseTimeMs?: number;
}

export function useGapDetection() {
  const [isDetecting, setIsDetecting] = useState(false);
  const [lastDetection, setLastDetection] = useState<GapDetectionResult | null>(null);

  const detectGap = useCallback(async (request: GapDetectionRequest): Promise<GapDetectionResult> => {
    setIsDetecting(true);
    
    try {
      console.log('Gap detection request:', request);
      
      const { data, error } = await supabase.functions.invoke('gap-detector', {
        body: request
      });

      if (error) {
        console.error('Gap detection error:', error);
        throw error;
      }

      console.log('Gap detection response:', data);

      const result: GapDetectionResult = {
        gapDetected: data.gapDetected || false,
        gapId: data.gap?.id,
        severity: data.gap?.severity,
        category: data.gap?.category,
        topic: data.gap?.topic,  
        suggestions: data.gap?.suggestions,
        shouldEscalate: data.gap?.shouldEscalate
      };

      setLastDetection(result);
      return result;

    } catch (error) {
      console.error('Error in gap detection:', error);
      
      // Return a fallback result instead of throwing
      const fallbackResult: GapDetectionResult = {
        gapDetected: false
      };
      
      setLastDetection(fallbackResult);
      return fallbackResult;
    } finally {
      setIsDetecting(false);
    }
  }, []);

  const monitorConfidence = useCallback(async (
    query: string,
    response: string,
    confidence: number,
    metadata?: {
      category?: string;
      sessionId?: string;
      userId?: string;
      modelUsed?: string;
      responseTimeMs?: number;
    }
  ): Promise<GapDetectionResult> => {
    
    // Only trigger gap detection if confidence is below threshold
    const confidenceThreshold = 0.60;
    
    if (confidence >= confidenceThreshold) {
      const result: GapDetectionResult = { gapDetected: false };
      setLastDetection(result);
      return result;
    }

    // Trigger gap detection for low confidence responses
    return await detectGap({
      query,
      response,
      confidence,
      category: metadata?.category,
      sessionId: metadata?.sessionId,
      userId: metadata?.userId,
      modelUsed: metadata?.modelUsed,
      responseTimeMs: metadata?.responseTimeMs
    });
  }, [detectGap]);

  const checkGapStatus = useCallback(async (gapId: string) => {
    try {
      const { data, error } = await supabase
        .from('knowledge_gaps')
        .select('*')
        .eq('id', gapId)
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error checking gap status:', error);
      return null;
    }
  }, []);

  const reportGapFeedback = useCallback(async (
    gapId: string, 
    feedback: 'helpful' | 'not_helpful' | 'resolved',
    notes?: string
  ) => {
    try {
      // Log user feedback on gap detection
      await supabase
        .from('confidence_monitoring')
        .update({
          user_feedback_score: feedback === 'helpful' ? 5 : feedback === 'not_helpful' ? 1 : 3,
          metadata: {
            feedback_notes: notes,
            feedback_type: feedback
          }
        })
        .eq('gap_id', gapId);

      console.log('Gap feedback reported:', { gapId, feedback, notes });
    } catch (error) {
      console.error('Error reporting gap feedback:', error);
    }
  }, []);

  return {
    detectGap,
    monitorConfidence,
    checkGapStatus,
    reportGapFeedback,
    isDetecting,
    lastDetection
  };
}