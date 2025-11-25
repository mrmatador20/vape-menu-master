import { supabase } from '@/integrations/supabase/client';

interface SendSecurityAlertOptions {
  userId: string;
  email: string;
  phone?: string;
  alertType: 'suspicious_login' | 'failed_login' | 'password_changed' | 'account_locked' | 'admin_action';
  metadata: {
    userName?: string;
    ipAddress?: string;
    location?: string;
    timestamp?: string;
    attemptCount?: number;
    lockDuration?: string;
    reason?: string;
    actionType?: string;
  };
}

export async function sendSecurityAlert(options: SendSecurityAlertOptions): Promise<void> {
  try {
    console.log('Sending security alert:', options.alertType);

    const { data, error } = await supabase.functions.invoke('send-security-alert', {
      body: options,
    });

    if (error) {
      console.error('Error sending security alert:', error);
      throw error;
    }

    console.log('Security alert sent successfully:', data);
  } catch (error) {
    console.error('Failed to send security alert:', error);
    // Don't throw - notifications are best-effort
  }
}

export async function sendFailedLoginAlert(
  userId: string,
  email: string,
  attemptCount: number,
  ipAddress?: string
) {
  const timestamp = new Date().toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  await sendSecurityAlert({
    userId,
    email,
    alertType: 'failed_login',
    metadata: {
      attemptCount,
      ipAddress: ipAddress || 'Desconhecido',
      timestamp,
    },
  });
}

export async function sendSuspiciousLoginAlert(
  userId: string,
  email: string,
  ipAddress?: string,
  location?: string
) {
  const timestamp = new Date().toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  await sendSecurityAlert({
    userId,
    email,
    alertType: 'suspicious_login',
    metadata: {
      ipAddress: ipAddress || 'Desconhecido',
      location,
      timestamp,
    },
  });
}

export async function sendPasswordChangedAlert(
  userId: string,
  email: string,
  userName?: string,
  ipAddress?: string
) {
  const timestamp = new Date().toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  await sendSecurityAlert({
    userId,
    email,
    alertType: 'password_changed',
    metadata: {
      userName,
      ipAddress: ipAddress || 'Desconhecido',
      timestamp,
    },
  });
}

export async function sendAccountLockedAlert(
  userId: string,
  email: string,
  lockDuration: string,
  reason: string
) {
  const timestamp = new Date().toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  await sendSecurityAlert({
    userId,
    email,
    alertType: 'account_locked',
    metadata: {
      lockDuration,
      reason,
      timestamp,
    },
  });
}
