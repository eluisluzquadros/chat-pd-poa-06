-- Tabela para armazenar análises de gaps de conhecimento
CREATE TABLE IF NOT EXISTS knowledge_gap_analysis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gap_id TEXT NOT NULL,
  category TEXT NOT NULL,
  topic TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  analysis TEXT NOT NULL,
  failed_test_count INTEGER NOT NULL DEFAULT 0,
  suggested_action TEXT,
  status TEXT CHECK (status IN ('analyzed', 'in_progress', 'resolved')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para conteúdo pendente de revisão
CREATE TABLE IF NOT EXISTS pending_knowledge_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  topic TEXT NOT NULL,
  content TEXT NOT NULL,
  gap_severity TEXT CHECK (gap_severity IN ('critical', 'high', 'medium', 'low')),
  status TEXT CHECK (status IN ('pending_review', 'approved', 'rejected', 'applied')),
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewer_id UUID REFERENCES auth.users(id),
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_knowledge_gap_analysis_status ON knowledge_gap_analysis(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_gap_analysis_severity ON knowledge_gap_analysis(severity);
CREATE INDEX IF NOT EXISTS idx_pending_knowledge_updates_status ON pending_knowledge_updates(status);

-- RLS
ALTER TABLE knowledge_gap_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_knowledge_updates ENABLE ROW LEVEL SECURITY;

-- Políticas para admin
CREATE POLICY "Admin can view all knowledge gap analysis" ON knowledge_gap_analysis
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admin can manage pending knowledge updates" ON pending_knowledge_updates
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );