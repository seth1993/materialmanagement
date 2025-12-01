'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { NotificationService } from '@/lib/notification-service';
import { Notification, NotificationStats } from '@/types/notification';

export const useNotifications = (limitCount: number = 20) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats>({ total: 0, unread: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setStats({ total: 0, unread: 0 });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Subscribe to real-time notifications
    const unsubscribeNotifications = NotificationService.subscribeToUserNotifications(
      user.uid,
      (newNotifications) => {
        setNotifications(newNotifications);
        setLoading(false);
      },
      limitCount
    );

    // Subscribe to real-time stats
    const unsubscribeStats = NotificationService.subscribeToUserNotificationStats(
      user.uid,
      (newStats) => {
        setStats(newStats);
      }
    );

    // Cleanup subscriptions
    return () => {
      unsubscribeNotifications();
      unsubscribeStats();
    };
  }, [user, limitCount]);

  const markAsRead = async (notificationId: string) => {
    try {
      await NotificationService.markAsRead(notificationId);
    } catch (err) {
      setError('Failed to mark notification as read');
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    
    try {
      await NotificationService.markAllAsRead(user.uid);
    } catch (err) {
      setError('Failed to mark all notifications as read');
      console.error('Error marking all notifications as read:', err);
    }
  };

  const markMultipleAsRead = async (notificationIds: string[]) => {
    try {
      await NotificationService.markMultipleAsRead(notificationIds);
    } catch (err) {
      setError('Failed to mark notifications as read');
      console.error('Error marking multiple notifications as read:', err);
    }
  };

  return {
    notifications,
    stats,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    markMultipleAsRead,
  };
};
