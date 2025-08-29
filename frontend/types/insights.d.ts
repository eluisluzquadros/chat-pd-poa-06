
export interface Metric {
  id: string;
  document_id: string | null;
  metric_type: string;
  value: any;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface Recommendation {
  id: string;
  document_id: string | null;
  title: string;
  description: string;
  priority: 'alta' | 'media' | 'baixa';
  tags: string[];
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface Insight {
  id: string;
  document_id: string | null;
  title: string;
  description: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}
