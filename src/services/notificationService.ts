import { supabase } from '../lib/supabase';

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'comment' | 'reply' | 'view_milestone' | 'welcome' | 'subscription' | 'system';
  link?: string;
  is_read: boolean;
  created_at: string;
}

export async function getUserNotifications(userId: string): Promise<NotificationItem[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      console.warn('[NotificationService] Fetch error:', error.message);
      return [];
    }

    // If user has no notifications yet, automatically seed useful initial onboarding notifications
    if (!data || data.length === 0) {
      const initialNotifications: Omit<NotificationItem, 'id' | 'created_at'>[] = [
        {
          user_id: userId,
          title: '🎉 Bienvenue sur ManuX !',
          message: 'Votre compte créateur est actif. Connectez votre boutique Chariow pour commencer à exposer vos produits.',
          type: 'welcome',
          link: '/dashboard/store',
          is_read: false,
        },
        {
          user_id: userId,
          title: '⚡ Boostez votre visibilité',
          message: 'Ajoutez une vidéo YouTube non répertoriée pour faire la démonstration concrète de votre produit.',
          type: 'system',
          link: '/dashboard/videos',
          is_read: false,
        },
      ];

      for (const item of initialNotifications) {
        await createNotification(item.user_id, item.title, item.message, item.type, item.link);
      }

      // Re-fetch created notifications
      const { data: refreshed } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30);

      return refreshed || [];
    }

    return data || [];
  } catch (err) {
    console.warn('[NotificationService] Fetch exception:', err);
    return [];
  }
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
  } catch (err) {
    console.warn('[NotificationService] Mark read error:', err);
  }
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  try {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
  } catch (err) {
    console.warn('[NotificationService] Mark all read error:', err);
  }
}

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: NotificationItem['type'],
  link?: string
): Promise<void> {
  try {
    await supabase.from('notifications').insert({
      user_id: userId,
      title,
      message,
      type,
      link,
      is_read: false,
    });
  } catch (err) {
    console.warn('[NotificationService] Create error:', err);
  }
}
