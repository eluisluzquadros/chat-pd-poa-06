# 📋 Plano de Implementação - Agentic-RAG v2.0

## 🎯 Objetivo
Transformar o RAG atual (pipeline sequencial simples) em um sistema Agentic-RAG verdadeiro, capaz de lidar com a complexidade jurídico-urbanística do Plano Diretor de Porto Alegre.

## 🔄 De → Para

| Componente | Atual (Problema) | Proposto (Solução) |
|------------|------------------|-------------------|
| **Orquestração** | Pipeline fixo sequencial | Agentes autônomos com decisões dinâmicas |
| **Chunking** | Divisão simples (300 chars) | Hierárquico com contexto preservado |
| **Busca** | Vector search básico | Knowledge Graph + Vector + SQL integrados |
| **Contexto** | Sem memória | Análise contextual com histórico de sessão |
| **Validação** | Nenhuma | Auto-validação com loop de refinamento |
| **Citações** | Hardcoded (fake) | Extração real do Knowledge Graph |

## 📅 Cronograma Detalhado

### 🚀 SPRINT 1: Fundação (Dias 1-5)

#### Dia 1-2: Infraestrutura de Dados
```sql
-- Criar novas tabelas
CREATE TABLE document_chunks_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL,
    parent_chunk_id UUID REFERENCES document_chunks_v2(id),
    level VARCHAR(20) NOT NULL, -- 'document', 'section', 'article', 'paragraph'
    sequence_number INTEGER NOT NULL,
    title TEXT,
    content TEXT NOT NULL,
    embedding vector(1536),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_parent (parent_chunk_id),
    INDEX idx_level (level),
    INDEX idx_document (document_id)
);

CREATE TABLE knowledge_graph (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_type VARCHAR(50) NOT NULL, -- 'law', 'article', 'zone', 'concept'
    label TEXT NOT NULL,
    properties JSONB DEFAULT '{}',
    embedding vector(1536),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE kg_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES knowledge_graph(id),
    target_id UUID REFERENCES knowledge_graph(id),
    relationship_type VARCHAR(100) NOT NULL,
    properties JSONB DEFAULT '{}',
    weight FLOAT DEFAULT 1.0,
    INDEX idx_source (source_id),
    INDEX idx_target (target_id),
    INDEX idx_type (relationship_type)
);
```

#### Dia 3-4: Reprocessamento com Chunking Hierárquico
```typescript
// supabase/functions/document-reprocessor/index.ts
export async function reprocessDocuments() {
    const documents = await getDocuments();
    
    for (const doc of documents) {
        // Criar chunk de documento (nível 0)
        const docChunk = await createChunk({
            level: 'document',
            title: doc.title,
            content: doc.fullText,
            metadata: { type: doc.type, source: doc.source }
        });
        
        // Processar seções (nível 1)
        const sections = extractSections(doc);
        for (const section of sections) {
            const sectionChunk = await createChunk({
                level: 'section',
                parent_id: docChunk.id,
                title: section.title,
                content: section.text
            });
            
            // Processar artigos (nível 2)
            const articles = extractArticles(section);
            for (const article of articles) {
                const articleChunk = await createChunk({
                    level: 'article',
                    parent_id: sectionChunk.id,
                    title: `Art. ${article.number}`,
                    content: article.text
                });
                
                // Criar nó no Knowledge Graph
                await createKGNode({
                    type: 'article',
                    label: `${doc.law} - Art. ${article.number}`,
                    properties: {
                        law: doc.law,
                        number: article.number,
                        text: article.text
                    }
                });
            }
        }
    }
}
```

#### Dia 5: Scripts de Migração
```javascript
// scripts/migrate-to-hierarchical.mjs
import { createClient } from '@supabase/supabase-js';

async function migrate() {
    console.log('🔄 Iniciando migração para chunking hierárquico...');
    
    // 1. Backup dados atuais
    await backupCurrentData();
    
    // 2. Reprocessar documentos DOCX
    const docs = ['PDUS_2025.docx', 'LUOS_2025.docx', 'FAQ.docx', 'Regime_Urbanistico.docx'];
    for (const doc of docs) {
        await reprocessWithHierarchy(doc);
    }
    
    // 3. Popular Knowledge Graph inicial
    await populateInitialKG();
    
    // 4. Validar migração
    const stats = await validateMigration();
    console.log('✅ Migração completa:', stats);
}
```

