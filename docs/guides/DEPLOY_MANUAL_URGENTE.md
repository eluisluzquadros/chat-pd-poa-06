# 🚨 DEPLOY MANUAL URGENTE - Correção Petrópolis

## Problema Identificado
O sistema está retornando dados de Petrópolis para queries genéricas porque o **sql-generator** está gerando queries com `WHERE Bairro = 'PETRÓPOLIS'` mesmo quando não há bairro especificado.

## Funções que Precisam de Deploy

### 1. sql-generator (PRIORIDADE MÁXIMA)
**Arquivo:** `supabase/functions/sql-generator/index.ts`

**Alterações realizadas:**
- Adicionada REGRA ABSOLUTA na linha 197
- Se não há bairro na consulta, NÃO gera queries com filtro de bairro
- Previne uso de Petrópolis como padrão

### 2. response-synthesizer (JÁ DEPLOYED)
**Arquivo:** `supabase/functions/response-synthesizer/index.ts`

**Status:** ✅ Deploy realizado às 17:25

## Instruções de Deploy Manual

### Via Dashboard Supabase:

1. Acesse: https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/functions

2. **Para sql-generator:**
   - Encontre a função "sql-generator"
   - Clique em "Edit"
   - Cole TODO o código de: `supabase/functions/sql-generator/index.ts`
   - Clique em "Save and Deploy"
   - Aguarde confirmação de deploy bem-sucedido

3. **Verificar se as alterações estão presentes:**
   - Procure por: "REGRA ABSOLUTA: Se NÃO há bairro"
   - Deve estar na linha ~197

## Teste Rápido Após Deploy

Execute no terminal:
```bash
node test_petropolis_direct.mjs
```

### Resultado Esperado:
- ✅ "Altura máxima da construção dos prédios em porto alegre" → Resposta genérica
- ✅ "Como poderá ser feito a flexibilizaçao de Recuo de jardim?" → Resposta genérica
- ✅ "qual a altura máxima permitida?" → Resposta genérica
- ✅ "coeficiente de aproveitamento em porto alegre" → Resposta genérica

**NENHUMA** deve mencionar Petrópolis!

## Status Atual
- ❌ sql-generator precisa de deploy URGENTE
- ✅ response-synthesizer já está deployed
- ✅ query-analyzer funcionando corretamente

---

**AÇÃO NECESSÁRIA:** Deploy manual do sql-generator via dashboard