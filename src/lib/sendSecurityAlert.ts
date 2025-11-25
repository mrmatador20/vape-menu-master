import { supabase } from "@/integrations/supabase/client";

export interface SecurityAlertOptions {
  userId: string;
  email: string;
  userName: string;
  alertType: "suspicious_login" | "failed_auth" | "admin_action" | "password_change";
  phoneNumber?: string;
  eventDetails: {
    ipAddress?: string;
    location?: string;
    deviceInfo?: string;
    timestamp: string;
    attemptCount?: number;
    actionType?: string;
    actionDescription?: string;
  };
}

export async function sendSecurityAlert(options: SecurityAlertOptions): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke("send-security-alert", {
      body: options,
    });

    if (error) {
      console.error("Error sending security alert:", error);
      throw error;
    }

    console.log("Security alert sent successfully:", data);
  } catch (error) {
    console.error("Failed to send security alert:", error);
    throw error;
  }
}
