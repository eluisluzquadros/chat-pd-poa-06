# 🔑 Guia Completo de API Keys - Sistema RAG Multi-LLM

## 📋 Visão Geral

Este guia fornece instruções detalhadas para obter e configurar todas as API keys necessárias para o sistema RAG Multi-LLM do Porto de Outono.

## 🚀 Configuração Rápida

1. **Copie o template de configuração:**
   ```bash
   cp .env.example .env.local
   ```

2. **Execute o script de validação:**
   ```bash
   npm run validate-keys
   ```

3. **Deploy no Supabase:**
   ```bash
   npm run deploy-env
   ```

## 🎯 API Keys Necessárias

### 1. 🤖 OpenAI (GPT-4, GPT-4.5, Embeddings)

**Como obter:**
1. Acesse: https://platform.openai.com/
2. Faça login ou crie uma conta
3. Vá para [API Keys](https://platform.openai.com/api-keys)
4. Clique em "Create new secret key"
5. Copie a key que começa com `sk-`

**Variáveis necessárias:**
```bash
OPENAI_API_KEY=sk-your-key-here
OPENAI_ORG_ID=org-your-org-id  # (opcional)
```

**Modelos disponíveis:**
- `gpt-4o-mini` (padrão, mais barato)
- `gpt-4-turbo-preview` (mais capaz)
- `gpt-4.5-turbo` (mais recente)
- `text-embedding-3-large` (embeddings)

**Custos aproximados:**
- GPT-4o-mini: $0.15/1M tokens input, $0.60/1M tokens output
- GPT-4 Turbo: $10/1M tokens input, $30/1M tokens output

---

### 2. 🧠 Anthropic Claude (Opus, Sonnet, Haiku)

**Como obter:**
1. Acesse: https://console.anthropic.com/
2. Crie uma conta Anthropic
3. Vá para [API Keys](https://console.anthropic.com/settings/keys)
4. Clique em "Create Key"
5. Copie a key que começa com `sk-ant-`

**Variáveis necessárias:**
```bash
CLAUDE_API_KEY=sk-ant-your-key-here
ANTHROPIC_API_KEY=sk-ant-your-key-here  # (alias)
```

**Modelos disponíveis:**
- `claude-3-haiku-20240307` (mais rápido, barato)
- `claude-3-5-sonnet-20241022` (equilibrado)
- `claude-3-opus-20240229` (mais capaz)

**Custos aproximados:**
- Haiku: $0.25/1M tokens input, $1.25/1M tokens output
- Sonnet: $3/1M tokens input, $15/1M tokens output
- Opus: $15/1M tokens input, $75/1M tokens output

---

### 3. 🌟 Google Gemini (Pro, Flash, Vision)

**Como obter:**
1. **Opção A - Google AI Studio (Recomendado para desenvolvimento):**
   - Acesse: https://makersuite.google.com/app/apikey
   - Faça login com conta Google
   - Clique em "Create API Key"
   - Copie a key gerada

2. **Opção B - Google Cloud Platform (Para produção):**
   - Acesse: https://cloud.google.com/
   - Crie um projeto no GCP
   - Ative a Vertex AI API
   - Crie uma Service Account
   - Baixe o arquivo JSON de credenciais

**Variáveis necessárias:**
```bash
# Opção A - Google AI Studio
GEMINI_API_KEY=your-key-here
GOOGLE_AI_API_KEY=your-key-here  # (alias)

# Opção B - Google Cloud
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=./config/google-service-account.json
```

**Modelos disponíveis:**
- `gemini-1.5-flash` (mais rápido, barato)
- `gemini-1.5-pro` (equilibrado)
- `gemini-1.5-pro-vision` (com visão)

**Custos aproximados:**
- Flash: $0.075/1M tokens input, $0.30/1M tokens output
- Pro: $1.25/1M tokens input, $5/1M tokens output

---

### 4. ⚡ Groq (Ultra-Fast Inference)

**Como obter:**
1. Acesse: https://console.groq.com/
2. Crie uma conta Groq
3. Vá para [API Keys](https://console.groq.com/keys)
4. Clique em "Create API Key"
5. Copie a key que começa com `gsk_`

**Variáveis necessárias:**
```bash
GROQ_API_KEY=gsk_your-key-here
```

**Modelos disponíveis:**
- `mixtral-8x7b-32768` (Mixtral, muito rápido)
- `llama3.1-70b-versatile` (Llama 3.1, equilibrado)
- `llama3.1-8b-instant` (mais rápido)

**Vantagens:**
- ⚡ Inferência ultra-rápida (500+ tokens/s)
- 💰 Preços competitivos
- 🆓 Tier gratuito generoso

---

### 5. 💻 DeepSeek (Especialista em Código)

**Como obter:**
1. Acesse: https://platform.deepseek.com/
2. Crie uma conta DeepSeek
3. Vá para [API Keys](https://platform.deepseek.com/api_keys)
4. Clique em "Create new key"
5. Copie a key que começa com `sk-`

**Variáveis necessárias:**
```bash
DEEPSEEK_API_KEY=sk-your-key-here
```

**Modelos disponíveis:**
- `deepseek-coder` (especialista em código)
- `deepseek-chat` (conversação geral)

**Vantagens:**
- 🔥 Excelente para programação
- 💰 Preços muito baixos
- 🚀 Performance competitiva

---

### 6. 🦙 Meta Llama (Open Source)

**Opções de acesso:**

#### A. Hugging Face (Recomendado)
1. Acesse: https://huggingface.co/
2. Crie uma conta
3. Vá para [Settings > Access Tokens](https://huggingface.co/settings/tokens)
4. Clique em "New token"
5. Copie o token que começa com `hf_`

#### B. Replicate (API Hospedada)
1. Acesse: https://replicate.com/
2. Crie uma conta
3. Vá para [Account Settings](https://replicate.com/account/api-tokens)
4. Copie seu API token que começa com `r8_`

#### C. Ollama (Local)
1. Instale Ollama: https://ollama.ai/
2. Execute: `ollama pull llama3.1:8b`
3. Inicie o servidor: `ollama serve`

**Variáveis necessárias:**
```bash
# Hugging Face
HUGGINGFACE_API_TOKEN=hf_your-token-here

# Replicate
REPLICATE_API_TOKEN=r8_your-token-here

# Ollama (local)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODELS=llama3.1:8b,codellama:13b
```

---

## 🔧 Scripts de Configuração

### 1. Validação de API Keys

```bash
# Instalar dependências
npm install

# Validar todas as keys
npm run validate-keys

# Validar provider específico
npm run validate-keys -- --provider openai
```

### 2. Deploy no Supabase

```bash
# Deploy todas as variáveis
npm run deploy-env

# Deploy provider específico
npm run deploy-env -- --provider claude
```

### 3. Teste de Conectividade

```bash
# Testar todos os provedores
npm run test-llm-connections

# Testar provider específico
npm run test-llm-connections -- --provider gemini
```

---

## 💰 Gestão de Custos

### Limites Recomendados

```bash
# Custos diários (USD)
MAX_DAILY_COST_USD=50.00

# Rate limits (requests/minuto)
OPENAI_RATE_LIMIT=3500
CLAUDE_RATE_LIMIT=1000
GEMINI_RATE_LIMIT=1500
GROQ_RATE_LIMIT=30000
```

### Monitoramento

- 📊 Dashboard de métricas no sistema
- 📧 Alertas automáticos por email/webhook
- 📈 Relatórios de uso por provider
- 💸 Controle de gastos em tempo real

---

## 🔒 Segurança

### ✅ Boas Práticas

1. **Nunca commite API keys no git**
2. **Use .env.local (ignorado pelo git)**
3. **Rotacione keys regularmente**
4. **Configure rate limits apropriados**
5. **Use diferentes keys para dev/prod**

### 🛡️ Configurações de Segurança

```bash
# Criptografia das keys
API_KEYS_ENCRYPTION_KEY=your-32-char-encryption-key

# JWT para autenticação
JWT_SECRET=your-super-secret-jwt-key

# CORS para APIs
CORS_ORIGINS=http://localhost:3000,https://your-domain.com
```

---

## 🚨 Troubleshooting

### Erros Comuns

1. **"API key not found"**
   - Verifique se a key está no .env.local
   - Reinicie o servidor após adicionar keys

2. **"Rate limit exceeded"**
   - Aguarde alguns minutos
   - Ajuste os rate limits no .env

3. **"Invalid API key"**
   - Verifique se copiou a key completa
   - Confirme se a key não expirou

4. **"Model not found"**
   - Verifique se o modelo está disponível
   - Confirme se tem acesso ao modelo

### Logs de Debug

```bash
# Ativar logs detalhados
DEBUG_MODE=true
LOG_LEVEL=debug

# Ver logs em tempo real
npm run logs:follow
```

---

## 📞 Suporte

### Links Úteis

- **OpenAI Help:** https://help.openai.com/
- **Anthropic Docs:** https://docs.anthropic.com/
- **Google AI Docs:** https://ai.google.dev/docs
- **Groq Docs:** https://console.groq.com/docs
- **DeepSeek Docs:** https://platform.deepseek.com/docs

### Contato

- 📧 Email: suporte@sistema-rag.com
- 💬 Discord: Sistema RAG Community
- 📚 Docs: https://docs.sistema-rag.com

---

## 🔄 Atualizações

Este guia é atualizado regularmente. Última atualização: **Janeiro 2025**

### Changelog

- **v1.3** - Adicionado suporte GPT-4.5 e Gemini Flash
- **v1.2** - Melhorado sistema de fallback
- **v1.1** - Adicionado DeepSeek e Groq
- **v1.0** - Versão inicial

---

*💡 Dica: Use o comando `npm run setup-wizard` para configuração interativa guiada!*