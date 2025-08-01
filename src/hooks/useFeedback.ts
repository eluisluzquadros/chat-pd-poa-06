import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuthContext } from '@/context/auth/useAuthContext';
import { MessageFeedback, FeedbackMetrics, FeedbackFilters } from '@/types/feedback';

export function useFeedback() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuthContext();

  const submitFeedback = async (
    messageId: string,
    sessionId: string,
    model: string,
    helpful: boolean,
    comment?: string
  ) => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para dar feedback",
        variant: "destructive",
      });
      return false;
    }

    setIsLoading(true);
    
    const feedbackData = {
      message_id: messageId,
      session_id: sessionId,
      model: model,
      helpful: helpful,
      comment: comment || null,
    };
    
    try {
      const { error } = await supabase
        .from('message_feedback')
        .insert(feedbackData);

      if (error) throw error;

      toast({
        title: "Obrigado pelo feedback!",
        description: "Seu feedback nos ajuda a melhorar o sistema.",
      });

      // Trigger alert check for negative feedback
      if (!helpful) {
        await checkAndCreateAlert(messageId, sessionId, model, comment);
      }

      return true;
    } catch (error) {
      console.error('Erro ao enviar feedback:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar o feedback. Tente novamente.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const checkAndCreateAlert = async (
    messageId: string,
    sessionId: string,
    model: string,
    comment?: string
  ) => {
    try {
      // Check if this session has multiple negative feedbacks
      const { data: sessionFeedbacks } = await supabase
        .from('message_feedback')
        .select('*')
        .eq('session_id', sessionId)
        .eq('helpful', false);

      const severity = sessionFeedbacks && sessionFeedbacks.length >= 3 ? 'high' : 'medium';

      // Create alert
      await supabase
        .from('feedback_alerts')
        .insert({
          message_id: messageId,
          session_id: sessionId,
          model: model,
          alert_type: 'negative_feedback',
          severity: severity,
          comment: comment,
          resolved: false
        });
    } catch (error) {
      console.error('Error creating feedback alert:', error);
    }
  };

  const getFeedback = async (filters?: FeedbackFilters): Promise<MessageFeedback[]> => {
    setIsLoading(true);
    
    let query = supabase
      .from('message_feedback')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.dateRange) {
      query = query
        .gte('created_at', filters.dateRange.start.toISOString())
        .lte('created_at', filters.dateRange.end.toISOString());
    }

    if (filters?.model) {
      query = query.eq('model', filters.model);
    }

    if (filters?.helpful !== undefined && filters?.helpful !== null) {
      query = query.eq('helpful', filters.helpful);
    }

    if (filters?.hasComment) {
      query = query.not('comment', 'is', null);
    }

    if (filters?.sessionId) {
      query = query.eq('session_id', filters.sessionId);
    }

    try {
      const { data, error } = await query;
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error fetching feedback:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os feedbacks.",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const getFeedbackMetrics = async (filters?: FeedbackFilters): Promise<FeedbackMetrics | null> => {
    try {
      const feedbacks = await getFeedback(filters);
      
      if (feedbacks.length === 0) {
        return {
          total_feedback: 0,
          helpful_count: 0,
          unhelpful_count: 0,
          helpful_percentage: 0,
          avg_rating: 0,
          comment_count: 0
        };
      }

      const helpful_count = feedbacks.filter(f => f.helpful).length;
      const unhelpful_count = feedbacks.filter(f => !f.helpful).length;
      const comment_count = feedbacks.filter(f => f.comment && f.comment.trim() !== '').length;
      
      return {
        total_feedback: feedbacks.length,
        helpful_count,
        unhelpful_count,
        helpful_percentage: (helpful_count / feedbacks.length) * 100,
        avg_rating: helpful_count / feedbacks.length,
        comment_count
      };
    } catch (error) {
      console.error('Error calculating metrics:', error);
      return null;
    }
  };

  return {
    submitFeedback,
    getFeedback,
    getFeedbackMetrics,
    isLoading
  };
}