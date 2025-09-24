# 🚀 Guia Completo de Deploy - Edge Functions

## 📋 Visão Geral

Este guia contém todo o processo de deploy automatizado para as Edge Functions do sistema Chat PD POA - Porto Alegre.

## 📦 Estrutura do Deploy

### Functions Categorizadas por Prioridade

#### 🔴 Críticas (Deploy Primeiro)
- `feedback-processor` - Processamento de feedback dos usuários
- `gap-detector` - Detecção de lacunas no conhecimento
- `knowledge-updater` - Atualização automática da base de conhecimento
- `paginated-search` - Busca paginada otimizada
- `cursor-pagination` - Paginação por cursor para performance

#### 🤖 Multi-LLM Functions
- `claude-chat`, `claude-haiku-chat`, `claude-opus-chat`, `claude-sonnet-chat`
- `gemini-chat`, `gemini-pro-chat`, `gemini-vision-chat`
- `openai-advanced-chat`
- `deepseek-chat`, `groq-chat`, `llama-chat`

#### 🧠 Core RAG System
- `enhanced-vector-search` - Busca vetorial aprimorada
- `response-synthesizer` - Síntese inteligente de respostas
- `contextual-scoring` - Pontuação contextual
- `agent-rag`, `agentic-rag`
- `query-analyzer`, `sql-generator`

#### 🛠️ Support Functions
- `process-document` - Processamento de documentos
- `generate-embedding`, `generate-text-embedding`
- `match-documents`, `predefined-responses`
- `check-processing-status`

#### 👨‍💼 Admin Functions
- `create-admin-user`, `create-admin-account`
- `create-user-from-interest`, `set-user-role`
- `setup-demo-user`

#### 🧪 QA & Testing
- `qa-validator`, `qa-validator-simple`
- `qa-validator-direct`, `qa-validator-test`
- `test-qa-cases`

## 🛠️ Pré-requisitos

### 1. Ambiente Local
```bash
# Node.js 18+ instalado
node --version

# Supabase CLI
npm install -g supabase

# Verificar instalação
npx supabase --version
```

### 2. Configurações Obrigatórias
- Supabase CLI configurado e logado
- Variáveis de ambiente configuradas
- API keys válidas para os serviços externos

### 3. Projeto Supabase
- Project Reference: `ngrqwmvuhvjkeohesbxs`
- URL: `https://ngrqwmvuhvjkeohesbxs.supabase.co`

## 🚀 Processo de Deploy

### Passo 1: Setup do Ambiente
```bash
# Executar setup automático
node setup-environment.mjs

# Verificar configurações
cat .env.local
```

### Passo 2: Configurar API Keys
Configure manualmente no arquivo `.env.local`:
```env
OPENAI_API_KEY=sk-proj-...
GOOGLE_AI_API_KEY=...
ANTHROPIC_API_KEY=...
GROQ_API_TOKEN=...
DEEPSEEK_API_KEY=...
```

### Passo 3: Deploy Completo
```bash
# Deploy de todas as functions
node deploy-all-functions.mjs

# Ou deploy por categoria
node deploy-all-functions.mjs --category critical
node deploy-all-functions.mjs --category multiLLM
```

### Passo 4: Verificação
```bash
# Testes automatizados
node test-functions.mjs

# Verificação manual com checklist
# Seguir: post-deploy-checklist.md
```

## 📊 Scripts Disponíveis

### `setup-environment.mjs`
- Configura variáveis de ambiente
- Cria arquivos `.env.local` e `.env.example`
- Atualiza `supabase/config.toml`
- Valida configurações

### `deploy-all-functions.mjs`
- Deploy automatizado de todas as functions
- Deploy por categoria/prioridade
- Validação pré-deploy
- Configuração automática
- Relatório detalhado de deploy

### `test-functions.mjs`
- Testes automatizados pós-deploy
- Verificação CORS
- Testes de conectividade
- Testes funcionais básicos
- Relatório de testes

## 🔧 Configurações Específicas

### Functions com JWT Obrigatório
```toml
[functions.feedback-processor]
verify_jwt = true

[functions.knowledge-updater]
verify_jwt = true

[functions.paginated-search]
verify_jwt = true

[functions.cursor-pagination]
verify_jwt = true

[functions.enhanced-vector-search]
verify_jwt = true

[functions.response-synthesizer]
verify_jwt = true

[functions.contextual-scoring]
verify_jwt = true
```

### Functions Públicas (sem JWT)
```toml
[functions.gap-detector]
verify_jwt = false
```

## 🧪 Testes e Validação

### Testes Básicos (CORS)
```bash
# Testar CORS para function crítica
curl -X OPTIONS -H "Origin: http://localhost:3000" \
  https://ngrqwmvuhvjkeohesbxs.supabase.co/functions/v1/feedback-processor
```

### Testes Funcionais
```bash
# Teste de feedback
curl -X POST \
  https://ngrqwmvuhvjkeohesbxs.supabase.co/functions/v1/feedback-processor \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "message_id": "test-123",
    "session_id": "session-456", 
    "model": "test-model",
    "helpful": true
  }'
```

