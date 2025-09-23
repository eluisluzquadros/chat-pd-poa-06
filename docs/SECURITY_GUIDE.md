# 🔒 Guia de Segurança - API Keys e Configurações

## 🚨 Regras Fundamentais de Segurança

### ⚠️ NUNCA FAÇA ISSO:
- ❌ Commitar API keys no Git
- ❌ Compartilhar keys em chats ou emails
- ❌ Usar keys de produção em desenvolvimento
- ❌ Armazenar keys em código-fonte
- ❌ Usar keys com permissões excessivas

### ✅ SEMPRE FAÇA ISSO:
- ✅ Use arquivos .env.local (ignorados pelo Git)
- ✅ Rotacione keys regularmente
- ✅ Configure rate limits apropriados
- ✅ Monitor uso e custos
- ✅ Use different keys para diferentes ambientes

---

## 🛡️ Configuração Segura

### 1. Estrutura de Arquivos

```
projeto/
├── .env.example          # Template público (sem valores reais)
├── .env.local           # Variáveis locais (NUNCA commitar)
├── .env.production      # Variáveis de produção (servidor apenas)
├── .gitignore          # Deve incluir .env.local
└── docs/               # Documentação
```

### 2. Gitignore Obrigatório

Certifique-se que seu `.gitignore` contém:

```gitignore
# Environment variables
.env.local
.env.production
.env.staging
.env*.local

# API Keys e Secrets
**/secrets/
**/*secret*
**/*key*
**/*token*

# Logs que podem conter dados sensíveis
logs/
*.log
npm-debug.log*

# Arquivos temporários
temp/
*.tmp
.cache/
```

### 3. Validação de Keys

Use nosso script para validar se keys estão expostas:

```bash
# Verificar se não há keys commitadas
npm run security-check

# Validar configuração atual
npm run validate-keys

# Audit de segurança
npm audit
```

---

## 🔐 Gestão de API Keys por Provider

### OpenAI
**Configurações de Segurança:**
- Limite de uso: $100/mês (recomendado para desenvolvimento)
- Rate limiting: 3500 requests/minuto
- Monitoring: Ativar alertas no dashboard

**Rotação:**
```bash
# 1. Gerar nova key no OpenAI Dashboard
# 2. Atualizar .env.local
OPENAI_API_KEY=sk-nova-key-aqui
# 3. Testar nova key
npm run test-llm-connections -- --provider openai
# 4. Revogar key antiga no dashboard
```

### Anthropic Claude
**Configurações de Segurança:**
- Limite de uso: $50/mês
- Rate limiting: 1000 requests/minuto
- IP restrictions: Configure no console

**Boas Práticas:**
- Use diferentes keys para diferentes projetos
- Monitor usage patterns
- Configure webhook alerts

### Google Gemini
**Configurações de Segurança:**
- API restrictions: Limite por referrer/IP
- Quotas: 1500 requests/minuto
- Billing alerts: $20/mês

**Duas Opções Seguras:**
1. **Google AI Studio** (desenvolvimento)
2. **Google Cloud** (produção com IAM)

### Groq
**Configurações de Segurança:**
- Rate limiting: 30000 requests/minuto
- Usage monitoring via dashboard
- Automatic scaling limits

### DeepSeek
**Configurações de Segurança:**
- Conservative rate limits
- Regular key rotation
- Monitor for unusual usage patterns

---

## 🔧 Configurações de Segurança do Sistema

### 1. Variáveis de Ambiente Seguras

```bash
# Criptografia das API keys
API_KEYS_ENCRYPTION_KEY=your-32-character-encryption-key-here

# JWT para autenticação interna
JWT_SECRET=your-super-secret-jwt-key-minimum-32-chars

# CORS - seja específico em produção
CORS_ORIGINS=https://your-domain.com,https://app.your-domain.com

# Rate limiting
MAX_REQUESTS_PER_MINUTE=100
MAX_DAILY_COST_USD=50.00

# Logging seguro (não loggar keys)
LOG_LEVEL=info
ENABLE_DEBUG_LOGS=false
```

### 2. Supabase Security

```bash
# RLS (Row Level Security) ativado
SUPABASE_ENABLE_RLS=true

# Service Role apenas para backend
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Anon key apenas para frontend
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Rate Limiting Inteligente

```typescript
// Configuração por provider
const RATE_LIMITS = {
  openai: { rpm: 3500, dailyCost: 30 },
  claude: { rpm: 1000, dailyCost: 20 },
  gemini: { rpm: 1500, dailyCost: 15 },
  groq: { rpm: 30000, dailyCost: 10 },
  deepseek: { rpm: 1000, dailyCost: 10 }
};
```

---

## 🚨 Monitoramento e Alertas

### 1. Sistema de Alertas

Configure alertas para:
- Uso anormal de API
- Custos acima do limite
- Tentativas de acesso não autorizadas
- Rate limits atingidos
- Erros de autenticação

### 2. Webhook de Segurança

```bash
# URL para receber alertas
SECURITY_WEBHOOK_URL=https://your-monitoring-service.com/alerts

