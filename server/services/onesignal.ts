export interface OneSignalNotificationPayload {
  playerId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  taskId?: string;
  priority?: 'urgent' | 'normal' | 'can_wait';
}

export async function sendOneSignalNotification(payload: OneSignalNotificationPayload): Promise<boolean> {
  const appId = process.env.ONESIGNAL_APP_ID;
  const restApiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!appId || !restApiKey) {
    console.warn('⚠️ OneSignal credentials nisu postavljeni - push notifikacije neće raditi!');
    return false;
  }

  try {
    const { playerId, title, body, data = {}, taskId, priority = 'normal' } = payload;

    const notification = {
      app_id: appId,
      include_player_ids: [playerId],
      headings: { en: title },
      contents: { en: body },
      data: {
        ...data,
        taskId: taskId || '',
        priority: priority,
        type: 'new_task',
      },
      android_sound: 'alert1',
      android_channel_id: 'reklamacije-alert',
      priority: 10,
    };

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${restApiKey}`,
      },
      body: JSON.stringify(notification),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OneSignal API error:', errorText);
      return false;
    }

    const result = await response.json();
    console.log('✅ OneSignal notifikacija uspešno poslata:', result);
    return true;

  } catch (error) {
    console.error('❌ Greška pri slanju OneSignal notifikacije:', error);
    return false;
  }
}

export async function sendOneSignalToUser(
  userId: string,
  title: string,
  body: string,
  taskId?: string,
  priority?: 'urgent' | 'normal' | 'can_wait'
): Promise<boolean> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: user, error } = await supabase
      .from('users')
      .select('onesignal_player_id')
      .eq('id', userId)
      .single();

    if (error || !user?.onesignal_player_id) {
      console.warn(`⚠️ User ${userId} nema registrovan OneSignal Player ID - preskačem slanje`);
      return false;
    }

    return await sendOneSignalNotification({
      playerId: user.onesignal_player_id,
      title,
      body,
      taskId,
      priority,
    });

  } catch (error) {
    console.error('❌ Greška pri slanju OneSignal notifikacije korisniku:', error);
    return false;
  }
}
