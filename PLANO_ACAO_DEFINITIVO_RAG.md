# 🚨 PLANO DE AÇÃO DEFINITIVO - SISTEMA RAG PLANO DIRETOR POA

**SITUAÇÃO CRÍTICA:** O sistema está funcionando com gambiarras, não com RAG real.

---

## 🔴 ESTADO ATUAL - A VERDADE

### O que está acontecendo:
1. **Vector Search QUEBRADO** - 0 resultados para qualquer busca
2. **Embeddings CORROMPIDOS** - 17773 dimensões (impossível)
3. **Sistema "funciona" com HARDCODING** - 10 respostas fixas
4. **98.3% de "sucesso" é FALSO** - testes validam hardcoding, não RAG

### Impacto real:
- Cidadãos recebem informações ERRADAS sobre legislação urbana
- Profissionais tomam decisões baseadas em dados INCORRETOS
- Sistema não escala - apenas 10 de 500+ artigos mapeados

---

## ✅ SOLUÇÃO DEFINITIVA - PASSO A PASSO

### FASE 1: DIAGNÓSTICO EMERGENCIAL (30 min)

#### 1.1 Verificar estado real dos embeddings
```bash
# Verificar configuração de embeddings
node -e "
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const { data } = await supabase.from('document_sections').select('embedding').limit(1);
console.log('Dimensão atual:', data[0].embedding.length);
"
```

#### 1.2 Identificar função de embedding usada
- Verificar em `supabase/functions/qa-ingest-kb/index.ts`
- Verificar modelo usado (deve ser OpenAI text-embedding-ada-002)

### FASE 2: REPROCESSAMENTO CORRETO (2-4 horas)

#### 2.1 Criar script de reprocessamento correto
```typescript
// scripts/reprocess-embeddings-correctly.ts
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateEmbedding(text: string) {
  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002", // 1536 dimensões
    input: text,
  });
  return response.data[0].embedding;
}

// Reprocessar TODOS os documentos
```

#### 2.2 Executar reprocessamento
```bash
# Backup primeiro
pg_dump [database] > backup_before_fix.sql

# Reprocessar
npm run kb:reprocess-correct

# Verificar
SELECT COUNT(*), array_length(embedding, 1) as dim 
FROM document_sections 
GROUP BY dim;
```

### FASE 3: REMOVER GAMBIARRAS (1 hora)

#### 3.1 Desativar response-synthesizer-simple
```bash
# Renomear para backup
mv supabase/functions/response-synthesizer-simple \
   supabase/functions/response-synthesizer-simple.backup
```

#### 3.2 Restaurar response-synthesizer original
```typescript
// Verificar e corrigir:
// - Timeout adequado (30s)
// - API key correta
// - Modelo disponível
// - Error handling
```

### FASE 4: CONFIGURAR RAG CORRETAMENTE (2 horas)

#### 4.1 Pipeline correto
```
Query → Query Analyzer → Vector Search (FUNCIONANDO) → 
Context → LLM → Response com citações REAIS
```

#### 4.2 Parâmetros críticos
```typescript
const VECTOR_SEARCH_CONFIG = {
  threshold: 0.7,        // Similaridade mínima
  limit: 10,            // Top K resultados
  rerank: true,         // Reordenar por relevância
  hybrid: true          // Combinar com keyword search
};

const LLM_CONFIG = {
  model: "gpt-4-turbo-preview",
  temperature: 0.1,     // Baixo para precisão
  max_tokens: 2000,
  system_prompt: `
    Você é um especialista em legislação urbana de Porto Alegre.
    SEMPRE cite o artigo específico quando encontrado no contexto.
    NUNCA invente artigos ou números.
    Se não encontrar, diga "não encontrei a referência específica".
  `
};
```

### FASE 5: VALIDAÇÃO REAL (1 hora)

#### 5.1 Testes SEM hardcoding
```javascript
// Desabilitar COMPLETAMENTE response-synthesizer-simple
// Testar queries que NUNCA foram hardcoded:

const REAL_TESTS = [
  "Qual o artigo sobre recuo de jardim?",
  "O que diz o artigo 115 da LUOS?",
  "Quais são as regras para loteamento?",
  "Como funciona a transferência de potencial construtivo?",
  "Qual a legislação sobre áreas de preservação?"
];
```

#### 5.2 Métricas de sucesso REAIS
- Vector search retorna resultados relevantes: >90%
- Citações corretas do contexto: >95%
- Tempo de resposta: <10s
- SEM respostas hardcoded: 0%

### FASE 6: MONITORAMENTO CONTÍNUO

#### 6.1 Dashboard de saúde
```sql
-- Queries para monitorar
CREATE VIEW rag_health AS
SELECT 
  COUNT(*) as total_docs,
  AVG(array_length(embedding, 1)) as avg_embedding_dim,
  COUNT(DISTINCT metadata->>'source') as sources,
  MAX(created_at) as last_update
FROM document_sections;
```

#### 6.2 Alertas automáticos
- Vector search retornando 0: ALERTA CRÍTICO
- Embedding dimension != 1536: ALERTA CRÍTICO
- Response time > 15s: ALERTA WARNING

---

## 🚀 COMANDO ÚNICO DE EMERGÊNCIA

```bash
# Script all-in-one para consertar tudo
cat << 'EOF' > fix-rag-emergency.sh
#!/bin/bash
set -e

echo "🚨 INICIANDO CORREÇÃO EMERGENCIAL DO RAG"

# 1. Backup
echo "📦 Fazendo backup..."
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Verificar dimensão atual
echo "🔍 Verificando embeddings..."
psql $DATABASE_URL -c "SELECT array_length(embedding, 1) FROM document_sections LIMIT 1;"

# 3. Reprocessar com embeddings corretos
echo "🔄 Reprocessando documentos..."
npm run kb:reprocess

# 4. Verificar correção
echo "✅ Verificando correção..."
psql $DATABASE_URL -c "SELECT COUNT(*), array_length(embedding, 1) FROM document_sections GROUP BY 2;"

# 5. Testar vector search
echo "🧪 Testando vector search..."
node scripts/test-enhanced-vector-search.mjs

# 6. Deploy das correções
echo "🚀 Deploy..."
npm run deploy-functions

echo "✅ CORREÇÃO COMPLETA!"
EOF

chmod +x fix-rag-emergency.sh
./fix-rag-emergency.sh
```

---

## ⏰ CRONOGRAMA

| Fase | Tempo | Prioridade |
|------|-------|------------|
| Diagnóstico | 30 min | 🔴 CRÍTICA |
| Reprocessamento | 2-4 horas | 🔴 CRÍTICA |
| Remover gambiarras | 1 hora | 🟡 ALTA |
| Configurar RAG | 2 horas | 🔴 CRÍTICA |
| Validação | 1 hora | 🔴 CRÍTICA |
| **TOTAL** | **6-9 horas** | |

---

## ⚠️ RISCOS SE NÃO CONSERTAR

1. **LEGAL**: Informações incorretas sobre legislação urbana
2. **REPUTACIONAL**: Sistema não confiável para decisões importantes
3. **TÉCNICO**: Dívida técnica crescente com mais hardcoding
4. **FINANCEIRO**: Custos de manutenção manual infinitos

---

## 📞 AÇÃO IMEDIATA NECESSÁRIA

**PARE TUDO E CONSERTE ISSO AGORA!**

1. [ ] Executar diagnóstico (30 min)
2. [ ] Decidir: consertar ou desligar sistema
3. [ ] Se consertar: seguir plano acima
4. [ ] Se desligar: avisar usuários imediatamente

**Este não é um sistema de teste. É produção com impacto real na cidade!**