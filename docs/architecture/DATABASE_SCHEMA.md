# DATABASE SCHEMA - Chat PD POA

## Tabelas Principais

### 1. regime_urbanistico_consolidado
**Descrição**: Dados estruturados do regime urbanístico dos 94 bairros de Porto Alegre
**Colunas principais** (ATENÇÃO: nomes com maiúsculas!):
- `Bairro` (TEXT) - Nome do bairro em MAIÚSCULAS (ex: "PETRÓPOLIS", "CENTRO HISTÓRICO")
- `Zona` (TEXT) - Zona de Ordenamento Territorial (ex: "ZOT 01", "ZOT 07")
- `Altura_Maxima___Edificacao_Isolada` (NUMBER) - Altura máxima em metros
- `Coeficiente_de_Aproveitamento___Basico` (NUMBER) - CA básico
- `Coeficiente_de_Aproveitamento___Maximo` (NUMBER) - CA máximo
- `Taxa_de_Permeabilidade_acima_de_1,500_m2` (NUMBER) - Taxa de permeabilidade
- `Recuo_de_Jardim` (NUMBER) - Recuo frontal obrigatório

**Total de registros**: ~385
**Bairros cobertos**: 94 bairros oficiais de Porto Alegre

### 2. legal_articles
**Descrição**: Artigos legais do PDUS e LUOS com embeddings para busca semântica
**Colunas principais**:
- `id` (INTEGER) - ID único
- `document_type` (TEXT) - Tipo do documento: "PDUS", "LUOS", "REGIME_FALLBACK"
- `article_number` (INTEGER) - Número do artigo
- `article_text` (TEXT) - Texto do artigo
- `full_content` (TEXT) - Conteúdo completo
- `keywords` (TEXT[]) - Array de palavras-chave
- `embedding` (VECTOR) - Embedding para busca semântica
- `hierarchy_level` (TEXT) - Nível hierárquico: "article", "chapter", "section", "title", "part"
- `title` (TEXT) - Título do elemento hierárquico
- `source` (TEXT) - Fonte do documento

**Tipos de documentos**:
- **PDUS**: Plano Diretor Urbano Sustentável (217 artigos)
- **LUOS**: Lei de Uso e Ocupação do Solo (123 artigos)
- **REGIME_FALLBACK**: Dados de regime urbanístico em formato texto (864 registros)

### 3. document_sections
**Descrição**: Seções de documentos com embeddings para busca semântica detalhada
**Colunas principais**:
- `id` (INTEGER) - ID único
- `document_id` (TEXT) - ID do documento
- `section_number` (INTEGER) - Número da seção
- `title` (TEXT) - Título da seção
- `content` (TEXT) - Conteúdo da seção
- `embedding` (VECTOR) - Embedding para busca semântica
- `metadata` (JSONB) - Metadados adicionais

### 4. qa_test_cases
**Descrição**: Casos de teste para validação do sistema
**Colunas principais**:
- `id` (INTEGER) - ID único
- `test_id` (TEXT) - ID do teste
- `category` (TEXT) - Categoria do teste
- `question` (TEXT) - Pergunta de teste
- `expected_answer` (TEXT) - Resposta esperada
- `keywords` (TEXT[]) - Palavras-chave esperadas

**Total de casos**: 125 casos de teste

### 5. query_cache
**Descrição**: Cache de queries para otimização de performance
**Colunas principais**:
- `query_hash` (TEXT) - Hash da query
- `query` (TEXT) - Query original
- `response` (TEXT) - Resposta cacheada
- `metadata` (JSONB) - Metadados da resposta
- `created_at` (TIMESTAMP) - Data de criação
- `expires_at` (TIMESTAMP) - Data de expiração

## Índices Importantes

### regime_urbanistico_consolidado
- Índice em `"Bairro"` (case-insensitive)
- Índice em `"Zona"`
- Índice composto em `("Bairro", "Zona")`

### legal_articles
- Índice em `document_type`
- Índice em `article_number`
- Índice GIN em `keywords`
- Índice HNSW em `embedding` (pgvector)
- Índice em `hierarchy_level`

## Estratégias de Busca

### 1. Busca de Regime Urbanístico
```sql
-- Busca por bairro (ATENÇÃO: usar maiúsculas nas colunas!)
SELECT * FROM regime_urbanistico_consolidado 
WHERE "Bairro" ILIKE '%PETRÓPOLIS%';

-- Se não encontrar, buscar no fallback
SELECT * FROM legal_articles 
WHERE document_type = 'REGIME_FALLBACK' 
AND keywords @> ARRAY['BAIRRO_PETROPOLIS'];
```

### 2. Busca de Artigos
```sql
-- Busca por artigo específico
SELECT * FROM legal_articles 
WHERE document_type = 'LUOS' 
AND article_number = 5;
```

### 3. Busca Semântica
```sql
-- Busca por similaridade usando embeddings
SELECT * FROM legal_articles 
ORDER BY embedding <-> '[vector]' 
LIMIT 10;
```

## Normalização de Dados

### Bairros
- Total: 94 bairros oficiais
- Formato: MAIÚSCULAS, com acentos
- Exemplos: "PETRÓPOLIS", "CENTRO HISTÓRICO", "BELÉM NOVO"

### Zonas
- Total: 16 zonas principais (ZOT 01 a ZOT 16)
- Formato: "ZOT XX" ou subzonas como "ZOT 08.1", "ZOT 08.2", "ZOT 08.3"
- Zonas especiais: "ZONA RURAL", "ZONA ESPECIAL"

## Keywords Normalizadas

### Para Bairros
- Formato: `BAIRRO_[NOME_SEM_ESPACOS]`
- Exemplo: `BAIRRO_PETROPOLIS`, `BAIRRO_CENTRO_HISTORICO`

### Para Zonas
- Formato: `ZONA_XX`
- Exemplo: `ZONA_01`, `ZONA_07`, `ZONA_081`, `ZONA_083`

## Metadados Importantes

- **Total de artigos PDUS**: 217
- **Total de artigos LUOS**: 123
- **Total de registros REGIME_FALLBACK**: 864
- **Total de bairros com dados**: 94
- **Total de zonas**: 21 zonas únicas
- **Total de casos de teste QA**: 125

## Notas para o Sistema

1. **SEMPRE** verificar primeiro a tabela `regime_urbanistico_consolidado` para dados de bairros
2. Se não encontrar, buscar em `legal_articles` com `document_type = 'REGIME_FALLBACK'`
3. Usar embeddings para buscas semânticas quando a busca exata não retornar resultados
4. Normalizar nomes de bairros para MAIÚSCULAS antes de buscar
5. Atenção aos nomes das colunas que usam maiúsculas e underscores triplos