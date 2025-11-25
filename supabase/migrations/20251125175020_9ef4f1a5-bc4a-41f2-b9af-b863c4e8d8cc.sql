-- Adicionar políticas RLS mais restritivas para notification_preferences
-- Apenas admins devem poder gerenciar preferências de notificação

-- Remover políticas existentes
DROP POLICY IF EXISTS "Users can insert their own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can update their own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can view their own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Admins can view all preferences" ON notification_preferences;

-- Criar novas políticas apenas para admins
CREATE POLICY "Only admins can view notification preferences"
  ON notification_preferences
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can insert notification preferences"
  ON notification_preferences
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update notification preferences"
  ON notification_preferences
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Service role precisa acessar para criar preferências padrão via edge function
CREATE POLICY "Service role can manage notification preferences"
  ON notification_preferences
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Atualizar políticas de security_notification_logs para ser apenas admin
DROP POLICY IF EXISTS "Users can view their own notification logs" ON security_notification_logs;
DROP POLICY IF EXISTS "Admins can view all notification logs" ON security_notification_logs;

CREATE POLICY "Only admins can view notification logs"
  ON security_notification_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));