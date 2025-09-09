-- =====================================================
-- CRITICAL SECURITY FIX: Enable RLS on Public Tables
-- =====================================================
-- This migration addresses the "RLS Disabled in Public" security issue
-- by enabling Row Level Security on all exposed tables and implementing
-- appropriate access policies.

-- =====================================================
-- PHASE 1: ENABLE RLS ON ALL VULNERABLE TABLES
-- =====================================================

-- Critical Content Tables
ALTER TABLE legal_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_anexos ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_hierarchy ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_anexo_references ENABLE ROW LEVEL SECURITY;

-- Knowledge Graph Tables (IP Protection)
ALTER TABLE knowledge_graph_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_graph_edges ENABLE ROW LEVEL SECURITY;

-- Query and User Data Tables
ALTER TABLE agentic_query_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_cache ENABLE ROW LEVEL SECURITY;

-- QA and Performance Tables
ALTER TABLE qa_automated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_token_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_performance_metrics ENABLE ROW LEVEL SECURITY;

-- Backup Table (Admin Only)
ALTER TABLE legal_articles_backup_content ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PHASE 2: LEGAL CONTENT POLICIES (PUBLIC READ)
-- =====================================================

-- Legal Articles: Public read access for processed content
CREATE POLICY "Public can read processed legal articles" 
ON legal_articles FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage legal articles" 
ON legal_articles FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

-- Legal Anexos: Public read access
CREATE POLICY "Public can read legal anexos" 
ON legal_anexos FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage legal anexos" 
ON legal_anexos FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

-- Legal Hierarchy: Public read access
CREATE POLICY "Public can read legal hierarchy" 
ON legal_hierarchy FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage legal hierarchy" 
ON legal_hierarchy FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

-- Article Metadata: Public read access
CREATE POLICY "Public can read article metadata" 
ON article_metadata FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage article metadata" 
ON article_metadata FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

-- Article Anexo References: Public read access
CREATE POLICY "Public can read article anexo references" 
ON article_anexo_references FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage article anexo references" 
ON article_anexo_references FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

-- =====================================================
-- PHASE 3: KNOWLEDGE GRAPH POLICIES (AUTHENTICATED ONLY)
-- =====================================================

-- Knowledge Graph Nodes: Authenticated users only
CREATE POLICY "Authenticated users can read knowledge graph nodes" 
ON knowledge_graph_nodes FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage knowledge graph nodes" 
ON knowledge_graph_nodes FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

-- Knowledge Graph Edges: Authenticated users only
CREATE POLICY "Authenticated users can read knowledge graph edges" 
ON knowledge_graph_edges FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage knowledge graph edges" 
ON knowledge_graph_edges FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

-- =====================================================
-- PHASE 4: USER DATA POLICIES (USER-SPECIFIC ACCESS)
-- =====================================================

-- User Feedback: Users can manage their own feedback
CREATE POLICY "Users can manage their own feedback" 
ON user_feedback FOR ALL 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Supervisors can view all feedback" 
ON user_feedback FOR SELECT 
USING (is_supervisor_or_admin());

-- User Queries: Users can manage their own queries
CREATE POLICY "Users can manage their own queries" 
ON user_queries FOR ALL 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Supervisors can view all user queries" 
ON user_queries FOR SELECT 
USING (is_supervisor_or_admin());

-- =====================================================
-- PHASE 5: CACHE AND ANALYTICS POLICIES 
-- =====================================================

-- Agentic Query Cache: Service role and admins only
CREATE POLICY "Service role can manage agentic query cache" 
ON agentic_query_cache FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Admins can view agentic query cache" 
ON agentic_query_cache FOR SELECT 
USING (is_admin());

-- Validation Cache: Service role and admins only
CREATE POLICY "Service role can manage validation cache" 
ON validation_cache FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Admins can view validation cache" 
ON validation_cache FOR SELECT 
USING (is_admin());

-- =====================================================
-- PHASE 6: QA AND PERFORMANCE POLICIES
-- =====================================================

-- QA Automated Reports: Supervisors and admins only
CREATE POLICY "Supervisors can view QA automated reports" 
ON qa_automated_reports FOR SELECT 
USING (is_supervisor_or_admin());

CREATE POLICY "Admins can manage QA automated reports" 
ON qa_automated_reports FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

-- QA Token Usage: Supervisors and admins only
CREATE POLICY "Supervisors can view QA token usage" 
ON qa_token_usage FOR SELECT 
USING (is_supervisor_or_admin());

CREATE POLICY "Service role can manage QA token usage" 
ON qa_token_usage FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

-- Agent Performance Metrics: System access only
CREATE POLICY "Service role can manage agent performance metrics" 
ON agent_performance_metrics FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Admins can view agent performance metrics" 
ON agent_performance_metrics FOR SELECT 
USING (is_admin());

-- =====================================================
-- PHASE 7: BACKUP TABLE PROTECTION (ADMIN ONLY)
-- =====================================================

-- Legal Articles Backup: Admin only access
CREATE POLICY "Admins only can access backup content" 
ON legal_articles_backup_content FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

-- =====================================================
-- VERIFICATION AND LOGGING
-- =====================================================

-- Log this critical security fix
INSERT INTO audit_log (action, table_name, new_values) 
VALUES (
  'critical_security_fix_rls', 
  'multiple_tables', 
  jsonb_build_object(
    'description', 'Enabled RLS on 14 vulnerable public tables',
    'tables_secured', ARRAY[
      'legal_articles', 'legal_anexos', 'legal_hierarchy', 
      'article_metadata', 'article_anexo_references',
      'knowledge_graph_nodes', 'knowledge_graph_edges',
      'agentic_query_cache', 'user_feedback', 'user_queries',
      'validation_cache', 'qa_automated_reports', 'qa_token_usage',
      'agent_performance_metrics', 'legal_articles_backup_content'
    ],
    'policies_created', 30,
    'security_level', 'CRITICAL_FIX',
    'timestamp', NOW()::text
  )
);

-- Verify RLS is now enabled on all tables
SELECT 
    tablename,
    CASE 
        WHEN rowsecurity = true THEN '✅ RLS ENABLED' 
        ELSE '❌ RLS DISABLED'
    END as security_status
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY 
    CASE WHEN rowsecurity = false THEN 1 ELSE 2 END,
    tablename;