### 🧠 SPRINT 2: Knowledge Graph (Dias 6-10)

#### Dia 6-7: Modelagem de Relações
```typescript
// Definir ontologia do Knowledge Graph
const ontology = {
    nodes: {
        'law': ['PDUS', 'LUOS', 'Decreto', 'Portaria'],
        'article': ['número', 'texto', 'lei_origem'],
        'zone': ['ZOT', 'nome', 'código'],
        'parameter': ['altura_maxima', 'coef_aproveitamento', 'taxa_ocupacao'],
        'concept': ['EIV', 'ZEIS', 'APP', 'Outorga Onerosa']
    },
    relationships: {
        'DEFINES': { from: 'article', to: 'concept' },
        'REFERENCES': { from: 'article', to: 'article' },
        'BELONGS_TO': { from: 'zone', to: 'law' },
        'HAS_PARAMETER': { from: 'zone', to: 'parameter' },
        'LOCATED_IN': { from: 'neighborhood', to: 'zone' }
    }
};
```

#### Dia 8-9: População do Knowledge Graph
```python
# scripts/populate_knowledge_graph.py
import json
from typing import Dict, List

def create_knowledge_graph():
    # Criar nós principais
    nodes = []
    
    # 1. Leis
    nodes.append({
        'type': 'law',
        'label': 'LUOS',
        'properties': {
            'full_name': 'Lei de Uso e Ocupação do Solo',
            'year': 2025,
            'status': 'vigente'
        }
    })
    
    # 2. Artigos importantes
    critical_articles = [
        ('LUOS', 89, 'EIV - Estudo de Impacto de Vizinhança'),
        ('PDUS', 92, 'ZEIS - Zonas Especiais de Interesse Social'),
        ('LUOS', 81, 'Certificação em Sustentabilidade'),
        ('LUOS', 86, 'Outorga Onerosa')
    ]
    
    for law, number, concept in critical_articles:
        # Criar nó do artigo
        article_node = create_node('article', f'{law} Art. {number}', {
            'law': law,
            'number': number,
            'defines': concept
        })
        
        # Criar relação DEFINES
        create_relationship(article_node, concept_node, 'DEFINES')
    
    # 3. Zonas e parâmetros
    zones = load_zones_from_db()
    for zone in zones:
        zone_node = create_node('zone', zone['name'], zone)
        
        # Conectar com parâmetros
        for param in zone['parameters']:
            param_node = create_node('parameter', param['name'], param)
            create_relationship(zone_node, param_node, 'HAS_PARAMETER')
```

#### Dia 10: API de Traversal
```typescript
// supabase/functions/kg-traverse/index.ts
export async function traverseKnowledgeGraph(
    startNode: string,
    maxDepth: number = 3,
    relationships?: string[]
) {
    const query = `
        WITH RECURSIVE graph_traversal AS (
            -- Nó inicial
            SELECT 
                id, label, properties, 0 as depth
            FROM knowledge_graph
            WHERE label = $1
            
            UNION ALL
            
            -- Recursão
            SELECT 
                kg.id, kg.label, kg.properties, gt.depth + 1
            FROM knowledge_graph kg
            JOIN kg_relationships kr ON kg.id = kr.target_id
            JOIN graph_traversal gt ON kr.source_id = gt.id
            WHERE gt.depth < $2
                AND ($3::text[] IS NULL OR kr.relationship_type = ANY($3))
        )
        SELECT * FROM graph_traversal;
    `;
    
    return await executeQuery(query, [startNode, maxDepth, relationships]);
}
```

### 🤖 SPRINT 3: Agentes Especializados (Dias 11-20)

