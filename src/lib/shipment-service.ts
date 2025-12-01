import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  Timestamp,
  arrayUnion
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Shipment, 
  CreateShipmentData, 
  ShipmentStatus,
  CreateShipmentIssueData,
  ShipmentIssue
} from '@/types/shipment';
import { NotificationService } from '@/lib/notification-service';

const SHIPMENTS_COLLECTION = 'shipments';

export class ShipmentService {
  /**
   * Create a new shipment
   */
  static async createShipment(
    userId: string, 
    data: CreateShipmentData
  ): Promise<string> {
    if (!db) {
      throw new Error('Firebase not configured');
    }

    const shipmentData = {
      ...data,
      userId,
      status: ShipmentStatus.PENDING,
      issues: [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      estimatedDelivery: Timestamp.fromDate(data.estimatedDelivery),
    };

    const docRef = await addDoc(collection(db, SHIPMENTS_COLLECTION), shipmentData);
    return docRef.id;
  }

  /**
   * Update shipment status
   */
  static async updateShipmentStatus(
    shipmentId: string, 
    status: ShipmentStatus,
    actualDelivery?: Date
  ): Promise<void> {
    if (!db) {
      throw new Error('Firebase not configured');
    }

    const shipmentRef = doc(db, SHIPMENTS_COLLECTION, shipmentId);
    const updateData: any = {
      status,
      updatedAt: Timestamp.now(),
    };

    if (actualDelivery) {
      updateData.actualDelivery = Timestamp.fromDate(actualDelivery);
    }

    await updateDoc(shipmentRef, updateData);
  }

  /**
   * Add an issue to a shipment
   */
  static async addShipmentIssue(
    shipmentId: string,
    userId: string,
    data: CreateShipmentIssueData,
    trackingNumber: string
  ): Promise<void> {
    if (!db) {
      throw new Error('Firebase not configured');
    }

    const issue: ShipmentIssue = {
      id: `issue_${Date.now()}`,
      ...data,
      reportedBy: userId,
      reportedAt: new Date(),
    };

    const shipmentRef = doc(db, SHIPMENTS_COLLECTION, shipmentId);
    await updateDoc(shipmentRef, {
      issues: arrayUnion(issue),
      updatedAt: Timestamp.now(),
    });

    // Create notification
    await NotificationService.createShipmentIssueNotification(
      userId,
      shipmentId,
      data.type,
      trackingNumber
    );
  }

  /**
   * Resolve a shipment issue
   */
  static async resolveShipmentIssue(
    shipmentId: string,
    issueId: string,
    resolution: string
  ): Promise<void> {
    if (!db) {
      throw new Error('Firebase not configured');
    }

    // Note: This is a simplified approach. In a real app, you might want to 
    // store issues in a separate collection for better querying
    const shipmentRef = doc(db, SHIPMENTS_COLLECTION, shipmentId);
    
    // For now, we'll need to fetch the shipment, update the issue, and save it back
    // This is not ideal for concurrent updates, but works for this demo
    const shipmentDoc = await shipmentRef.get();
    if (shipmentDoc.exists()) {
      const shipmentData = shipmentDoc.data();
      const issues = shipmentData.issues || [];
      
      const updatedIssues = issues.map((issue: ShipmentIssue) => {
        if (issue.id === issueId) {
          return {
            ...issue,
            resolvedAt: new Date(),
            resolution,
          };
        }
        return issue;
      });

      await updateDoc(shipmentRef, {
        issues: updatedIssues,
        updatedAt: Timestamp.now(),
      });
    }
  }

  /**
   * Get shipments for a user
   */
  static async getUserShipments(userId: string): Promise<Shipment[]> {
    if (!db) {
      return [];
    }

    const q = query(
      collection(db, SHIPMENTS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      estimatedDelivery: doc.data().estimatedDelivery?.toDate() || new Date(),
      actualDelivery: doc.data().actualDelivery?.toDate(),
    })) as Shipment[];
  }

  /**
   * Get all shipments (for admin/manager view)
   */
  static async getAllShipments(): Promise<Shipment[]> {
    if (!db) {
      return [];
    }

    const q = query(
      collection(db, SHIPMENTS_COLLECTION),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      estimatedDelivery: doc.data().estimatedDelivery?.toDate() || new Date(),
      actualDelivery: doc.data().actualDelivery?.toDate(),
    })) as Shipment[];
  }

  /**
   * Get shipments by status
   */
  static async getShipmentsByStatus(status: ShipmentStatus): Promise<Shipment[]> {
    if (!db) {
      return [];
    }

    const q = query(
      collection(db, SHIPMENTS_COLLECTION),
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      estimatedDelivery: doc.data().estimatedDelivery?.toDate() || new Date(),
      actualDelivery: doc.data().actualDelivery?.toDate(),
    })) as Shipment[];
  }
}
