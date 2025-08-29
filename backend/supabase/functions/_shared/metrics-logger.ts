/**
 * SISTEMA DE LOGGING DE MÉTRICAS PARA AGENTIC-RAG V3
 * 
 * Utilitário compartilhado para coleta automática de métricas
 * em todas as Edge Functions do sistema RAG.
 * 
 * Funcionalidades:
 * - Rastreamento de latência por componente
 * - Coleta de tokens e custos estimados
 * - Logging de confiança e qualidade
 * - Sistema de alertas automáticos
 * - Integração com A/B testing
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

export interface MetricsData {
  sessionId?: string;
  userId?: string;
  ragVersion: string;
  queryText: string;
  queryCategory?: string;
  totalLatency: number;
  analyzerLatency?: number;
  sqlGeneratorLatency?: number;
  vectorSearchLatency?: number;
  synthesizerLatency?: number;
  confidenceScore?: number;
  hasResults: boolean;
  resultCount: number;
  refinementCount?: number;
  totalTokens?: number;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCost?: number;
  status: 'success' | 'error' | 'timeout';
  errorMessage?: string;
  errorCode?: string;
  llmModel?: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface FeedbackData {
  sessionId?: string;
  userId?: string;
  metricId?: string;
  rating?: number;
  isHelpful?: boolean;
  isAccurate?: boolean;
  isComplete?: boolean;
  feedbackText?: string;
  feedbackCategory?: string;
  problemType?: string;
  expectedResult?: string;
  feedbackSource?: string;
  userAgent?: string;
  ipAddress?: string;
}

export class MetricsLogger {
  private supabase: SupabaseClient;
  private startTime: number;
  private componentTimes: Map<string, number> = new Map();
  private ragVersion: string;
  private sessionId?: string;
  private userId?: string;

  constructor(supabase: SupabaseClient, ragVersion: string = 'v3', sessionId?: string, userId?: string) {
    this.supabase = supabase;
    this.ragVersion = ragVersion;
    this.sessionId = sessionId;
    this.userId = userId;
    this.startTime = Date.now();
  }

  // Marcar início de componente
  startComponent(componentName: string): void {
    this.componentTimes.set(`${componentName}_start`, Date.now());
  }

  // Marcar fim de componente
  endComponent(componentName: string): number {
    const startKey = `${componentName}_start`;
    const startTime = this.componentTimes.get(startKey);
    if (!startTime) {
      console.warn(`⚠️ Component ${componentName} not started`);
      return 0;
    }
    
    const duration = Date.now() - startTime;
    this.componentTimes.set(componentName, duration);
    this.componentTimes.delete(startKey);
    return duration;
  }

  // Calcular custo estimado baseado em tokens
  calculateEstimatedCost(tokens: number, model: string): number {
    // Preços aproximados por 1K tokens (input + output médio)
    const modelPrices: { [key: string]: number } = {
      'gpt-4': 0.06,
      'gpt-4-turbo': 0.03,
      'gpt-3.5-turbo': 0.002,
      'claude-3-opus': 0.075,
      'claude-3-sonnet': 0.015,
      'claude-3-haiku': 0.0025,
      'gemini-pro': 0.001,
      'gemini-1.5-pro': 0.0035,
      'gemini-1.5-flash': 0.000375,
      'mixtral-8x7b': 0.0006,
      'llama3-70b': 0.0008,
      'deepseek-coder': 0.0014,
      'glm-4': 0.001
    };

    // Extrair modelo base do nome completo
    const modelKey = Object.keys(modelPrices).find(key => 
      model.toLowerCase().includes(key.toLowerCase().replace('-', ''))
    );

    const pricePerK = modelKey ? modelPrices[modelKey] : 0.002; // Fallback price
    return (tokens / 1000) * pricePerK;
  }

  // Detectar categoria da query
  detectQueryCategory(query: string): string {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('artigo') || lowerQuery.includes('lei') || lowerQuery.includes('luos') || lowerQuery.includes('pdus')) {
      return 'legal';
    }
    if (lowerQuery.includes('zona') || lowerQuery.includes('zot') || lowerQuery.includes('zoneamento')) {
      return 'zoning';
    }
    if (lowerQuery.includes('altura') || lowerQuery.includes('construção') || lowerQuery.includes('edificação')) {
      return 'construction';
    }
    if (lowerQuery.includes('risco') || lowerQuery.includes('desastre') || lowerQuery.includes('inundação')) {
      return 'risk';
    }
    if (lowerQuery.includes('bairro') || lowerQuery.includes('região') || lowerQuery.includes('endereço')) {
      return 'location';
    }
    
    return 'general';
  }

  // Hash query para deduplicação
  hashQuery(query: string): string {
    // Simple hash function for query deduplication
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  // Verificar participação em A/B test
  async checkABTestAssignment(): Promise<string> {
    if (!this.userId) return this.ragVersion;

    try {
      // Buscar experimentos ativos
      const { data: activeExperiments, error } = await this.supabase
        .from('ab_experiments')
        .select('id, control_version, treatment_version, traffic_split')
        .eq('status', 'running')
        .lte('start_date', new Date().toISOString())
        .gte('end_date', new Date().toISOString());

      if (error || !activeExperiments || activeExperiments.length === 0) {
        return this.ragVersion;
      }

      // Verificar se usuário já está em algum experimento
      for (const experiment of activeExperiments) {
        const { data: participant } = await this.supabase
          .from('ab_participants')
          .select('assigned_version')
          .eq('experiment_id', experiment.id)
          .eq('user_id', this.userId)
          .single();

        if (participant) {
          return participant.assigned_version;
        }

        // Se não está no experimento, atribuir baseado no hash
        const userHash = this.hashUser(this.userId, experiment.id);
        const assignedVersion = userHash < experiment.traffic_split ? 
          experiment.treatment_version : experiment.control_version;

        // Salvar atribuição
        await this.supabase
          .from('ab_participants')
          .insert([{
            experiment_id: experiment.id,
            user_id: this.userId,
            session_id: this.sessionId,
            assigned_version: assignedVersion,
            assignment_reason: 'random'
          }]);

        return assignedVersion;
      }

      return this.ragVersion;
    } catch (error) {
      console.warn('⚠️ Error checking A/B test assignment:', error);
      return this.ragVersion;
    }
  }

  // Hash usuário para A/B testing
  private hashUser(userId: string, experimentId: string): number {
    const combined = userId + experimentId;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash) / 2147483647; // Normalize to 0-1
  }

  // Salvar métricas no banco
  async logMetrics(data: Partial<MetricsData>): Promise<string | null> {
    try {
      const totalLatency = Date.now() - this.startTime;
      
      const metrics: MetricsData = {
        sessionId: this.sessionId,
        userId: this.userId,
        ragVersion: this.ragVersion,
        queryText: data.queryText || '',
        queryCategory: data.queryCategory || this.detectQueryCategory(data.queryText || ''),
        totalLatency,
        analyzerLatency: this.componentTimes.get('analyzer') || data.analyzerLatency,
        sqlGeneratorLatency: this.componentTimes.get('sql_generator') || data.sqlGeneratorLatency,
        vectorSearchLatency: this.componentTimes.get('vector_search') || data.vectorSearchLatency,
        synthesizerLatency: this.componentTimes.get('synthesizer') || data.synthesizerLatency,
        confidenceScore: data.confidenceScore,
        hasResults: data.hasResults || false,
        resultCount: data.resultCount || 0,
        refinementCount: data.refinementCount || 0,
        totalTokens: data.totalTokens || 0,
        inputTokens: data.inputTokens || 0,
        outputTokens: data.outputTokens || 0,
        estimatedCost: data.estimatedCost || (data.totalTokens ? this.calculateEstimatedCost(data.totalTokens, data.llmModel || '') : 0),
        status: data.status || 'success',
        errorMessage: data.errorMessage,
        errorCode: data.errorCode,
        llmModel: data.llmModel,
        userAgent: data.userAgent,
        ipAddress: data.ipAddress
      };

      const { data: insertedData, error } = await this.supabase
        .from('rag_metrics')
        .insert([{
          session_id: metrics.sessionId,
          user_id: metrics.userId,
          rag_version: metrics.ragVersion,
          query_text: metrics.queryText,
          query_category: metrics.queryCategory,
          query_hash: this.hashQuery(metrics.queryText),
          total_latency: metrics.totalLatency,
          analyzer_latency: metrics.analyzerLatency,
          sql_generator_latency: metrics.sqlGeneratorLatency,
          vector_search_latency: metrics.vectorSearchLatency,
          synthesizer_latency: metrics.synthesizerLatency,
          confidence_score: metrics.confidenceScore,
          has_results: metrics.hasResults,
          result_count: metrics.resultCount,
          refinement_count: metrics.refinementCount,
          total_tokens: metrics.totalTokens,
          input_tokens: metrics.inputTokens,
          output_tokens: metrics.outputTokens,
          estimated_cost: metrics.estimatedCost,
          status: metrics.status,
          error_message: metrics.errorMessage,
          error_code: metrics.errorCode,
          llm_model: metrics.llmModel,
          user_agent: metrics.userAgent,
          ip_address: metrics.ipAddress
        }])
        .select('id')
        .single();

      if (error) {
        console.error('❌ Error logging metrics:', error);
        return null;
      }

      // Log para debugging se necessário
      console.log(`📊 Metrics logged: ${totalLatency}ms total, confidence: ${metrics.confidenceScore}, cost: $${metrics.estimatedCost?.toFixed(4)}`);

      return insertedData?.id || null;
    } catch (error) {
      console.error('❌ Failed to log metrics:', error);
      return null;
    }
  }

  // Salvar feedback do usuário
  static async logFeedback(supabase: SupabaseClient, data: FeedbackData): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_feedback')
        .insert([{
          session_id: data.sessionId,
          user_id: data.userId,
          metric_id: data.metricId,
          rating: data.rating,
          is_helpful: data.isHelpful,
          is_accurate: data.isAccurate,
          is_complete: data.isComplete,
          feedback_text: data.feedbackText,
          feedback_category: data.feedbackCategory,
          problem_type: data.problemType,
          expected_result: data.expectedResult,
          feedback_source: data.feedbackSource || 'chat',
          user_agent: data.userAgent,
          ip_address: data.ipAddress
        }]);

      if (error) {
        console.error('❌ Error logging feedback:', error);
        return false;
      }

      console.log('📝 User feedback logged successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to log feedback:', error);
      return false;
    }
  }

  // Função utilitária para extrair informações da request
  static extractRequestInfo(req: Request) {
    const userAgent = req.headers.get('user-agent') || undefined;
    const forwarded = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const ipAddress = forwarded?.split(',')[0]?.trim() || realIp || undefined;

    return { userAgent, ipAddress };
  }

  // Função para calcular confiança baseada nos resultados
  static calculateConfidence(
    hasResults: boolean,
    resultCount: number,
    queryComplexity: number = 0.5,
    vectorSimilarity: number = 0.5
  ): number {
    if (!hasResults || resultCount === 0) return 0;

    // Base confidence from having results
    let confidence = 0.6;

    // Boost based on number of results (more results can mean better context)
    if (resultCount > 0) confidence += Math.min(resultCount * 0.1, 0.2);

    // Adjust for query complexity (simpler queries should have higher confidence)
    confidence += (1 - queryComplexity) * 0.1;

    // Adjust for vector similarity
    confidence += vectorSimilarity * 0.1;

    return Math.min(Math.max(confidence, 0), 1);
  }

  // Sistema de health check
  static async performHealthCheck(supabase: SupabaseClient): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: any;
    alerts: any[];
  }> {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      // Buscar métricas recentes
      const { data: recentMetrics, error: metricsError } = await supabase
        .from('rag_metrics')
        .select('status, total_latency, confidence_score')
        .gte('created_at', fiveMinutesAgo);

      if (metricsError) throw metricsError;

      // Calcular estatísticas
      const totalQueries = recentMetrics?.length || 0;
      const errorRate = totalQueries > 0 ? 
        (recentMetrics?.filter(m => m.status === 'error').length || 0) / totalQueries * 100 : 0;
      
      const latencies = recentMetrics?.map(m => m.total_latency).filter(l => l != null) || [];
      const avgLatency = latencies.length > 0 ? 
        latencies.reduce((sum, l) => sum + l, 0) / latencies.length : 0;
      
      const p95Latency = latencies.length > 0 ? 
        latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)] : 0;

      // Buscar alertas ativos
      const { data: activeAlerts } = await supabase
        .from('active_alerts')
        .select('*')
        .eq('status', 'active');

      // Determinar status do sistema
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      if (errorRate > 15 || p95Latency > 10000) {
        status = 'unhealthy';
      } else if (errorRate > 5 || p95Latency > 5000 || (activeAlerts?.length || 0) > 0) {
        status = 'degraded';
      }

      return {
        status,
        metrics: {
          totalQueries,
          errorRate: Math.round(errorRate * 100) / 100,
          avgLatency: Math.round(avgLatency),
          p95Latency,
          timestamp: new Date().toISOString()
        },
        alerts: activeAlerts || []
      };

    } catch (error) {
      console.error('❌ Health check failed:', error);
      return {
        status: 'unhealthy',
        metrics: { error: error.message },
        alerts: []
      };
    }
  }
}

export default MetricsLogger;