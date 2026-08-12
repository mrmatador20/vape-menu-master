import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  registerServiceWorker,
  requestNotificationPermission,
  subscribeToPushNotifications,
  isPushNotificationSupported,
  VAPID_PUBLIC_KEY,
} from '@/lib/pushNotifications';

export const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    setIsSupported(isPushNotificationSupported());
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!isSupported) {
      console.warn('[Push] Push notifications not supported');
      return false;
    }

    const newPermission = await requestNotificationPermission();
    setPermission(newPermission);
    return newPermission === 'granted';
  };

  const subscribe = async () => {
    if (!isSupported || Notification.permission !== 'granted') {
      console.warn('[Push] Cannot subscribe: not supported or permission denied');
      return false;
    }

    try {
      const registration = await registerServiceWorker();
      if (!registration) return false;

      const subscription = await subscribeToPushNotifications(registration, VAPID_PUBLIC_KEY);
      if (!subscription) return false;

      const json = subscription.toJSON() as {
        endpoint?: string;
        keys?: { p256dh?: string; auth?: string };
      };

      const { data: { user } } = await supabase.auth.getUser();
      if (user && json.endpoint && json.keys?.p256dh && json.keys?.auth) {
        await supabase.from('push_subscriptions').upsert(
          {
            user_id: user.id,
            endpoint: json.endpoint,
            p256dh: json.keys.p256dh,
            auth: json.keys.auth,
            user_agent: navigator.userAgent.slice(0, 300),
          },
          { onConflict: 'endpoint' },
        );
      }

      setIsSubscribed(true);
      console.log('[Push] Successfully subscribed to push notifications');
      return true;
    } catch (error) {
      console.error('[Push] Error subscribing:', error);
      return false;
    }
  };

  const enablePush = async () => {
    const granted = await requestPermission();
    if (!granted) return false;
    return await subscribe();
  };

  return {
    isSupported,
    permission,
    isSubscribed,
    requestPermission,
    subscribe,
    enablePush,
  };
};
