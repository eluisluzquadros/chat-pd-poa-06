import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface KnowledgeGap {
  id: string;
  category: string;
  description: string;
  confidence: number;
  created_at: string;
}

export interface GapDetectionResult {
  id: string;
  category: string;
  description: string;
  confidence: number;
  created_at: string;
  gapDetected?: boolean;
  severity?: string;
  topic?: string;
  suggestions?: string[];
  shouldEscalate?: boolean;
}

export function useGapDetection() {
  const [gaps, setGaps] = useState<KnowledgeGap[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const detectGaps = async () => {
    setIsLoading(true);
    try {
      // Simulate gap detection logic
      const mockGaps: KnowledgeGap[] = [
        {
          id: '1',
          category: 'SQL',
          description: 'Consultas complexas com múltiplas junções',
          confidence: 0.8,
          created_at: new Date().toISOString()
        }
      ];
      
      setGaps(mockGaps);
    } catch (error) {
      console.error('Error detecting gaps:', error);
      toast.error('Erro ao detectar gaps de conhecimento');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    detectGaps();
  }, []);

  return {
    gaps,
    isLoading,
    detectGaps
  };
}