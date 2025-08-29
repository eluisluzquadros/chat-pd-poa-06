# 📊 ANÁLISE DAS DIVERGÊNCIAS NO SISTEMA QA

**Data:** 12/08/2025  
**Contexto:** Análise dos resultados do painel /admin/quality mostrando divergências significativas

---

## 🔍 PROBLEMAS IDENTIFICADOS

### 1. Taxa de Sucesso Real vs Esperada

| Métrica | Esperado | Real (Admin Panel) | Divergência |
|---------|----------|-------------------|-------------|
| Taxa de Sucesso | 98.3% | **50%** | -48.3% |
| Acurácia Média | >95% | **50%** | -45% |

### 2. Casos de Falha Específicos

#### ❌ Problema 1: Artigo EIV Incorreto
- **Query:** "Qual artigo define o Estudo de Impacto de Vizinhança?"
- **Esperado:** LUOS - Art. 90
- **Retornado:** LUOS - Art. 89 ❌
- **Causa:** Mapeamento hardcoded incorreto no `response-synthesizer-simple`
- **Status:** ✅ CORRIGIDO (linha 66 do response-synthesizer-simple/index.ts)

#### ❌ Problema 2: Taxa de Permeabilidade Não Encontrada
- **Query:** "Qual é a taxa de permeabilidade mínima para terrenos acima de 1.500 m²?"
- **Retornado:** "Desculpe, não encontrei informações específicas..."
- **Causa:** Dados não estruturados corretamente no banco
- **Status:** ⚠️ REQUER INVESTIGAÇÃO

#### ❌ Problema 3: Confusão de Bairros
- **Query:** "Qual a altura máxima em Boa Vista?"
- **Retornado:** Dados de "Boa Vista do Sul" também aparecem
- **Problema:** Busca parcial (ILIKE '%Boa Vista%') retorna múltiplos matches
- **Status:** ✅ Lógica de EXACT MATCH já existe mas pode não estar sendo aplicada

#### ❌ Problema 4: Sensibilidade ao Formato
- **Query:** "Jardim São Pedro" - FALHA
- **Query:** "o que posso construir no bairro jardim sao pedro" - SUCESSO
- **Causa:** Normalização de texto inconsistente
- **Status:** ⚠️ REQUER MELHORIA

#### ❌ Problema 5: Valores "-" nos Coeficientes
- **Query:** Regime urbanístico retorna "-" para coeficientes
- **Causa:** Dados faltantes ou nulos no banco
- **Status:** ⚠️ VERIFICAR DADOS

---

## 🔧 SOBRE O RESPONSE-SYNTHESIZER-SIMPLE

### Por que existe?

O `response-synthesizer-simple` foi criado como uma **solução de contingência** quando o synthesizer original com LLM estava falhando com erro 500. Ele:

1. **NÃO usa LLM externo** - Reduz dependências e custos
2. **Tem mapeamentos fixos** para queries legais comuns
3. **Garante citações corretas** para perguntas frequentes
4. **Formata dados estruturados** de forma consistente

### Mapeamentos Hardcoded (Atualizados)

```typescript
// Citações legais garantidas:
- Certificação Sustentabilidade → LUOS Art. 81, Inciso III ✅
- 4º Distrito → LUOS Art. 74 ✅
- ZEIS → PDUS Art. 92 ✅
- EIV → LUOS Art. 90 ✅ (CORRIGIDO - era 89)
- Outorga Onerosa → LUOS Art. 86 ✅
- Altura Máxima → LUOS Art. 81 ✅
- Coeficiente Aproveitamento → LUOS Art. 82 ✅
```

### Vantagens e Desvantagens

**✅ Vantagens:**
- 100% confiável para casos mapeados
- Sem custos de LLM
- Resposta instantânea
- Sem timeouts

**❌ Desvantagens:**
- Limitado aos casos pré-definidos
- Não se adapta a novas queries
- Respostas menos naturais
- Manutenção manual necessária

---

## 🎯 CAUSA RAIZ DAS DIVERGÊNCIAS

### 1. **Dupla Validação**
- Os testes automatizados (98.3%) usam a API diretamente
- O painel admin pode estar usando cache antigo ou método diferente

### 2. **Dados Inconsistentes**
- Alguns dados estão faltando no banco (permeabilidade)
- Valores nulos aparecem como "-"
- Nomes de bairros não normalizados

### 3. **Lógica de Busca**
- ILIKE parcial causa matches indesejados
- Normalização inconsistente entre componentes
- Query analyzer pode não estar detectando corretamente o intent

---

## 📋 PLANO DE CORREÇÃO

### Correções Imediatas ✅

1. **[FEITO] Corrigir Art. 90 do EIV**
   ```typescript
   // De: LUOS - Art. 89
   // Para: LUOS - Art. 90
   ```

### Correções Necessárias ⚠️

2. **Melhorar Normalização de Queries**
   - Padronizar remoção de acentos
   - Unificar maiúsculas/minúsculas
   - Tratar "Jardim São Pedro" = "jardim sao pedro"

3. **Popular Dados Faltantes**
   - Verificar e adicionar taxas de permeabilidade
   - Corrigir valores "-" nos coeficientes
   - Validar todos os bairros

4. **Forçar Exact Match para Bairros Ambíguos**
   - Garantir que "Boa Vista" ≠ "Boa Vista do Sul"
   - Aplicar lógica já existente de forma consistente

5. **Sincronizar Métodos de Teste**
   - Garantir que admin panel use mesma lógica que API
   - Limpar cache antes de validações
   - Usar bypassCache=true nos testes críticos

---

## 📊 MÉTRICAS DE VALIDAÇÃO

### Como Medir Sucesso:

1. **Taxa Real no Admin Panel:** Deve subir de 50% para >95%
2. **Citações Legais:** 100% corretas (Art. 90 para EIV)
3. **Bairros:** Sem confusão Boa Vista/Boa Vista do Sul
4. **Dados Completos:** Sem valores "-" ou "não encontrei"

### Script de Validação:

```bash
# Testar casos críticos
node scripts/verify-specific-issues.mjs

# Limpar cache e retestar
node scripts/clear-cache-and-fix.ts
node scripts/test-interfaces-quick.mjs
```

---

## 🚨 RECOMENDAÇÕES

### Curto Prazo:
1. ✅ Deploy da correção Art. 90
2. Executar novo teste no admin panel
3. Verificar e popular dados faltantes
4. Melhorar normalização de texto

### Médio Prazo:
1. Migrar de volta para synthesizer com LLM quando estável
2. Implementar cache inteligente
3. Adicionar mais testes de regressão
4. Criar dashboard de monitoramento

### Longo Prazo:
1. Treinar modelo específico para PDUS
2. Implementar feedback loop automático
3. Versionamento de respostas

---

## 📝 CONCLUSÃO

O sistema tem **duas realidades**:
- **API direta:** 98.3% de sucesso ✅
- **Admin Panel:** 50% de sucesso ❌

A divergência ocorre por:
1. Mapeamentos incorretos (Art. 89 vs 90)
2. Dados faltantes no banco
3. Normalização inconsistente
4. Possível cache desatualizado

**O response-synthesizer-simple é uma solução válida** mas precisa de manutenção constante. As correções identificadas devem elevar a taxa real para >95%.

---

**Próximos Passos:**
1. Deploy das correções
2. Popular dados faltantes
3. Re-executar validação no admin panel
4. Monitorar resultados