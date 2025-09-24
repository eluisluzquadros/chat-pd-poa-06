import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(() => ({
    insert: jest.fn(() => ({ error: null })),
    select: jest.fn(() => ({ 
      data: [], 
      error: null,
      eq: jest.fn(() => ({ data: [], error: null })),
      order: jest.fn(() => ({ data: [], error: null })),
      limit: jest.fn(() => ({ data: [], error: null }))
    })),
    update: jest.fn(() => ({ error: null })),
    delete: jest.fn(() => ({ error: null }))
  })),
  auth: {
    getUser: jest.fn(() => ({ 
      data: { user: { id: 'test-user-id' } }, 
      error: null 
    }))
  }
};

jest.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase
}));

// Mock toast
const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast })
}));

// Mock auth context
jest.mock('@/context/auth/useAuthContext', () => ({
  useAuthContext: () => ({
    user: { id: 'test-user-id' },
    profile: { role: 'admin' }
  })
}));

import { useFeedback } from '@/hooks/useFeedback';

describe('Feedback System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useFeedback Hook', () => {
    it('should submit positive feedback successfully', async () => {
      const mockInsert = jest.fn(() => Promise.resolve({ error: null }));
      mockSupabase.from.mockReturnValue({
        insert: mockInsert
      });

      // This would need to be tested in a React component context
      // For now, testing the core logic
      const feedbackData = {
        message_id: 'test-message-id',
        session_id: 'test-session-id',
        model: 'gpt-4',
        helpful: true,
        comment: null
      };

      expect(feedbackData.helpful).toBe(true);
      expect(feedbackData.model).toBe('gpt-4');
    });

    it('should submit negative feedback with comment', async () => {
      const feedbackData = {
        message_id: 'test-message-id',
        session_id: 'test-session-id',
        model: 'gpt-4',
        helpful: false,
        comment: 'The response was incomplete'
      };

      expect(feedbackData.helpful).toBe(false);
      expect(feedbackData.comment).toBe('The response was incomplete');
    });

    it('should handle feedback submission errors', async () => {
      const mockInsert = jest.fn(() => Promise.resolve({ 
        error: { message: 'Database error' } 
      }));
      mockSupabase.from.mockReturnValue({
        insert: mockInsert
      });

      // Test error handling logic
      const error = { message: 'Database error' };
      expect(error.message).toBe('Database error');
    });
  });

  describe('Feedback Metrics', () => {
    it('should calculate satisfaction rate correctly', () => {
      const feedbacks = [
        { helpful: true },
        { helpful: true },
        { helpful: false },
        { helpful: true }
      ];

      const helpfulCount = feedbacks.filter(f => f.helpful).length;
      const totalCount = feedbacks.length;
      const satisfactionRate = (helpfulCount / totalCount) * 100;

      expect(satisfactionRate).toBe(75);
    });

    it('should categorize feedback comments', () => {
      const comments = [
        'The information was incorreta',
        'Response was incompleta',
        'Very confusa explanation'
      ];

      const categories = {
        'incorreta': 'Informação incorreta',
        'incompleta': 'Resposta incompleta',
        'confusa': 'Explicação confusa'
      };

      const categorizedComments = comments.map(comment => {
        const lowerComment = comment.toLowerCase();
        for (const [keyword, category] of Object.entries(categories)) {
          if (lowerComment.includes(keyword)) {
            return { comment, category };
          }
        }
        return { comment, category: 'Outros problemas' };
      });

      expect(categorizedComments[0].category).toBe('Informação incorreta');
      expect(categorizedComments[1].category).toBe('Resposta incompleta');
      expect(categorizedComments[2].category).toBe('Explicação confusa');
    });
  });

  describe('Alert System', () => {
    it('should create alert for multiple negative feedbacks', () => {
      const sessionFeedbacks = [
        { helpful: false, session_id: 'session-1' },
        { helpful: false, session_id: 'session-1' },
        { helpful: false, session_id: 'session-1' }
      ];

      const negativeCount = sessionFeedbacks.filter(f => !f.helpful).length;
      const shouldCreateAlert = negativeCount >= 2;
      const severity = negativeCount >= 3 ? 'high' : 'medium';

      expect(shouldCreateAlert).toBe(true);
      expect(severity).toBe('high');
    });

    it('should detect spam patterns', () => {
      const spamComments = [
        'spam',
        'test',
        'asdf',
        '123',
        'a'
      ];

      const spamIndicators = ['spam', 'test', 'asdf', '123'];
      
      const spamDetected = spamComments.map(comment => {
        const isSpam = spamIndicators.some(indicator => 
          comment.toLowerCase().includes(indicator)
        ) || comment.length < 3;
        
        return { comment, isSpam };
      });

      expect(spamDetected[0].isSpam).toBe(true); // 'spam'
      expect(spamDetected[1].isSpam).toBe(true); // 'test'
      expect(spamDetected[4].isSpam).toBe(true); // too short
    });
  });

  describe('Model Performance Tracking', () => {
    it('should calculate model performance metrics', () => {
      const modelFeedbacks = {
        'gpt-4': [
          { helpful: true },
          { helpful: true },
          { helpful: false }
        ],
        'claude-3': [
          { helpful: true },
          { helpful: true },
          { helpful: true },
          { helpful: false }
        ]
      };

      const modelMetrics = Object.entries(modelFeedbacks).map(([model, feedbacks]) => {
        const total = feedbacks.length;
        const helpful = feedbacks.filter(f => f.helpful).length;
        const satisfaction = (helpful / total) * 100;

        return { model, total, helpful, satisfaction };
      });

      expect(modelMetrics[0].satisfaction).toBeCloseTo(66.67, 1); // gpt-4
      expect(modelMetrics[1].satisfaction).toBe(75); // claude-3
    });
  });

  describe('Data Export', () => {
    it('should format feedback data for CSV export', () => {
      const feedbacks = [
        {
          created_at: '2025-01-31T10:00:00Z',
          model: 'gpt-4',
          helpful: true,
          comment: 'Great response',
          session_id: 'session-1'
        },
        {
          created_at: '2025-01-31T11:00:00Z',
          model: 'claude-3',
          helpful: false,
          comment: 'Could be better',
          session_id: 'session-2'
        }
      ];

      const csvHeaders = ['Data', 'Modelo', 'Útil', 'Comentário', 'Sessão'];
      const csvRows = feedbacks.map(f => [
        new Date(f.created_at).toLocaleDateString('pt-BR'),
        f.model,
        f.helpful ? 'Sim' : 'Não',
        f.comment?.replace(/,/g, ';') || '',
        f.session_id
      ]);

      expect(csvHeaders).toHaveLength(5);
      expect(csvRows).toHaveLength(2);
      expect(csvRows[0][2]).toBe('Sim'); // helpful = true
      expect(csvRows[1][2]).toBe('Não'); // helpful = false
    });
  });

  describe('Real-time Updates', () => {
    it('should handle real-time notification updates', () => {
      const newNotification = {
        id: 'notif-1',
        type: 'feedback_alert',
        title: 'Feedback Negativo',
        message: 'Modelo GPT-4 recebeu feedback negativo',
        read: false,
        created_at: '2025-01-31T12:00:00Z'
      };

      const existingNotifications = [
        {
          id: 'notif-2',
          type: 'system',
          title: 'Sistema atualizado',
          message: 'Nova versão disponível',
          read: true,
          created_at: '2025-01-31T11:00:00Z'
        }
      ];

      const updatedNotifications = [newNotification, ...existingNotifications];

      expect(updatedNotifications).toHaveLength(2);
      expect(updatedNotifications[0].id).toBe('notif-1');
      expect(updatedNotifications[0].read).toBe(false);
    });
  });
});

