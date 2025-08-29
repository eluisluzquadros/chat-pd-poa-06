# 📚 Guia de Atualização da Base de Conhecimento

## 🎯 Resumo da Situação

Você adicionou novos documentos na pasta `knowledgebase`, incluindo dados de **risco de desastre por bairro**. Para aproveitar o novo sistema RAG otimizado, **SIM, é recomendado reprocessar toda a base de conhecimento**.

## ✨ Por Que Reprocessar?

### 1. **Novo Sistema de Chunking Hierárquico**
- ✅ Detecta artigos, incisos (formato III. --), parágrafos
- ✅ Cria chunks separados para conteúdo importante
- ✅ Adiciona metadados ricos (keywords, referências)

### 2. **Sistema de Keywords Inteligente**
- ✅ Detecta automaticamente termos compostos
- ✅ Identifica referências a leis, ZOTs, anexos
- ✅ Prioriza chunks com termos importantes

### 3. **Scoring Contextual Otimizado**
- ✅ Boosts específicos (certificação: 1.8x, 4º distrito: 2.0x)
- ✅ Penalizações para termos genéricos
- ✅ Thresholds dinâmicos por tipo de query

### 4. **Nova Tabela de Riscos de Desastre**
- ✅ Relaciona bairros com tipos de risco
- ✅ Níveis de risco (1-5)
- ✅ Áreas críticas e observações

## 🚀 Como Atualizar

### Passo 1: Aplicar Migrações SQL

```bash
# Aplica nova estrutura de dados
supabase db push
```

Isso criará:
- Tabela `bairros_risco_desastre`
- Funções SQL para busca de riscos
- View materializada de bairros de alto risco
- Melhorias no chunking hierárquico

### Passo 2: Instalar Dependências (se necessário)

```bash
npm install xlsx dotenv
```

### Passo 3: Executar Script de Reprocessamento

```bash
npx ts-node scripts/reprocess-knowledge-base.ts
```

O script irá:
1. **Perguntar** se deseja limpar dados existentes
2. **Fazer upload** dos documentos para o storage
3. **Processar** cada documento com chunking otimizado
4. **Importar** dados de risco de desastre
5. **Mostrar** estatísticas do processamento

### Passo 4: Verificar Resultados

```sql
-- Verifica chunks hierárquicos criados
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN chunk_metadata IS NOT NULL THEN 1 END) as hierarchical,
  COUNT(CASE WHEN chunk_metadata->>'type' = 'article' THEN 1 END) as articles,
  COUNT(CASE WHEN chunk_metadata->>'type' = 'inciso' THEN 1 END) as incisos
FROM document_embeddings;

-- Verifica dados de risco
SELECT COUNT(*) FROM bairros_risco_desastre;
```

## 📊 Documentos na Knowledge Base

### Documentos Legais (serão processados com chunking hierárquico):
- `PDPOA2025-Minuta_Preliminar_LUOS.docx`
- `PDPOA2025-Minuta_Preliminar_PLANO_DIRETOR.docx`

### Dados Estruturados:
- `PDPOA2025-Regime_Urbanistico.xlsx`
- `PDPOA2025-ZOTs_vs_Bairros.xlsx`
- `PDPOA2025-Risco_Desastre_vs_Bairros.xlsx` ⚠️ **NOVO!**

### Outros Documentos:
- `PDPOA2025-Objetivos_Previstos.docx`
- `PDPOA2025-QA.docx`

## 🔍 Novas Funcionalidades Disponíveis

### 1. Queries sobre Riscos de Desastre

```typescript
// Exemplos de queries que funcionarão:
"Quais bairros têm risco de inundação?"
"Qual o nível de risco do bairro Centro?"
"Áreas de risco de deslizamento em Porto Alegre"
```

### 2. Respostas Enriquecidas

Quando um bairro for mencionado, o sistema pode adicionar automaticamente:
- ⚠️ Informações de risco
- 📍 ZOTs aplicáveis
- 📋 Regime urbanístico

### 3. Funções SQL Disponíveis

```sql
-- Buscar riscos por bairro
SELECT * FROM get_riscos_bairro('Centro');

-- Buscar bairros por tipo de risco
SELECT * FROM get_bairros_por_tipo_risco('inundação', 3);

-- View de alto risco
SELECT * FROM mv_bairros_alto_risco;
```

## ⚡ Processamento Alternativo

Se preferir processar apenas os novos dados de risco:

```bash
# Importa apenas dados de risco
npx ts-node scripts/import-disaster-risk-data.ts
```

Mas **recomendo fortemente** o reprocessamento completo para aproveitar todas as melhorias do sistema RAG otimizado.

## 📈 Benefícios Esperados

1. **Precisão**: Respostas com referências exatas (Art. 81 - III)
2. **Contexto**: Informações de risco integradas
3. **Performance**: Busca otimizada com índices
4. **Qualidade**: Keywords e scoring inteligente

## 🆘 Troubleshooting

### Erro de variáveis de ambiente
```bash
# Verifique .env.local
NEXT_PUBLIC_SUPABASE_URL=seu_url
SUPABASE_SERVICE_ROLE_KEY=sua_chave
```

### Erro de permissões
```bash
# Use service role key (não anon key)
# Verifique políticas RLS no Supabase
```

### Documentos não processando
- Verifique se o storage bucket 'documents' existe
- Confirme que as Edge Functions estão deployadas

## 🎉 Conclusão

Após o reprocessamento, seu sistema RAG estará totalmente otimizado com:
- ✅ Identificação precisa de artigos e incisos
- ✅ Dados de risco de desastre integrados
- ✅ Scoring contextual inteligente
- ✅ Respostas enriquecidas e precisas

Execute o script e aproveite o sistema melhorado! 🚀