### Monitoramento
```bash
# Logs em tempo real
npx supabase functions logs feedback-processor --project-ref ngrqwmvuhvjkeohesbxs

# Logs com filtro
npx supabase functions logs gap-detector --filter "ERROR" --project-ref ngrqwmvuhvjkeohesbxs
```

## 🚨 Troubleshooting

### Problemas Comuns

#### 1. Function não responde (504)
```bash
# Verificar logs
npx supabase functions logs FUNCTION_NAME --project-ref ngrqwmvuhvjkeohesbxs

# Verificar timeout configuration
# Aumentar timeout se necessário
```

#### 2. Erro CORS (403/405)
```bash
# Verificar se OPTIONS está implementado
curl -X OPTIONS https://ngrqwmvuhvjkeohesbxs.supabase.co/functions/v1/FUNCTION_NAME

# Verificar headers CORS na function
```

#### 3. Erro de Autenticação (401)
```bash
# Verificar JWT configuration
cat supabase/config.toml | grep -A 2 "functions.FUNCTION_NAME"

# Testar sem autenticação se function for pública
curl -X POST https://ngrqwmvuhvjkeohesbxs.supabase.co/functions/v1/gap-detector
```

#### 4. API Key Issues
```bash
# Verificar se secrets estão configurados
npx supabase secrets list --project-ref ngrqwmvuhvjkeohesbxs

# Configurar secret faltando
npx supabase secrets set OPENAI_API_KEY="sk-..." --project-ref ngrqwmvuhvjkeohesbxs
```

## 🔄 Rollback

### Rollback Completo
```bash
# Usar versão anterior do git
git checkout HEAD~1
node deploy-all-functions.mjs
```

### Rollback Seletivo
```bash
# Rollback de function específica
git show HEAD~1:supabase/functions/FUNCTION_NAME/index.ts > temp.ts
cp temp.ts supabase/functions/FUNCTION_NAME/index.ts
npx supabase functions deploy FUNCTION_NAME --project-ref ngrqwmvuhvjkeohesbxs
```

Ver documento completo: `rollback-plan.md`

## 📈 Monitoramento e Performance

### Métricas Importantes
- Response time < 5 segundos
- Error rate < 1% 
- CORS success rate > 99%
- Memory usage within limits

### Dashboards
- Supabase Dashboard: https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs
- Functions: https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/functions
- Logs: https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/logs

## 📚 Documentação Adicional

### Arquivos de Referência
- `post-deploy-checklist.md` - Checklist de verificação
- `rollback-plan.md` - Plano de rollback detalhado
- `SETUP_INSTRUCTIONS.md` - Instruções detalhadas (gerado automaticamente)

### URLs das Functions Deployadas
Todas as functions estarão disponíveis em:
```
https://ngrqwmvuhvjkeohesbxs.supabase.co/functions/v1/FUNCTION_NAME
```

### Estrutura de Diretórios
```
supabase/
  functions/
    feedback-processor/
      index.ts
    gap-detector/
      index.ts
    knowledge-updater/
      index.ts
    ... (outras functions)
  config.toml
```

## 👥 Equipe e Responsabilidades

### DevOps
- Deploy das functions
- Monitoramento de performance
- Configuração de secrets

### Backend
- Desenvolvimento das functions
- Testes funcionais
- Debugging

### QA
- Testes de integração
- Validação pós-deploy
- Reporte de issues

## 🔐 Segurança

### Boas Práticas
- Nunca committar API keys no código
- Usar environment variables para secrets
- Implementar rate limiting quando necessário
- Validar inputs nas functions
- Logs não devem expor informações sensíveis

### Configuração de Secrets
```bash
# Configurar secrets no Supabase
npx supabase secrets set OPENAI_API_KEY="..." --project-ref ngrqwmvuhvjkeohesbxs
npx supabase secrets set GOOGLE_AI_API_KEY="..." --project-ref ngrqwmvuhvjkeohesbxs
```

## 📞 Suporte

### Contatos
- Supabase Support: https://supabase.com/support
- OpenAI Support: https://help.openai.com/
- Documentação: https://supabase.com/docs/guides/functions

### Links Úteis
- [Supabase Functions Documentation](https://supabase.com/docs/guides/functions)
- [Deno Deploy Documentation](https://deno.com/deploy/docs)
- [Edge Runtime Documentation](https://edge-runtime.vercel.app/)

---

## ✅ Checklist Final

Antes de considerar o deploy completo:

- [ ] Todas as functions críticas deployadas
- [ ] Testes automatizados passando
- [ ] Checklist pós-deploy concluído
- [ ] Monitoramento configurado
- [ ] Documentação atualizada
- [ ] Equipe comunicada
- [ ] Plano de rollback testado

**Data do Deploy**: _______________  
**Responsável**: _______________  
**Status**: _______________