import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface QualityDashboardData {
  runId: string;
  actualAnswer: string;
  expectedAnswer: string;
  expectedKeywords: string[];
  question: string;
  category: string;
  isCorrect: boolean;
  accuracyScore: number;
  calculatedAccuracy: number;
  discrepancy: number;
  manualReview: boolean;
}

export function useQualityDashboard() {
  const [isLoading, setIsLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState<QualityDashboardData[]>([]);
  const [reviewQueue, setReviewQueue] = useState<QualityDashboardData[]>([]);

  const loadQualityDashboard = async (runId?: string) => {
    setIsLoading(true);
    try {
      console.log('[QualityDashboard] Loading dashboard data for runId:', runId);

      // Get validation results with test case details - use correct foreign key
      let query = supabase
        .from('qa_validation_results')
        .select(`
          *
        `)
        .order('created_at', { ascending: false });

      if (runId) {
        query = query.eq('validation_run_id', runId);
      } else {
        // Get recent results from last 5 runs
        const { data: recentRuns } = await supabase
          .from('qa_validation_runs')
          .select('id')
          .order('started_at', { ascending: false })
          .limit(5);

        if (recentRuns?.length) {
          const runIds = recentRuns.map(r => r.id);
          query = query.in('validation_run_id', runIds);
        }
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;

      // Now get test cases for each result
      const testCaseIds = [...new Set((data || []).map(r => parseInt(r.test_case_id)))].filter(id => !isNaN(id));
      const { data: testCases, error: testCaseError } = await supabase
        .from('qa_test_cases')
        .select('*')
        .in('id', testCaseIds);

      if (testCaseError) throw testCaseError;

      // Create a map for quick lookup
      const testCaseMap = new Map();
      (testCases || []).forEach(tc => {
        testCaseMap.set(tc.id.toString(), tc);
      });

      // Process data for quality analysis
      const processedData: QualityDashboardData[] = (data || []).map(result => {
        const testCase = testCaseMap.get(result.test_case_id) || {
          question: 'Pergunta não encontrada',
          query: '',
          expected_answer: '',
          expected_keywords: [],
          category: 'unknown'
        };
        
        const actualAnswer = result.actual_answer || '';
        const expectedAnswer = testCase.expected_answer || '';
        const expectedKeywords = testCase.expected_keywords || [];

        // Recalculate accuracy with enhanced method
        const calculatedAccuracy = calculateEnhancedAccuracy(
          actualAnswer,
          expectedKeywords,
          expectedAnswer,
          testCase.category
        );

        const originalAccuracy = result.accuracy_score || 0;
        const discrepancy = Math.abs(calculatedAccuracy - originalAccuracy);

        return {
          runId: result.validation_run_id,
          actualAnswer,
          expectedAnswer,
          expectedKeywords,
          question: testCase.question || testCase.query,
          category: testCase.category,
          isCorrect: result.is_correct,
          accuracyScore: originalAccuracy,
          calculatedAccuracy,
          discrepancy,
          manualReview: discrepancy > 0.3 || (result.is_correct && calculatedAccuracy < 0.5)
        };
      });

      setDashboardData(processedData);

      // Filter items that need manual review
      const needsReview = processedData.filter(item => item.manualReview);
      setReviewQueue(needsReview);

      console.log(`[QualityDashboard] Loaded ${processedData.length} results, ${needsReview.length} need review`);

    } catch (error) {
      console.error('[QualityDashboard] Error loading data:', error);
      toast.error('Erro ao carregar dashboard de qualidade');
    } finally {
      setIsLoading(false);
    }
  };

  const markAsReviewed = async (resultId: string, isCorrect: boolean, notes?: string) => {
    try {
      // Update the result with manual review
      const { error } = await supabase
        .from('qa_validation_results')
        .update({
          is_correct: isCorrect,
          error_details: notes ? `Manual review: ${notes}` : 'Manually reviewed'
        })
        .eq('id', resultId);

      if (error) throw error;

      // Remove from review queue
      setReviewQueue(prev => prev.filter(item => item.runId !== resultId));
      
      toast.success('Item marcado como revisado');
    } catch (error) {
      console.error('[QualityDashboard] Error marking as reviewed:', error);
      toast.error('Erro ao marcar como revisado');
    }
  };

  const generateQualityReport = () => {
    const totalItems = dashboardData.length;
    const highDiscrepancy = dashboardData.filter(item => item.discrepancy > 0.4).length;
    const needsReview = reviewQueue.length;
    const avgDiscrepancy = totalItems > 0 
      ? dashboardData.reduce((sum, item) => sum + item.discrepancy, 0) / totalItems
      : 0;

    return {
      totalItems,
      highDiscrepancy,
      needsReview,
      avgDiscrepancy: Math.round(avgDiscrepancy * 100),
      qualityScore: Math.max(0, 100 - (highDiscrepancy / totalItems * 100))
    };
  };

  return {
    isLoading,
    dashboardData,
    reviewQueue,
    loadQualityDashboard,
    markAsReviewed,
    generateQualityReport
  };
}

// Enhanced accuracy calculation function
function calculateEnhancedAccuracy(
  actualAnswer: string,
  expectedKeywords: string[],
  expectedAnswer: string,
  category: string
): number {
  // Use the enhanced template filtering
  const cleanActual = removePromotionalTemplate(actualAnswer);
  
  if (expectedKeywords?.length > 0) {
    const normalizedKeywords = expectedKeywords.map(k => k.toLowerCase().trim());
    const actualLower = cleanActual.toLowerCase();
    
    const matchedKeywords = normalizedKeywords.filter(keyword => 
      actualLower.includes(keyword) || 
      keyword.split(' ').some(word => word.length > 3 && actualLower.includes(word))
    );
    
    return matchedKeywords.length / normalizedKeywords.length;
  }
  
  // Fallback to text similarity
  if (expectedAnswer) {
    const expectedLower = expectedAnswer.toLowerCase();
    const actualLower = cleanActual.toLowerCase();
    
    const expectedWords = expectedLower.split(/\s+/).filter(w => w.length > 3);
    const actualWords = actualLower.split(/\s+/);
    
    const matches = expectedWords.filter(word => 
      actualWords.some(actual => actual.includes(word) || word.includes(actual))
    );
    
    return expectedWords.length > 0 ? matches.length / expectedWords.length : 0;
  }
  
  return 0;
}

// Template filtering function (duplicated to avoid circular imports)
function removePromotionalTemplate(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/📍.*?Explore mais:.*?$/gm, '')
    .replace(/💬.*?Dúvidas\?.*?$/gm, '')
    .replace(/https:\/\/bit\.ly\/\w+\s*↗\s*↗/g, '')
    .replace(/Contribua com sugestões:.*$/gm, '')
    .replace(/Participe da Audiência Pública:.*$/gm, '')
    .replace(/Mapa com Regras Construtivas:.*$/gm, '')
    .replace(/planodiretor@portoalegre\.rs\.gov\.br/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s{2,}/g, ' ')
    .trim();
}