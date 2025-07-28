import { createClient } from '@supabase/supabase-js';

export interface QualityMetrics {
  responseTime: number;
  hasValidResponse: boolean;
  hasBetaMessage: boolean;
  hasTable: boolean;
  confidence: number;
  category: string;
  timestamp: Date;
  sessionId: string;
  query: string;
  response: string;
}

export interface QualityThresholds {
  maxResponseTime: number;
  minConfidence: number;
  maxBetaRate: number;
  alertThreshold: number;
}

export class QualityMonitor {
  private supabase: any;
  private metrics: QualityMetrics[] = [];
  private thresholds: QualityThresholds;
  private alertCallbacks: ((alert: QualityAlert) => void)[] = [];

  constructor(supabaseUrl: string, supabaseKey: string, thresholds?: Partial<QualityThresholds>) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.thresholds = {
      maxResponseTime: 5000, // 5 seconds
      minConfidence: 0.7,
      maxBetaRate: 0.05, // 5%
      alertThreshold: 0.8, // Alert if 80% of recent responses fail quality checks
      ...thresholds
    };
  }

  async trackResponse(metrics: QualityMetrics) {
    this.metrics.push(metrics);
    
    // Store in database for persistence
    await this.storeMetrics(metrics);
    
    // Check quality thresholds
    this.checkQualityThresholds();
    
    // Maintain only last 100 metrics in memory
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }
  }

  private async storeMetrics(metrics: QualityMetrics) {
    try {
      await this.supabase
        .from('quality_metrics')
        .insert({
          session_id: metrics.sessionId,
          query: metrics.query,
          response: metrics.response.substring(0, 1000), // Limit response size
          response_time: metrics.responseTime,
          has_valid_response: metrics.hasValidResponse,
          has_beta_message: metrics.hasBetaMessage,
          has_table: metrics.hasTable,
          confidence: metrics.confidence,
          category: metrics.category,
          created_at: metrics.timestamp
        });
    } catch (error) {
      console.error('Error storing quality metrics:', error);
    }
  }

  private checkQualityThresholds() {
    const recent = this.metrics.slice(-20); // Last 20 responses
    
    if (recent.length < 5) return; // Need minimum sample size
    
    const issues: string[] = [];
    
    // Check response time
    const avgResponseTime = recent.reduce((sum, m) => sum + m.responseTime, 0) / recent.length;
    if (avgResponseTime > this.thresholds.maxResponseTime) {
      issues.push(`Average response time (${avgResponseTime}ms) exceeds threshold`);
    }
    
    // Check beta rate
    const betaCount = recent.filter(m => m.hasBetaMessage).length;
    const betaRate = betaCount / recent.length;
    if (betaRate > this.thresholds.maxBetaRate) {
      issues.push(`Beta message rate (${(betaRate * 100).toFixed(1)}%) exceeds threshold`);
    }
    
    // Check confidence
    const avgConfidence = recent.reduce((sum, m) => sum + m.confidence, 0) / recent.length;
    if (avgConfidence < this.thresholds.minConfidence) {
      issues.push(`Average confidence (${avgConfidence.toFixed(2)}) below threshold`);
    }
    
    // Check valid response rate
    const invalidCount = recent.filter(m => !m.hasValidResponse).length;
    const invalidRate = invalidCount / recent.length;
    if (invalidRate > 0.2) { // More than 20% invalid
      issues.push(`Invalid response rate (${(invalidRate * 100).toFixed(1)}%) is too high`);
    }
    
    if (issues.length > 0) {
      this.triggerAlert({
        level: issues.length > 2 ? 'critical' : 'warning',
        issues,
        metrics: this.getRecentStats(),
        timestamp: new Date()
      });
    }
  }

  onAlert(callback: (alert: QualityAlert) => void) {
    this.alertCallbacks.push(callback);
  }

  private triggerAlert(alert: QualityAlert) {
    this.alertCallbacks.forEach(callback => callback(alert));
  }

  getRecentStats() {
    const recent = this.metrics.slice(-20);
    
    if (recent.length === 0) {
      return {
        sampleSize: 0,
        avgResponseTime: 0,
        betaRate: 0,
        avgConfidence: 0,
        validResponseRate: 0,
        categoryBreakdown: {}
      };
    }
    
    const categoryBreakdown = recent.reduce((acc, m) => {
      acc[m.category] = (acc[m.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      sampleSize: recent.length,
      avgResponseTime: recent.reduce((sum, m) => sum + m.responseTime, 0) / recent.length,
      betaRate: recent.filter(m => m.hasBetaMessage).length / recent.length,
      avgConfidence: recent.reduce((sum, m) => sum + m.confidence, 0) / recent.length,
      validResponseRate: recent.filter(m => m.hasValidResponse).length / recent.length,
      categoryBreakdown
    };
  }

  async getDailyReport() {
    const { data, error } = await this.supabase
      .from('quality_metrics')
      .select('*')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    
    if (error || !data) return null;
    
    return {
      totalQueries: data.length,
      avgResponseTime: data.reduce((sum, m) => sum + m.response_time, 0) / data.length,
      betaRate: data.filter(m => m.has_beta_message).length / data.length,
      avgConfidence: data.reduce((sum, m) => sum + m.confidence, 0) / data.length,
      validResponseRate: data.filter(m => m.has_valid_response).length / data.length,
      categoryBreakdown: data.reduce((acc, m) => {
        acc[m.category] = (acc[m.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      hourlyDistribution: this.getHourlyDistribution(data)
    };
  }

  private getHourlyDistribution(data: any[]) {
    const hours = Array(24).fill(0);
    
    data.forEach(metric => {
      const hour = new Date(metric.created_at).getHours();
      hours[hour]++;
    });
    
    return hours;
  }
}

export interface QualityAlert {
  level: 'warning' | 'critical';
  issues: string[];
  metrics: any;
  timestamp: Date;
}

// Helper to analyze response quality
export function analyzeResponseQuality(query: string, response: string, responseTime: number, confidence: number): QualityMetrics {
  const hasBetaMessage = response.toLowerCase().includes('versão beta') || 
                        response.toLowerCase().includes('não consigo responder');
  
  const hasTable = response.includes('|') && 
                  response.split('\n').filter(line => line.includes('|')).length > 2;
  
  const hasValidResponse = !hasBetaMessage && response.length > 50;
  
  // Categorize query
  let category = 'general';
  if (query.toLowerCase().includes('construir') || query.toLowerCase().includes('zot')) {
    category = 'construction';
  } else if (query.toLowerCase().includes('quantos') || query.toLowerCase().includes('lista')) {
    category = 'counting';
  } else if (query.toLowerCase().includes('rua') || query.toLowerCase().includes('endereço')) {
    category = 'address';
  } else if (query.toLowerCase().includes('objetivo') || query.toLowerCase().includes('mobilidade')) {
    category = 'conceptual';
  }
  
  return {
    responseTime,
    hasValidResponse,
    hasBetaMessage,
    hasTable,
    confidence,
    category,
    timestamp: new Date(),
    sessionId: '',
    query,
    response
  };
}