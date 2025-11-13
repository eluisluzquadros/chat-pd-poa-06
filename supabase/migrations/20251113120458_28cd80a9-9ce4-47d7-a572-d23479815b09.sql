-- Adicionar RLS policies para as novas tabelas

-- Security Notifications
ALTER TABLE security_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage security notifications"
ON security_notifications FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Service role can manage security notifications"
ON security_notifications FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Security Automation Configs
ALTER TABLE security_automation_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage automation configs"
ON security_automation_configs FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Supervisors can view automation configs"
ON security_automation_configs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'supervisor')
  )
);

-- Security Automation Logs
ALTER TABLE security_automation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view automation logs"
ON security_automation_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'supervisor')
  )
);

CREATE POLICY "Service role can manage automation logs"
ON security_automation_logs FOR ALL
TO service_role
USING (true)
WITH CHECK (true);