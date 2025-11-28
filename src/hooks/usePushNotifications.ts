import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  registerServiceWorker, 
  requestNotificationPermission, 
  subscribeToPushNotifications,
  isPushNotificationSupported 
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
    if (!isSupported || permission !== 'granted') {
      console.warn('[Push] Cannot subscribe: not supported or permission denied');
      return false;
    }

    try {
      const registration = await registerServiceWorker();
      if (!registration) {
        console.error('[Push] No service worker registration');
        return false;
      }

      // For now, we'll use a placeholder VAPID key
      // In production, you would need to generate proper VAPID keys
      const vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
      
      const subscription = await subscribeToPushNotifications(registration, vapidPublicKey);
      
      if (subscription) {
        // Store subscription in database
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('user_activity_logs')
            .insert([{
              user_id: user.id,
              activity_type: 'push_subscription_created',
              metadata: JSON.parse(JSON.stringify({
                subscription: subscription.toJSON(),
              })),
            }]);
        }
        
        setIsSubscribed(true);
        console.log('[Push] Successfully subscribed to push notifications');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[Push] Error subscribing:', error);
      return false;
    }
  };

  return {
    isSupported,
    permission,
    isSubscribed,
    requestPermission,
    subscribe,
  };
};
