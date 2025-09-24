# 📋 PLANO DE AÇÃO - Correções Sistema Chat PD POA
**Data:** 07/08/2025  
**Versão:** 1.0  
**Status:** 🔴 URGENTE - Implementação Necessária

---

## 🎯 OBJETIVO PRINCIPAL
Corrigir as falhas críticas do sistema RAG, especialmente na recuperação de artigos da LUOS/LEI, e resolver problemas no dashboard administrativo, elevando a taxa de sucesso de 53.2% para 80%+.

---

## 🔍 PROBLEMAS IDENTIFICADOS

### 1. **Falha na Recuperação de Artigos da LEI/LUOS** 🔴 CRÍTICO
- Sistema não está recuperando artigos específicos (ex: Art. 81, Art. 74)
- Respostas genéricas ou "Não disponível" para queries sobre legislação
- Sistema hierárquico de chunking implementado mas não ativo

### 2. **Dashboard Administrativo Quebrado** 🔴 CRÍTICO
- Botão "Salvar Casos de Teste" não funciona
- "Executar Validação" fica em loop infinito
- Resultados não carregam no dashboard
- URL: http://localhost:8080/admin/quality

### 3. **Taxa de Sucesso Baixa** 🟡 ALTO
- Apenas 53.2% dos casos passando (58/109)
- 33 casos sem indicadores obrigatórios
- 49 casos com valores incorretos

### 4. **Coeficientes Limitados** 🟡 MÉDIO
- Funcionam apenas para ZOT 04
- Outras ZOTs retornam "Não disponível" mesmo com dados

---

## 📝 PLANO DE AÇÃO DETALHADO

### FASE 1: Reativar Sistema de Chunking Hierárquico (Prioridade: CRÍTICA)
**Prazo:** Imediato  
**Responsável:** Claude Code

#### Ações:
1. **Verificar integração do sistema hierárquico**
   ```bash
   # Verificar se os arquivos existem
   ls supabase/functions/_shared/hierarchical-chunking.ts
   ls supabase/functions/_shared/keywords_detector.py
   ```

2. **Atualizar enhanced-vector-search**
   - Arquivo: `supabase/functions/enhanced-vector-search/index.ts`
   - Adicionar lógica para detectar queries sobre artigos/leis
   - Usar busca hierárquica quando apropriado

3. **Modificar query-analyzer**
   - Arquivo: `supabase/functions/query-analyzer/index.ts`
   - Adicionar detecção de patterns: "artigo", "art.", "inciso", "parágrafo", "LUOS"
   - Marcar como `intent: 'legal_query'`

4. **Atualizar response-synthesizer**
   - Arquivo: `supabase/functions/response-synthesizer/index.ts`
   - Formatar respostas legais: "**Art. XX - Inciso**: conteúdo..."
   - Priorizar chunks com metadados legais

### FASE 2: Corrigir Dashboard Administrativo (Prioridade: CRÍTICA)
**Prazo:** Hoje  
**Responsável:** Claude Code

#### Ações:
1. **Diagnosticar problema do botão "Salvar"**
   - Arquivo: `src/pages/admin/quality/QualityAssurance.tsx`
   - Verificar event handlers e chamadas API
   - Adicionar logs de debug

2. **Corrigir loop infinito em "Executar Validação"**
   - Verificar timeout e retry logic
   - Implementar cancelamento adequado
   - Adicionar progress indicator real

3. **Resolver carregamento de resultados**
   - Verificar fetch de dados do Supabase
   - Corrigir estado do componente
   - Implementar error boundaries

### FASE 3: Adicionar Casos de Teste para LEI/LUOS (Prioridade: ALTA)
**Prazo:** Hoje  
**Responsável:** Claude Code

#### Novos casos de teste a adicionar:
```javascript
const legalTestCases = [
  {
    id: 600,
    question: "Qual artigo da LUOS trata da Certificação em Sustentabilidade Ambiental?",
    expected_answer: "Art. 81 - III: os acréscimos definidos em regulamento para projetos que obtenham Certificação em Sustentabilidade Ambiental",
    category: "legal_articles",
    keywords: ["artigo 81", "certificação", "sustentabilidade", "ambiental", "III"]
  },
  {
    id: 601,
    question: "Qual a regra para empreendimentos no 4° Distrito?",
    expected_answer: "Art. 74: Os empreendimentos localizados na ZOT 8.2 - 4º Distrito",
    category: "legal_articles",
    keywords: ["artigo 74", "4º distrito", "ZOT 8.2", "empreendimentos"]
  },
  {
    id: 602,
    question: "O que diz o artigo sobre altura de edificação?",
    expected_answer: "Art. 81: altura máxima da edificação",
    category: "legal_articles",
    keywords: ["artigo 81", "altura", "edificação"]
  },
  {
    id: 603,
    question: "Qual artigo trata do coeficiente de aproveitamento?",
    expected_answer: "Art. 82: coeficiente de aproveitamento",
    category: "legal_articles",
    keywords: ["artigo 82", "coeficiente", "aproveitamento"]
  },
  {
    id: 604,
    question: "O que estabelece o artigo sobre recuos?",
    expected_answer: "Art. 83: recuos obrigatórios",
    category: "legal_articles",
    keywords: ["artigo 83", "recuos"]
  }
];
```

