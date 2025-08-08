# 🎯 PLANO DE AÇÃO - REPROCESSAMENTO DA BASE DE CONHECIMENTO
**Data:** 08/08/2025  
**Prioridade:** 🔴 CRÍTICA  
**Prazo:** IMEDIATO

---

## 🚨 PROBLEMA PRINCIPAL

A base de conhecimento do Chat PD POA está com problemas críticos que comprometem a precisão das respostas:

1. **Tabela regime_urbanístico desatualizada** - não reflete dados da planilha Excel original
2. **Embeddings inconsistentes** - documentos DOCX usando métodos diferentes
3. **Falha em queries legais** - Artigos/Incisos não são recuperados corretamente
4. **Formatação inadequada** - respostas não usam tabelas para dados complexos
5. **Sem aprendizagem** - sistema não evolui com feedback

---

## 📋 AÇÕES IMEDIATAS (EXECUTAR AGORA)

### PASSO 1: Backup Completo
```bash
# Criar backup de segurança
pg_dump -h db.ngrqwmvuhvjkeohesbxs.supabase.co \
  -U postgres \
  -d postgres \
  --table=regime_urbanistico \
  --table=document_sections \
  --table=document_rows \
  > backup_knowledge_base_08082025.sql
```

### PASSO 2: Criar Script de Reprocessamento
```javascript
// scripts/reprocess-knowledge-base.mjs
import { createClient } from '@supabase/supabase-js';
import ExcelJS from 'exceljs';
import { Document } from 'langchain/document';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import mammoth from 'mammoth';
import fs from 'fs/promises';
import path from 'path';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class KnowledgeBaseProcessor {
  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-3-small'
    });
    
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ["\n\n", "\n", ".", "!", "?", ";", ":", " ", ""]
    });
  }

  // 1. Processar Regime Urbanístico do Excel
  async processRegimeUrbanistico() {
    console.log('📊 Processando Regime Urbanístico...');
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile('knowledgebase/PDPOA2025-Regime_Urbanistico.xlsx');
    const worksheet = workbook.getWorksheet(1);
    
    // Limpar tabela existente
    await supabase.from('regime_urbanistico').delete().neq('id', 0);
    
    const records = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) { // Skip header
        const record = {
          zona: row.getCell(1).value,
          bairro: row.getCell(2).value,
          altura_maxima: row.getCell(3).value,
          coef_aproveitamento_basico: row.getCell(4).value,
          coef_aproveitamento_maximo: row.getCell(5).value,
          // ... mapear todas as 57 colunas
        };
        records.push(record);
      }
    });
    
    // Inserir em lotes
    const batchSize = 50;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { error } = await supabase
        .from('regime_urbanistico')
        .insert(batch);
      
      if (error) {
        console.error('❌ Erro ao inserir regime:', error);
      } else {
        console.log(`✅ Inseridos ${batch.length} registros (${i + batch.length}/${records.length})`);
      }
    }
  }

  // 2. Processar Documentos DOCX com método unificado
  async processDocuments() {
    console.log('📄 Processando documentos DOCX...');
    
    const docFiles = [
      'PDPOA2025-Minuta_Preliminar_LUOS.docx',
      'PDPOA2025-Minuta_Preliminar_PLANO_DIRETOR.docx',
      'PDPOA2025-Objetivos_Previstos.docx',
      'PDPOA2025-QA.docx'
    ];
    
    // Limpar embeddings existentes
    await supabase
      .from('document_sections')
      .delete()
      .in('source_file', docFiles);
    
    for (const file of docFiles) {
      console.log(`\n📖 Processando ${file}...`);
      
      const filePath = path.join('knowledgebase', file);
      const buffer = await fs.readFile(filePath);
      const result = await mammoth.extractRawText({ buffer });
      const text = result.value;
      
      // Chunking hierárquico para documentos legais
      const chunks = await this.hierarchicalChunking(text, file);
      
      // Gerar embeddings
      const embeddings = await this.generateEmbeddings(chunks);
      
      // Salvar no banco
      await this.saveEmbeddings(chunks, embeddings, file);
    }
  }

  // 3. Chunking hierárquico otimizado para documentos legais
  async hierarchicalChunking(text, filename) {
    const chunks = [];
    
    // Detectar estrutura do documento
    const isLegalDoc = filename.includes('LUOS') || filename.includes('PLANO_DIRETOR');
    
    if (isLegalDoc) {
      // Processar por artigos/seções
      const articlePattern = /(?:ARTIGO|Art\.?)\s+(\d+)[º°]?\s*[-–]\s*(.+?)(?=(?:ARTIGO|Art\.?)\s+\d+|$)/gis;
      const matches = [...text.matchAll(articlePattern)];
      
      for (const match of matches) {
        const articleNum = match[1];
        const articleContent = match[0];
        
        // Preservar artigo completo se pequeno
        if (articleContent.length < 1500) {
          chunks.push({
            content: articleContent,
            metadata: {
              type: 'article',
              article_number: articleNum,
              source: filename
            }
          });
        } else {
          // Dividir artigos grandes por parágrafos/incisos
          const subChunks = await this.splitter.splitText(articleContent);
          subChunks.forEach((chunk, idx) => {
            chunks.push({
              content: chunk,
              metadata: {
                type: 'article_part',
                article_number: articleNum,
                part: idx + 1,
                source: filename
              }
            });
          });
        }
      }
    } else {
      // Chunking padrão para outros documentos
      const textChunks = await this.splitter.splitText(text);
      textChunks.forEach((chunk, idx) => {
        chunks.push({
          content: chunk,
          metadata: {
            type: 'standard',
            chunk_index: idx,
            source: filename
          }
        });
      });
    }
    
    return chunks;
  }

  // 4. Gerar embeddings em lote
  async generateEmbeddings(chunks) {
    const texts = chunks.map(c => c.content);
    const embeddings = [];
    
    // Processar em lotes de 20
    for (let i = 0; i < texts.length; i += 20) {
      const batch = texts.slice(i, i + 20);
      const batchEmbeddings = await this.embeddings.embedDocuments(batch);
      embeddings.push(...batchEmbeddings);
      
      console.log(`🔄 Embeddings gerados: ${embeddings.length}/${texts.length}`);
    }
    
    return embeddings;
  }

  // 5. Salvar embeddings com metadados ricos
  async saveEmbeddings(chunks, embeddings, sourceFile) {
    const records = chunks.map((chunk, idx) => ({
      content: chunk.content,
      embedding: embeddings[idx],
      metadata: {
        ...chunk.metadata,
        source_file: sourceFile,
        created_at: new Date().toISOString(),
        chunk_method: 'hierarchical',
        model: 'text-embedding-3-small'
      }
    }));
    
    // Inserir em lotes
    for (let i = 0; i < records.length; i += 50) {
      const batch = records.slice(i, i + 50);
      const { error } = await supabase
        .from('document_sections')
        .insert(batch);
      
      if (error) {
        console.error('❌ Erro ao salvar embeddings:', error);
      } else {
        console.log(`✅ Salvos ${batch.length} chunks (${i + batch.length}/${records.length})`);
      }
    }
  }

  // 6. Criar índices otimizados
  async createIndexes() {
    console.log('🔍 Criando índices otimizados...');
    
    const indexes = [
      // Índice para busca de artigos
      `CREATE INDEX IF NOT EXISTS idx_document_sections_articles 
       ON document_sections USING gin(to_tsvector('portuguese', content))`,
      
      // Índice para metadados
      `CREATE INDEX IF NOT EXISTS idx_document_sections_metadata 
       ON document_sections USING gin(metadata jsonb_path_ops)`,
      
      // Índice para busca vetorial
      `CREATE INDEX IF NOT EXISTS idx_document_sections_embedding 
       ON document_sections USING ivfflat (embedding vector_cosine_ops) 
       WITH (lists = 100)`,
      
      // Índice para regime urbanístico
      `CREATE INDEX IF NOT EXISTS idx_regime_zona_bairro 
       ON regime_urbanistico(zona, bairro)`,
      
      `CREATE INDEX IF NOT EXISTS idx_regime_bairro 
       ON regime_urbanistico(bairro)`
    ];
    
    for (const index of indexes) {
      const { error } = await supabase.rpc('execute_sql', { query: index });
      if (error) {
        console.error('❌ Erro ao criar índice:', error);
      } else {
        console.log('✅ Índice criado com sucesso');
      }
    }
  }

  // Executar todo o processo
  async run() {
    console.log('🚀 Iniciando reprocessamento da base de conhecimento...\n');
    
    try {
      // 1. Processar regime urbanístico
      await this.processRegimeUrbanistico();
      
      // 2. Processar documentos
      await this.processDocuments();
      
      // 3. Criar índices
      await this.createIndexes();
      
      console.log('\n✅ Reprocessamento concluído com sucesso!');
      
      // Estatísticas finais
      const { count: regimeCount } = await supabase
        .from('regime_urbanistico')
        .select('*', { count: 'exact', head: true });
      
      const { count: sectionsCount } = await supabase
        .from('document_sections')
        .select('*', { count: 'exact', head: true });
      
      console.log('\n📊 Estatísticas:');
      console.log(`- Registros de regime urbanístico: ${regimeCount}`);
      console.log(`- Seções de documentos: ${sectionsCount}`);
      
    } catch (error) {
      console.error('❌ Erro no reprocessamento:', error);
      process.exit(1);
    }
  }
}

// Executar
const processor = new KnowledgeBaseProcessor();
processor.run();
```

