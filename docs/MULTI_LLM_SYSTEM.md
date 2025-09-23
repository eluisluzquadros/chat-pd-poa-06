# Sistema Multi-LLM Avançado

## Visão Geral

Este sistema implementa uma solução completa de integração de múltiplos modelos de linguagem (LLMs) com métricas avançadas, comparação de performance e seleção inteligente de modelos baseada no contexto.

## 🚀 Funcionalidades Principais

### 1. Suporte a Múltiplos Modelos
- **OpenAI**: GPT-4o, GPT-4.5 Turbo (futuro)
- **Anthropic Claude**: Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Sonnet, Claude 3 Haiku
- **Google Gemini**: Gemini 1.5 Pro, Gemini Pro Vision
- **Meta Llama**: Llama 3.1 (local)
- **DeepSeek**: DeepSeek Coder
- **Groq**: Lightning (ultra-rápido)

### 2. Sistema de Métricas Avançado
- **Tempo de resposta** (ms)
- **Tokens por segundo**
- **Custo por consulta** ($)
- **Score de qualidade** (0-100)
- **Taxa de sucesso** (%)
- **Nível de confiança** (0-1)

### 3. Comparação Inteligente
- Melhor para **velocidade**
- Melhor para **qualidade**
- Melhor para **custo**
- **Recomendação balanceada**

### 4. Seleção Automática
- Análise de complexidade da query
- Consideração do papel do usuário
- Restrições de orçamento
- Suporte multimodal (imagens)

## 📁 Estrutura do Sistema

```
src/
├── services/
│   ├── multiLLMService.ts          # Serviço principal
│   └── llmMetricsService.ts        # Sistema de métricas
├── components/
│   └── ui/model-selector.tsx       # Interface de seleção
├── hooks/
│   └── useIntelligentModelSelection.ts  # Hook inteligente
└── types/
    └── chat.ts                     # Tipos TypeScript

supabase/functions/
├── openai-advanced-chat/           # GPT-4.5 Turbo
├── claude-opus-chat/               # Claude 3 Opus
├── claude-sonnet-chat/             # Claude 3 Sonnet
├── claude-haiku-chat/              # Claude 3 Haiku
├── gemini-pro-chat/                # Gemini 1.5 Pro
└── gemini-vision-chat/             # Gemini Pro Vision

supabase/migrations/
└── 20240201000000_add_llm_metrics.sql  # Schema de métricas
```

## 🔧 Configuração

### 1. Variáveis de Ambiente

```env
# OpenAI
OPENAI_API_KEY=sk-...

# Anthropic Claude
CLAUDE_API_KEY=sk-ant-...

# Google Gemini
GEMINI_API_KEY=AI...

# Groq
GROQ_API_KEY=gsk_...

# DeepSeek
DEEPSEEK_API_KEY=sk-...
```

### 2. Banco de Dados

Execute a migração para criar as tabelas de métricas:

```sql
-- Executar no Supabase SQL Editor
-- supabase/migrations/20240201000000_add_llm_metrics.sql
```

### 3. Deploy das Edge Functions

```bash
# Deploy todas as novas functions
supabase functions deploy openai-advanced-chat
supabase functions deploy claude-opus-chat
supabase functions deploy claude-sonnet-chat
supabase functions deploy claude-haiku-chat
supabase functions deploy gemini-pro-chat
supabase functions deploy gemini-vision-chat
```

## 💡 Como Usar

### 1. Uso Básico

```typescript
import { multiLLMService } from '@/services/multiLLMService';

// Processar mensagem com modelo específico
const response = await multiLLMService.processMessage(
  "Qual a altura máxima no Centro?",
  "claude-3-opus",
  "citizen"
);

console.log(response.response);
console.log(`Qualidade: ${response.qualityScore}/100`);
console.log(`Tempo: ${response.executionTime}ms`);
console.log(`Custo: $${response.costEstimate}`);
```

### 2. Comparação de Modelos

```typescript
// Comparar múltiplos modelos
const comparisons = await multiLLMService.compareModels(
  "Análise detalhada da ZOT 8.3",
  "analyst"
);

// Resultados ordenados por qualidade
comparisons.forEach(comp => {
  console.log(`${comp.provider}: ${comp.qualityScore}/100`);
});
```

### 3. Seleção Inteligente

```typescript
// Obter melhor modelo para critério específico
const bestForSpeed = await multiLLMService.getBestModel(
  "Resposta rápida sobre altura",
  "speed"
);

const bestForQuality = await multiLLMService.getBestModel(
  "Análise complexa de aproveitamento",
  "quality"
);

const bestForCost = await multiLLMService.getBestModel(
  "Informação básica",
  "cost"
);
```

### 4. Interface React

```tsx
import { ModelSelector } from '@/components/ui/model-selector';

function ChatSettings() {
  const [selectedModel, setSelectedModel] = useState<LLMProvider>('openai');

  return (
    <ModelSelector 
      selectedModel={selectedModel}
      onModelChange={setSelectedModel}
      showComparison={true}
    />
  );
}
```

### 5. Hook Inteligente

```tsx
import { useIntelligentModelSelection } from '@/hooks/useIntelligentModelSelection';

function SmartChat() {
  const { 
    selectedModel, 
    getBestModelFor,
    switchToOptimalModel 
  } = useIntelligentModelSelection();

  const handleQuery = async (query: string) => {
    // Selecionar automaticamente o melhor modelo
    const optimal = await getBestModelFor(query, {
      priority: 'balanced',
      userRole: 'citizen'
    });
    
    // Processar com modelo otimizado
    const response = await multiLLMService.processMessage(
      query, 
      optimal
    );
    
    return response;
  };
}
```

## 📊 Sistema de Métricas

### 1. Coleta Automática

