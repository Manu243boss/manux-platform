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