### PASSO 3: Instalar Dependências
```bash
npm install exceljs mammoth langchain @langchain/openai
```

### PASSO 4: Executar Reprocessamento
```bash
# Definir variáveis de ambiente
export SUPABASE_URL="https://ngrqwmvuhvjkeohesbxs.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="[YOUR_SERVICE_ROLE_KEY]"
export OPENAI_API_KEY="[YOUR_OPENAI_KEY]"

# Executar script
node scripts/reprocess-knowledge-base.mjs
```

---

## 🔧 MELHORIAS NO PIPELINE RAG

### 1. Atualizar Query Analyzer
```typescript
// supabase/functions/query-analyzer/index.ts

// Adicionar patterns mais robustos para queries legais
const enhancedLegalPatterns = [
  // Artigos
  /\bart(?:igo)?\.?\s*(\d+)/gi,
  /\bart(?:igo)?\.?\s*(\d+)[º°]?/gi,
  
  // Incisos
  /\binciso\s+([IVXLCDM]+|\d+)/gi,
  /\b§\s*(\d+)[º°]?/gi,
  
  // Parágrafos
  /\bpar[aá]grafo\s+(\d+|[úu]nico)/gi,
  
  // Alíneas
  /\bal[íi]nea\s+([a-z])/gi,
  
  // Leis e decretos
  /\blei\s+(?:complementar\s+)?n[º°]?\s*(\d+)/gi,
  /\bdecreto\s+n[º°]?\s*(\d+)/gi,
  
  // Termos específicos do PDUS
  /\bcertifica[çc][ãa]o.*sustentabilidade/gi,
  /\b4[º°]?\s*distrito/gi,
  /\boutorga\s+onerosa/gi,
  /\bzeis\b/gi,
  /\beiv\b/gi,
  /\binstrumentos.*pol[íi]tica.*urbana/gi
];

// Melhorar extração de entidades
function extractLegalEntities(query: string) {
  const entities = {
    articles: [],
    paragraphs: [],
    laws: [],
    specificTerms: []
  };
  
  // Extrair números de artigos
  const articleMatches = query.matchAll(/\bart(?:igo)?\.?\s*(\d+)/gi);
  for (const match of articleMatches) {
    entities.articles.push(parseInt(match[1]));
  }
  
  // Extrair referências de leis
  const lawMatches = query.matchAll(/\blei\s+(?:complementar\s+)?n[º°]?\s*(\d+)/gi);
  for (const match of lawMatches) {
    entities.laws.push(match[1]);
  }
  
  return entities;
}
```