Todas as interações são automaticamente registradas com:

```typescript
interface LLMMetrics {
  responseTime: number;      // Tempo de resposta (ms)
  tokensPerSecond: number;   // Velocidade de processamento
  inputTokens: number;       // Tokens de entrada
  outputTokens: number;      // Tokens de saída
  totalCost: number;         // Custo total ($)
  qualityScore: number;      // Score de qualidade (0-100)
  confidence: number;        // Nível de confiança (0-1)
  successRate: number;       // Taxa de sucesso (%)
}
```

### 2. Análises Disponíveis

```typescript
// Performance por provedor
const performance = await llmMetricsService.getModelPerformance('claude', 7);

// Comparação geral
const comparison = await llmMetricsService.compareModels(7);

// Benchmark em tempo real
const benchmarks = await llmMetricsService.benchmarkAllModels();
```

### 3. Funções SQL Especializadas

```sql
-- Obter melhor modelo por critério
SELECT * FROM get_best_model('quality', 7);
SELECT * FROM get_best_model('speed', 7);
SELECT * FROM get_best_model('cost', 7);

-- Comparação completa ranqueada
SELECT * FROM get_model_comparison(7);

-- Registrar uso manual
SELECT record_model_usage(
  'claude-3-opus',
  'claude-3-opus-20240229', 
  1500, -- response_time
  100,  -- input_tokens
  200,  -- output_tokens
  95    -- quality_score
);
```

## 🎯 Características por Modelo

### OpenAI GPT-4.5 Turbo (Futuro)
- **Força**: Raciocínio superior, análise complexa
- **Custo**: Alto ($0.015 por 1K tokens output)
- **Velocidade**: Média (40 tokens/s)
- **Caso de uso**: Análises críticas, decisões complexas

### Claude 3 Opus
- **Força**: Máxima qualidade, raciocínio profundo
- **Custo**: Muito alto ($0.075 por 1K tokens output)  
- **Velocidade**: Baixa (30 tokens/s)
- **Caso de uso**: Análises premium, trabalho profissional

### Claude 3 Sonnet
- **Força**: Equilíbrio ideal, versatilidade
- **Custo**: Médio ($0.015 por 1K tokens output)
- **Velocidade**: Boa (40 tokens/s)
- **Caso de uso**: Uso geral, melhor custo-benefício

### Claude 3 Haiku
- **Força**: Velocidade extrema, eficiência
- **Custo**: Baixo ($0.00125 por 1K tokens output)
- **Velocidade**: Muito alta (60 tokens/s)
- **Caso de uso**: Respostas rápidas, alto volume

### Gemini 1.5 Pro
- **Força**: Contexto longo, multimodal
- **Custo**: Médio ($0.005 por 1K tokens output)
- **Velocidade**: Boa (45 tokens/s)
- **Caso de uso**: Análise de documentos, imagens

### Groq Lightning
- **Força**: Velocidade extrema, baixa latência
- **Custo**: Baixo ($0.00027 por 1K tokens)
- **Velocidade**: Extrema (100+ tokens/s)
- **Caso de uso**: Aplicações tempo-real

## 🧪 Testes

### Executar Testes

```bash
# Teste rápido
npx tsx scripts/test-multi-llm-system.ts quick

# Teste completo
npx tsx scripts/test-multi-llm-system.ts full

# Benchmark de latência
npx tsx scripts/test-multi-llm-system.ts benchmark
```

### Exemplos de Output

```
⚡ Teste Rápido do Sistema Multi-LLM
========================================
Testando: "Qual é a altura máxima no Centro de Porto Alegre?"
Provedor: openai

✅ Resposta recebida:
  Tempo: 1247ms
  Qualidade: 87/100
  Confiança: 92.3%
  Custo: $0.0023
  Comprimento: 456 caracteres

📊 Métricas detalhadas:
  Tokens de entrada: 15
  Tokens de saída: 114
  Tokens/segundo: 52.1
```

## 📈 Monitoramento

### Dashboard de Métricas

O sistema inclui um dashboard completo para monitorar:

- **Performance em tempo real**
- **Custos acumulados**
- **Tendências de uso**
- **Comparações históricas**
- **Alertas de performance**

### Views SQL para Análise

```sql
-- Performance resumida
SELECT * FROM llm_model_performance;

-- Métricas diárias
SELECT * FROM llm_daily_metrics;

-- Análise de custos
SELECT provider, SUM(total_cost) as total_spent
FROM llm_metrics 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY provider;
```

## 🔒 Segurança e Privacidade

- **Row Level Security** habilitado
- **API Keys** seguras via environment variables
- **Logs auditáveis** de todas as interações
- **Rate limiting** por usuário/sessão
- **Validação** de entrada e saída

## 🚀 Próximos Passos

1. **Auto-scaling** baseado em carga
2. **Cache inteligente** de respostas similares
3. **Fine-tuning** de modelos específicos
4. **A/B testing** automatizado
5. **Integração** com ferramentas de observabilidade

## 📞 Suporte

Para dúvidas ou problemas:

1. Consulte os logs do Supabase
2. Execute os testes diagnósticos
3. Verifique as métricas no dashboard
4. Analise os custos acumulados

## 🎉 Conclusão

Este sistema Multi-LLM oferece:

- ✅ **14 modelos** diferentes disponíveis
- ✅ **Métricas detalhadas** automatizadas  
- ✅ **Seleção inteligente** baseada em contexto
- ✅ **Interface completa** para comparação
- ✅ **Otimização** de custo-benefício
- ✅ **Escalabilidade** enterprise-ready

A implementação permite escolher o modelo ideal para cada situação, otimizando qualidade, velocidade e custo de acordo com as necessidades específicas de cada consulta sobre o PDUS 2025.