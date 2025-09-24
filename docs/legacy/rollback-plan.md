# 🔄 Plano de Rollback - Edge Functions

## 📋 Visão Geral

Este plano descreve os procedimentos para fazer rollback das Edge Functions em caso de problemas críticos após o deploy.

## 🚨 Situações que Requerem Rollback

### Críticas (Rollback Imediato)
- Functions retornando erro 500 consistentemente
- Timeout em todas as requests (> 30 segundos)
- Database corruption ou data loss
- Security vulnerabilities descobertas
- Complete function unavailability

### Altas (Rollback em 1-2 horas)
- Performance degradation significativa (> 50% slower)
- Erro rate > 10%
- Specific features não funcionando
- API external integration failures

### Médias (Rollback em 4-8 horas)
- Minor bugs affecting user experience
- Logging issues
- Non-critical feature failures
- UI/UX issues

## 🛠️ Métodos de Rollback

### 1. Rollback por Re-deploy da Versão Anterior

#### Preparação (Faça ANTES do deploy)
```bash
# Criar backup das functions atuais
mkdir -p backups/$(date +%Y%m%d_%H%M%S)
cp -r supabase/functions/ backups/$(date +%Y%m%d_%H%M%S)/

# Fazer commit do estado atual
git add -A
git commit -m "Pre-deploy backup - $(date)"
git tag "pre-deploy-$(date +%Y%m%d_%H%M%S)"
```

#### Rollback Process
```bash
# 1. Identificar última versão estável
git log --oneline -10

# 2. Fazer checkout da versão estável
git checkout <STABLE_COMMIT_HASH>

# 3. Re-deploy das functions críticas primeiro
npx supabase functions deploy feedback-processor --project-ref ngrqwmvuhvjkeohesbxs
npx supabase functions deploy gap-detector --project-ref ngrqwmvuhvjkeohesbxs
npx supabase functions deploy knowledge-updater --project-ref ngrqwmvuhvjkeohesbxs
npx supabase functions deploy enhanced-vector-search --project-ref ngrqwmvuhvjkeohesbxs

# 4. Testar functions críticas
curl -X OPTIONS https://ngrqwmvuhvjkeohesbxs.supabase.co/functions/v1/feedback-processor
curl -X OPTIONS https://ngrqwmvuhvjkeohesbxs.supabase.co/functions/v1/gap-detector

# 5. Deploy das demais functions se críticas estiverem OK
node deploy-all-functions.mjs
```

### 2. Rollback Seletivo (Function por Function)

```bash
# Rollback de function específica
git show HEAD~1:supabase/functions/feedback-processor/index.ts > temp_rollback.ts
cp temp_rollback.ts supabase/functions/feedback-processor/index.ts
npx supabase functions deploy feedback-processor --project-ref ngrqwmvuhvjkeohesbxs

# Verificar rollback
curl -X OPTIONS https://ngrqwmvuhvjkeohesbxs.supabase.co/functions/v1/feedback-processor
```

### 3. Rollback de Configuração

```bash
# Rollback do config.toml
git checkout HEAD~1 -- supabase/config.toml

# Rollback de environment variables
npx supabase secrets unset PROBLEMATIC_VARIABLE --project-ref ngrqwmvuhvjkeohesbxs
npx supabase secrets set VARIABLE_NAME="OLD_VALUE" --project-ref ngrqwmvuhvjkeohesbxs
```

### 4. Emergency Function Disable

```bash
# Desabilitar function temporariamente (se possível via config)
# Ou deploy de function que retorna erro controlado

# Criar function de manutenção
cat > supabase/functions/maintenance-mode/index.ts << 'EOF'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(() => {
  return new Response(JSON.stringify({
    error: "Function temporarily unavailable for maintenance",
    status: "maintenance_mode",
    retry_after: "2023-XX-XX 12:00:00"
  }), {
    status: 503,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': '3600'
    }
  })
})
EOF

# Deploy da function de manutenção com o nome da function problemática
npx supabase functions deploy maintenance-mode --project-ref ngrqwmvuhvjkeohesbxs
```

## 📊 Scripts de Rollback Automatizados

### Script de Rollback Completo
```bash
#!/bin/bash
# rollback-complete.sh

echo "🔄 Iniciando rollback completo..."

# Verificar se há backup disponível
if [ ! -d "backups" ]; then
    echo "❌ Nenhum backup encontrado!"
    exit 1
fi

# Encontrar backup mais recente
LATEST_BACKUP=$(ls -t backups/ | head -n1)
echo "📦 Usando backup: $LATEST_BACKUP"

# Restaurar functions
cp -r "backups/$LATEST_BACKUP/functions/"* supabase/functions/

# Re-deploy
echo "🚀 Re-deployando functions..."
node deploy-all-functions.mjs

echo "✅ Rollback completo concluído"
```