### 2. Melhorar Vector Search
```typescript
// supabase/functions/enhanced-vector-search/index.ts

// Expansão de query para termos legais
function expandLegalQuery(query: string): string {
  const expansions = {
    'certificação sustentabilidade': [
      'artigo 81',
      'inciso III',
      'certificação de sustentabilidade ambiental',
      'acréscimos no potencial construtivo'
    ],
    '4º distrito': [
      'artigo 74',
      'quarto distrito',
      'ZOT 8.2',
      'revitalização urbana',
      'área de transformação'
    ],
    'outorga onerosa': [
      'artigo 86',
      'direito de construir',
      'contrapartida financeira',
      'solo criado'
    ],
    'zeis': [
      'artigo 92',
      'zonas especiais de interesse social',
      'habitação de interesse social',
      'regularização fundiária'
    ]
  };
  
  let expandedQuery = query;
  
  for (const [term, synonyms] of Object.entries(expansions)) {
    if (query.toLowerCase().includes(term)) {
      expandedQuery += ' ' + synonyms.join(' ');
    }
  }
  
  return expandedQuery;
}

// Busca híbrida: keyword + semantic
async function hybridSearch(query: string, limit: number = 10) {
  // 1. Busca por palavras-chave
  const keywordResults = await supabase
    .from('document_sections')
    .select('*')
    .textSearch('content', query, {
      type: 'websearch',
      config: 'portuguese'
    })
    .limit(limit);
  
  // 2. Busca semântica
  const embedding = await generateEmbedding(query);
  const semanticResults = await supabase
    .rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: limit
    });
  
  // 3. Combinar e re-ranquear
  return reRankResults(keywordResults.data, semanticResults.data);
}
```

