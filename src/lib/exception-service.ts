import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  getDoc,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { ShipmentException, CreateExceptionData, UpdateExceptionData, ExceptionStatus, ExceptionType, ExceptionSummary } from '@/types/exception';
import { ShipmentService } from './shipment-service';

const COLLECTION_NAME = 'shipment_exceptions';

export class ExceptionService {
  static async createException(userId: string, data: CreateExceptionData, photoUrls: string[] = []): Promise<string> {
    if (!db) throw new Error('Firebase not configured');

    const exceptionData = {
      shipmentId: data.shipmentId,
      issueType: data.issueType,
      description: data.description,
      photos: photoUrls,
      status: ExceptionStatus.OPEN,
      reportedAt: Timestamp.now(),
      userId,
      vendorNotified: false
    };

    const docRef = await addDoc(collection(db, COLLECTION_NAME), exceptionData);
    
    // Update shipment exception count
    await this.updateShipmentExceptionCount(data.shipmentId);
    
    return docRef.id;
  }

  static async getExceptions(userId: string): Promise<ShipmentException[]> {
    if (!db) throw new Error('Firebase not configured');

    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('reportedAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      reportedAt: doc.data().reportedAt?.toDate() || new Date(),
      resolvedAt: doc.data().resolvedAt?.toDate() || undefined,
      notificationSentAt: doc.data().notificationSentAt?.toDate() || undefined,
    })) as ShipmentException[];
  }

  static async getExceptionsByShipment(shipmentId: string): Promise<ShipmentException[]> {
    if (!db) throw new Error('Firebase not configured');

    const q = query(
      collection(db, COLLECTION_NAME),
      where('shipmentId', '==', shipmentId),
      orderBy('reportedAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      reportedAt: doc.data().reportedAt?.toDate() || new Date(),
      resolvedAt: doc.data().resolvedAt?.toDate() || undefined,
      notificationSentAt: doc.data().notificationSentAt?.toDate() || undefined,
    })) as ShipmentException[];
  }

  static async getException(exceptionId: string): Promise<ShipmentException | null> {
    if (!db) throw new Error('Firebase not configured');

    const docRef = doc(db, COLLECTION_NAME, exceptionId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      reportedAt: data.reportedAt?.toDate() || new Date(),
      resolvedAt: data.resolvedAt?.toDate() || undefined,
      notificationSentAt: data.notificationSentAt?.toDate() || undefined,
    } as ShipmentException;
  }

  static async updateException(exceptionId: string, data: UpdateExceptionData): Promise<void> {
    if (!db) throw new Error('Firebase not configured');

    const updateData: any = { ...data };

    if (data.resolvedAt) {
      updateData.resolvedAt = Timestamp.fromDate(data.resolvedAt);
    }

    if (data.status === ExceptionStatus.RESOLVED && !data.resolvedAt) {
      updateData.resolvedAt = Timestamp.now();
    }

    const docRef = doc(db, COLLECTION_NAME, exceptionId);
    await updateDoc(docRef, updateData);

    // Update shipment exception count if status changed
    if (data.status) {
      const exception = await this.getException(exceptionId);
      if (exception) {
        await this.updateShipmentExceptionCount(exception.shipmentId);
      }
    }
  }

  static async deleteException(exceptionId: string): Promise<void> {
    if (!db) throw new Error('Firebase not configured');

    const exception = await this.getException(exceptionId);
    if (!exception) return;

    const docRef = doc(db, COLLECTION_NAME, exceptionId);
    await deleteDoc(docRef);

    // Update shipment exception count
    await this.updateShipmentExceptionCount(exception.shipmentId);
  }

  static async markVendorNotified(exceptionId: string): Promise<void> {
    if (!db) throw new Error('Firebase not configured');

    const docRef = doc(db, COLLECTION_NAME, exceptionId);
    await updateDoc(docRef, {
      vendorNotified: true,
      notificationSentAt: Timestamp.now()
    });
  }

  static async getExceptionSummary(userId: string): Promise<ExceptionSummary> {
    const exceptions = await this.getExceptions(userId);
    
    const summary: ExceptionSummary = {
      total: exceptions.length,
      open: 0,
      inProgress: 0,
      resolved: 0,
      byType: {
        [ExceptionType.LATE]: 0,
        [ExceptionType.PARTIAL]: 0,
        [ExceptionType.DAMAGED]: 0,
        [ExceptionType.WRONG_ITEM]: 0,
        [ExceptionType.MISSING]: 0,
        [ExceptionType.OTHER]: 0
      }
    };

    exceptions.forEach(exception => {
      // Count by status
      switch (exception.status) {
        case ExceptionStatus.OPEN:
          summary.open++;
          break;
        case ExceptionStatus.IN_PROGRESS:
          summary.inProgress++;
          break;
        case ExceptionStatus.RESOLVED:
        case ExceptionStatus.CLOSED:
          summary.resolved++;
          break;
      }

      // Count by type
      summary.byType[exception.issueType]++;
    });

    return summary;
  }

  private static async updateShipmentExceptionCount(shipmentId: string): Promise<void> {
    const exceptions = await this.getExceptionsByShipment(shipmentId);
    const openExceptions = exceptions.filter(e => 
      e.status === ExceptionStatus.OPEN || e.status === ExceptionStatus.IN_PROGRESS
    );
    
    await ShipmentService.updateExceptionCount(shipmentId, openExceptions.length);
  }
}
