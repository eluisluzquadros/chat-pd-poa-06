-- FASE 2: Automação de Segurança

-- Sprint 2.1: Trigger para validação automática pós-ataque
CREATE OR REPLACE FUNCTION public.auto_trigger_security_validation()
RETURNS TRIGGER AS $$
BEGIN
  -- Após detectar ataque crítico ou alto, notificar para executar validação
  IF NEW.severity IN ('critical', 'high') THEN
    PERFORM pg_notify(
      'run_security_validation',
      json_build_object(
        'alert_id', NEW.id,
        'alert_type', NEW.alert_type,
        'severity', NEW.severity,
        'triggered_at', NEW.triggered_at,
        'user_email', NEW.data->>'user_email',
        'session_id', NEW.data->>'session_id'
      )::text
    );
    
    RAISE NOTICE 'Validação de segurança automática agendada para alerta %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_validation ON intelligence_alerts;

CREATE TRIGGER trigger_auto_validation
AFTER INSERT ON intelligence_alerts
FOR EACH ROW
WHEN (NEW.severity IN ('critical', 'high'))
EXECUTE FUNCTION auto_trigger_security_validation();

-- Sprint 2.3: Função para notificar admins por email
CREATE OR REPLACE FUNCTION public.notify_admins_security_alert()
RETURNS TRIGGER AS $$
DECLARE
  admin_record RECORD;
  admin_count INTEGER := 0;
BEGIN
  -- Buscar todos os admins ativos
  FOR admin_record IN 
    SELECT DISTINCT ua.email, ua.full_name
    FROM user_accounts ua
    JOIN user_roles ur ON ua.user_id = ur.user_id
    WHERE ur.role = 'admin' 
      AND ua.is_active = true
      AND ua.email IS NOT NULL
  LOOP
    -- Notificar via pg_notify para edge function processar
    PERFORM pg_notify(
      'send_security_email',
      json_build_object(
        'to', admin_record.email,
        'to_name', admin_record.full_name,
        'alert_id', NEW.id,
        'alert_type', NEW.alert_type,
        'severity', NEW.severity,
        'title', NEW.title,
        'description', NEW.description,
        'triggered_at', NEW.triggered_at,
        'user_email', NEW.data->>'user_email',
        'session_id', NEW.data->>'session_id'
      )::text
    );
    
    admin_count := admin_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Notificação de segurança enviada para % administradores', admin_count;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_admins ON intelligence_alerts;

CREATE TRIGGER trigger_notify_admins
AFTER INSERT ON intelligence_alerts
FOR EACH ROW
WHEN (NEW.severity IN ('critical', 'high'))
EXECUTE FUNCTION notify_admins_security_alert();

-- Índices para melhorar performance de queries em tempo real
CREATE INDEX IF NOT EXISTS idx_intelligence_alerts_triggered_at
ON intelligence_alerts(triggered_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_roles_admin
ON user_roles(role) WHERE role = 'admin';