# Tipos de alerta
ALERT_ON_HIGH_USAGE=true
ALERT_ON_COST_LIMIT=true
ALERT_ON_AUTH_FAILURES=true
```

### 3. Logs de Auditoria

```typescript
// Exemplo de log seguro (sem keys)
{
  "timestamp": "2025-01-31T10:00:00Z",
  "action": "api_call",
  "provider": "openai",
  "user_id": "user123",
  "cost": 0.002,
  "tokens": 150,
  "ip": "192.168.1.1",
  "success": true
  // API key NUNCA é logada
}
```

---

## 🔄 Rotação Automática de Keys

### Script de Rotação

```bash
#!/bin/bash
# rotate-keys.sh

echo "🔄 Iniciando rotação de API keys..."

# Backup das keys atuais
cp .env.local .env.backup.$(date +%Y%m%d)

# Validar keys atuais
npm run validate-keys

# Prompt para novas keys
echo "🔑 Configurar novas API keys:"
npm run setup-wizard

# Testar novas keys
echo "🧪 Testando novas configurações:"
npm run test-llm-connections

# Deploy para produção
echo "🚀 Deploying para Supabase:"
npm run deploy-env

echo "✅ Rotação concluída! Revogue as keys antigas nos dashboards."
```

### Agenda de Rotação

- **Desenvolvimento:** A cada 3 meses
- **Staging:** A cada 2 meses  
- **Produção:** A cada mês
- **Emergência:** Imediatamente se comprometida

---

## 🛠️ Ferramentas de Segurança

### 1. Detector de Secrets

```bash
# Instalar detector
npm install -g detect-secrets

# Scan no projeto
detect-secrets scan --all-files

# Audit findings
detect-secrets audit .secrets.baseline
```

### 2. Git Hooks de Segurança

Crie `.git/hooks/pre-commit`:

```bash
#!/bin/bash
# Verificar se não há secrets sendo commitados

if grep -r "sk-\|gsk_\|sk-ant-" --include="*.ts" --include="*.js" . ; then
    echo "❌ ERRO: API key detectada no código!"
    echo "💡 Use .env.local para armazenar keys"
    exit 1
fi

echo "✅ Nenhuma API key detectada no commit"
```

### 3. Scan de Vulnerabilidades

```bash
# NPM audit
npm audit --audit-level high

# Dependências vulneráveis
npm audit fix

# Security scan completo
npx audit-ci --high
```

---

## 🏥 Plano de Resposta a Incidentes

### Se uma API Key for Comprometida:

1. **IMEDIATO (0-5 minutos):**
   - 🚨 Revogar key comprometida no dashboard
   - 🔄 Gerar nova key
   - 📱 Notificar equipe

2. **CURTO PRAZO (5-30 minutos):**
   - 🔧 Atualizar .env.local
   - 🧪 Testar nova configuração
   - 🚀 Deploy de emergência

3. **MÉDIO PRAZO (30 minutos - 2 horas):**
   - 📊 Analisar logs de uso
   - 💰 Verificar custos anômalos
   - 🔍 Investigar origem do vazamento

4. **LONGO PRAZO (2+ horas):**
   - 📝 Documentar incidente
   - 🛡️ Melhorar procedimentos
   - 👥 Treinar equipe

### Contatos de Emergência

```bash
# Configurar notificações
EMERGENCY_WEBHOOK=https://your-incident-management.com/webhook
SECURITY_EMAIL=security@your-company.com
SLACK_SECURITY_CHANNEL=#security-alerts
```

---

## ✅ Checklist de Segurança

### Configuração Inicial
- [ ] .env.local criado e configurado
- [ ] .gitignore atualizado
- [ ] Git hooks instalados
- [ ] Rate limits configurados
- [ ] Monitoring ativado

### Operação Diária
- [ ] Logs de segurança revisados
- [ ] Custos monitorados
- [ ] Alertas verificados
- [ ] Backup das configurações

### Manutenção Mensal
- [ ] Rotação de keys executada
- [ ] Audit de segurança realizado
- [ ] Documentação atualizada
- [ ] Equipe treinada

### Revisão Trimestral
- [ ] Políticas de segurança revisadas
- [ ] Ferramentas atualizadas
- [ ] Procedimentos testados
- [ ] Compliance verificado

---

## 📞 Suporte e Recursos

### Links Úteis
- **OWASP API Security:** https://owasp.org/www-project-api-security/
- **NIST Cybersecurity Framework:** https://www.nist.gov/cyberframework
- **API Security Checklist:** https://github.com/shieldfy/API-Security-Checklist

### Ferramentas Recomendadas
- **1Password / Bitwarden:** Gestão de secrets
- **HashiCorp Vault:** Secrets management enterprise
- **AWS Secrets Manager:** Para deploy em AWS
- **Azure Key Vault:** Para deploy em Azure

---

*⚠️ LEMBRE-SE: Segurança é responsabilidade de todos. Quando em dúvida, seja mais restritivo.*