#### Dia 11-13: Legal Specialist Agent
```typescript
// supabase/functions/agent-legal/index.ts
export class LegalSpecialistAgent {
    async process(query: string, context: any) {
        // 1. Extrair referências legais
        const legalRefs = this.extractLegalReferences(query);
        
        // 2. Buscar no Knowledge Graph
        const graphResults = await this.searchKnowledgeGraph(legalRefs);
        
        // 3. Validar citações
        const validated = await this.validateCitations(graphResults);
        
        // 4. Enriquecer com contexto hierárquico
        const enriched = await this.enrichWithHierarchy(validated);
        
        return {
            type: 'legal',
            confidence: this.calculateConfidence(enriched),
            articles: enriched.articles,
            laws: enriched.laws,
            relationships: enriched.relationships
        };
    }
    
    private extractLegalReferences(query: string) {
        const patterns = [
            /(?:artigo|art\.?)\s*(\d+)/gi,
            /(?:LUOS|PDUS|Lei)\s*(?:n[º°]?\s*)?(\d+)/gi,
            /(?:inciso|§)\s*([IVXLCDM]+|\d+)/gi
        ];
        
        const refs = [];
        for (const pattern of patterns) {
            const matches = query.matchAll(pattern);
            for (const match of matches) {
                refs.push({
                    type: 'legal_reference',
                    value: match[0],
                    normalized: this.normalizeLegalRef(match)
                });
            }
        }
        return refs;
    }
}
```

#### Dia 14-16: Urban Planning Agent
```typescript
// supabase/functions/agent-urban/index.ts
export class UrbanPlanningAgent {
    async process(query: string, context: any) {
        // 1. Identificar bairros e zonas
        const locations = await this.extractLocations(query);
        
        // 2. Buscar regime urbanístico
        const regimeData = await this.queryRegimeUrbanistico(locations);
        
        // 3. Enriquecer com Knowledge Graph
        const enriched = await this.enrichWithGraph(regimeData);
        
        // 4. Calcular métricas derivadas
        const metrics = this.calculateUrbanMetrics(enriched);
        
        // 5. Verificar restrições e exceções
        const restrictions = await this.checkRestrictions(locations);
        
        return {
            type: 'urban',
            locations: locations,
            regime: regimeData,
            metrics: metrics,
            restrictions: restrictions,
            zones: enriched.zones
        };
    }
    
    private async queryRegimeUrbanistico(locations: any[]) {
        const query = `
            SELECT 
                b.nome as bairro,
                z.codigo as zot,
                ru.altura_maxima,
                ru.coef_aproveitamento_basico,
                ru.coef_aproveitamento_maximo,
                ru.taxa_ocupacao,
                ru.taxa_permeabilidade
            FROM bairros b
            JOIN zonas z ON b.zona_id = z.id
            JOIN regime_urbanistico ru ON z.id = ru.zona_id
            WHERE b.nome = ANY($1)
        `;
        
        return await this.db.query(query, [locations.map(l => l.name)]);
    }
}
```

#### Dia 17-18: Validation Agent
```typescript
// supabase/functions/agent-validator/index.ts
export class ValidationAgent {
    async validate(results: any[]): Promise<ValidationResult> {
        const checks = [];
        
        // 1. Validar citações legais
        if (this.hasLegalCitations(results)) {
            checks.push(await this.validateLegalCitations(results));
        }
        
        // 2. Validar dados numéricos
        if (this.hasNumericData(results)) {
            checks.push(await this.validateNumericData(results));
        }
        
        // 3. Verificar consistência entre fontes
        checks.push(await this.checkConsistency(results));
        
        // 4. Detectar contradições
        const contradictions = await this.detectContradictions(results);
        
        // 5. Calcular confiança
        const confidence = this.calculateOverallConfidence(checks);
        
        return {
            isValid: checks.every(c => c.passed),
            confidence: confidence,
            issues: checks.filter(c => !c.passed),
            contradictions: contradictions,
            requiresRefinement: confidence < 0.8
        };
    }
    
    private async validateLegalCitations(results: any[]) {
        // Verificar se artigos citados existem no KG
        const citations = this.extractCitations(results);
        const validated = [];
        
        for (const citation of citations) {
            const exists = await this.checkInKnowledgeGraph(citation);
            validated.push({
                citation: citation,
                valid: exists,
                source: exists ? 'knowledge_graph' : null
            });
        }
        
        return {
            passed: validated.every(v => v.valid),
            details: validated
        };
    }
}
```

