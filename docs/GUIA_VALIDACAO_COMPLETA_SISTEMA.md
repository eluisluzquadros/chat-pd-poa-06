# 🧪 GUIA DE VALIDAÇÃO COMPLETA DO SISTEMA RAG
**Data:** 12/08/2025  
**Versão:** 1.0.0  
**Taxa de Sucesso Esperada:** 98.3%

---

## 📋 RESUMO DOS TESTES

O sistema foi validado com **98.3% de sucesso** em 121 casos de teste via API. Este guia mostra como reproduzir essa validação através das interfaces:
- **/chat** - Interface do usuário final
- **/admin/quality** - Painel de qualidade para administradores
- **/admin/benchmark** - Comparação de modelos

---

## 🎯 1. VALIDAÇÃO VIA CHAT (/chat)

### Acesso
```
URL: https://chat-pd-poa.vercel.app/chat
ou
URL: http://localhost:5173/chat (desenvolvimento local)
```

### Casos de Teste Prioritários

#### A. Teste de Citações Legais (100% sucesso esperado)

**Teste 1 - Certificação em Sustentabilidade:**
```
Pergunta: Qual artigo da LUOS trata da Certificação em Sustentabilidade?
Resposta Esperada: Deve citar "LUOS - Art. 81, Inciso III"
```

**Teste 2 - ZEIS:**
```
Pergunta: O que são ZEIS segundo o PDUS?
Resposta Esperada: Deve citar "PDUS - Art. 92"
```

**Teste 3 - EIV:**
```
Pergunta: Qual artigo define o EIV?
Resposta Esperada: Deve citar "LUOS - Art. 89"
```

**Teste 4 - 4º Distrito:**
```
Pergunta: O que a LUOS diz sobre o 4º Distrito?
Resposta Esperada: Deve citar "LUOS - Art. 74"
```

#### B. Teste de Regime Urbanístico (100% sucesso esperado)

**Teste 5 - Altura Máxima:**
```
Pergunta: Qual a altura máxima permitida em Boa Vista?
Resposta Esperada: Deve retornar dados estruturados com altura em metros
```

**Teste 6 - Coeficiente de Aproveitamento:**
```
Pergunta: Qual o coeficiente de aproveitamento do Centro Histórico?
Resposta Esperada: Deve mostrar CA Básico e CA Máximo
```

#### C. Teste de Conceitos (100% sucesso esperado)

**Teste 7 - PDUS:**
```
Pergunta: O que é o PDUS?
Resposta Esperada: Explicação sobre o Plano Diretor
```

**Teste 8 - Gentrificação:**
```
Pergunta: O que é gentrificação?
Resposta Esperada: Definição do conceito
```

### Checklist de Validação no Chat

- [ ] Sistema responde em menos de 15 segundos
- [ ] Citações legais incluem nome da lei (LUOS/PDUS)
- [ ] Dados de regime urbanístico são apresentados em formato tabular
- [ ] Links no rodapé estão funcionando
- [ ] Não há erros 500 ou timeouts

---

## 📊 2. VALIDAÇÃO VIA ADMIN/QUALITY

### Acesso
```
URL: https://chat-pd-poa.vercel.app/admin/quality
Login: Requer credenciais de administrador
```

### Processo de Validação

#### Passo 1: Executar Teste Automático
1. Clique em **"Executar Teste de QA"**
2. Aguarde o processamento dos 121 casos
3. Observe o progresso em tempo real

#### Passo 2: Analisar Resultados

**Métricas Esperadas:**
```
Taxa de Sucesso Geral: ≥ 98%
Tempo Médio de Resposta: < 6 segundos
Casos com Sucesso: ≥ 119/121
```

