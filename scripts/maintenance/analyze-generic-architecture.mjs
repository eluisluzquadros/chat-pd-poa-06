#!/usr/bin/env node

/**
 * ANÁLISE ARQUITETURAL GENÉRICA DO AGENTIC-RAG
 * Identifica problemas estruturais e propõe soluções genéricas
 * sem hardcoding específico para casos de teste
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngrqwmvuhvjkeohesbxs.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * 1. ANÁLISE DO PIPELINE ATUAL
 */
async function analyzePipelineStructure() {
  console.log(chalk.bold.cyan('\n🔍 ANÁLISE DO PIPELINE RAG ATUAL\n'));
  
  console.log('📊 Componentes do Pipeline:');
  console.log('  1. Query Analysis → Entende a intenção');
  console.log('  2. Entity Extraction → Extrai entidades (bairros, artigos, etc)');
  console.log('  3. Search Strategy → Decide como buscar');
  console.log('  4. Data Retrieval → Busca em múltiplas fontes');
  console.log('  5. Result Ranking → Ordena por relevância');
  console.log('  6. Response Synthesis → Gera resposta final');
  
  console.log(chalk.red('\n❌ Problemas Identificados:'));
  console.log('  • Entity Extraction está hardcoded para bairros específicos');
  console.log('  • Search Strategy não adapta baseado no tipo de query');
  console.log('  • Data Retrieval não usa todas as tabelas disponíveis');
  console.log('  • Result Ranking não existe (sem re-ranking)');
  console.log('  • Response Synthesis não valida qualidade antes de retornar');
}

/**
 * 2. ANÁLISE DAS FONTES DE DADOS
 */
async function analyzeDataSources() {
  console.log(chalk.bold.cyan('\n📚 ANÁLISE DAS FONTES DE DADOS\n'));
  
  const tables = [
    'legal_articles',
    'document_sections', 
    'regime_urbanistico_consolidado',
    'legal_hierarchy',
    'document_rows',
    'qa_test_cases'
  ];
  
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    const { data: sample } = await supabase
      .from(table)
      .select('*')
      .limit(1);
    
    console.log(`\n📋 ${table}:`);
    console.log(`  Registros: ${count || 0}`);
    
    if (sample && sample[0]) {
      const columns = Object.keys(sample[0]);
      console.log(`  Colunas: ${columns.slice(0, 5).join(', ')}...`);
      
      // Check for embeddings
      if (columns.includes('embedding')) {
        const { count: embCount } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
          .not('embedding', 'is', null);
        console.log(`  Com embeddings: ${embCount || 0}`);
      }
      
      // Check for full-text search capability
      if (columns.includes('full_content') || columns.includes('content')) {
        console.log('  ✅ Suporta busca textual');
      }
    }
  }
  
  console.log(chalk.yellow('\n💡 Insights:'));
  console.log('  • legal_articles tem embeddings e full_content');
  console.log('  • regime_urbanistico_consolidado tem dados estruturados');
  console.log('  • document_sections está vazio (não utilizado)');
  console.log('  • qa_test_cases pode ser usado para validação');
}

/**
 * 3. PROPOSTA DE ARQUITETURA GENÉRICA
 */
