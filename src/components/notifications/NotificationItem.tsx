'use client';

import React from 'react';
import { Notification, NotificationType } from '@/types/notification';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onClose?: () => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onClose,
}) => {
  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
    
    // Navigate to action URL if available
    if (notification.metadata?.actionUrl) {
      window.location.href = notification.metadata.actionUrl;
    }
    
    if (onClose) {
      onClose();
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.REQUISITION_SUBMITTED:
        return '📝';
      case NotificationType.REQUISITION_APPROVED:
        return '✅';
      case NotificationType.REQUISITION_REJECTED:
        return '❌';
      case NotificationType.SHIPMENT_ISSUE_CREATED:
        return '⚠️';
      case NotificationType.SHIPMENT_DELIVERED:
        return '📦';
      case NotificationType.MATERIAL_LOW_STOCK:
        return '📉';
      default:
        return '🔔';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500';
      case 'medium':
        return 'border-l-yellow-500';
      case 'low':
        return 'border-l-green-500';
      default:
        return 'border-l-blue-500';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div
      className={`
        p-4 border-l-4 cursor-pointer transition-colors duration-200
        ${getPriorityColor(notification.metadata?.priority)}
        ${notification.read 
          ? 'bg-gray-50 hover:bg-gray-100' 
          : 'bg-white hover:bg-blue-50 border-r-2 border-r-blue-200'
        }
      `}
      onClick={handleClick}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 text-lg">
          {getNotificationIcon(notification.type)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className={`text-sm font-medium ${
              notification.read ? 'text-gray-700' : 'text-gray-900'
            }`}>
              {notification.title}
            </h4>
            {!notification.read && (
              <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></div>
            )}
          </div>
          
          <p className={`mt-1 text-sm ${
            notification.read ? 'text-gray-500' : 'text-gray-700'
          }`}>
            {notification.message}
          </p>
          
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {formatTimeAgo(notification.createdAt)}
            </span>
            
            {notification.metadata?.priority && (
              <span className={`
                text-xs px-2 py-1 rounded-full
                ${notification.metadata.priority === 'high' 
                  ? 'bg-red-100 text-red-800' 
                  : notification.metadata.priority === 'medium'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-green-100 text-green-800'
                }
              `}>
                {notification.metadata.priority}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
