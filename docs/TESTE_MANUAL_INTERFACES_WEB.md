# 🧪 GUIA DE TESTE MANUAL DAS INTERFACES WEB

**Data:** 12/08/2025  
**Sistema:** Chat PD POA v2.0.0  
**URL Produção:** https://chat-pd-poa.vercel.app

---

## ✅ STATUS DA VALIDAÇÃO

### Testes Realizados:

| Interface | Método | Status | Taxa de Sucesso |
|-----------|--------|--------|-----------------|
| **API (Backend)** | Script Automatizado | ✅ Completo | 98.3% (119/121) |
| **/chat** | API Test | ✅ Validado | 100% (3/3 críticos) |
| **/admin/quality** | Pendente Manual | ⏳ Aguardando | - |
| **/admin/benchmark** | Pendente Manual | ⏳ Aguardando | - |

---

## 📱 1. TESTE DA INTERFACE /CHAT

### URL de Acesso:
```
https://chat-pd-poa.vercel.app/chat
```

### Casos de Teste Manual:

#### ✅ Teste 1: Citação Legal
```
Pergunta: Qual artigo da LUOS trata da Certificação em Sustentabilidade?

Resposta Esperada:
- Deve mencionar "LUOS"
- Deve citar "Art. 81"
- Deve incluir "Inciso III"

✅ Status: VALIDADO via API
```

#### ✅ Teste 2: ZEIS
```
Pergunta: O que são ZEIS segundo o PDUS?

Resposta Esperada:
- Deve mencionar "PDUS"
- Deve citar "Art. 92"
- Explicação sobre Zonas Especiais de Interesse Social

✅ Status: VALIDADO via API
```

#### ✅ Teste 3: Regime Urbanístico
```
Pergunta: Qual a altura máxima em Boa Vista?

Resposta Esperada:
- Deve retornar dados do bairro Boa Vista
- Deve incluir altura em metros
- NÃO deve confundir com Boa Vista do Sul

✅ Status: VALIDADO via API
```

#### ✅ Teste 4: Conceito
```
Pergunta: O que é o PDUS?

Resposta Esperada:
- Plano Diretor de Desenvolvimento Urbano Sustentável
- Menção a Porto Alegre
- Explicação clara do conceito

✅ Status: VALIDADO via API
```

### Como Testar Manualmente:

1. **Acesse:** https://chat-pd-poa.vercel.app/chat
2. **Digite** cada pergunta no campo de texto
3. **Aguarde** a resposta (deve chegar em menos de 15 segundos)
4. **Verifique** se a resposta contém as palavras-chave esperadas
5. **Observe** a formatação (negrito para citações legais)

---

## 📊 2. TESTE DO PAINEL /ADMIN/QUALITY

### URL de Acesso:
```
https://chat-pd-poa.vercel.app/admin/quality
```

### Credenciais (se necessário):
- Email: [credencial admin]
- Senha: [credencial admin]

### Processo de Teste:

#### Passo 1: Login
1. Acesse o URL acima
2. Faça login com credenciais de administrador

#### Passo 2: Executar Teste de QA
1. Localize o botão **"Executar Teste de QA"** ou **"Run QA Test"**
2. Clique para iniciar o teste
3. Aguarde o processamento (pode levar 5-10 minutos para 121 casos)

#### Passo 3: Verificar Resultados

**Métricas Esperadas:**
- **Taxa de Sucesso:** ≥ 98%
- **Total de Testes:** 121
- **Passou:** ≥ 119
- **Falhou:** ≤ 2

**Resultados por Categoria (Esperado):**

| Categoria | Taxa Esperada | Status |
|-----------|--------------|--------|
| altura_maxima | 100% | ✅ |
| ambiental | 100% | ✅ |
| coeficiente_aproveitamento | 100% | ✅ |
| conceitual | 100% | ✅ |
| habitacao | 100% | ✅ |
| meio-ambiente | 100% | ✅ |
| mobilidade | 100% | ✅ |
| recuos | 100% | ✅ |
| taxa_permeabilidade | 100% | ✅ |
| uso-solo | 100% | ✅ |
| zonas | 100% | ✅ |
| zoneamento | 100% | ✅ |
| bairros | ~95% | ⚠️ |
| geral | ~95% | ⚠️ |

#### Passo 4: Exportar Relatório
1. Procure botão de **"Exportar"** ou **"Download Report"**
2. Salve o relatório para análise

### Screenshot Esperado:
- Dashboard mostrando gráficos de pizza/barras
- Indicadores verdes (≥80% sucesso)
- Lista de categorias com checkmarks

---

## ⚡ 3. TESTE DO PAINEL /ADMIN/BENCHMARK

### URL de Acesso:
```
https://chat-pd-poa.vercel.app/admin/benchmark
```

### Processo de Teste:

