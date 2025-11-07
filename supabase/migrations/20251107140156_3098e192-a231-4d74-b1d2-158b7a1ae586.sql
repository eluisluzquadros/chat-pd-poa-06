-- ====================================
-- FASE 1: Sistema de Alertas de Segurança Automático
-- ====================================

-- Função para detectar ameaças de segurança automaticamente
CREATE OR REPLACE FUNCTION public.detect_security_threats()
RETURNS TRIGGER AS $$
DECLARE
  v_session_user_id UUID;
  v_user_email TEXT;
  v_user_full_name TEXT;
BEGIN
  -- Buscar informações do usuário da sessão
  SELECT cs.user_id, ua.email, ua.full_name
  INTO v_session_user_id, v_user_email, v_user_full_name
  FROM chat_sessions cs
  LEFT JOIN user_accounts ua ON ua.user_id = cs.user_id
  WHERE cs.id = NEW.session_id;
  
  -- Detectar tentativa de prompt injection
  IF NEW.sentiment = 'negative' 
     AND (NEW.keywords IS NULL OR array_length(NEW.keywords, 1) = 0)
     AND (
       LOWER(NEW.user_message) LIKE '%system%prompt%' OR
       LOWER(NEW.user_message) LIKE '%ignore%instruction%' OR
       LOWER(NEW.user_message) LIKE '%database%' OR
       LOWER(NEW.user_message) LIKE '%reiniciar%instruç%' OR
       LOWER(NEW.user_message) LIKE '%acesso%irrestrito%' OR
       LOWER(NEW.user_message) LIKE '%[system%' OR
       LOWER(NEW.user_message) LIKE '%override%' OR
       LOWER(NEW.user_message) LIKE '%bypass%security%'
     ) THEN
    
    -- Inserir alerta crítico
    INSERT INTO intelligence_alerts (
      alert_type,
      severity,
      title,
      description,
      data,
      triggered_at
    ) VALUES (
      'prompt_injection_attempt',
      'critical',
      'Tentativa de Prompt Injection Detectada',
      'Usuário ' || COALESCE(v_user_email, 'desconhecido') || ' tentou manipular instruções do sistema através de prompt injection',
      jsonb_build_object(
        'session_id', NEW.session_id,
        'user_id', v_session_user_id,
        'user_email', v_user_email,
        'user_full_name', v_user_full_name,
        'user_message', LEFT(NEW.user_message, 500),
        'sentiment', NEW.sentiment,
        'keywords', NEW.keywords,
        'detected_at', NEW.created_at,
        'attack_type', 'prompt_injection',
        'technique', 'System Prompt Override',
        'threat_level', 'high'
      ),
      NEW.created_at
    );
    
    -- Desativar usuário automaticamente se identificado
    IF v_session_user_id IS NOT NULL THEN
      UPDATE user_accounts
      SET 
        is_active = false,
        updated_at = NOW()
      WHERE user_id = v_session_user_id;
      
      RAISE NOTICE 'Usuário % desativado automaticamente por tentativa de ataque', v_user_email;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para monitorar message_insights
DROP TRIGGER IF EXISTS trigger_security_threats ON message_insights;

CREATE TRIGGER trigger_security_threats
AFTER INSERT ON message_insights
FOR EACH ROW
EXECUTE FUNCTION detect_security_threats();

-- Índice para melhorar performance de consultas de alertas
CREATE INDEX IF NOT EXISTS idx_intelligence_alerts_severity 
ON intelligence_alerts(severity, triggered_at DESC);

CREATE INDEX IF NOT EXISTS idx_intelligence_alerts_type 
ON intelligence_alerts(alert_type, triggered_at DESC);

-- Comentários para documentação
COMMENT ON FUNCTION detect_security_threats() IS 
'Detecta automaticamente tentativas de prompt injection e outras ameaças de segurança. Gera alertas críticos e desativa usuários maliciosos automaticamente.';

COMMENT ON TRIGGER trigger_security_threats ON message_insights IS 
'Monitora todas as mensagens inseridas para detectar padrões de ataque em tempo real.';