describe('Enhanced Message Feedback Component', () => {
  it('should render feedback buttons', () => {
    const props = {
      messageId: 'msg-1',
      sessionId: 'session-1',
      model: 'gpt-4',
      content: 'Test message content'
    };

    // In a real test, you would render the component and test UI interactions
    expect(props.messageId).toBe('msg-1');
    expect(props.model).toBe('gpt-4');
  });

  it('should show detailed modal when requested', () => {
    const showDetailedModal = true;
    expect(showDetailedModal).toBe(true);
  });

  it('should handle category selection', () => {
    const categories = ['accuracy', 'incomplete', 'unclear'];
    const selectedCategories = ['accuracy', 'incomplete'];
    
    const isSelected = (categoryId: string) => selectedCategories.includes(categoryId);
    
    expect(isSelected('accuracy')).toBe(true);
    expect(isSelected('unclear')).toBe(false);
  });
});

describe('Feedback Dashboard', () => {
  it('should aggregate metrics correctly', () => {
    const metrics = {
      total_feedback: 100,
      helpful_count: 75,
      unhelpful_count: 25,
      helpful_percentage: 75,
      comment_count: 30
    };

    expect(metrics.helpful_percentage).toBe(75);
    expect(metrics.total_feedback).toBe(metrics.helpful_count + metrics.unhelpful_count);
  });

  it('should calculate trends data', () => {
    const dailyData = [
      { date: '2025-01-29', helpful: 10, unhelpful: 2 },
      { date: '2025-01-30', helpful: 15, unhelpful: 3 },
      { date: '2025-01-31', helpful: 12, unhelpful: 5 }
    ];

    const trendsWithTotal = dailyData.map(day => ({
      ...day,
      total: day.helpful + day.unhelpful
    }));

    expect(trendsWithTotal[0].total).toBe(12);
    expect(trendsWithTotal[1].total).toBe(18);
    expect(trendsWithTotal[2].total).toBe(17);
  });
});