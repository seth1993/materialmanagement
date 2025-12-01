import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Notification, 
  CreateNotificationData, 
  NotificationStats,
  NotificationType 
} from '@/types/notification';

const NOTIFICATIONS_COLLECTION = 'notifications';

export class NotificationService {
  /**
   * Create a new notification
   */
  static async createNotification(data: CreateNotificationData): Promise<string> {
    if (!db) {
      throw new Error('Firebase not configured');
    }

    const notificationData = {
      ...data,
      read: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, NOTIFICATIONS_COLLECTION), notificationData);
    return docRef.id;
  }

  /**
   * Get notifications for a user with pagination
   */
  static async getUserNotifications(
    userId: string, 
    limitCount: number = 20
  ): Promise<Notification[]> {
    if (!db) {
      return [];
    }

    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as Notification[];
  }

  /**
   * Get notification statistics for a user
   */
  static async getUserNotificationStats(userId: string): Promise<NotificationStats> {
    if (!db) {
      return { total: 0, unread: 0 };
    }

    const allQuery = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId)
    );

    const unreadQuery = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      where('read', '==', false)
    );

    const [allSnapshot, unreadSnapshot] = await Promise.all([
      getDocs(allQuery),
      getDocs(unreadQuery)
    ]);

    return {
      total: allSnapshot.size,
      unread: unreadSnapshot.size,
    };
  }

  /**
   * Mark a notification as read
   */
  static async markAsRead(notificationId: string): Promise<void> {
    if (!db) {
      throw new Error('Firebase not configured');
    }

    const notificationRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
    await updateDoc(notificationRef, {
      read: true,
      updatedAt: Timestamp.now(),
    });
  }

  /**
   * Mark multiple notifications as read
   */
  static async markMultipleAsRead(notificationIds: string[]): Promise<void> {
    if (!db) {
      throw new Error('Firebase not configured');
    }

    const batch = writeBatch(db);
    
    notificationIds.forEach(id => {
      const notificationRef = doc(db, NOTIFICATIONS_COLLECTION, id);
      batch.update(notificationRef, {
        read: true,
        updatedAt: Timestamp.now(),
      });
    });

    await batch.commit();
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<void> {
    if (!db) {
      throw new Error('Firebase not configured');
    }

    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      where('read', '==', false)
    );

    const querySnapshot = await getDocs(q);
    const batch = writeBatch(db);

    querySnapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        read: true,
        updatedAt: Timestamp.now(),
      });
    });

    await batch.commit();
  }

  /**
   * Subscribe to real-time notifications for a user
   */
  static subscribeToUserNotifications(
    userId: string,
    callback: (notifications: Notification[]) => void,
    limitCount: number = 20
  ): () => void {
    if (!db) {
      return () => {};
    }

    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    return onSnapshot(q, (querySnapshot) => {
      const notifications = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as Notification[];

      callback(notifications);
    });
  }

  /**
   * Subscribe to notification stats for a user
   */
  static subscribeToUserNotificationStats(
    userId: string,
    callback: (stats: NotificationStats) => void
  ): () => void {
    if (!db) {
      return () => {};
    }

    const q = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId)
    );

    return onSnapshot(q, (querySnapshot) => {
      const total = querySnapshot.size;
      const unread = querySnapshot.docs.filter(doc => !doc.data().read).length;
      
      callback({ total, unread });
    });
  }

  /**
   * Helper methods for creating specific notification types
   */
  static async createRequisitionSubmittedNotification(
    userId: string, 
    requisitionId: string, 
    requisitionTitle: string
  ): Promise<string> {
    return this.createNotification({
      userId,
      type: NotificationType.REQUISITION_SUBMITTED,
      title: 'Requisition Submitted',
      message: `Your requisition "${requisitionTitle}" has been submitted for review.`,
      metadata: {
        requisitionId,
        actionUrl: `/requisitions/${requisitionId}`,
        priority: 'medium',
      },
    });
  }

  static async createRequisitionApprovedNotification(
    userId: string, 
    requisitionId: string, 
    requisitionTitle: string,
    approvedBy: string
  ): Promise<string> {
    return this.createNotification({
      userId,
      type: NotificationType.REQUISITION_APPROVED,
      title: 'Requisition Approved',
      message: `Your requisition "${requisitionTitle}" has been approved by ${approvedBy}.`,
      metadata: {
        requisitionId,
        actionUrl: `/requisitions/${requisitionId}`,
        priority: 'high',
      },
    });
  }

  static async createShipmentIssueNotification(
    userId: string, 
    shipmentId: string, 
    issueType: string,
    trackingNumber: string
  ): Promise<string> {
    return this.createNotification({
      userId,
      type: NotificationType.SHIPMENT_ISSUE_CREATED,
      title: 'Shipment Issue Reported',
      message: `A ${issueType} issue has been reported for shipment ${trackingNumber}.`,
      metadata: {
        shipmentId,
        actionUrl: `/shipments/${shipmentId}`,
        priority: 'high',
      },
    });
  }
}
