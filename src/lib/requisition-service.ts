import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Requisition, 
  CreateRequisitionData, 
  RequisitionStatus 
} from '@/types/requisition';
import { NotificationService } from '@/lib/notification-service';

const REQUISITIONS_COLLECTION = 'requisitions';

export class RequisitionService {
  /**
   * Create a new requisition
   */
  static async createRequisition(
    userId: string, 
    data: CreateRequisitionData
  ): Promise<string> {
    if (!db) {
      throw new Error('Firebase not configured');
    }

    const requisitionData = {
      ...data,
      userId,
      requestedBy: userId,
      status: RequisitionStatus.DRAFT,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, REQUISITIONS_COLLECTION), requisitionData);
    return docRef.id;
  }

  /**
   * Submit a requisition for review
   */
  static async submitRequisition(
    requisitionId: string, 
    userId: string,
    requisitionTitle: string
  ): Promise<void> {
    if (!db) {
      throw new Error('Firebase not configured');
    }

    const requisitionRef = doc(db, REQUISITIONS_COLLECTION, requisitionId);
    await updateDoc(requisitionRef, {
      status: RequisitionStatus.SUBMITTED,
      updatedAt: Timestamp.now(),
    });

    // Create notification
    await NotificationService.createRequisitionSubmittedNotification(
      userId,
      requisitionId,
      requisitionTitle
    );
  }

  /**
   * Approve a requisition
   */
  static async approveRequisition(
    requisitionId: string, 
    approvedBy: string,
    userId: string,
    requisitionTitle: string,
    approverName: string
  ): Promise<void> {
    if (!db) {
      throw new Error('Firebase not configured');
    }

    const requisitionRef = doc(db, REQUISITIONS_COLLECTION, requisitionId);
    await updateDoc(requisitionRef, {
      status: RequisitionStatus.APPROVED,
      approvedBy,
      approvedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // Create notification for the requester
    await NotificationService.createRequisitionApprovedNotification(
      userId,
      requisitionId,
      requisitionTitle,
      approverName
    );
  }

  /**
   * Reject a requisition
   */
  static async rejectRequisition(
    requisitionId: string, 
    rejectedBy: string,
    notes?: string
  ): Promise<void> {
    if (!db) {
      throw new Error('Firebase not configured');
    }

    const requisitionRef = doc(db, REQUISITIONS_COLLECTION, requisitionId);
    await updateDoc(requisitionRef, {
      status: RequisitionStatus.REJECTED,
      rejectedBy,
      rejectedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      ...(notes && { notes }),
    });
  }

  /**
   * Get requisitions for a user
   */
  static async getUserRequisitions(userId: string): Promise<Requisition[]> {
    if (!db) {
      return [];
    }

    const q = query(
      collection(db, REQUISITIONS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      approvedAt: doc.data().approvedAt?.toDate(),
      rejectedAt: doc.data().rejectedAt?.toDate(),
    })) as Requisition[];
  }

  /**
   * Get all requisitions (for admin/manager view)
   */
  static async getAllRequisitions(): Promise<Requisition[]> {
    if (!db) {
      return [];
    }

    const q = query(
      collection(db, REQUISITIONS_COLLECTION),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      approvedAt: doc.data().approvedAt?.toDate(),
      rejectedAt: doc.data().rejectedAt?.toDate(),
    })) as Requisition[];
  }

  /**
   * Get requisitions by status
   */
  static async getRequisitionsByStatus(status: RequisitionStatus): Promise<Requisition[]> {
    if (!db) {
      return [];
    }

    const q = query(
      collection(db, REQUISITIONS_COLLECTION),
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      approvedAt: doc.data().approvedAt?.toDate(),
      rejectedAt: doc.data().rejectedAt?.toDate(),
    })) as Requisition[];
  }
}
