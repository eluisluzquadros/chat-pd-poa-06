# 🔧 Solução para Problemas nas Queries do RAG

## 🔍 Diagnóstico do Problema

As queries estão falhando porque:

1. **Cache antigo** pode estar retornando respostas desatualizadas
2. **Documentos não reprocessados** com o novo sistema hierárquico
3. **Funções SQL** podem não estar deployadas
4. **Edge Functions** podem precisar ser redeployadas

## 🚀 Solução Passo a Passo

### 1️⃣ Executar Diagnóstico Completo

```bash
npx ts-node scripts/diagnose-rag-issues.ts
```

Este script vai verificar:
- ✅ Estrutura do banco de dados
- ✅ Documentos processados
- ✅ Embeddings e chunks hierárquicos
- ✅ Cache de queries
- ✅ Edge Functions disponíveis
- ✅ Testes de busca

### 2️⃣ Limpar Cache e Aplicar Correções

```bash
npx ts-node scripts/clear-cache-and-fix.ts
```

Este script vai:
- 🧹 Limpar todo o cache de queries
- 🔧 Criar funções SQL faltantes
- 📊 Verificar embeddings
- 🧪 Opcionalmente criar chunks de teste

### 3️⃣ Deploy das Migrações (se necessário)

Se você tem o Supabase CLI instalado:
```bash
supabase db push
```

Se não, acesse o Supabase Dashboard e execute manualmente:
- `supabase/migrations/20240131000001_add_hierarchical_chunking.sql`
- `supabase/migrations/20240131000002_add_disaster_risk_support.sql`

### 4️⃣ Reprocessar Base de Conhecimento

```bash
npx ts-node scripts/reprocess-knowledge-base.ts
```

Quando perguntado, escolha:
- **Limpar dados existentes?** → SIM (s)

### 5️⃣ Deploy das Edge Functions (se necessário)

Se você tem o Supabase CLI:
```bash
supabase functions deploy process-document
supabase functions deploy enhanced-vector-search
supabase functions deploy contextual-scoring
supabase functions deploy response-synthesizer
```

### 6️⃣ Reiniciar o Servidor

```bash
# Ctrl+C para parar
npm run dev
```

## 🧪 Testar Novamente

Após completar os passos, teste as queries:

1. **"Qual artigo da LUOS trata da Certificação em Sustentabilidade Ambiental?"**
   - Esperado: "Art. 81 - III"

2. **"Qual a regra para empreendimentos do 4º distrito?"**
   - Esperado: "Art. 74"

3. **"Quais bairros têm risco de inundação?"**
   - Esperado: Lista de bairros com dados de risco

## 🔍 Se Ainda Houver Problemas

### Verificar no Supabase Dashboard:

1. **SQL Editor** → Execute:
```sql
-- Verifica chunks hierárquicos
SELECT COUNT(*) as total,
       COUNT(chunk_metadata) as with_metadata
FROM document_embeddings;

-- Verifica chunks específicos
SELECT content_chunk, chunk_metadata
FROM document_embeddings
WHERE chunk_metadata->>'hasCertification' = 'true'
LIMIT 5;
```

2. **Edge Functions** → Logs
   - Verifique erros nas funções
   - Especialmente `process-document` e `enhanced-vector-search`

3. **Authentication** → Settings
   - Confirme que service_role key está correta

### Verificar Localmente:

1. **Console do navegador** (F12)
   - Erros de rede
   - Respostas das APIs

2. **Terminal do npm run dev**
   - Erros de compilação
   - Avisos importantes

## 💡 Dica Importante

O problema mais comum é que os documentos foram processados ANTES das melhorias do sistema. Por isso, o reprocessamento (passo 4) geralmente resolve a maioria dos problemas.

## 📞 Suporte

Se os problemas persistirem após todos os passos:

1. Execute o diagnóstico e salve o output
2. Verifique os logs do Supabase
3. Compartilhe os resultados para análise detalhada

O sistema está configurado corretamente no código, só precisa garantir que:
- ✅ Banco de dados tem a estrutura atualizada
- ✅ Documentos foram reprocessados
- ✅ Cache foi limpo
- ✅ Funções estão deployadas