### FASE 4: Expandir Coeficientes para Todas ZOTs (Prioridade: MÉDIA)
**Prazo:** Amanhã  
**Responsável:** Claude Code

#### Ações:
1. **Auditar dados no banco**
   ```sql
   SELECT DISTINCT zona, 
          coef_aproveitamento_basico, 
          coef_aproveitamento_maximo
   FROM regime_urbanistico
   WHERE coef_aproveitamento_basico IS NOT NULL
   ORDER BY zona;
   ```

2. **Atualizar response-synthesizer**
   - Melhorar tratamento de NULLs
   - Adicionar valores default quando apropriado
   - Formatar mensagens mais claras

3. **Corrigir sql-generator**
   - Melhorar queries para coeficientes
   - Adicionar COALESCE para valores NULL

### FASE 5: Implementar Script de Inserção Manual de Casos (Prioridade: MÉDIA)
**Prazo:** Hoje  
**Responsável:** Claude Code

#### Criar script auxiliar:
```javascript
// scripts/add-test-cases.mjs
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addTestCases(cases) {
  const { data, error } = await supabase
    .from('qa_test_cases')
    .insert(cases);
    
  if (error) {
    console.error('Erro:', error);
  } else {
    console.log('✅ Casos adicionados:', data);
  }
}

// Executar
addTestCases(legalTestCases);
```

---

## 📊 MÉTRICAS DE SUCESSO

### Indicadores Chave (KPIs):
1. **Taxa de Sucesso QA**: Elevar de 53.2% para 80%+
2. **Queries Legais**: 100% de precisão em artigos da LUOS
3. **Dashboard**: 100% funcional
4. **Coeficientes**: Funcionar em 100% das ZOTs com dados
5. **Tempo de Resposta**: Manter < 3 segundos

### Critérios de Validação:
- [ ] Artigo 81 retorna corretamente
- [ ] Artigo 74 (4º Distrito) retorna corretamente
- [ ] Dashboard permite adicionar casos de teste
- [ ] Validação QA executa sem loops
- [ ] Coeficientes funcionam para ZOT 02, 09, 14, 15
- [ ] 80%+ dos casos de teste passando

---

## 🚀 CRONOGRAMA DE EXECUÇÃO

### DIA 1 (Hoje - 07/08/2025):
**Manhã (2h)**
- [ ] Reativar sistema hierárquico de chunking
- [ ] Atualizar query-analyzer para detectar queries legais
- [ ] Testar com casos de artigos da LUOS

**Tarde (3h)**
- [ ] Corrigir dashboard administrativo
- [ ] Implementar script de inserção de casos
- [ ] Adicionar 10+ casos de teste legais

**Noite (2h)**
- [ ] Executar teste completo
- [ ] Documentar resultados
- [ ] Preparar deploy

### DIA 2 (08/08/2025):
**Manhã (2h)**
- [ ] Expandir coeficientes para todas ZOTs
- [ ] Otimizar response-synthesizer
- [ ] Testes de regressão

**Tarde (2h)**
- [ ] Deploy para produção
- [ ] Monitoramento inicial
- [ ] Ajustes finos

---

## 🛠️ COMANDOS ÚTEIS

### Deploy das correções:
```bash
# Deploy individual de functions
npx supabase functions deploy enhanced-vector-search --project-ref ngrqwmvuhvjkeohesbxs
npx supabase functions deploy query-analyzer --project-ref ngrqwmvuhvjkeohesbxs
npx supabase functions deploy response-synthesizer --project-ref ngrqwmvuhvjkeohesbxs

# Adicionar casos de teste
node scripts/add-test-cases.mjs

# Executar validação
node scripts/run-all-qa-tests-optimized.mjs

# Limpar cache se necessário
node scripts/clear-cache-simple.mjs
```

### Verificação rápida:
```bash
# Testar query legal específica
curl -X POST https://ngrqwmvuhvjkeohesbxs.supabase.co/functions/v1/agentic-rag \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message": "Qual artigo da LUOS trata da Certificação em Sustentabilidade Ambiental?"}'
```

---

## ⚠️ RISCOS E MITIGAÇÕES

### Riscos Identificados:
1. **Sistema hierárquico pode impactar performance**
   - Mitigação: Cache agressivo para queries legais
   
2. **Dashboard pode ter dependências quebradas**
   - Mitigação: Criar interface CLI alternativa
   
3. **Dados legais podem estar desatualizados**
   - Mitigação: Validar com documentação oficial

---

## 📝 NOTAS IMPORTANTES

1. **Sistema Hierárquico já estava implementado** conforme `RESUMO_IMPLEMENTACAO_RAG_OTIMIZADO.md` mas aparentemente não está ativo
2. **Dashboard é crítico** para gestão contínua do sistema
3. **Casos de teste legais** são essenciais para validação
4. **Priorizar correções** que impactam maior número de usuários

---

## ✅ CHECKLIST DE CONCLUSÃO

- [ ] Sistema hierárquico reativado e funcionando
- [ ] Dashboard administrativo 100% operacional
- [ ] 20+ casos de teste legais adicionados
- [ ] Taxa de sucesso > 80%
- [ ] Documentação atualizada
- [ ] Deploy em produção realizado
- [ ] Monitoramento configurado

---

**Responsável:** Claude Code Assistant  
**Aprovação:** Pendente  
**Início:** 07/08/2025  
**Conclusão Estimada:** 08/08/2025