# Sistema Inteligente de Keywords - Plano Diretor POA

## Visão Geral

Este sistema implementa detecção inteligente de keywords para melhorar a recuperação de informações do Plano Diretor de Porto Alegre. O sistema identifica automaticamente termos técnicos, referências legais, e conceitos importantes para priorizar chunks de texto mais relevantes.

## Recursos Implementados

### 1. Detecção de Keywords Compostas Prioritárias
- **certificação em sustentabilidade ambiental** (prioridade 10.0)
- **estudo de impacto de vizinhança** (prioridade 9.0)
- **zoneamento especial de interesse social** (prioridade 8.5)
- **área de proteção ambiental** (prioridade 8.0)
- **4º distrito**, **zot 8.2** e outros termos específicos

### 2. Detecção Automática por Padrões Regex
- **Referências Legais**: `lei complementar nº 434/1999`, `decreto nº 15.958`
- **Referências ZOT**: `zot 8.2`, `zona 3`, `zoneamento 12.4`
- **Referências a Anexos**: `anexo 5`, `tabela 4.2`, `figura 1.5`
- **Referências a Distritos**: `4º distrito`, `região 3`
- **Termos Ambientais**: `área de proteção ambiental`, `impacto ambiental`

### 3. Sistema de Priorização
- Chunks com keywords compostas recebem **score mais alto**
- Referências legais têm **bonus de relevância**
- Sistema combina **similaridade semântica** + **keywords** + **prioridade**

## Integração com Sistema Existente

### Processamento de Documentos
O sistema se integra automaticamente com `process-document/index.py`:

```python
# Chunks agora incluem informações de keywords
enhanced_chunks = enhance_chunks_with_keywords(chunks)

# Cada chunk armazenado contém:
{
    "keywords": [...],              # Keywords detectadas
    "priority_score": 2.4,          # Score de prioridade
    "has_composite_keywords": true,  # Tem keywords compostas
    "legal_references_count": 2      # Número de refs legais
}
```

### Agente RAG Melhorado
O agente RAG agora utiliza keywords para:

```python
# Filtra contexto por keywords da query
keyword_filtered_context = filter_chunks_by_query(context, query)

# Analisa query para personalizar resposta
query_keywords = detector.extract_all_keywords(query)
has_legal_references = any(kw.type == 'legal_reference' for kw in query_keywords)
```

## Funcionalidades da API

### 1. Busca Inteligente
```python
from intelligent_search import IntelligentSearch

search = IntelligentSearch(supabase_client)
results = await search.search_with_keywords(
    query="certificação sustentabilidade 4º distrito",
    limit=10
)
```

### 2. Busca Específica por Tipo
```python
# Busca por referência legal específica
legal_results = await search.search_by_legal_reference("lei 434/1999")

# Busca por ZOT específica
zot_results = await search.search_by_zot("8.2")
```

### 3. Sugestões de Busca
```python
suggestions = search.get_search_suggestions("certif")
# Retorna: ["certificação em sustentabilidade ambiental", ...]
```

## Esquema do Banco de Dados

### Novas Colunas em `document_embeddings`
```sql
keywords JSONB DEFAULT '[]',                    -- Array de keywords detectadas
priority_score FLOAT DEFAULT 0.0,              -- Score de prioridade do chunk
has_composite_keywords BOOLEAN DEFAULT FALSE,  -- Tem keywords compostas
legal_references_count INTEGER DEFAULT 0       -- Número de referências legais
```

### Nova Tabela `document_keywords_summary`
```sql
CREATE TABLE document_keywords_summary (
    document_id UUID REFERENCES documents(id),
    keywords_summary JSONB,        -- Estatísticas do documento
    total_chunks INTEGER,          -- Total de chunks
    high_priority_chunks INTEGER   -- Chunks com alta prioridade
);
```

### Funções SQL Disponíveis
```sql
-- Busca por keywords
SELECT * FROM search_chunks_by_keywords(
    ARRAY['certificação', 'sustentabilidade'],
    ARRAY['doc-uuid'],
    10
);

-- Busca por tipos de keywords
SELECT * FROM search_chunks_by_keyword_types(
    ARRAY['composite', 'legal_reference'],
    NULL,
    20
);

-- Estatísticas de keywords de um documento
SELECT * FROM get_document_keywords_stats('doc-uuid');
```

## Exemplos de Uso

### 1. Query com Referência Legal
```
Input: "Lei complementar nº 434 sobre sustentabilidade"
Detecta: legal_reference + composite keywords
Estratégia: Prioriza chunks com referências legais
```

### 2. Query sobre ZOT
```
Input: "Regras para ZOT 8.2"
Detecta: zot_reference
Estratégia: Busca específica por zoneamento
```

### 3. Query Técnica
```
Input: "Como funciona estudo de impacto de vizinhança"
Detecta: composite keyword
Estratégia: Prioriza chunks com termos técnicos
```

## Métricas de Performance

### Resultados dos Testes
- ✅ **Keywords Compostas**: 13 termos prioritários detectados
- ✅ **Padrões Regex**: 5 tipos de referências automáticas
- ✅ **Priorização**: Chunks ordenados por relevância
- ✅ **Integração**: Funciona com sistema de chunking existente

### Exemplo de Scores
```
Chunk: "Certificação em sustentabilidade ambiental no 4º distrito..."
- Keywords detectadas: 2 (composite + district_reference)
- Priority score: 2.4
- Ranking: 1º lugar
```

## Como Usar

### 1. Para Desenvolvedores
```python
# Importar detector de keywords
from keywords_detector import KeywordDetector

detector = KeywordDetector()
keywords = detector.extract_all_keywords(text)
```

### 2. Para Administradores
```sql
-- Ver chunks com alta prioridade
SELECT * FROM high_priority_chunks 
WHERE priority_score > 2.0;

-- Estatísticas de um documento
SELECT * FROM get_document_keywords_stats('uuid-do-documento');
```

### 3. Para Usuários Finais
- Digite queries naturais: "certificação sustentabilidade"
- Use referências específicas: "lei 434" ou "zot 8.2"
- Sistema sugere completar: "cert" → "certificação em sustentabilidade ambiental"

## Configuração

### Variáveis de Ambiente
Nenhuma configuração adicional necessária. O sistema usa as mesmas credenciais do Supabase e OpenAI.

### Dependências
```python
# Já incluídas no sistema existente
import re
from typing import List, Dict, Set, Tuple, Optional
from dataclasses import dataclass
from enum import Enum
```

## Monitoramento

### Logs Disponíveis
```
"Keywords filtering reduced context from 50 to 12 chunks"
"Query analysis: legal_refs=true, zot_refs=false, composite=true"
"Enhanced 25 chunks with keyword detection"
```

### Métricas SQL
```sql
-- Documentos processados com keywords
SELECT COUNT(*) FROM document_keywords_summary;

-- Chunks com alta prioridade
SELECT COUNT(*) FROM document_embeddings 
WHERE priority_score > 1.0;
```

## Roadmap

### Próximas Melhorias
1. **Machine Learning**: Treinar modelo para detectar novos padrões
2. **Sinônimos**: Expandir matching com sinônimos técnicos  
3. **Contexto Semântico**: Melhorar análise de contexto das keywords
4. **Interface Web**: Dashboard para gerenciar keywords prioritárias

### Feedback
O sistema aprende automaticamente novos padrões baseado no uso. Logs detalhados permitem identificar keywords frequentes não detectadas para expansão futura.

---

**Status**: ✅ Sistema implementado e testado
**Integração**: ✅ Funciona com RAG e processamento existente
**Performance**: ✅ Melhora relevância dos resultados de busca