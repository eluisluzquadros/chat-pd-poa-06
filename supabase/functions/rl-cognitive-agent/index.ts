import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

interface CognitiveAnalysisRequest {
  testCaseId: string;
  expectedAnswer: string;
  actualAnswer: string;
  expectedKeywords: string[];
  category: string;
  model: string;
  accuracy: number;
  responseTime: number;
}

interface CognitiveDistance {
  semanticDistance: number;
  structuralDistance: number;
  keywordCoverage: number;
  conceptualAlignment: number;
  overallDistance: number;
  missingConcepts: string[];
  extraneousConcepts: string[];
  recommendations: string[];
}

interface LearningPattern {
  category: string;
  errorType: string;
  frequency: number;
  avgDistance: number;
  commonMissingConcepts: string[];
  suggestedImprovements: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, data } = await req.json();

    switch (action) {
      case 'analyze_cognitive_distance':
        return await analyzeCognitiveDistance(data, supabase);
      
      case 'learn_from_errors':
        return await learnFromErrors(data, supabase);
      
      case 'generate_improvements':
        return await generateImprovements(data, supabase);
      
      case 'track_evolution':
        return await trackEvolution(data, supabase);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('[rl-cognitive-agent] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function analyzeCognitiveDistance(
  data: CognitiveAnalysisRequest,
  supabase: any
): Promise<Response> {
  console.log('[RL-Agent] Analyzing cognitive distance for test case:', data.testCaseId);

  const { 
    expectedAnswer, 
    actualAnswer, 
    expectedKeywords, 
    category,
    accuracy 
  } = data;

  // Normalize texts for comparison
  const normalizedExpected = normalizeText(expectedAnswer);
  const normalizedActual = normalizeText(actualAnswer);

  // 1. Calculate Semantic Distance (using keyword overlap as proxy)
  const actualKeywords = extractKeywords(actualAnswer);
  const expectedKeywordsNorm = expectedKeywords.map(k => k.toLowerCase());
  
  const keywordOverlap = actualKeywords.filter(k => 
    expectedKeywordsNorm.some(ek => k.includes(ek) || ek.includes(k))
  );
  
  const keywordCoverage = expectedKeywords.length > 0 
    ? keywordOverlap.length / expectedKeywords.length 
    : 0;

  // 2. Calculate Structural Distance
  const structuralDistance = calculateStructuralDistance(expectedAnswer, actualAnswer);

  // 3. Identify Missing and Extraneous Concepts
  const missingConcepts = expectedKeywords.filter(k => 
    !normalizedActual.includes(k.toLowerCase())
  );
  
  const extraneousConcepts = identifyExtraneousConcepts(actualAnswer, expectedKeywords);

  // 4. Calculate Conceptual Alignment
  const conceptualAlignment = calculateConceptualAlignment(
    expectedAnswer,
    actualAnswer,
    category
  );

  // 5. Calculate Overall Cognitive Distance
  const semanticDistance = 1 - keywordCoverage;
  const overallDistance = (
    semanticDistance * 0.4 +
    structuralDistance * 0.2 +
    (1 - conceptualAlignment) * 0.4
  );

  // 6. Generate Recommendations
  const recommendations = generateRecommendations(
    missingConcepts,
    extraneousConcepts,
    structuralDistance,
    category
  );

  // 7. Store Analysis for Learning
  const analysis: CognitiveDistance = {
    semanticDistance,
    structuralDistance,
    keywordCoverage,
    conceptualAlignment,
    overallDistance,
    missingConcepts,
    extraneousConcepts,
    recommendations
  };

  // Save to database for pattern learning
  await supabase
    .from('cognitive_distance_analysis')
    .insert({
      test_case_id: data.testCaseId,
      model: data.model,
      analysis,
      accuracy: data.accuracy,
      response_time: data.responseTime,
      created_at: new Date().toISOString()
    });

  return new Response(
    JSON.stringify({
      success: true,
      analysis,
      insights: {
        performanceLevel: getPerformanceLevel(overallDistance),
        primaryIssue: identifyPrimaryIssue(analysis),
        improvementPotential: calculateImprovementPotential(analysis)
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function learnFromErrors(data: any, supabase: any): Promise<Response> {
  console.log('[RL-Agent] Learning from error patterns');

  // Fetch recent analyses
  const { data: analyses, error } = await supabase
    .from('cognitive_distance_analysis')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error || !analyses) {
    throw new Error('Failed to fetch analyses');
  }

  // Group by category and identify patterns
  const patterns = new Map<string, LearningPattern>();

  for (const analysis of analyses) {
    const category = analysis.category || 'general';
    
    if (!patterns.has(category)) {
      patterns.set(category, {
        category,
        errorType: '',
        frequency: 0,
        avgDistance: 0,
        commonMissingConcepts: [],
        suggestedImprovements: []
      });
    }

    const pattern = patterns.get(category)!;
    pattern.frequency++;
    pattern.avgDistance += analysis.analysis.overallDistance;
    
    // Track missing concepts
    for (const concept of analysis.analysis.missingConcepts || []) {
      if (!pattern.commonMissingConcepts.includes(concept)) {
        pattern.commonMissingConcepts.push(concept);
      }
    }
  }

  // Calculate averages and generate improvements
  const learningPatterns: LearningPattern[] = [];
  
  for (const [category, pattern] of patterns) {
    pattern.avgDistance = pattern.avgDistance / pattern.frequency;
    pattern.errorType = classifyErrorType(pattern);
    pattern.suggestedImprovements = generateSystemImprovements(pattern);
    learningPatterns.push(pattern);
  }

  // Store learning patterns
  await supabase
    .from('rl_learning_patterns')
    .insert({
      patterns: learningPatterns,
      timestamp: new Date().toISOString(),
      total_analyses: analyses.length
    });

  return new Response(
    JSON.stringify({
      success: true,
      patterns: learningPatterns,
      recommendations: generateSystemWideRecommendations(learningPatterns)
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function generateImprovements(data: any, supabase: any): Promise<Response> {
  console.log('[RL-Agent] Generating improvement suggestions');

  // Fetch recent patterns
  const { data: patterns } = await supabase
    .from('rl_learning_patterns')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(1)
    .single();

  if (!patterns) {
    return new Response(
      JSON.stringify({
        success: true,
        improvements: [],
        message: 'No patterns available yet'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const improvements = patterns.patterns.map((pattern: LearningPattern) => ({
    category: pattern.category,
    priority: calculatePriority(pattern),
    actions: pattern.suggestedImprovements,
    expectedImpact: estimateImpact(pattern),
    implementation: generateImplementationSteps(pattern)
  }));

  return new Response(
    JSON.stringify({
      success: true,
      improvements: improvements.sort((a: any, b: any) => b.priority - a.priority),
      summary: generateImprovementSummary(improvements)
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function trackEvolution(data: any, supabase: any): Promise<Response> {
  console.log('[RL-Agent] Tracking system evolution');

  // Fetch historical performance data
  const { data: history } = await supabase
    .from('qa_validation_runs')
    .select('*')
    .order('started_at', { ascending: true })
    .limit(100);

  if (!history || history.length === 0) {
    return new Response(
      JSON.stringify({
        success: true,
        evolution: null,
        message: 'No historical data available'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Calculate evolution metrics
  const evolution = {
    timeRange: {
      start: history[0].started_at,
      end: history[history.length - 1].started_at
    },
    accuracyTrend: calculateTrend(history.map((h: any) => h.overall_accuracy || 0)),
    responseTrend: calculateTrend(history.map((h: any) => h.avg_response_time_ms || 0)),
    improvementRate: calculateImprovementRate(history),
    learningCurve: generateLearningCurve(history),
    predictions: generatePredictions(history)
  };

  return new Response(
    JSON.stringify({
      success: true,
      evolution,
      insights: generateEvolutionInsights(evolution)
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Helper Functions

function normalizeText(text: string): string {
  return text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractKeywords(text: string): string[] {
  const normalized = normalizeText(text);
  const words = normalized.split(' ');
  
  // Filter out common stop words (Portuguese)
  const stopWords = ['o', 'a', 'de', 'para', 'em', 'com', 'por', 'que', 'e', 'do', 'da', 'no', 'na'];
  
  return words
    .filter(word => word.length > 3 && !stopWords.includes(word))
    .filter((word, index, self) => self.indexOf(word) === index);
}

function calculateStructuralDistance(expected: string, actual: string): number {
  const expectedLength = expected.length;
  const actualLength = actual.length;
  
  // Length difference ratio
  const lengthRatio = Math.min(expectedLength, actualLength) / Math.max(expectedLength, actualLength);
  
  // Paragraph structure difference
  const expectedParagraphs = expected.split('\n').filter(p => p.trim()).length;
  const actualParagraphs = actual.split('\n').filter(p => p.trim()).length;
  const paragraphRatio = Math.min(expectedParagraphs, actualParagraphs) / 
                         Math.max(expectedParagraphs, actualParagraphs) || 1;
  
  return 1 - ((lengthRatio + paragraphRatio) / 2);
}

function identifyExtraneousConcepts(actual: string, expectedKeywords: string[]): string[] {
  const actualKeywords = extractKeywords(actual);
  const expectedNorm = expectedKeywords.map(k => k.toLowerCase());
  
  // Find keywords in actual that are not related to expected
  return actualKeywords.filter(k => 
    !expectedNorm.some(ek => k.includes(ek) || ek.includes(k))
  ).slice(0, 5); // Limit to top 5
}

function calculateConceptualAlignment(expected: string, actual: string, category: string): number {
  // Category-specific concept checking
  const categoryKeywords: Record<string, string[]> = {
    'zoneamento': ['zona', 'zot', 'uso', 'ocupação', 'índice'],
    'altura_maxima': ['altura', 'máxima', 'metros', 'pavimentos', 'gabarito'],
    'uso-solo': ['uso', 'solo', 'permitido', 'proibido', 'residencial', 'comercial'],
    'construction': ['construção', 'edificação', 'obra', 'projeto', 'aprovação']
  };

  const keywords = categoryKeywords[category] || [];
  if (keywords.length === 0) return 0.5; // Default for unknown categories

  const actualNorm = normalizeText(actual);
  const matchedKeywords = keywords.filter(k => actualNorm.includes(k));
  
  return matchedKeywords.length / keywords.length;
}

function generateRecommendations(
  missingConcepts: string[],
  extraneousConcepts: string[],
  structuralDistance: number,
  category: string
): string[] {
  const recommendations: string[] = [];

  if (missingConcepts.length > 0) {
    recommendations.push(
      `Incluir conceitos ausentes: ${missingConcepts.slice(0, 3).join(', ')}`
    );
  }

  if (extraneousConcepts.length > 2) {
    recommendations.push(
      'Reduzir informações irrelevantes e focar nos pontos principais'
    );
  }

  if (structuralDistance > 0.5) {
    recommendations.push(
      'Melhorar estrutura da resposta para corresponder ao formato esperado'
    );
  }

  // Category-specific recommendations
  const categoryRecs: Record<string, string> = {
    'zoneamento': 'Incluir informações específicas sobre ZOTs e índices urbanísticos',
    'altura_maxima': 'Fornecer valores numéricos precisos de altura em metros',
    'uso-solo': 'Detalhar usos permitidos e restrições específicas',
    'construction': 'Incluir requisitos legais e procedimentos de aprovação'
  };

  if (categoryRecs[category]) {
    recommendations.push(categoryRecs[category]);
  }

  return recommendations;
}

function getPerformanceLevel(distance: number): string {
  if (distance < 0.2) return 'Excelente';
  if (distance < 0.4) return 'Bom';
  if (distance < 0.6) return 'Regular';
  if (distance < 0.8) return 'Fraco';
  return 'Crítico';
}

function identifyPrimaryIssue(analysis: CognitiveDistance): string {
  const issues = [];
  
  if (analysis.semanticDistance > 0.5) {
    issues.push('Baixa correspondência semântica');
  }
  if (analysis.keywordCoverage < 0.5) {
    issues.push('Cobertura insuficiente de palavras-chave');
  }
  if (analysis.structuralDistance > 0.5) {
    issues.push('Estrutura inadequada');
  }
  if (analysis.conceptualAlignment < 0.5) {
    issues.push('Desalinhamento conceitual');
  }

  return issues[0] || 'Nenhum problema crítico identificado';
}

function calculateImprovementPotential(analysis: CognitiveDistance): number {
  // Calculate how much the system can improve based on current gaps
  const potential = (1 - analysis.overallDistance) * 100;
  return Math.round(potential);
}

function classifyErrorType(pattern: LearningPattern): string {
  if (pattern.avgDistance > 0.7) return 'Erro Sistêmico';
  if (pattern.commonMissingConcepts.length > 5) return 'Lacuna de Conhecimento';
  if (pattern.frequency > 10) return 'Erro Recorrente';
  return 'Erro Ocasional';
}

function generateSystemImprovements(pattern: LearningPattern): string[] {
  const improvements = [];

  if (pattern.errorType === 'Erro Sistêmico') {
    improvements.push('Revisar completamente a base de conhecimento para esta categoria');
    improvements.push('Implementar validação adicional antes da resposta');
  }

  if (pattern.commonMissingConcepts.length > 0) {
    improvements.push(
      `Adicionar conhecimento sobre: ${pattern.commonMissingConcepts.slice(0, 3).join(', ')}`
    );
  }

  if (pattern.avgDistance > 0.5) {
    improvements.push('Implementar refinamento iterativo de respostas');
    improvements.push('Adicionar exemplos de respostas corretas ao treinamento');
  }

  return improvements;
}

function generateSystemWideRecommendations(patterns: LearningPattern[]): string[] {
  const recommendations = [];

  // Find most problematic categories
  const problematic = patterns.filter(p => p.avgDistance > 0.5);
  if (problematic.length > 0) {
    recommendations.push(
      `Priorizar melhorias nas categorias: ${problematic.map(p => p.category).join(', ')}`
    );
  }

  // Check for systemic issues
  const avgSystemDistance = patterns.reduce((sum, p) => sum + p.avgDistance, 0) / patterns.length;
  if (avgSystemDistance > 0.4) {
    recommendations.push('Considerar re-treinamento geral do sistema');
  }

  // Missing concepts across categories
  const allMissingConcepts = new Set<string>();
  patterns.forEach(p => p.commonMissingConcepts.forEach(c => allMissingConcepts.add(c)));
  
  if (allMissingConcepts.size > 10) {
    recommendations.push('Expandir base de conhecimento com conceitos frequentemente ausentes');
  }

  return recommendations;
}

function calculatePriority(pattern: LearningPattern): number {
  let priority = 0;
  
  priority += pattern.frequency * 2; // Frequency weight
  priority += pattern.avgDistance * 100; // Distance weight
  priority += pattern.commonMissingConcepts.length * 5; // Missing concepts weight
  
  if (pattern.errorType === 'Erro Sistêmico') priority += 50;
  if (pattern.errorType === 'Erro Recorrente') priority += 30;
  
  return Math.round(priority);
}

function estimateImpact(pattern: LearningPattern): string {
  const potentialImprovement = (1 - pattern.avgDistance) * 100;
  
  if (potentialImprovement > 70) return 'Alto Impacto';
  if (potentialImprovement > 40) return 'Médio Impacto';
  return 'Baixo Impacto';
}

function generateImplementationSteps(pattern: LearningPattern): string[] {
  const steps = [];
  
  steps.push('1. Analisar casos de falha específicos');
  steps.push('2. Identificar padrões nos erros');
  
  if (pattern.commonMissingConcepts.length > 0) {
    steps.push('3. Adicionar conceitos ausentes à base de conhecimento');
  }
  
  steps.push('4. Implementar correções no pipeline RAG');
  steps.push('5. Validar melhorias com casos de teste');
  steps.push('6. Monitorar métricas pós-implementação');
  
  return steps;
}

function calculateTrend(values: number[]): 'improving' | 'stable' | 'declining' {
  if (values.length < 2) return 'stable';
  
  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));
  
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  
  if (secondAvg > firstAvg * 1.1) return 'improving';
  if (secondAvg < firstAvg * 0.9) return 'declining';
  return 'stable';
}

function calculateImprovementRate(history: any[]): number {
  if (history.length < 2) return 0;
  
  const first = history[0].overall_accuracy || 0;
  const last = history[history.length - 1].overall_accuracy || 0;
  
  return ((last - first) / first) * 100;
}

function generateLearningCurve(history: any[]): any {
  return history.map((h, index) => ({
    iteration: index + 1,
    accuracy: h.overall_accuracy || 0,
    responseTime: h.avg_response_time_ms || 0
  }));
}

function generatePredictions(history: any[]): any {
  // Simple linear projection
  const recentAccuracy = history.slice(-5).map(h => h.overall_accuracy || 0);
  const avgRecent = recentAccuracy.reduce((a, b) => a + b, 0) / recentAccuracy.length;
  
  return {
    nextIterationAccuracy: Math.min(avgRecent * 1.05, 1),
    targetIterationsToGoal: Math.ceil((0.9 - avgRecent) / 0.05),
    confidenceLevel: history.length > 10 ? 'high' : 'low'
  };
}

function generateEvolutionInsights(evolution: any): string[] {
  const insights = [];
  
  if (evolution.accuracyTrend === 'improving') {
    insights.push('Sistema está melhorando consistentemente');
  } else if (evolution.accuracyTrend === 'declining') {
    insights.push('⚠️ Degradação de performance detectada');
  }
  
  if (evolution.improvementRate > 10) {
    insights.push(`Melhoria de ${evolution.improvementRate.toFixed(1)}% desde o início`);
  }
  
  if (evolution.predictions.targetIterationsToGoal < 10) {
    insights.push(`Meta de 90% de acurácia alcançável em ${evolution.predictions.targetIterationsToGoal} iterações`);
  }
  
  return insights;
}

function generateImprovementSummary(improvements: any[]): any {
  return {
    totalImprovements: improvements.length,
    highPriority: improvements.filter(i => i.priority > 70).length,
    estimatedImpact: improvements.reduce((sum, i) => {
      const impact = i.expectedImpact === 'Alto Impacto' ? 30 :
                    i.expectedImpact === 'Médio Impacto' ? 15 : 5;
      return sum + impact;
    }, 0),
    focusAreas: improvements.slice(0, 3).map(i => i.category)
  };
}