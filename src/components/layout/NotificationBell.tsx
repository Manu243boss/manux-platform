import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, ExternalLink, Sparkles, MessageSquare, Award, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  NotificationItem,
} from '../../services/notificationService';

export const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchNotes = async () => {
    if (!user) return;
    setLoading(true);
    const items = await getUserNotifications(user.id);
    setNotifications(items);
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchNotes();
      // Poll every 30s for real-time update
      const interval = setInterval(fetchNotes, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.is_read) {
      await markNotificationAsRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
    }
    setIsOpen(false);
    if (notif.link) {
      window.location.href = notif.link;
    }
  };

  const handleMarkAll = async () => {
    if (!user) return;
    await markAllNotificationsAsRead(user.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const getIconForType = (type: NotificationItem['type']) => {
    switch (type) {
      case 'comment':
      case 'reply':
        return <MessageSquare className="w-4 h-4 text-amber-500" />;
      case 'subscription':
        return <Award className="w-4 h-4 text-emerald-500" />;
      case 'view_milestone':
        return <Zap className="w-4 h-4 text-purple-500" />;
      case 'welcome':
        return <Sparkles className="w-4 h-4 text-amber-400" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  if (!user) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
        className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer border border-slate-200/70"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-slate-950 font-black text-[10px] rounded-full flex items-center justify-center shadow-xs animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-200 py-3 z-50 divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-4 pb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-extrabold text-slate-900 font-serif-heading">
                  Notifications ManuX
                </h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-black text-[10px] rounded-full">
                    {unreadCount} non lue(s)
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAll}
                  className="text-[11px] font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Tout marquer lu</span>
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
              {notifications.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs space-y-1">
                  <Bell className="w-6 h-6 mx-auto text-slate-300" />
                  <p className="font-bold text-slate-700">Aucune notification pour le moment.</p>
                  <p className="text-[11px] text-slate-400">
                    Vos alertes de commentaires, paiements et paliers de vues apparaîtront ici.
                  </p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3.5 transition-colors cursor-pointer flex items-start gap-3 text-xs ${
                      notif.is_read ? 'bg-white hover:bg-slate-50' : 'bg-amber-50/50 hover:bg-amber-50/80 font-semibold'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                      {getIconForType(notif.type)}
                    </div>
                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-slate-900 text-xs">
                          {notif.title}
                        </span>
                        {!notif.is_read && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        {notif.message}
                      </p>
                      <div className="text-[10px] text-slate-400 pt-1 flex items-center justify-between">
                        <span>
                          {new Date(notif.created_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {notif.link && (
                          <span className="text-amber-600 font-bold inline-flex items-center gap-0.5">
                            <span>Voir</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-4 pt-2.5 text-center">
              <span className="text-[10px] text-slate-400">
                Synchronisation automatique Chariow & ManuX Pulse
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