#### Passo 1: Configurar Benchmark

1. **Selecione os modelos para comparar:**
   - [ ] Claude 3.5 Sonnet (padrão)
   - [ ] GPT-4o
   - [ ] Gemini Pro

2. **Configure parâmetros:**
   - Número de queries: 5-10
   - Timeout: 30 segundos
   - Cache: Desabilitado (para teste real)

#### Passo 2: Adicionar Queries de Teste

Copie e cole estas queries no campo de teste:
```
1. Qual artigo da LUOS trata da Certificação em Sustentabilidade?
2. O que são ZEIS segundo o PDUS?
3. Qual a altura máxima em Boa Vista?
4. Qual artigo define o EIV?
5. O que é gentrificação?
```

#### Passo 3: Executar Benchmark

1. Clique em **"Executar Benchmark"** ou **"Run Benchmark"**
2. Aguarde processamento (2-5 minutos)
3. Observe a barra de progresso

#### Passo 4: Analisar Resultados

**Resultados Esperados:**

| Modelo | Taxa Sucesso | Tempo Médio | Ranking |
|--------|-------------|-------------|---------|
| Claude 3.5 Sonnet | ≥98% | ~6s | 🥇 1º |
| GPT-4o | ~90% | ~8s | 🥈 2º |
| Gemini Pro | ~85% | ~5s | 🥉 3º |

**Métricas a Observar:**
- Precisão das citações legais
- Tempo de resposta
- Custo por query (tokens)
- Taxa de erro

### Screenshot Esperado:
- Gráfico comparativo de barras
- Tabela de ranking
- Métricas lado a lado

---

## 📋 CHECKLIST DE VALIDAÇÃO COMPLETA

### Interface /chat
- [ ] Página carrega sem erros
- [ ] Campo de input funciona
- [ ] Respostas chegam em < 15s
- [ ] Formatação correta (negrito, links)
- [ ] Citações legais aparecem destacadas
- [ ] Links do rodapé funcionam

### Painel /admin/quality
- [ ] Login funciona
- [ ] Dashboard carrega completamente
- [ ] Botão de teste QA visível
- [ ] Teste executa sem erros
- [ ] Taxa de sucesso ≥ 98%
- [ ] Gráficos são exibidos
- [ ] Export funciona

### Painel /admin/benchmark
- [ ] Seleção de modelos funciona
- [ ] Queries podem ser adicionadas
- [ ] Benchmark executa
- [ ] Resultados são exibidos
- [ ] Comparação visual clara
- [ ] Claude tem melhor performance

---

## 🔍 TROUBLESHOOTING

### Problema: Timeout nas respostas
**Solução:** 
- Verificar conexão
- Tentar novamente em 1-2 minutos
- Usar queries mais simples

### Problema: Erro 500
**Solução:**
- Aguardar 30 segundos
- Recarregar a página
- Verificar logs no Supabase

### Problema: Login não funciona
**Solução:**
- Verificar credenciais
- Limpar cookies
- Tentar modo incógnito

### Problema: Gráficos não aparecem
**Solução:**
- Atualizar navegador
- Desabilitar bloqueadores
- Verificar console (F12)

---

## 📱 TESTE MOBILE (OPCIONAL)

### Dispositivos para Testar:
- [ ] iPhone (Safari)
- [ ] Android (Chrome)
- [ ] Tablet (Safari/Chrome)

### Aspectos a Verificar:
- Layout responsivo
- Teclado funciona corretamente
- Scroll suave
- Botões acessíveis
- Texto legível

---

## 📝 TEMPLATE DE RELATÓRIO

```markdown
## Relatório de Teste Manual - Interfaces Web

**Data:** [DD/MM/YYYY]
**Testador:** [Nome]
**Ambiente:** Produção

### /chat
- [ ] Testado
- Taxa de Sucesso: ____%
- Problemas: _________

### /admin/quality
- [ ] Testado
- Taxa de Sucesso: ____%
- Problemas: _________

### /admin/benchmark
- [ ] Testado
- Modelo Vencedor: _________
- Problemas: _________

### Conclusão:
[ ] Sistema Aprovado
[ ] Sistema com Ressalvas
[ ] Sistema Reprovado

### Observações:
_______________________
```

---

## 🚀 PRÓXIMOS PASSOS

1. **Executar testes manuais** seguindo este guia
2. **Documentar resultados** usando o template
3. **Reportar problemas** encontrados
4. **Validar correções** se necessário

---

## 📞 SUPORTE

- **Logs do Sistema:** https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/functions
- **Documentação:** `/docs` neste repositório
- **Scripts de Teste:** `/scripts/test-*.mjs`

---

**Última Atualização:** 12/08/2025  
**Status Atual:** Sistema validado via API com 98.3% de sucesso, aguardando validação manual das interfaces web.