**Resultados por Categoria (Esperado):**
| Categoria | Taxa Esperada | Casos |
|-----------|--------------|-------|
| altura_maxima | 100% | 4/4 |
| ambiental | 100% | 2/2 |
| bairros | 94.7% | 18/19 |
| coeficiente_aproveitamento | 100% | 3/3 |
| conceitual | 100% | 24/24 |
| geral | 94.7% | 18/19 |
| habitacao | 100% | 3/3 |
| meio-ambiente | 100% | 3/3 |
| mobilidade | 100% | 2/2 |
| recuos | 100% | 3/3 |
| taxa_permeabilidade | 100% | 3/3 |
| uso-solo | 100% | 15/15 |
| zonas | 100% | 6/6 |
| zoneamento | 100% | 15/15 |

#### Passo 3: Revisar Casos Problemáticos

Casos que podem falhar (2 de 121):
1. **Bairros:** "Quais são os principais índices do regime urbanístico de Ipanema?"
   - Possível erro HTTP 500
   
2. **Geral:** "Como será o EVU no novo Plano?"
   - Possível erro de conexão (ECONNRESET)

### Dashboard de Qualidade - Indicadores

**🟢 Verde (Bom):** Taxa ≥ 80%
**🟡 Amarelo (Atenção):** Taxa entre 60-80%
**🔴 Vermelho (Crítico):** Taxa < 60%

---

## ⚡ 3. VALIDAÇÃO VIA ADMIN/BENCHMARK

### Acesso
```
URL: https://chat-pd-poa.vercel.app/admin/benchmark
Login: Requer credenciais de administrador
```

### Testes de Comparação de Modelos

#### Configuração do Teste
1. **Selecione os modelos para comparar:**
   - Claude 3.5 Sonnet (padrão atual)
   - GPT-4o
   - Gemini Pro

2. **Configure os parâmetros:**
   ```
   Número de queries: 10
   Timeout: 30 segundos
   Cache: Desabilitado
   ```

3. **Queries de teste recomendadas:**
   ```
   1. Qual artigo da LUOS trata da Certificação em Sustentabilidade?
   2. O que são ZEIS segundo o PDUS?
   3. Qual a altura máxima em Boa Vista?
   4. O que é o EIV?
   5. Qual o coeficiente de aproveitamento do Centro Histórico?
   6. O que diz sobre o 4º Distrito?
   7. Qual a taxa de permeabilidade mínima?
   8. Como funciona a outorga onerosa?
   9. O que é gentrificação?
   10. Quais bairros têm altura máxima acima de 50m?
   ```

### Métricas de Comparação

**Avaliar cada modelo em:**
- **Precisão:** Respostas corretas com citações
- **Velocidade:** Tempo médio de resposta
- **Custo:** Tokens utilizados
- **Confiabilidade:** Taxa de erro

### Resultados Esperados

| Modelo | Taxa Sucesso | Tempo Médio | Observação |
|--------|-------------|-------------|------------|
| Claude 3.5 Sonnet | ≥98% | ~6s | Modelo atual otimizado |
| GPT-4o | ~90% | ~8s | Bom, mas mais lento |
| Gemini Pro | ~85% | ~5s | Rápido, menos preciso |

---

## 🔍 4. VALIDAÇÃO MANUAL ESPECÍFICA

### Teste de Casos Críticos

#### A. Diferenciação de Bairros
```
✅ DEVE FUNCIONAR:
Pergunta: "Altura máxima em Boa Vista"
Resposta: Dados do bairro BOA VISTA (não Boa Vista do Sul)

❌ CONHECIDO (50% sucesso):
Pergunta: "Vila Nova do Sul existe?"
Resposta esperada: "Bairro não existe"
Resposta atual: Pode não detectar como inexistente
```

#### B. Citações Obrigatórias
```
✅ FUNCIONANDO:
- Certificação → LUOS Art. 81
- ZEIS → PDUS Art. 92
- EIV → LUOS Art. 89
- 4º Distrito → LUOS Art. 74
- Outorga Onerosa → LUOS Art. 86
- Coeficiente → LUOS Art. 82
```

---

## 📈 5. MONITORAMENTO CONTÍNUO

### Scripts de Teste Automatizado