### 3. Implementar Response Formatter
```typescript
// supabase/functions/response-synthesizer/index.ts

class ResponseFormatter {
  formatRegimeData(data: any[]): string {
    if (!data || data.length === 0) return '';
    
    // Agrupar por zona
    const byZone = data.reduce((acc, item) => {
      if (!acc[item.zona]) acc[item.zona] = [];
      acc[item.zona].push(item);
      return acc;
    }, {});
    
    let formatted = '## 📊 Regime Urbanístico\n\n';
    
    for (const [zona, items] of Object.entries(byZone)) {
      formatted += `### ${zona}\n\n`;
      formatted += '| Bairro | Altura Máx | Coef. Básico | Coef. Máximo |\n';
      formatted += '|--------|------------|--------------|---------------|\n';
      
      for (const item of items) {
        formatted += `| ${item.bairro} | ${item.altura_maxima}m | ${item.coef_aproveitamento_basico} | ${item.coef_aproveitamento_maximo} |\n`;
      }
      formatted += '\n';
    }
    
    return formatted;
  }
  
  formatLegalReference(article: number, content: string): string {
    return `
📜 **Artigo ${article}**

${content}

---
*Fonte: Plano Diretor de Porto Alegre - PDUS 2025*
    `;
  }
}
```

---

## 🧪 TESTES DE VALIDAÇÃO

### Script de Teste Completo
```javascript
// scripts/validate-reprocessing.mjs

const testCases = [
  // Teste 1: Regime Urbanístico
  {
    query: "Qual a altura máxima no bairro Centro?",
    expectedFields: ['altura_maxima', 'zona', 'coef_aproveitamento_basico']
  },
  
  // Teste 2: Artigos Legais
  {
    query: "O que diz o artigo 81 sobre certificação de sustentabilidade?",
    expectedContent: ['certificação', 'sustentabilidade', 'inciso III']
  },
  
  // Teste 3: Query Complexa
  {
    query: "Quais são as regras para construção no 4º distrito?",
    expectedContent: ['artigo 74', 'ZOT 8.2', 'revitalização']
  },
  
  // Teste 4: Formatação de Tabela
  {
    query: "Compare o regime urbanístico dos bairros Moinhos de Vento e Petrópolis",
    expectedFormat: 'table',
    expectedBairros: ['Moinhos de Vento', 'Petrópolis']
  }
];

async function runValidation() {
  console.log('🧪 Iniciando validação do reprocessamento...\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const test of testCases) {
    const response = await fetch('https://ngrqwmvuhvjkeohesbxs.supabase.co/functions/v1/agentic-rag', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ query: test.query })
    });
    
    const result = await response.json();
    
    // Validar resposta
    let testPassed = true;
    
    if (test.expectedFields) {
      for (const field of test.expectedFields) {
        if (!result.response.includes(field)) {
          testPassed = false;
          console.log(`❌ Falhou: Campo '${field}' não encontrado`);
        }
      }
    }
    
    if (test.expectedContent) {
      for (const content of test.expectedContent) {
        if (!result.response.toLowerCase().includes(content.toLowerCase())) {
          testPassed = false;
          console.log(`❌ Falhou: Conteúdo '${content}' não encontrado`);
        }
      }
    }
    
    if (testPassed) {
      console.log(`✅ Passou: ${test.query}`);
      passed++;
    } else {
      console.log(`❌ Falhou: ${test.query}`);
      failed++;
    }
  }
  
  console.log(`\n📊 Resultados: ${passed} passou, ${failed} falhou`);
  console.log(`Taxa de sucesso: ${(passed / testCases.length * 100).toFixed(1)}%`);
}

