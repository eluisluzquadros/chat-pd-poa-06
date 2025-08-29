import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GapDetectionRequest {
  query: string;
  response?: string;
  confidence: number;
  category?: string;
  sessionId?: string;
  userId?: string;
  modelUsed?: string;
  responseTimeMs?: number;
}

interface DetectedGap {
  id: string;
  category: string;
  topic: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
  shouldEscalate: boolean;
  suggestions: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json() as GapDetectionRequest;
    const { query, response, confidence, category, sessionId, userId, modelUsed, responseTimeMs } = body;

    console.log(`Gap Detector: Analyzing query with confidence ${confidence}`);

    // 1. First, log the confidence monitoring data
    await logConfidenceMonitoring(supabase, body);

    // 2. Check if confidence is below threshold
    const confidenceThreshold = 0.60;
    if (confidence >= confidenceThreshold) {
      return new Response(JSON.stringify({
        success: true,
        gapDetected: false,
        confidence,
        message: 'Confidence above threshold, no gap detected'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Analyze the query and response to detect knowledge gap
    const gapAnalysis = await analyzeKnowledgeGap(query, response, confidence, category);
    
    // 4. Check for existing similar gaps
    const existingGap = await findSimilarGap(supabase, gapAnalysis);
    
    let gapId: string;
    if (existingGap) {
      // Update existing gap
      gapId = await updateExistingGap(supabase, existingGap.id, gapAnalysis);
      console.log(`Updated existing gap: ${gapId}`);
    } else {
      // Create new gap
      gapId = await createNewGap(supabase, gapAnalysis, query, response, confidence);
      console.log(`Created new gap: ${gapId}`);
    }

    // 5. Update confidence monitoring with gap reference
    await supabase
      .from('confidence_monitoring')
      .update({ 
        gap_detected: true, 
        gap_id: gapId,
        auto_escalated: gapAnalysis.shouldEscalate
      })
      .eq('query', query)
      .eq('initial_confidence', confidence);

    // 6. Trigger automatic escalation if needed
    if (gapAnalysis.shouldEscalate) {
      await triggerAutoEscalation(supabase, gapId, gapAnalysis);
    }

    // 7. Learn from this gap detection
    await updateLearningPatterns(supabase, gapAnalysis, query);

    const response_data: DetectedGap = {
      id: gapId,
      category: gapAnalysis.category,
      topic: gapAnalysis.topic,
      severity: gapAnalysis.severity,
      confidence,
      shouldEscalate: gapAnalysis.shouldEscalate,
      suggestions: gapAnalysis.suggestions
    };

    return new Response(JSON.stringify({
      success: true,
      gapDetected: true,
      gap: response_data,
      message: `Knowledge gap detected and ${existingGap ? 'updated' : 'created'}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Gap Detector error:', error);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function logConfidenceMonitoring(supabase: any, request: GapDetectionRequest) {
  const { query, response, confidence, category, sessionId, userId, modelUsed, responseTimeMs } = request;
  
  const responseQuality = response ? 
    (confidence > 0.8 ? 'excellent' : 
     confidence > 0.6 ? 'good' : 
     confidence > 0.3 ? 'poor' : 'no_answer') : 'no_answer';

  await supabase
    .from('confidence_monitoring')
    .insert({
      query: query.substring(0, 1000), // Limit query length
      category: category || 'general',
      initial_confidence: confidence,
      response_provided: !!response,
      response_quality: responseQuality,
      session_id: sessionId,
      user_id: userId,
      model_used: modelUsed || 'unknown',
      response_time_ms: responseTimeMs,
      metadata: {
        query_length: query.length,
        response_length: response?.length || 0,
      }
    });
}

interface GapAnalysis {
  category: string;
  topic: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  shouldEscalate: boolean;
  suggestions: string[];
  failurePattern: string;
  priorityScore: number;
}

async function analyzeKnowledgeGap(
  query: string, 
  response: string | undefined, 
  confidence: number, 
  category?: string
): Promise<GapAnalysis> {
  
  // Analyze query patterns to categorize and topic extraction
  const queryLower = query.toLowerCase();
  
  // Determine category if not provided
  const detectedCategory = category || detectCategory(queryLower);
  
  // Extract topic
  const topic = extractTopic(queryLower);
  
  // Determine severity based on confidence and response quality
  const severity = determineSeverity(confidence, response);
  
  // Check if should auto-escalate (critical gaps or patterns)
  const shouldEscalate = shouldAutoEscalate(severity, confidence, response);
  
  // Generate improvement suggestions
  const suggestions = generateSuggestions(detectedCategory, topic, severity, response);
  
  // Identify failure pattern
  const failurePattern = identifyFailurePattern(queryLower, response, confidence);
  
  // Calculate priority score (1-10, higher = more urgent)
  const priorityScore = calculatePriorityScore(severity, confidence, shouldEscalate);

  return {
    category: detectedCategory,
    topic,
    severity,
    shouldEscalate,
    suggestions,
    failurePattern,
    priorityScore
  };
}

function detectCategory(query: string): string {
  const categoryKeywords = {
    'zoneamento': ['zoneamento', 'zona', 'zot', 'uso do solo'],
    'coeficientes': ['coeficiente', 'aproveitamento', 'ocupação', 'taxa'],
    'alturas': ['altura', 'gabarito', 'andar', 'pavimento'],
    'bairros': ['bairro', 'região', 'localização', 'onde fica'],
    'mobilidade': ['transporte', 'trânsito', 'mobilidade', 'via'],
    'meio_ambiente': ['área verde', 'parque', 'preservação', 'ambiental'],
    'habitacao': ['habitação', 'moradia', 'residencial', 'habitacional'],
    'patrimonio': ['patrimônio', 'histórico', 'cultural', 'tombamento']
  };

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => query.includes(keyword))) {
      return category;
    }
  }
  
  return 'geral';
}

function extractTopic(query: string): string {
  // Extract main topic from query using common patterns
  const topicPatterns = [
    { pattern: /(coeficiente|taxa).*?(aproveitamento|ocupação)/i, topic: 'coeficientes_urbanisticos' },
    { pattern: /altura.*?(máxima|limite|gabarito)/i, topic: 'altura_edificacoes' },
    { pattern: /bairro.*?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i, topic: 'informacoes_bairros' },
    { pattern: /zot.*?(\d+)/i, topic: 'zonas_uso_solo' },
    { pattern: /(onde|localização).*?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i, topic: 'localizacao_espacial' }
  ];

  for (const { pattern, topic } of topicPatterns) {
    if (pattern.test(query)) {
      return topic;
    }
  }

  // Fallback to simple keyword matching
  if (query.includes('coeficiente')) return 'coeficientes';
  if (query.includes('altura')) return 'alturas';
  if (query.includes('bairro')) return 'bairros';
  if (query.includes('zoneamento')) return 'zoneamento';
  
  return 'topico_geral';
}

function determineSeverity(confidence: number, response?: string): 'critical' | 'high' | 'medium' | 'low' {
  const hasNoAnswer = !response || 
    response.includes('não tenho') || 
    response.includes('não consigo') ||
    response.includes('não encontrei');

  if (confidence < 0.20 || hasNoAnswer) return 'critical';
  if (confidence < 0.40) return 'high';
  if (confidence < 0.60) return 'medium';
  return 'low';
}

function shouldAutoEscalate(severity: string, confidence: number, response?: string): boolean {
  // Auto-escalate critical gaps or when no response provided
  if (severity === 'critical') return true;
  
  // Auto-escalate if confidence is very low even with a response
  if (confidence < 0.30) return true;
  
  // Auto-escalate if response indicates complete lack of knowledge
  if (response && (
    response.includes('não sei') ||
    response.includes('não tenho informações') ||
    response.includes('não consegui encontrar')
  )) return true;
  
  return false;
}

function generateSuggestions(category: string, topic: string, severity: string, response?: string): string[] {
  const suggestions: string[] = [];
  
  if (severity === 'critical') {
    suggestions.push('Adicionar documentação específica urgentemente');
    suggestions.push('Revisar base de conhecimento para este tópico');
  }
  
  if (!response || response.includes('não tenho')) {
    suggestions.push('Incluir informações básicas sobre ' + topic);
    suggestions.push('Criar seção dedicada para ' + category);
  }
  
  // Category-specific suggestions
  switch (category) {
    case 'coeficientes':
      suggestions.push('Adicionar tabela de coeficientes urbanísticos');
      suggestions.push('Incluir exemplos práticos de cálculo');
      break;
    case 'bairros':
      suggestions.push('Completar informações dos bairros');
      suggestions.push('Adicionar mapeamento de zonas por bairro');
      break;
    case 'alturas':
      suggestions.push('Especificar gabaritos por zona');
      suggestions.push('Incluir exceções e regras especiais');
      break;
  }
  
  suggestions.push('Melhorar contexto para consultas similares');
  
  return suggestions;
}

function identifyFailurePattern(query: string, response?: string, confidence?: number): string {
  if (!response) return 'no_response_generated';
  if (response.includes('não tenho')) return 'insufficient_knowledge';
  if (confidence && confidence < 0.30) return 'low_confidence_response';
  if (response.length < 50) return 'incomplete_response';
  
  return 'inaccurate_response';
}

function calculatePriorityScore(severity: string, confidence: number, shouldEscalate: boolean): number {
  let score = 1;
  
  // Base severity score
  switch (severity) {
    case 'critical': score += 8; break;
    case 'high': score += 6; break;
    case 'medium': score += 4; break;
    case 'low': score += 2; break;
  }
  
  // Confidence penalty (lower confidence = higher priority)
  score += Math.round((1 - confidence) * 3);
  
  // Escalation bonus
  if (shouldEscalate) score += 2;
  
  return Math.min(score, 10);
}

async function findSimilarGap(supabase: any, analysis: GapAnalysis): Promise<any> {
  const { data } = await supabase
    .from('knowledge_gaps')
    .select('id, similar_failures_count, confidence_score')
    .eq('category', analysis.category)
    .eq('topic', analysis.topic)
    .not('status', 'eq', 'resolved')
    .limit(1);
    
  return data && data.length > 0 ? data[0] : null;
}

async function updateExistingGap(supabase: any, gapId: string, analysis: GapAnalysis): Promise<string> {
  await supabase
    .from('knowledge_gaps')
    .update({
      similar_failures_count: supabase.raw('similar_failures_count + 1'),
      updated_at: new Date().toISOString(),
      priority_score: analysis.priorityScore,
      suggested_action: analysis.suggestions.join('; ')
    })
    .eq('id', gapId);
    
  return gapId;
}

async function createNewGap(
  supabase: any, 
  analysis: GapAnalysis, 
  query: string, 
  response: string | undefined, 
  confidence: number
): Promise<string> {
  const { data } = await supabase
    .from('knowledge_gaps')
    .insert({
      category: analysis.category,
      topic: analysis.topic,
      severity: analysis.severity,
      failed_query: query.substring(0, 1000), // Limit length
      actual_answer: response?.substring(0, 2000) || 'Nenhuma resposta fornecida',
      confidence_score: confidence,
      failure_pattern: analysis.failurePattern,
      suggested_action: analysis.suggestions.join('; '),
      priority_score: analysis.priorityScore,
      status: analysis.shouldEscalate ? 'analyzing' : 'detected'
    })
    .select('id')
    .single();
    
  return data.id;
}

async function triggerAutoEscalation(supabase: any, gapId: string, analysis: GapAnalysis) {
  console.log(`Auto-escalating gap ${gapId} for immediate attention`);
  
  // Mark gap for immediate analysis
  await supabase
    .from('knowledge_gaps')
    .update({
      status: 'analyzing',
      priority_score: 10 // Maximum priority
    })
    .eq('id', gapId);
    
  // Could trigger notification here if needed
  // await notifyAdministrators(gapId, analysis);
}

async function updateLearningPatterns(supabase: any, analysis: GapAnalysis, query: string) {
  // Store failure pattern for learning
  const patternData = {
    query_pattern: extractQueryPattern(query),
    failure_type: analysis.failurePattern,
    category: analysis.category,
    topic: analysis.topic,
    severity: analysis.severity
  };
  
  await supabase
    .from('learning_patterns')
    .upsert({
      pattern_type: 'failure_pattern',
      pattern_name: `${analysis.category}_${analysis.topic}_failure`,
      pattern_description: `Failure pattern for ${analysis.category} queries about ${analysis.topic}`,
      pattern_data: patternData,
      categories: [analysis.category],
      topics: [analysis.topic],
      tags: [analysis.severity, analysis.failurePattern],
      last_updated: new Date().toISOString()
    }, {
      onConflict: 'pattern_name',
      ignoreDuplicates: false
    });
}

function extractQueryPattern(query: string): string {
  // Extract general pattern from specific query for learning
  return query
    .toLowerCase()
    .replace(/[a-z]+\s+[a-z]+/g, '[LOCATION]') // Replace location names
    .replace(/\d+/g, '[NUMBER]') // Replace numbers
    .replace(/\b(que|qual|onde|como|quando)\b/g, '[QUESTION_WORD]'); // Replace question words
}