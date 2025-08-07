import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Feedback {
  id: string;
  helpful: boolean;
  comment?: string;
  created_at: string;
  message_id: string;
  model: string;
  session_id: string;
  user_id?: string;
}

export interface FeedbackMetrics {
  totalFeedback: number;
  positiveFeedback: number;
  negativeFeedback: number;
  satisfactionRate: number;
  total_feedback: number;
  helpful_percentage: number;
}

export function useFeedback() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchFeedbacks = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('message_feedback')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      setFeedbacks(data || []);
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
      toast.error('Erro ao carregar feedbacks');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const submitFeedback = async (feedback: Omit<Feedback, 'id' | 'created_at'>) => {
    try {
      const { error } = await supabase
        .from('message_feedback')
        .insert(feedback);
      
      if (error) throw error;
      
      await fetchFeedbacks();
      toast.success('Feedback enviado com sucesso');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Erro ao enviar feedback');
    }
  };

  const getFeedbackMetrics = async (): Promise<FeedbackMetrics> => {
    try {
      const { data } = await supabase
        .from('message_feedback')
        .select('helpful');
      
      const total = data?.length || 0;
      const positive = data?.filter(f => f.helpful).length || 0;
      const negative = total - positive;
      
      return {
        totalFeedback: total,
        positiveFeedback: positive,
        negativeFeedback: negative,
        satisfactionRate: total > 0 ? positive / total : 0,
        total_feedback: total,
        helpful_percentage: total > 0 ? (positive / total) * 100 : 0
      };
    } catch (error) {
      console.error('Error getting feedback metrics:', error);
      return {
        totalFeedback: 0,
        positiveFeedback: 0,
        negativeFeedback: 0,
        satisfactionRate: 0,
        total_feedback: 0,
        helpful_percentage: 0
      };
    }
  };

  return {
    feedbacks,
    isLoading,
    refetch: fetchFeedbacks,
    submitFeedback,
    getFeedbackMetrics
  };
}