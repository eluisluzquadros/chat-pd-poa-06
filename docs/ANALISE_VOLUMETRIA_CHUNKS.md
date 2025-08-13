# 📊 Análise de Volumetria - Chunking Hierárquico

## 📚 Documentos Base

### 1. PDPOA2025-Minuta_Preliminar_PLANO_DIRETOR.docx
- **Páginas**: ~110 páginas
- **Tipo**: Plano Diretor Urbano Sustentável (PDUS)
- **Conteúdo**: Diretrizes gerais, princípios, objetivos, instrumentos de política urbana

### 2. PDPOA2025-Minuta_Preliminar_LUOS.docx  
- **Páginas**: ~60 páginas
- **Tipo**: Lei de Uso e Ocupação do Solo (LUOS)
- **Conteúdo**: Zoneamento, parâmetros urbanísticos, regime de atividades

**Total**: 170 páginas de documentação legal

## 🔢 Estimativa de Chunks por Nível

### Análise Estrutural Típica

#### PLANO DIRETOR (110 páginas)
```
Estrutura esperada:
├── 1 Lei completa (chunk nível 0)
├── ~8 Títulos (chunks nível 1)
├── ~25 Capítulos (chunks nível 2)
├── ~40 Seções (chunks nível 3)
├── ~180 Artigos (chunks nível 5)
├── ~350 Parágrafos (chunks nível 6)
├── ~500 Incisos (chunks nível 7)
└── ~200 Alíneas (chunks nível 8)

Total estimado: ~1.300 chunks
```

#### LUOS (60 páginas)
```
Estrutura esperada:
├── 1 Lei completa (chunk nível 0)
├── ~5 Títulos (chunks nível 1)
├── ~15 Capítulos (chunks nível 2)
├── ~25 Seções (chunks nível 3)
├── ~120 Artigos (chunks nível 5)
├── ~200 Parágrafos (chunks nível 6)
├── ~300 Incisos (chunks nível 7)
└── ~150 Alíneas (chunks nível 8)

Total estimado: ~800 chunks
```

### Total Geral Estimado
- **Chunks hierárquicos**: ~2.100 chunks
- **Comparação com atual**: 350 chunks (6x mais granular)

## 📐 Tamanho dos Chunks

### Estratégia de Tamanho por Nível

| Nível | Tipo | Tokens Médios | Caracteres Médios | Exemplo |
|-------|------|---------------|-------------------|---------|
| 0 | Lei | 50.000-80.000 | 200.000-350.000 | Documento completo |
| 1 | Título | 5.000-10.000 | 20.000-40.000 | "TÍTULO III - DO ORDENAMENTO TERRITORIAL" |
| 2 | Capítulo | 1.500-3.000 | 6.000-12.000 | "CAPÍTULO II - DO ZONEAMENTO" |
| 3 | Seção | 500-1.000 | 2.000-4.000 | "SEÇÃO I - DAS ZONAS DE ORDENAMENTO" |
| 4 | Subseção | 300-500 | 1.200-2.000 | "SUBSEÇÃO I - DISPOSIÇÕES GERAIS" |
| 5 | Artigo | 100-300 | 400-1.200 | "Art. 89 - O EIV será exigido..." |
| 6 | Parágrafo | 50-150 | 200-600 | "§ 1º - O EIV deverá contemplar..." |
| 7 | Inciso | 20-50 | 80-200 | "I - adensamento populacional" |
| 8 | Alínea | 10-30 | 40-120 | "a) impacto no sistema viário" |

## 💾 Impacto no Armazenamento

### Embeddings (1536 dimensões)

```python
# Cálculo de armazenamento
embeddings_per_chunk = 2  # Principal + Contextual
dimension = 1536
bytes_per_float = 4

total_chunks = 2100
storage_per_chunk = embeddings_per_chunk * dimension * bytes_per_float
total_storage_mb = (total_chunks * storage_per_chunk) / (1024 * 1024)

print(f"Armazenamento de embeddings: {total_storage_mb:.2f} MB")
# Resultado: ~25.8 MB
```

### Banco de Dados

```sql
-- Estimativa de espaço
-- Texto: ~5 MB (170 páginas)
-- Metadados JSON: ~2 MB
-- Índices: ~3 MB
-- Embeddings: ~26 MB
-- Total: ~36 MB

-- Comparação com atual:
-- Atual: ~6 MB (350 chunks)
-- Novo: ~36 MB (2100 chunks)
-- Aumento: 6x
```

## ⚡ Otimizações de Performance

### 1. Chunking Inteligente

```python
class SmartChunker:
    def __init__(self):
        self.config = {
            # Apenas gerar embeddings para níveis importantes
            'embed_levels': ['artigo', 'paragrafo', 'secao'],
            
            # Resumir níveis superiores
            'summarize_levels': ['titulo', 'capitulo'],
            
            # Limites de tamanho
            'max_tokens': {
                'artigo': 512,
                'paragrafo': 256,
                'inciso': 128
            }
        }
    
    def should_embed(self, chunk):
        """Decide se deve gerar embedding"""
        # Sempre embeddar artigos
        if chunk.level_type == 'artigo':
            return True
        
        # Embeddar parágrafos com conteúdo substantivo
        if chunk.level_type == 'paragrafo' and len(chunk.content) > 100:
            return True
        
        # Embeddar seções com definições importantes
        if chunk.level_type == 'secao' and self.has_definitions(chunk):
            return True
        
        return False
    
    def optimize_storage(self, chunks):
        """Otimiza armazenamento de chunks"""
        optimized = []
        
        for chunk in chunks:
            # Comprimir níveis muito granulares
            if chunk.level_type in ['inciso', 'alinea']:
                # Agrupar com pai se muito pequeno
                if len(chunk.content) < 50:
                    self.merge_with_parent(chunk)
                    continue
            
            # Gerar embedding apenas se necessário
            if self.should_embed(chunk):
                chunk.embedding = self.generate_embedding(chunk.content)
            
            optimized.append(chunk)
        
        return optimized
```