**Executar via terminal:**
```bash
# Teste rápido (5 casos)
npm run test:quick

# Teste de citações legais
node scripts/test-legal-citations.mjs

# Teste completo (121 casos)
node test-all-121-cases.mjs

# Teste com relatório
npm run test:qa
```

### Verificação de Logs

**Supabase Dashboard:**
1. Acesse: https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs
2. Vá para: Functions → Logs
3. Verifique:
   - agentic-rag (orquestrador)
   - query-analyzer (análise)
   - response-synthesizer-simple (síntese)
   - sql-generator-v2 (SQL)

### Indicadores de Saúde

**✅ Sistema Saudável:**
- Taxa de sucesso ≥ 95%
- Tempo médio < 10s
- Zero erros 500
- Citações funcionando

**⚠️ Atenção Necessária:**
- Taxa de sucesso 80-95%
- Tempo médio 10-15s
- Erros esporádicos
- Algumas citações falhando

**🔴 Crítico:**
- Taxa de sucesso < 80%
- Tempo médio > 15s
- Erros frequentes
- Sistema instável

---

## 📝 6. CHECKLIST DE VALIDAÇÃO COMPLETA

### Frontend (/chat)
- [ ] Interface carrega corretamente
- [ ] Mensagens são enviadas sem erro
- [ ] Respostas chegam em < 15 segundos
- [ ] Formatação está correta (negrito, links)
- [ ] Links do rodapé funcionam

### Admin Quality (/admin/quality)
- [ ] Dashboard carrega os 121 casos
- [ ] Teste automático executa
- [ ] Taxa de sucesso ≥ 98%
- [ ] Gráficos são exibidos corretamente
- [ ] Exportação de relatório funciona

### Admin Benchmark (/admin/benchmark)
- [ ] Comparação entre modelos funciona
- [ ] Métricas são calculadas corretamente
- [ ] Gráficos comparativos aparecem
- [ ] Claude 3.5 Sonnet tem melhor performance

### Backend (API)
- [ ] Endpoint agentic-rag responde
- [ ] Sem erros 500 sistemáticos
- [ ] Cache está funcionando
- [ ] Timeouts configurados (max 25s)

---

## 🚀 7. AÇÕES CORRETIVAS

### Se taxa < 98%:
1. Verificar logs no Supabase
2. Testar funções individualmente
3. Verificar API keys
4. Limpar cache se necessário

### Se há timeouts:
1. Verificar enhanced-vector-search
2. Reduzir limite de resultados
3. Aumentar timeout para 30s
4. Verificar conexão com Supabase

### Se citações falham:
1. Verificar response-synthesizer-simple
2. Confirmar mapeamento de artigos
3. Testar query-analyzer isoladamente

---

## 📊 8. RELATÓRIO DE VALIDAÇÃO

### Template de Relatório

```
DATA: [DD/MM/YYYY]
HORA: [HH:MM]
RESPONSÁVEL: [Nome]

RESULTADOS:
✅ Taxa de Sucesso: ____%
✅ Tempo Médio: ____ms
✅ Total de Testes: ___/121

INTERFACES TESTADAS:
[ ] /chat - Funcionando
[ ] /admin/quality - Funcionando
[ ] /admin/benchmark - Funcionando

PROBLEMAS ENCONTRADOS:
1. _________________
2. _________________

AÇÕES TOMADAS:
1. _________________
2. _________________

STATUS: [ ] APROVADO [ ] REPROVADO
```

---

## 💡 DICAS IMPORTANTES

1. **Sempre teste após deploy:** Qualquer mudança nas Edge Functions
2. **Use cache:** Para testes repetidos, mantém performance
3. **Monitore horários:** Sistema pode ser mais lento em horários de pico
4. **Documente falhas:** Mantenha registro de problemas recorrentes
5. **Teste incremental:** Comece com poucos casos, depois teste completo

---

**Última Atualização:** 12/08/2025  
**Sistema Validado:** ✅ 98.3% de sucesso  
**Próxima Validação:** Semanal ou após mudanças