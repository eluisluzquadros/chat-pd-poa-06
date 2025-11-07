-- Correção dos warnings de segurança: adicionar search_path às funções criadas
-- Dropar triggers primeiro, depois funções

DROP TRIGGER IF EXISTS trigger_auto_validation ON intelligence_alerts;
DROP TRIGGER IF EXISTS trigger_notify_admins ON intelligence_alerts;

DROP FUNCTION IF EXISTS public.auto_trigger_security_validation();
DROP FUNCTION IF EXISTS public.notify_admins_security_alert();

-- Recriar função com search_path seguro
CREATE OR REPLACE FUNCTION public.auto_trigger_security_validation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
$$;

-- Recriar função com search_path seguro
CREATE OR REPLACE FUNCTION public.notify_admins_security_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record RECORD;
  admin_count INTEGER := 0;
BEGIN
  FOR admin_record IN 
    SELECT DISTINCT ua.email, ua.full_name
    FROM user_accounts ua
    JOIN user_roles ur ON ua.user_id = ur.user_id
    WHERE ur.role = 'admin' 
      AND ua.is_active = true
      AND ua.email IS NOT NULL
  LOOP
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
$$;

-- Recriar triggers
CREATE TRIGGER trigger_auto_validation
AFTER INSERT ON intelligence_alerts
FOR EACH ROW
WHEN (NEW.severity IN ('critical', 'high'))
EXECUTE FUNCTION auto_trigger_security_validation();

CREATE TRIGGER trigger_notify_admins
AFTER INSERT ON intelligence_alerts
FOR EACH ROW
WHEN (NEW.severity IN ('critical', 'high'))
EXECUTE FUNCTION notify_admins_security_alert();