### Script de Rollback Seletivo
```bash
#!/bin/bash
# rollback-function.sh

FUNCTION_NAME=$1
COMMITS_BACK=${2:-1}

if [ -z "$FUNCTION_NAME" ]; then
    echo "Usage: ./rollback-function.sh <function-name> [commits-back]"
    exit 1
fi

echo "🔄 Rolling back $FUNCTION_NAME to $COMMITS_BACK commits ago..."

# Extrair versão anterior
git show HEAD~$COMMITS_BACK:supabase/functions/$FUNCTION_NAME/index.ts > temp_rollback.ts

# Verificar se arquivo existe
if [ ! -s temp_rollback.ts ]; then
    echo "❌ Function não encontrada no commit especificado"
    rm temp_rollback.ts
    exit 1
fi

# Aplicar rollback
cp temp_rollback.ts supabase/functions/$FUNCTION_NAME/index.ts
rm temp_rollback.ts

# Re-deploy
npx supabase functions deploy $FUNCTION_NAME --project-ref ngrqwmvuhvjkeohesbxs

echo "✅ Rollback de $FUNCTION_NAME concluído"
```

## 🧪 Verificação Pós-Rollback

### Checklist de Verificação
- [ ] Functions críticas respondem (status 200/204)
- [ ] Logs não mostram erros críticos
- [ ] Database connections funcionando
- [ ] External APIs responding
- [ ] Performance metrics restored
- [ ] User authentication working
- [ ] Frontend integration working

### Script de Verificação
```bash
#!/bin/bash
# verify-rollback.sh

echo "🔍 Verificando rollback..."

FUNCTIONS=(
    "feedback-processor"
    "gap-detector" 
    "knowledge-updater"
    "enhanced-vector-search"
    "response-synthesizer"
)

FAILURES=0

for func in "${FUNCTIONS[@]}"; do
    echo "Testing $func..."
    
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS \
        https://ngrqwmvuhvjkeohesbxs.supabase.co/functions/v1/$func)
    
    if [ "$STATUS" -eq 200 ] || [ "$STATUS" -eq 204 ]; then
        echo "✅ $func: OK ($STATUS)"
    else
        echo "❌ $func: FAIL ($STATUS)"
        FAILURES=$((FAILURES + 1))
    fi
done

if [ $FAILURES -eq 0 ]; then
    echo "🎉 Todas as functions estão funcionando!"
    exit 0
else
    echo "💥 $FAILURES functions com problema!"
    exit 1
fi
```

## 📝 Comunicação Durante Rollback

### Equipe Interna
```markdown
🚨 ROLLBACK EM ANDAMENTO

**Horário**: $(date)
**Causa**: [Descrever problema]
**ETA**: [Tempo estimado]
**Status**: [Em andamento/Concluído]

**Functions Afetadas**:
- feedback-processor: [status]
- gap-detector: [status]
- knowledge-updater: [status]

**Próximos Passos**:
1. [Ação 1]
2. [Ação 2]
```

### Usuários (se necessário)
```markdown
⚠️ MANUTENÇÃO TEMPORÁRIA

Estamos realizando uma manutenção de emergência em alguns recursos do sistema.

**Serviços Afetados**: [Lista]
**Duração Estimada**: [Tempo]
**Status**: Solucionando

Atualizações em: [Canal/URL]
```

## 🎯 Prevenção de Problemas Futuros

### Antes de Cada Deploy
1. **Backup completo** das functions atuais
2. **Tag git** da versão estável
3. **Testes em ambiente staging**
4. **Plano de rollback específico** para as mudanças
5. **Horário de deploy** em low-traffic period

### Monitoramento Contínuo
1. **Alerts** para error rates > 5%
2. **Performance monitoring** para response times
3. **Health checks** automáticos a cada 5 minutos
4. **Log aggregation** para identificar padrões
5. **User feedback** monitoring

### Processo de Deploy Mais Seguro
1. **Blue-green deployment** (se possível)
2. **Canary releases** para functions críticas
3. **Feature flags** para rollback rápido
4. **Automated testing** em CI/CD
5. **Review process** obrigatório

## 📞 Contatos de Emergência

### Equipe Técnica
- **DevOps Lead**: [Contato]
- **Backend Lead**: [Contato]
- **Database Admin**: [Contato]

### Suporte Externo
- **Supabase Support**: https://supabase.com/support
- **OpenAI Support**: https://help.openai.com/
- **Google Cloud Support**: [Se aplicável]

## 📊 Post-Mortem Template

```markdown
# Post-Mortem: Rollback [Data]

## Resumo
**Problema**: [Descrição breve]
**Duração**: [Tempo total]
**Impacto**: [Usuários/functions afetadas]

## Timeline
- HH:MM - Problema detectado
- HH:MM - Rollback iniciado
- HH:MM - Functions críticas restauradas
- HH:MM - Rollback completo
- HH:MM - Verificação concluída

## Causa Raiz
[Análise detalhada]

## Ações Preventivas
1. [Ação 1]
2. [Ação 2]
3. [Ação 3]

## Lições Aprendidas
[Insights para próximos deploys]
```

---

## ⚡ Comandos Rápidos para Emergência

```bash
# Rollback completo das últimas changes
git reset --hard HEAD~1
node deploy-all-functions.mjs

# Desabilitar function específica  
echo 'export default () => new Response("Maintenance", {status: 503})' > supabase/functions/FUNCTION_NAME/index.ts
npx supabase functions deploy FUNCTION_NAME --project-ref ngrqwmvuhvjkeohesbxs

# Verificar status de todas as functions
for f in feedback-processor gap-detector knowledge-updater; do
  curl -s -o /dev/null -w "$f: %{http_code}\n" -X OPTIONS https://ngrqwmvuhvjkeohesbxs.supabase.co/functions/v1/$f
done
```