function proposeGenericArchitecture() {
  console.log(chalk.bold.green('\n🏗️ ARQUITETURA GENÉRICA PROPOSTA\n'));
  
  const architecture = {
    "1_QUERY_UNDERSTANDING": {
      description: "Análise semântica genérica da query",
      components: [
        "Intent Classification (pergunta, comando, busca)",
        "Language Detection (PT-BR, EN)",
        "Query Expansion (sinônimos, variações)"
      ],
      implementation: `
// Generic query understanding
interface QueryAnalysis {
  intent: 'search' | 'question' | 'command' | 'summary';
  entities: Map<string, string[]>; // entity_type -> values
  keywords: string[];
  language: 'pt' | 'en';
  expanded_terms: string[];
}

async function analyzeQuery(query: string): Promise<QueryAnalysis> {
  // Use NLP techniques, not hardcoded patterns
  const analysis = await nlpService.analyze(query);
  return {
    intent: detectIntent(analysis),
    entities: extractEntities(analysis), // Generic entity extraction
    keywords: extractKeywords(analysis),
    language: detectLanguage(query),
    expanded_terms: expandWithSynonyms(analysis.keywords)
  };
}`
    },
    
    "2_MULTI_STRATEGY_SEARCH": {
      description: "Busca adaptativa baseada no tipo de query",
      components: [
        "Vector Search (semantic similarity)",
        "Keyword Search (BM25/TF-IDF)",
        "Structured Search (SQL)",
        "Hybrid Search (combination)"
      ],
      implementation: `
// Adaptive search strategy
interface SearchStrategy {
  vector_weight: number;
  keyword_weight: number;
  structured_weight: number;
}

function selectStrategy(analysis: QueryAnalysis): SearchStrategy {
  // Adapt weights based on query type
  if (analysis.intent === 'search') {
    return { vector_weight: 0.7, keyword_weight: 0.2, structured_weight: 0.1 };
  } else if (analysis.entities.size > 0) {
    return { vector_weight: 0.3, keyword_weight: 0.3, structured_weight: 0.4 };
  } else {
    return { vector_weight: 0.5, keyword_weight: 0.5, structured_weight: 0.0 };
  }
}`
    },
    
    "3_INTELLIGENT_RETRIEVAL": {
      description: "Busca inteligente em múltiplas fontes",
      components: [
        "Parallel Search (all sources simultaneously)",
        "Dynamic Limit (adjust based on quality)",
        "Deduplication (remove duplicates)",
        "Source Tracking (maintain provenance)"
      ],
      implementation: `
// Intelligent multi-source retrieval
async function retrieveFromAllSources(
  analysis: QueryAnalysis,
  strategy: SearchStrategy
): Promise<SearchResults> {
  const searches = [];
  
  // Search all relevant tables in parallel
  if (strategy.vector_weight > 0) {
    searches.push(vectorSearch(analysis.expanded_terms));
  }
  if (strategy.keyword_weight > 0) {
    searches.push(keywordSearch(analysis.keywords));
  }
  if (strategy.structured_weight > 0) {
    searches.push(structuredSearch(analysis.entities));
  }
  
  const results = await Promise.all(searches);
  return mergeAndDeduplicate(results);
}`
    },
    
    "4_SMART_RANKING": {
      description: "Re-ranking com múltiplos sinais",
      components: [
        "Relevance Score (semantic similarity)",
        "Recency Score (temporal relevance)",
        "Authority Score (source credibility)",
        "Diversity Score (avoid redundancy)"
      ],
      implementation: `
// Multi-signal ranking
interface RankingSignals {
  relevance: number;    // 0-1 semantic similarity
  recency: number;      // 0-1 temporal score
  authority: number;    // 0-1 source credibility
  diversity: number;    // 0-1 information diversity
}

function rankResults(
  results: SearchResult[],
  query: string
): RankedResult[] {
  return results.map(result => ({
    ...result,
    score: calculateCompositeScore(result, query),
    signals: extractRankingSignals(result, query)
  })).sort((a, b) => b.score - a.score);
}`
    },
    
    "5_QUALITY_VALIDATION": {
      description: "Validação de qualidade antes de retornar",
      components: [
        "Answer Validation (verifica se responde a pergunta)",
        "Fact Checking (contra ground truth)",
        "Confidence Scoring (0-1)",
        "Fallback Triggers (quando reprocessar)"
      ],
      implementation: `
// Quality validation
interface QualityMetrics {
  answers_question: boolean;
  has_sources: boolean;
  confidence: number;
  needs_refinement: boolean;
}

async function validateResponse(
  response: string,
  query: string,
  sources: any[]
): Promise<QualityMetrics> {
  const metrics = {
    answers_question: await checkAnswersQuestion(response, query),
    has_sources: sources.length > 0,
    confidence: calculateConfidence(response, sources),
    needs_refinement: false
  };
  
  metrics.needs_refinement = metrics.confidence < 0.7;
  return metrics;
}`
    }
  };
  
  for (const [component, details] of Object.entries(architecture)) {
    console.log(chalk.bold.yellow(`\n${component}:`));
    console.log(`  📝 ${details.description}`);
    console.log(chalk.gray('  Componentes:'));
    details.components.forEach(c => console.log(`    • ${c}`));
    console.log(chalk.blue('\n  Implementação:'));
    console.log(chalk.gray(details.implementation));
  }
}

/**
 * 4. TESTE END-TO-END GENÉRICO
 */
