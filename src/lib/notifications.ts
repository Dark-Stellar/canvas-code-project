import { supabase } from '@/integrations/supabase/client';

export async function scheduleNotifications(
  morningTime: string,
  eveningTime: string,
  notificationsEnabled: boolean
) {
  if (!notificationsEnabled) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return;

  const now = new Date();
  const [morningHour, morningMinute] = morningTime.split(':').map(Number);
  const [eveningHour, eveningMinute] = eveningTime.split(':').map(Number);

  const morningNotification = new Date();
  morningNotification.setHours(morningHour, morningMinute, 0, 0);

  const eveningNotification = new Date();
  eveningNotification.setHours(eveningHour, eveningMinute, 0, 0);

  // Schedule browser notifications
  const scheduleBrowserNotification = (time: Date, message: string, type: 'morning' | 'evening') => {
    const delay = time.getTime() - now.getTime();
    if (delay > 0) {
      setTimeout(async () => {
        // Browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Glow Reminder', {
            body: message,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
          });
        }

        // Send email notification
        try {
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-reminder`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ email: user.email, type }),
          });
          if (!response.ok) {
            console.error('Failed to send email reminder');
          }
        } catch (error) {
          console.error('Failed to send email reminder:', error);
        }
      }, delay);
    }
  };

  if (morningNotification > now) {
    scheduleBrowserNotification(
      morningNotification,
      'Plan your day! Set your tasks and weights.',
      'morning'
    );
  }

  if (eveningNotification > now) {
    scheduleBrowserNotification(
      eveningNotification,
      'Log your progress! Update your task completion.',
      'evening'
    );
  }
}
