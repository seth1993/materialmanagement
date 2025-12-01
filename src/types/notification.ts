export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
  metadata?: NotificationMetadata;
}

export enum NotificationType {
  REQUISITION_SUBMITTED = 'requisition_submitted',
  REQUISITION_APPROVED = 'requisition_approved',
  REQUISITION_REJECTED = 'requisition_rejected',
  SHIPMENT_ISSUE_CREATED = 'shipment_issue_created',
  SHIPMENT_DELIVERED = 'shipment_delivered',
  MATERIAL_LOW_STOCK = 'material_low_stock',
}

export interface NotificationMetadata {
  requisitionId?: string;
  shipmentId?: string;
  materialId?: string;
  actionUrl?: string;
  priority?: 'low' | 'medium' | 'high';
  [key: string]: any;
}

export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: NotificationMetadata;
}

export interface NotificationStats {
  total: number;
  unread: number;
}
