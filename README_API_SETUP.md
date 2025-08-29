# 🚀 Sistema RAG Multi-LLM - Configuração de API Keys

## 📋 Visão Geral

Este sistema suporta múltiplos provedores de LLM para máxima flexibilidade e redundância:

- **OpenAI** (GPT-4, GPT-4.5) - Principal
- **Anthropic Claude** (Opus, Sonnet, Haiku) - Alternativa premium
- **Google Gemini** (Pro, Flash, Vision) - Equilibrado
- **Groq** (Mixtral, Llama) - Ultra-rápido
- **DeepSeek** (Coder, Chat) - Especialista em código
- **Meta Llama** (via HuggingFace/Replicate/Ollama) - Open source

## 🎯 Configuração Rápida

### 1. Setup Automático (Recomendado)

```bash
# Configuração interativa guiada
npm run setup-wizard

# Validar configuração
npm run validate-keys

# Deploy para Supabase
npm run deploy-env

# Testar conexões
npm run test-llm-connections
```

### 2. Setup Manual

```bash
# Copiar template
cp .env.example .env.local

# Editar manualmente
nano .env.local

# Validar
npm run validate-keys
```

---

## 🔑 Onde Obter as API Keys

### OpenAI
1. 🌐 **Site:** https://platform.openai.com/api-keys
2. 💰 **Custo:** $0.15-$30 por 1M tokens
3. 📝 **Variável:** `OPENAI_API_KEY=sk-...`

### Anthropic Claude
1. 🌐 **Site:** https://console.anthropic.com/settings/keys
2. 💰 **Custo:** $0.25-$75 por 1M tokens
3. 📝 **Variável:** `CLAUDE_API_KEY=sk-ant-...`

### Google Gemini
1. 🌐 **Site:** https://makersuite.google.com/app/apikey
2. 💰 **Custo:** $0.075-$5 por 1M tokens
3. 📝 **Variável:** `GEMINI_API_KEY=...`

### Groq
1. 🌐 **Site:** https://console.groq.com/keys
2. 💰 **Custo:** $0.27 por 1M tokens
3. 📝 **Variável:** `GROQ_API_KEY=gsk_...`

### DeepSeek
1. 🌐 **Site:** https://platform.deepseek.com/api_keys
2. 💰 **Custo:** $0.14-$0.28 por 1M tokens
3. 📝 **Variável:** `DEEPSEEK_API_KEY=sk-...`

---

## ⚙️ Configuração Mínima

Para o sistema funcionar, você precisa de **pelo menos um LLM** configurado:

```bash
# Supabase (obrigatório)
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Pelo menos um LLM (escolha um)
OPENAI_API_KEY=sk-...          # OU
CLAUDE_API_KEY=sk-ant-...      # OU
GEMINI_API_KEY=...             # OU
GROQ_API_KEY=gsk_...           # OU
DEEPSEEK_API_KEY=sk-...
```

---

## 🛠️ Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run setup-wizard` | 🧙‍♂️ Configuração interativa completa |
| `npm run validate-keys` | ✅ Validar todas as API keys |
| `npm run deploy-env` | 🚀 Deploy para Supabase Edge Functions |
| `npm run test-llm-connections` | 🧪 Testar conectividade de todos os LLMs |

### Exemplos de Uso

```bash
# Validar apenas OpenAI
npm run validate-keys -- --provider openai

# Deploy apenas Claude
npm run deploy-env -- --provider claude

# Testar apenas Gemini
npm run test-llm-connections -- --provider gemini

# Benchmark de performance
npm run test-llm-connections -- --benchmark
```

---

## 🔒 Segurança

### ✅ Práticas Seguras
- Use `.env.local` (ignorado pelo Git)
- Configure rate limits apropriados
- Monitore custos regularmente
- Rotacione keys mensalmente

### ❌ Nunca Faça
- Commitar API keys no Git
- Usar keys de produção em desenvolvimento
- Compartilhar keys em chats/emails
- Deixar keys sem rate limits

📚 **Guia Completo:** [`docs/SECURITY_GUIDE.md`](docs/SECURITY_GUIDE.md)

---

## 📊 Monitoramento

### Métricas Automáticas
- 💰 Custo por request
- ⚡ Tempo de resposta
- 📈 Tokens por segundo
- 🎯 Taxa de sucesso
- 📊 Score de qualidade

### Alertas Configuráveis
- Limite de custo diário atingido
- Rate limit excedido
- Taxa de erro elevada
- API key inválida

---

## 🚨 Troubleshooting

### Problemas Comuns

**🔴 "API key not found"**
```bash
# Verifique se está no .env.local
grep OPENAI_API_KEY .env.local

# Reinicie o servidor
npm run dev
```

**🔴 "Rate limit exceeded"**
```bash
# Ajuste os limites
echo "OPENAI_RATE_LIMIT=1000" >> .env.local
npm run deploy-env
```

**🔴 "Invalid API key"**
```bash
# Teste a key
npm run validate-keys -- --provider openai

# Gere nova key no dashboard do provider
```

**🔴 Edge Functions não funcionam**
```bash
# Verifique se as vars foram deployadas
supabase secrets list

# Redeploy se necessário
npm run deploy-env
```

### Logs e Debug

```bash
# Habilitar debug
echo "DEBUG_MODE=true" >> .env.local
echo "LOG_LEVEL=debug" >> .env.local

# Ver logs das Edge Functions
supabase functions logs agentic-rag --follow
```

---

## 📈 Otimização de Performance

### Modelos Recomendados por Caso de Uso

| Caso de Uso | Modelo Recomendado | Razão |
|-------------|-------------------|-------|
| **Velocidade** | Groq Mixtral | 500+ tokens/s |
| **Qualidade** | Claude 3.5 Sonnet | Melhor raciocínio |
| **Custo** | Gemini Flash | $0.075/1M tokens |
| **Código** | DeepSeek Coder | Especializado |
| **Geral** | GPT-4o-mini | Equilibrado |

### Configuração Otimizada

```bash
# Para máxima velocidade
DEFAULT_LLM_PROVIDER=groq
BACKUP_LLM_PROVIDER=gemini
ENABLE_AUTO_FALLBACK=true

# Para máxima qualidade
DEFAULT_LLM_PROVIDER=claude
BACKUP_LLM_PROVIDER=openai

# Para mínimo custo
DEFAULT_LLM_PROVIDER=gemini
DEFAULT_MODEL=gemini-1.5-flash
```

---

## 📞 Suporte

### Documentação Completa
- 📖 **Guia de API Keys:** [`docs/API_KEYS_GUIDE.md`](docs/API_KEYS_GUIDE.md)
- 🔒 **Segurança:** [`docs/SECURITY_GUIDE.md`](docs/SECURITY_GUIDE.md)
- 🧪 **Testes:** [`docs/TESTING_GUIDE.md`](docs/TESTING_GUIDE.md)

### Contato
- 📧 **Email:** suporte@sistema-rag.com
- 💬 **Discord:** Sistema RAG Community
- 🐛 **Issues:** GitHub Issues

---

## 🔄 Atualizações

**Última atualização:** Janeiro 2025

### Changelog
- **v2.1** - Adicionado DeepSeek e melhorado Groq
- **v2.0** - Setup wizard interativo e scripts automatizados
- **v1.5** - Suporte a Gemini Flash e Claude 3.5 Sonnet
- **v1.0** - Sistema multi-LLM básico

---

*💡 **Dica:** Use `npm run setup-wizard` para uma configuração guiada completa!*