#### Dia 19-20: Master Orchestrator
```typescript
// supabase/functions/orchestrator-master/index.ts
export class MasterOrchestrator {
    private agents = {
        legal: new LegalSpecialistAgent(),
        urban: new UrbanPlanningAgent(),
        geographic: new GeographicAgent(),
        conceptual: new ConceptualAgent(),
        validator: new ValidationAgent()
    };
    
    async processQuery(query: string, sessionId: string) {
        // 1. Análise contextual
        const context = await this.analyzeContext(query, sessionId);
        
        // 2. Decisão de roteamento
        const routing = this.decideRouting(context);
        
        // 3. Execução paralela de agentes
        const agentResults = await this.executeAgents(routing, query, context);
        
        // 4. Reranking multi-critério
        const ranked = await this.rerank(agentResults, context);
        
        // 5. Validação
        const validation = await this.agents.validator.validate(ranked);
        
        // 6. Loop de refinamento se necessário
        if (validation.requiresRefinement) {
            return await this.refine(query, validation, context);
        }
        
        // 7. Síntese final
        return await this.synthesize(ranked, validation);
    }
    
    private decideRouting(context: any) {
        const routing = [];
        
        // Decisões baseadas na análise
        if (context.hasLegalReferences) {
            routing.push({ agent: 'legal', priority: 'high' });
        }
        
        if (context.hasLocationReferences) {
            routing.push({ agent: 'urban', priority: 'high' });
            routing.push({ agent: 'geographic', priority: 'medium' });
        }
        
        if (context.needsConceptualExplanation) {
            routing.push({ agent: 'conceptual', priority: 'medium' });
        }
        
        return routing;
    }
    
    private async executeAgents(routing: any[], query: string, context: any) {
        const tasks = routing.map(r => 
            this.agents[r.agent].process(query, context)
        );
        
        return await Promise.all(tasks);
    }
}
```

### ⚡ SPRINT 4: Reranking e Otimização (Dias 21-25)

#### Dia 21-22: Sistema de Reranking
```typescript
// supabase/functions/reranker/index.ts
export class MultiCriteriaReranker {
    private weights = {
        semantic_relevance: 0.25,
        legal_authority: 0.20,
        specificity: 0.20,
        completeness: 0.15,
        recency: 0.10,
        source_quality: 0.10
    };
    
    async rerank(results: any[], context: any) {
        const scored = [];
        
        for (const result of results) {
            const scores = {
                semantic_relevance: await this.scoreSemanticRelevance(result, context),
                legal_authority: this.scoreLegalAuthority(result),
                specificity: this.scoreSpecificity(result, context),
                completeness: this.scoreCompleteness(result),
                recency: this.scoreRecency(result),
                source_quality: this.scoreSourceQuality(result)
            };
            
            const finalScore = Object.entries(scores).reduce(
                (sum, [criterion, score]) => sum + score * this.weights[criterion],
                0
            );
            
            scored.push({
                ...result,
                scores,
                finalScore
            });
        }
        
        return scored.sort((a, b) => b.finalScore - a.finalScore);
    }
}
```

