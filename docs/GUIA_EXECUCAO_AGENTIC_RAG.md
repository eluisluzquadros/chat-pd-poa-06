# 🚀 Guia de Execução - Implementação Agentic-RAG

## 📋 Status Atual

O sistema está preparado para migração do RAG simples para Agentic-RAG verdadeiro com:
- ✅ Arquitetura documentada
- ✅ Scripts de reprocessamento criados
- ✅ Migração SQL preparada
- ✅ Knowledge Graph modelado
- ⏳ Aguardando execução

## 🔄 Ordem de Execução

### Fase 1: Preparação do Banco de Dados (30 min)

#### 1.1 Executar Migração SQL
```bash
# No Supabase Dashboard SQL Editor, executar:
# supabase/migrations/20240813_create_hierarchical_tables.sql

# Ou via CLI:
npx supabase db push --project-ref ngrqwmvuhvjkeohesbxs
```

**Verificação:**
```sql
-- Verificar se tabelas foram criadas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'legal_document_chunks',
    'chunk_cross_references', 
    'knowledge_graph_nodes',
    'knowledge_graph_edges',
    'session_memory',
    'validation_cache'
);
```

### Fase 2: Reprocessamento Hierárquico (2-3 horas)

#### 2.1 Executar Chunking Hierárquico
```bash
# Processar documentos com nova estrutura
node scripts/reprocess-hierarchical-chunking.mjs

# O script irá:
# 1. Ler PDPOA2025-Minuta_Preliminar_PLANO_DIRETOR.docx (110 páginas)
# 2. Ler PDPOA2025-Minuta_Preliminar_LUOS.docx (60 páginas)
# 3. Criar ~2100 chunks hierárquicos
# 4. Gerar embeddings para artigos e seções importantes
# 5. Salvar no banco de dados
```

**Monitoramento:**
```sql
-- Verificar progresso
SELECT 
    level_type,
    COUNT(*) as total,
    COUNT(embedding) as com_embedding
FROM legal_document_chunks
GROUP BY level_type
ORDER BY level;
```

### Fase 3: Popular Knowledge Graph (30 min)

#### 3.1 Criar Nós e Relações
```bash
# Popular Knowledge Graph com conceitos principais
node scripts/populate-knowledge-graph.mjs

# Criará:
# - 40+ nós (leis, artigos, conceitos, zonas)
# - 50+ relações (DEFINES, REFERENCES, HAS_PARAMETER)
```

**Verificação:**
```sql
-- Verificar Knowledge Graph
SELECT 
    node_type,
    COUNT(*) as total
FROM knowledge_graph_nodes
GROUP BY node_type;

-- Testar traversal
SELECT * FROM traverse_knowledge_graph('EIV', 3);
```

### Fase 4: Implementar Agentes (1 semana)

#### 4.1 Deploy dos Edge Functions Agênticas
```bash
# Deploy do orquestrador principal
npx supabase functions deploy orchestrator-master --project-ref ngrqwmvuhvjkeohesbxs

# Deploy dos agentes especializados
npx supabase functions deploy agent-legal --project-ref ngrqwmvuhvjkeohesbxs
npx supabase functions deploy agent-urban --project-ref ngrqwmvuhvjkeohesbxs
npx supabase functions deploy agent-validator --project-ref ngrqwmvuhvjkeohesbxs
```

### Fase 5: Testes e Validação (2 dias)

#### 5.1 Testar Novo Pipeline
```bash
# Testar queries específicas
node scripts/test-agentic-rag.mjs

# Executar suite completa (121 casos)
node scripts/test-all-121-cases.mjs --use-agentic
```

#### 5.2 Comparação com Sistema Atual
```bash
# Comparar performance
node scripts/compare-rag-versions.mjs
```

## 📊 Métricas de Validação

### Critérios de Sucesso

