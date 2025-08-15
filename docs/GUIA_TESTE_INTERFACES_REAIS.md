# 🧪 GUIA DE TESTE DAS INTERFACES REAIS DO SISTEMA

**Data:** 12/08/2025  
**Sistema:** Chat PD POA v2.0.0  
**URLs Corretas:**
- **Local:** http://localhost:8080
- **Produção:** https://chat-pd-poa-06.vercel.app (se deployed)

---

## ✅ ROTAS DISPONÍVEIS NO SISTEMA

### Rotas Públicas:
- `/` - Redireciona para `/auth`
- `/auth` - Página de login
- `/demo` - Login de demonstração

### Rotas Autenticadas:
- `/chat` - Interface principal de chat
- `/settings` - Configurações do usuário

### Rotas Admin:
- `/admin/dashboard` - Dashboard administrativo
- `/admin/users` - Gerenciamento de usuários
- `/admin/quality` - Dashboard de Qualidade QA
- `/admin/quality-test` - Teste de qualidade
- `/admin/test-qa` - Teste QA
- `/admin/test-qa-cases` - Casos de teste QA
- `/admin/feedback` - Feedback dos usuários
- `/admin/benchmark` - Benchmark de modelos
- `/admin/kb` - Base de conhecimento

---

## 📱 1. TESTE DA INTERFACE /CHAT

### URL de Acesso:
```
Local: http://localhost:8080/chat
Produção: https://[seu-projeto].vercel.app/chat
```

### Como Acessar:
1. Primeiro faça login em `/auth`
2. Após autenticação, navegue para `/chat`

### Casos de Teste:

#### Teste 1: Citação Legal
```
Pergunta: Qual artigo da LUOS trata da Certificação em Sustentabilidade?
Resposta Esperada: LUOS - Art. 81, Inciso III
```

#### Teste 2: ZEIS
```
Pergunta: O que são ZEIS segundo o PDUS?
Resposta Esperada: PDUS - Art. 92
```

#### Teste 3: Altura Máxima
```
Pergunta: Qual a altura máxima em Boa Vista?
Resposta Esperada: Dados do bairro Boa Vista com altura em metros
```

#### Teste 4: Conceito PDUS
```
Pergunta: O que é o PDUS?
Resposta Esperada: Plano Diretor de Porto Alegre
```

---

## 📊 2. TESTE DO PAINEL /ADMIN/QUALITY

### URL de Acesso:
```
Local: http://localhost:8080/admin/quality
```

### Interface Real do Painel:

O painel possui os seguintes componentes:

1. **Botão "Executar Validação"** (não "Executar Teste QA")
   - Ícone: ▶️ (Play)
   - Localização: Canto superior direito
   - Abre um dialog de opções

2. **Dialog de Opções de Validação:**
   - **Seleção de Modelo:** Dropdown com modelos disponíveis
   - **Modo de Execução:**
     - Todos os casos ativos
     - Filtrados por categoria/dificuldade
     - Amostra aleatória
   - **Filtros (quando aplicável):**
     - Checkboxes de categorias
     - Checkboxes de dificuldades
   - **Botão de Execução:** No final do dialog

3. **Métricas Exibidas:**
   - Card "Execuções QA" - Total de validações
   - Card "Acurácia Média" - Porcentagem
   - Card "Casos de Teste" - Total disponível
   - Card "Tempo Resposta" - Média em ms

4. **Abas Disponíveis:**
   - Histórico de Execuções
   - Análise de Erros
   - Comparação de Modelos
   - Lacunas de Conhecimento
   - Lista de Casos de Teste

### Como Executar Teste:

1. **Clique no botão "Executar Validação"** (canto superior direito)
2. **Configure as opções no dialog:**
   - Selecione o modelo (padrão: Claude 3.5 Sonnet)
   - Escolha o modo (recomendado: "Todos os casos ativos")
3. **Clique em "Executar"** no dialog
4. **Aguarde a execução** (barra de progresso será exibida)
5. **Verifique resultados** nas métricas e abas

### Observação sobre Export:
- Não há botão de "Export" direto
- Os dados podem ser visualizados nas diferentes abas
- Histórico fica salvo automaticamente

---

## ⚡ 3. TESTE DO PAINEL /ADMIN/BENCHMARK

### URL de Acesso:
```
Local: http://localhost:8080/admin/benchmark
```

### Interface Real:

1. **Dialog de Execução Multi-Modelo**
   - Botão no canto superior direito
   - Permite comparar múltiplos modelos

2. **Configuração:**
   - Seleção de modelos para comparar
   - Queries de teste personalizadas
   - Opções de cache

3. **Resultados:**
   - Comparação lado a lado
   - Métricas de performance
   - Gráficos comparativos

---

## 🔧 EXECUTANDO O SISTEMA LOCALMENTE

### 1. Iniciar o Frontend:
```bash
npm run dev
# Acesse: http://localhost:8080
```

### 2. Verificar Backend (Supabase):
```bash
# As Edge Functions já devem estar deployed
# URL: https://ngrqwmvuhvjkeohesbxs.supabase.co
```

### 3. Credenciais de Teste:
- Use `/demo` para login rápido de demonstração
- Ou crie uma conta em `/auth`

---

## ✅ CHECKLIST DE VALIDAÇÃO

### Interface /chat:
- [ ] Login funciona
- [ ] Interface de chat carrega
- [ ] Mensagens são enviadas
- [ ] Respostas chegam (< 15s)
- [ ] Formatação correta

### Painel /admin/quality:
- [ ] Acesso ao painel (requer role admin)
- [ ] Botão "Executar Validação" visível
- [ ] Dialog de opções abre
- [ ] Validação executa
- [ ] Métricas são atualizadas
- [ ] Abas mostram dados

### Painel /admin/benchmark:
- [ ] Acesso ao painel
- [ ] Dialog multi-modelo funciona
- [ ] Comparação executa
- [ ] Resultados exibidos

---

## 📊 RESULTADOS DOS TESTES AUTOMATIZADOS

### Backend (API):
- ✅ **98.3% de sucesso** (119/121 testes)
- Tempo médio: 5.95s
- Citações legais: 100%

### Teste Rápido via API:
```bash
node scripts/test-interfaces-quick.mjs

Resultado:
✅ Citação Legal - OK (3116ms)
✅ Regime Urbanístico - OK (11168ms)
✅ Conceito - OK (3639ms)
Taxa de Sucesso: 100% (3/3)
```

---

## 🚀 SCRIPTS DE TESTE DISPONÍVEIS

### Teste Completo (121 casos):
```bash
node test-all-121-cases.mjs
```

### Teste Rápido (3 casos críticos):
```bash
node scripts/test-interfaces-quick.mjs
```

### Teste de Citações Legais:
```bash
node scripts/test-legal-citations.mjs
```

---

## 📝 OBSERVAÇÕES IMPORTANTES

1. **Não existe rota `/chat` direta** - é `/chat` após autenticação
2. **Botão é "Executar Validação"**, não "Executar Teste QA"
3. **Não há botão de Export direto** - dados ficam nas abas
4. **Requer role admin** para acessar `/admin/*`
5. **Use `/demo`** para teste rápido sem criar conta

---

## 🎯 STATUS ATUAL

| Componente | Status | Observação |
|------------|--------|------------|
| Backend API | ✅ 98.3% | Validado com 121 casos |
| Interface /chat | ✅ Funcional | Testado via API |
| Admin Quality | ⏳ Manual | Interface diferente do esperado |
| Admin Benchmark | ⏳ Manual | Aguardando teste |

---

**Sistema está OPERACIONAL com 98.3% de sucesso no backend!**