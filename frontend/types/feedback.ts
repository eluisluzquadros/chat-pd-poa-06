export interface MessageFeedback {
  id: string;
  message_id: string;
  session_id: string;
  user_id?: string;
  model: string;
  helpful: boolean;
  comment?: string;
  created_at: string;
  updated_at?: string;
}

export interface FeedbackMetrics {
  total_feedback: number;
  helpful_count: number;
  unhelpful_count: number;
  helpful_percentage: number;
  avg_rating: number;
  comment_count: number;
}

export interface ModelFeedbackStats {
  model: string;
  total_feedback: number;
  helpful_percentage: number;
  unhelpful_count: number;
  avg_session_satisfaction: number;
  recent_feedback: MessageFeedback[];
}

export interface FeedbackAlert {
  id: string;
  message_id: string;
  session_id: string;
  model: string;
  alert_type: 'low_rating' | 'negative_feedback' | 'spam_detection';
  severity: 'low' | 'medium' | 'high' | 'critical';
  comment?: string;
  created_at: string;
  resolved: boolean;
  resolved_by?: string;
  resolved_at?: string;
}

export interface FeedbackFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  model?: string;
  helpful?: boolean | null;
  hasComment?: boolean;
  userId?: string;
  sessionId?: string;
}

export interface DashboardMetrics {
  overview: FeedbackMetrics;
  byModel: ModelFeedbackStats[];
  trends: {
    date: string;
    helpful: number;
    unhelpful: number;
    total: number;
  }[];
  recentAlerts: FeedbackAlert[];
  topIssues: {
    issue: string;
    count: number;
    model: string;
  }[];
}