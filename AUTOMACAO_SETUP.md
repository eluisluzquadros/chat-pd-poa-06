# 🔧 Configuração da Automação de Segurança

## ✅ Status de Implementação

### PRIORIDADE 1 - FASE 3 (Automação) - COMPLETA ✅
- ✅ Edge Function `security-automation-scheduler` criada
- ✅ Componente `AutomationConfigDialog` implementado
- ✅ Componente `AutomationHistoryTable` implementado
- ✅ Integração em `SecurityValidation.tsx` e `SecurityMonitoringPanel.tsx`
- ⚠️ **Cron Job precisa ser configurado manualmente** (veja abaixo)

### PRIORIDADE 3 - FASE 4 (Notificações) - COMPLETA ✅
- ✅ Notificações integradas em `security-validator`
- ✅ Templates de email HTML responsivos
- ✅ Suporte a `simulation`, `incident` e `weekly_report`
- ✅ Relatórios semanais automatizados (segundas-feiras 9h)

---

## 📋 Configuração Manual do Cron Job

### Passo 1: Acessar o SQL Editor do Supabase

Acesse: https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/sql/new

### Passo 2: Habilitar Extensões

Execute o seguinte SQL:

```sql
-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
```

### Passo 3: Criar o Cron Job

Execute o seguinte SQL para criar um job que roda **a cada hora**:

```sql
-- Agendar execução automática a cada hora
SELECT cron.schedule(
  'security-automation-scheduler',
  '0 * * * *', -- A cada hora no minuto 0
  $$
  SELECT net.http_post(
    url:='https://ngrqwmvuhvjkeohesbxs.supabase.co/functions/v1/security-automation-scheduler',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MDkwMTcsImV4cCI6MjA2OTE4NTAxN30.K3uyyzjyAQ17ohQGCUFx_RiMufblLyQzvxEZHakqKrg"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);
```

### Passo 4: Verificar o Cron Job

Para verificar se o cron job foi criado corretamente:

```sql
SELECT * FROM cron.job WHERE jobname = 'security-automation-scheduler';
```

### Passo 5 (Opcional): Remover o Cron Job

Se precisar remover o cron job:

```sql
SELECT cron.unschedule('security-automation-scheduler');
```

---

## 🎯 Como Funciona

### Fluxo de Automação

1. **A cada hora**, o cron job invoca `security-automation-scheduler`
2. O scheduler verifica todas as configurações ativas em `security_automation_configs`
3. Para cada configuração:
   - Verifica se está na hora agendada (`schedule_time`, `schedule_days`)
   - Se sim, executa:
     - **Simulação** → Invoca `security-validator`
     - **Monitoramento** → Invoca `process-historical-threats`
4. Registra a execução em `security_automation_logs`
5. Envia notificações por email (se configurado)

### Relatórios Semanais

- Enviados automaticamente **toda segunda-feira às 9h**
- Contém resumo da semana:
  - Total de alertas
  - Alertas críticos
  - Relatórios gerados
- Destinatários: Admins e Supervisores ativos

---

## 📧 Tipos de Notificações

### 1. Incidentes (`incident`)
- Enviado quando um ciberataque é detectado
- Severidade: Critical/High
- Inclui dados do atacante e recomendações

### 2. Simulações (`simulation`)
- Enviado ao concluir uma simulação de segurança
- Mostra estatísticas: total, aprovados, falhados, taxa de sucesso

### 3. Relatórios Semanais (`weekly_report`)
- Enviado automaticamente segunda-feira 9h
- Resumo semanal de segurança

---

## 🔍 Monitoramento

### Verificar Logs de Automação

```sql
SELECT 
  l.*,
  c.config_name,
  c.config_type
FROM security_automation_logs l
JOIN security_automation_configs c ON c.id = l.config_id
ORDER BY l.started_at DESC
LIMIT 20;
```

### Ver Configurações Ativas

```sql
SELECT * FROM security_automation_configs
WHERE is_enabled = true
ORDER BY next_run_at;
```

### Notificações Enviadas

```sql
SELECT * FROM security_notifications
ORDER BY sent_at DESC
LIMIT 20;
```

---

## 🐛 Troubleshooting

### Automação não está executando

1. Verificar se o cron job está ativo:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'security-automation-scheduler';
   ```

2. Ver logs da edge function:
   - Acesse: https://supabase.com/dashboard/project/ngrqwmvuhvjkeohesbxs/functions/security-automation-scheduler/logs

3. Verificar configurações:
   ```sql
   SELECT * FROM security_automation_configs WHERE is_enabled = true;
   ```

### Notificações não estão sendo enviadas

1. Verificar se `email_notifications = true` na configuração
2. Verificar logs da edge function `send-security-notification`
3. Verificar RESEND_API_KEY configurada

---

## ✅ Próximos Passos

1. Execute o SQL acima para configurar o cron job
2. Crie configurações de automação via UI:
   - **Simulações**: `/admin/settings` → Botão "⚙️ Configurar Automação"
   - **Monitoramento**: `/admin/intelligence` → Botão "⚙️ Configurar Automação"
3. Monitore os logs em `AutomationHistoryTable`
4. Aguarde o relatório semanal na segunda-feira às 9h

---

## 📊 Métricas de Sucesso

- ✅ Simulações executadas automaticamente sem intervenção manual
- ✅ Incidentes de segurança detectados e reportados em tempo real
- ✅ Relatórios semanais enviados pontualmente
- ✅ Taxa de sucesso das simulações > 95%
- ✅ Tempo médio de resposta < 2 horas para incidentes críticos