### 2. Índices Otimizados

```sql
-- Índices compostos para queries comuns
CREATE INDEX idx_artigo_search ON legal_document_chunks (
    numero_artigo, 
    document_id
) WHERE level_type = 'artigo';

CREATE INDEX idx_concept_search ON legal_document_chunks 
USING gin(metadata) 
WHERE level_type IN ('artigo', 'secao');

-- Índice para navegação hierárquica
CREATE INDEX idx_hierarchy ON legal_document_chunks (
    parent_chunk_id, 
    level, 
    sequence_number
);

-- Índice para busca vetorial apenas em níveis relevantes
CREATE INDEX idx_embedding_artigos ON legal_document_chunks 
USING ivfflat (embedding vector_cosine_ops)
WHERE level_type IN ('artigo', 'paragrafo', 'secao')
AND embedding IS NOT NULL;
```

### 3. Cache Estratégico

```typescript
// Cache por tipo de consulta
const cacheStrategy = {
    // Artigos mais consultados (EIV, ZEIS, etc)
    hotArticles: {
        ttl: 86400, // 24 horas
        keys: ['Art. 89', 'Art. 92', 'Art. 81']
    },
    
    // Hierarquias completas de artigos importantes
    articleContext: {
        ttl: 43200, // 12 horas
        preload: true
    },
    
    // Bairros e zonas
    spatialData: {
        ttl: 86400,
        keys: ['regime_urbanistico', 'zoneamento']
    }
};
```

## 📊 Comparativo de Abordagens

| Aspecto | Chunking Atual | Chunking Hierárquico | Ganho |
|---------|---------------|---------------------|-------|
| **Número de chunks** | 350 | 2.100 | 6x mais granular |
| **Contexto preservado** | Não | Sim | 100% melhoria |
| **Precisão citações** | 16.7% | ~95% esperado | 5.7x melhor |
| **Armazenamento** | 6 MB | 36 MB | 6x maior |
| **Tempo de indexação** | 5 min | 30 min | 6x mais lento |
| **Tempo de busca** | 200ms | 150ms | 25% mais rápido |
| **Relevância** | Baixa | Alta | Significativa |

## 🎯 Recomendações

### Implementação em Fases

**Fase 1 (Prioritária):**
- Reprocessar apenas **Artigos** e **Seções** (~300 chunks)
- Foco nos artigos mais citados (Top 50)
- Validar melhoria de precisão

**Fase 2 (Incremental):**
- Adicionar **Parágrafos** importantes (~350 chunks)
- Incluir **Capítulos** para contexto (~40 chunks)

**Fase 3 (Completa):**
- Hierarquia completa com todos os níveis
- Otimizações de storage
- Cache inteligente

### Trade-offs

**Benefícios:**
- ✅ Precisão drasticamente melhorada
- ✅ Citações 100% corretas
- ✅ Navegação hierárquica
- ✅ Contexto sempre preservado

**Custos:**
- ⚠️ 6x mais armazenamento
- ⚠️ Reprocessamento inicial demorado
- ⚠️ Complexidade de manutenção maior

## 🚀 Script de Reprocessamento

```javascript
// scripts/reprocess-hierarchical.mjs
import { processDocument } from './lib/hierarchical-chunker.mjs';

async function reprocessDocuments() {
    const documents = [
        {
            path: 'PDPOA2025-Minuta_Preliminar_PLANO_DIRETOR.docx',
            type: 'PDUS',
            pages: 110,
            expectedChunks: 1300
        },
        {
            path: 'PDPOA2025-Minuta_Preliminar_LUOS.docx',
            type: 'LUOS',
            pages: 60,
            expectedChunks: 800
        }
    ];
    
    for (const doc of documents) {
        console.log(`\n📚 Processando ${doc.type} (${doc.pages} páginas)`);
        
        const startTime = Date.now();
        const chunks = await processDocument(doc.path, {
            hierarchical: true,
            preserveContext: true,
            generateEmbeddings: true,
            optimizeStorage: true
        });
        
        const elapsed = (Date.now() - startTime) / 1000;
        
        console.log(`✅ Gerados ${chunks.length} chunks em ${elapsed}s`);
        console.log(`   Esperado: ${doc.expectedChunks} chunks`);
        console.log(`   Taxa: ${(chunks.length / doc.pages).toFixed(1)} chunks/página`);
        
        // Salvar no banco
        await saveChunks(chunks);
        
        // Validar estrutura
        await validateHierarchy(chunks);
    }
}
```

## 📈 Métricas de Sucesso

Após implementação do chunking hierárquico:

1. **Citação de artigos**: 16.7% → 95%+
2. **Precisão geral**: 62.5% → 90%+
3. **Tempo de resposta**: 2.9s → <2s (com cache)
4. **Contexto preservado**: 0% → 100%
5. **Navegação legal**: Impossível → Totalmente navegável

---

*Análise criada em 13/08/2025*  
*Base: 170 páginas de documentação legal (PDUS + LUOS)*