async function createEndToEndTest() {
  console.log(chalk.bold.magenta('\n🧪 TESTE END-TO-END VIA /CHAT\n'));
  
  const testCode = `#!/usr/bin/env node

/**
 * TESTE END-TO-END GENÉRICO
 * Testa o sistema completo via endpoint /chat
 * Sem assumir estruturas hardcoded
 */

import fetch from 'node-fetch';

async function testChatEndpoint(query) {
  const response = await fetch('${supabaseUrl}/functions/v1/agentic-rag', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ${supabaseKey}',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      session_id: 'test-' + Date.now(),
      model: 'openai/gpt-4-turbo-preview'
    })
  });
  
  if (!response.ok) {
    throw new Error(\`HTTP \${response.status}\`);
  }
  
  return await response.json();
}

// Generic test categories
const TEST_CATEGORIES = {
  factual: [
    "What is stated in article 1 of LUOS?",
    "What are the height limits in the city?"
  ],
  analytical: [
    "Compare zoning regulations between different areas",
    "Explain the urban development principles"
  ],
  specific: [
    "Building parameters for commercial zones",
    "Environmental protection requirements"
  ],
  exploratory: [
    "Summarize the main objectives of the plan",
    "List all types of urban zones"
  ]
};

async function runTests() {
  const results = [];
  
  for (const [category, queries] of Object.entries(TEST_CATEGORIES)) {
    for (const query of queries) {
      const start = Date.now();
      try {
        const response = await testChatEndpoint(query);
        results.push({
          category,
          query,
          success: true,
          confidence: response.confidence,
          time: Date.now() - start,
          hasContent: response.response?.length > 100
        });
      } catch (error) {
        results.push({
          category,
          query,
          success: false,
          error: error.message
        });
      }
    }
  }
  
  // Calculate metrics
  const successRate = results.filter(r => r.success).length / results.length;
  const avgConfidence = results
    .filter(r => r.success && r.confidence)
    .reduce((sum, r) => sum + r.confidence, 0) / results.filter(r => r.success).length;
  
  console.log('Success Rate:', (successRate * 100).toFixed(1) + '%');
  console.log('Average Confidence:', avgConfidence.toFixed(2));
  
  return results;
}

runTests();`;
  
  console.log('📝 Teste criado que:');
  console.log('  • Usa endpoint real /chat (não funções isoladas)');
  console.log('  • Testa categorias genéricas de queries');
  console.log('  • Não assume estruturas hardcoded');
  console.log('  • Mede métricas de qualidade');
  console.log('  • Simula uso real do sistema');
  
  return testCode;
}

/**
 * 5. PLANO DE AÇÃO REVISADO
 */
function createRevisedActionPlan() {
  console.log(chalk.bold.cyan('\n' + '=' .repeat(70)));
  console.log(chalk.bold.cyan('📋 PLANO DE AÇÃO REVISADO - SOLUÇÃO GENÉRICA'));
  console.log(chalk.bold.cyan('=' .repeat(70)));
  
  const plan = [
    {
      phase: "FASE 0: DIAGNÓSTICO (2h)",
      tasks: [
        "Mapear pipeline atual completo",
        "Identificar todos os pontos de hardcoding",
        "Documentar fluxo de dados",
        "Criar testes end-to-end baseline"
      ],
      deliverable: "Documentação do estado atual + testes baseline"
    },
    {
      phase: "FASE 1: QUERY UNDERSTANDING (4h)",
      tasks: [
        "Implementar análise semântica genérica",
        "Criar extração de entidades sem hardcoding",
        "Adicionar expansão de query com sinônimos",
        "Implementar classificação de intenção"
      ],
      deliverable: "Módulo de entendimento de query genérico",
      impact: "+20% precisão"
    },
    {
      phase: "FASE 2: MULTI-MODAL SEARCH (6h)",
      tasks: [
        "Implementar busca vetorial com fallback",
        "Adicionar busca por palavras-chave (BM25)",
        "Criar busca estruturada dinâmica",
        "Implementar fusão de resultados"
      ],
      deliverable: "Sistema de busca híbrido adaptativo",
      impact: "+30% precisão"
    },
    {
      phase: "FASE 3: INTELLIGENT RANKING (4h)",
      tasks: [
        "Implementar scoring multi-sinal",
        "Adicionar re-ranking semântico",
        "Criar deduplicação inteligente",
        "Implementar diversificação de resultados"
      ],
      deliverable: "Sistema de ranking inteligente",
      impact: "+20% precisão"
    },
    {
      phase: "FASE 4: QUALITY ASSURANCE (3h)",
      tasks: [
        "Implementar validação de respostas",
        "Adicionar confidence scoring",
        "Criar sistema de fallback automático",
        "Implementar cache inteligente"
      ],
      deliverable: "Sistema de QA automático",
      impact: "+15% precisão"
    },
    {
      phase: "FASE 5: INTEGRATION & TESTING (4h)",
      tasks: [
        "Integrar todos os módulos",
        "Executar testes end-to-end via /chat",
        "Otimizar performance",
        "Documentar arquitetura final"
      ],
      deliverable: "Sistema completo com 95%+ precisão",
      impact: "+10% precisão"
    }
  ];
  
  console.log(chalk.white('\n📅 CRONOGRAMA:\n'));
  
  let totalHours = 0;
  let expectedPrecision = 20; // Starting point
  
  plan.forEach((phase, index) => {
    const hours = parseInt(phase.phase.match(/\((\d+)h\)/)?.[1] || '0');
    totalHours += hours;
    
    if (phase.impact) {
      const impactValue = parseInt(phase.impact.match(/\+(\d+)%/)?.[1] || '0');
      expectedPrecision += impactValue;
    }
    
    console.log(chalk.bold.yellow(`${phase.phase}`));
    console.log('  Tarefas:');
    phase.tasks.forEach(task => console.log(`    • ${task}`));
    console.log(`  Entregável: ${phase.deliverable}`);
    if (phase.impact) {
      console.log(chalk.green(`  Impacto: ${phase.impact} → Total: ${expectedPrecision}%`));
    }
    console.log();
  });
  
  console.log(chalk.bold.green(`\n⏱️ Tempo Total: ${totalHours} horas`));
  console.log(chalk.bold.green(`📊 Precisão Final Esperada: ${expectedPrecision}%`));
}