#### Dia 23-24: Memória de Sessão
```typescript
// supabase/functions/session-memory/index.ts
export class SessionMemory {
    async store(sessionId: string, turn: any) {
        const memory = {
            session_id: sessionId,
            turn_number: await this.getNextTurnNumber(sessionId),
            query: turn.query,
            context: turn.context,
            agent_results: turn.agentResults,
            final_response: turn.response,
            timestamp: new Date()
        };
        
        await this.db.insert('session_memory', memory);
        
        // Atualizar embeddings de sessão
        await this.updateSessionEmbedding(sessionId);
    }
    
    async retrieve(sessionId: string, k: number = 5) {
        return await this.db.query(
            `SELECT * FROM session_memory 
             WHERE session_id = $1 
             ORDER BY turn_number DESC 
             LIMIT $2`,
            [sessionId, k]
        );
    }
    
    async getContext(sessionId: string) {
        const history = await this.retrieve(sessionId);
        
        return {
            entities: this.extractEntities(history),
            topics: this.extractTopics(history),
            decisions: this.extractDecisions(history),
            clarifications: this.extractClarifications(history)
        };
    }
}
```

#### Dia 25: Testes de Integração
```javascript
// scripts/test-agentic-rag.mjs
async function testAgenticRAG() {
    const testCases = [
        {
            query: "Qual o artigo da LUOS que define o EIV?",
            expected: {
                article: "LUOS - Art. 89",
                confidence: "> 0.9"
            }
        },
        {
            query: "Qual a altura máxima no bairro Boa Vista?",
            expected: {
                contains: ["Boa Vista", "metros"],
                not_contains: ["Boa Vista do Sul"]
            }
        }
    ];
    
    for (const test of testCases) {
        const result = await callAgenticRAG(test.query);
        const validation = validateResult(result, test.expected);
        
        console.log({
            query: test.query,
            passed: validation.passed,
            confidence: result.confidence,
            agentsUsed: result.metadata.agents
        });
    }
}
```

## 📊 Métricas de Acompanhamento

```javascript
// scripts/monitor-progress.mjs
const metrics = {
    week1: {
        chunking_hierarchico: false,
        knowledge_graph_created: false,
        tables_migrated: false
    },
    week2: {
        agents_implemented: 0, // de 4
        kg_populated: false,
        traversal_api: false
    },
    week3: {
        orchestration_working: false,
        validation_loop: false,
        reranking_implemented: false
    },
    week4: {
        session_memory: false,
        tests_passing: 0, // de 121
        accuracy: 0 // %
    }
};
```

## 🚀 Comandos de Deploy

```bash
# Fase 1: Preparação
npm run db:migrate         # Criar novas tabelas
npm run chunks:reprocess   # Reprocessar com hierarquia
npm run kg:populate        # Popular Knowledge Graph

# Fase 2: Deploy dos Agentes
npx supabase functions deploy agent-legal --project-ref ngrqwmvuhvjkeohesbxs
npx supabase functions deploy agent-urban --project-ref ngrqwmvuhvjkeohesbxs
npx supabase functions deploy agent-validator --project-ref ngrqwmvuhvjkeohesbxs
npx supabase functions deploy orchestrator-master --project-ref ngrqwmvuhvjkeohesbxs

# Fase 3: Testes
npm run test:agentic       # Testar novo pipeline
npm run test:comparison    # Comparar com versão antiga
npm run test:full          # 121 casos completos
```

## ✅ Checklist de Validação

- [ ] Chunks hierárquicos preservam contexto
- [ ] Knowledge Graph conecta artigos e conceitos
- [ ] Agentes tomam decisões autônomas
- [ ] Validação detecta erros e solicita refinamento
- [ ] Citações vêm do KG, não hardcoded
- [ ] Memória de sessão funciona
- [ ] Reranking melhora relevância
- [ ] Acurácia > 90% nos 121 casos
- [ ] Tempo de resposta < 3s
- [ ] Zero citações incorretas

## 🎯 Resultado Final Esperado

Sistema Agentic-RAG com:
- **Precisão**: >90% geral, 100% em citações
- **Inteligência**: Agentes autônomos com decisões contextuais
- **Conhecimento**: Graph com todas relações jurídico-urbanísticas
- **Confiabilidade**: Auto-validação e correção
- **Performance**: <3s com cache inteligente

---

*Plano criado em 13/08/2025*  
*Estimativa: 4-5 semanas para implementação completa*