runValidation();
```

---

## 📊 MONITORAMENTO PÓS-REPROCESSAMENTO

### Dashboard de Métricas
```sql
-- Criar view para monitoramento
CREATE OR REPLACE VIEW v_knowledge_base_metrics AS
SELECT 
  'regime_urbanistico' as source,
  COUNT(*) as total_records,
  COUNT(DISTINCT zona) as unique_zones,
  COUNT(DISTINCT bairro) as unique_bairros
FROM regime_urbanistico

UNION ALL

SELECT 
  'document_sections' as source,
  COUNT(*) as total_records,
  COUNT(DISTINCT metadata->>'source_file') as unique_files,
  AVG(LENGTH(content)) as avg_content_length
FROM document_sections;

-- Query para verificar saúde do sistema
SELECT * FROM v_knowledge_base_metrics;
```

### Alertas Automáticos
```javascript
// scripts/monitor-health.mjs

async function checkSystemHealth() {
  const checks = {
    regime_count: { min: 387, actual: 0 },
    sections_count: { min: 1000, actual: 0 },
    avg_response_time: { max: 3000, actual: 0 },
    error_rate: { max: 0.1, actual: 0 }
  };
  
  // Verificar contagens
  const { count: regimeCount } = await supabase
    .from('regime_urbanistico')
    .select('*', { count: 'exact', head: true });
  checks.regime_count.actual = regimeCount;
  
  // Enviar alerta se problemas
  for (const [metric, values] of Object.entries(checks)) {
    if (values.min && values.actual < values.min) {
      console.error(`⚠️ ALERTA: ${metric} abaixo do mínimo (${values.actual} < ${values.min})`);
    }
    if (values.max && values.actual > values.max) {
      console.error(`⚠️ ALERTA: ${metric} acima do máximo (${values.actual} > ${values.max})`);
    }
  }
}

// Executar a cada 5 minutos
setInterval(checkSystemHealth, 5 * 60 * 1000);
```

---

## ✅ CHECKLIST DE EXECUÇÃO

### Preparação (10 min)
- [ ] Fazer backup do banco de dados
- [ ] Instalar dependências necessárias
- [ ] Configurar variáveis de ambiente
- [ ] Revisar scripts antes de executar

### Execução (2-3 horas)
- [ ] Executar script de reprocessamento
- [ ] Monitorar logs durante execução
- [ ] Verificar contagens após cada etapa
- [ ] Criar índices no banco

### Validação (30 min)
- [ ] Executar testes de validação
- [ ] Testar queries problemáticas manualmente
- [ ] Verificar formatação de respostas
- [ ] Confirmar taxa de sucesso > 80%

### Documentação (15 min)
- [ ] Atualizar documentação técnica
- [ ] Registrar mudanças realizadas
- [ ] Comunicar equipe sobre melhorias
- [ ] Agendar próxima revisão

---

## 🚀 COMANDO ÚNICO PARA EXECUÇÃO

```bash
# Script all-in-one
cat > reprocess-all.sh << 'EOF'
#!/bin/bash

echo "🚀 Iniciando reprocessamento completo..."

# 1. Backup
echo "📦 Fazendo backup..."
pg_dump -h db.ngrqwmvuhvjkeohesbxs.supabase.co \
  -U postgres -d postgres \
  --table=regime_urbanistico \
  --table=document_sections \
  > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Instalar dependências
echo "📦 Instalando dependências..."
npm install exceljs mammoth langchain @langchain/openai

# 3. Reprocessar
echo "🔄 Reprocessando base de conhecimento..."
node scripts/reprocess-knowledge-base.mjs

# 4. Validar
echo "🧪 Validando reprocessamento..."
node scripts/validate-reprocessing.mjs

# 5. Monitorar
echo "📊 Iniciando monitoramento..."
node scripts/monitor-health.mjs &

echo "✅ Reprocessamento completo!"
EOF

chmod +x reprocess-all.sh
./reprocess-all.sh
```

---

*Plano de ação criado em 08/08/2025 às 14:00 PM*  
*Execução recomendada: IMEDIATA*  
*Suporte: equipe-dev@chatpdpoa.com*