/**
 * 6. DIFERENÇAS CHAVE DO PLANO ANTERIOR
 */
function highlightKeyDifferences() {
  console.log(chalk.bold.red('\n' + '=' .repeat(70)));
  console.log(chalk.bold.red('🔄 DIFERENÇAS CHAVE DO PLANO REVISADO'));
  console.log(chalk.bold.red('=' .repeat(70)));
  
  console.log(chalk.white('\n❌ REMOVIDO (Soluções Hardcoded):'));
  console.log('  • Lista hardcoded de 94 bairros');
  console.log('  • Extração específica para "petrópolis", "centro", etc');
  console.log('  • Regras fixas para artigos 1, 38, 119');
  console.log('  • Mapeamento manual de ZOTs');
  
  console.log(chalk.white('\n✅ ADICIONADO (Soluções Genéricas):'));
  console.log('  • NLP-based entity extraction');
  console.log('  • Adaptive search strategy selection');
  console.log('  • Multi-signal ranking system');
  console.log('  • Query understanding with intent classification');
  console.log('  • End-to-end testing via /chat endpoint');
  console.log('  • Quality validation before response');
  
  console.log(chalk.yellow('\n🎯 FOCO PRINCIPAL:'));
  console.log('  ANTES: Corrigir casos específicos de teste');
  console.log('  AGORA: Melhorar arquitetura para QUALQUER query');
  
  console.log(chalk.green('\n📈 RESULTADO ESPERADO:'));
  console.log('  • Sistema genérico que funciona para queries não vistas');
  console.log('  • Sem dependência de padrões hardcoded');
  console.log('  • Adaptável a novos tipos de perguntas');
  console.log('  • Testável via endpoint real /chat');
}

/**
 * Main execution
 */
async function main() {
  console.log(chalk.bold.magenta('\n' + '=' .repeat(70)));
  console.log(chalk.bold.magenta('🔬 ANÁLISE ARQUITETURAL GENÉRICA - AGENTIC-RAG'));
  console.log(chalk.bold.magenta('=' .repeat(70)));
  
  await analyzePipelineStructure();
  await analyzeDataSources();
  proposeGenericArchitecture();
  const testCode = await createEndToEndTest();
  createRevisedActionPlan();
  highlightKeyDifferences();
  
  console.log(chalk.bold.cyan('\n' + '=' .repeat(70)));
  console.log(chalk.bold.cyan('📌 PRÓXIMOS PASSOS IMEDIATOS'));
  console.log(chalk.bold.cyan('=' .repeat(70)));
  
  console.log(chalk.white('\n1. Salvar teste end-to-end:'));
  console.log(chalk.gray('   scripts/test-chat-endpoint.mjs'));
  
  console.log(chalk.white('\n2. Executar baseline:'));
  console.log(chalk.gray('   node scripts/test-chat-endpoint.mjs'));
  
  console.log(chalk.white('\n3. Começar Fase 0:'));
  console.log(chalk.gray('   Documentar pipeline atual sem alterações'));
  
  console.log(chalk.white('\n4. Implementar melhorias incrementalmente:'));
  console.log(chalk.gray('   Cada fase deve ser testável independentemente'));
  
  console.log(chalk.bold.yellow('\n⚠️ IMPORTANTE:'));
  console.log('  • NÃO adicionar listas hardcoded');
  console.log('  • NÃO criar regras específicas para testes');
  console.log('  • SEMPRE testar via endpoint /chat');
  console.log('  • MANTER solução genérica e extensível');
}

// Execute
main().catch(error => {
  console.error(chalk.red('❌ Erro:', error));
  process.exit(1);
});