| Métrica | Atual | Meta | Como Medir |
|---------|-------|------|------------|
| **Citação de Artigos** | 16.7% | >95% | `test-article-citations.mjs` |
| **Precisão Geral** | 62.5% | >90% | `test-all-121-cases.mjs` |
| **Tempo de Resposta** | 2.9s | <3s | Logs do Supabase |
| **Contexto Preservado** | Não | Sim | Verificação manual |
| **Auto-correção** | Não | Sim | Logs de validação |

### Queries de Teste Prioritárias

```javascript
const criticalTests = [
    "Qual o artigo da LUOS que define o EIV?", // Deve retornar Art. 89
    "Quais são as ZEIS e onde estão definidas?", // Deve retornar PDUS Art. 92
    "Qual a altura máxima no bairro Boa Vista?", // Não deve confundir com Boa Vista do Sul
    "Quais os parâmetros do Centro Histórico?", // Deve retornar dados completos
    "Onde está definida a outorga onerosa?" // Deve retornar LUOS Art. 86
];
```

## ⚠️ Pontos de Atenção

### Antes de Começar
1. **Backup do banco atual** - Fazer snapshot no Supabase
2. **Horário de menor uso** - Executar fora do horário de pico
3. **Monitorar recursos** - Embeddings consomem API OpenAI

### Durante a Execução
1. **Chunks hierárquicos** - Verificar se preservam contexto
2. **Embeddings** - Monitorar geração (custo OpenAI)
3. **Knowledge Graph** - Validar relações criadas

### Após Implementação
1. **Remover hardcoding** - Eliminar mapeamentos hardcoded do response-synthesizer-v2
2. **Desativar pipeline antigo** - Manter como fallback temporário
3. **Monitorar performance** - Dashboards de métricas

## 🛠️ Troubleshooting

### Problema: Migração SQL falha
```sql
-- Verificar e dropar tabelas se necessário
DROP TABLE IF EXISTS legal_document_chunks CASCADE;
DROP TABLE IF EXISTS chunk_cross_references CASCADE;
DROP TABLE IF EXISTS knowledge_graph_nodes CASCADE;
DROP TABLE IF EXISTS knowledge_graph_edges CASCADE;

-- Re-executar migração
```

### Problema: Reprocessamento muito lento
```javascript
// Ajustar no script:
const BATCH_SIZE = 10; // Reduzir batch
const GENERATE_EMBEDDINGS = false; // Desabilitar temporariamente
```

### Problema: Knowledge Graph não conecta
```sql
-- Verificar nós órfãos
SELECT * FROM knowledge_graph_nodes n
WHERE NOT EXISTS (
    SELECT 1 FROM knowledge_graph_edges e
    WHERE e.source_id = n.id OR e.target_id = n.id
);
```

## 📈 Monitoramento Pós-Deploy

### Dashboard Queries
```sql
-- Performance do novo sistema
SELECT 
    DATE(created_at) as dia,
    COUNT(*) as queries,
    AVG(confidence) as confianca_media,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time) as mediana_tempo
FROM query_logs
WHERE pipeline = 'agentic'
GROUP BY DATE(created_at);

-- Uso dos agentes
SELECT 
    agent_type,
    COUNT(*) as utilizacoes,
    AVG(execution_time) as tempo_medio
FROM agent_executions
GROUP BY agent_type;
```

## 🎯 Próximos Passos

Após implementação bem-sucedida:

1. **Semana 1**: Monitorar métricas e ajustar
2. **Semana 2**: Implementar memória de sessão
3. **Semana 3**: Adicionar reranking multi-critério
4. **Semana 4**: Fine-tuning com feedback dos usuários

## 📞 Suporte

Em caso de problemas:
1. Verificar logs no Supabase Dashboard
2. Consultar documentação em `/docs`
3. Executar testes de diagnóstico
4. Rollback se necessário (snapshot do banco)

---

*Guia criado em 13/08/2025*  
*Versão: 1.0 - Implementação Inicial Agentic-RAG*