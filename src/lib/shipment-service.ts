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
import { Shipment, CreateShipmentData, UpdateShipmentData, ShipmentStatus } from '@/types/shipment';

const COLLECTION_NAME = 'shipments';

export class ShipmentService {
  static async createShipment(userId: string, data: CreateShipmentData): Promise<string> {
    if (!db) throw new Error('Firebase not configured');

    const shipmentData = {
      ...data,
      status: ShipmentStatus.PENDING,
      userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      exceptionCount: 0,
      expectedDeliveryDate: Timestamp.fromDate(data.expectedDeliveryDate)
    };

    const docRef = await addDoc(collection(db, COLLECTION_NAME), shipmentData);
    return docRef.id;
  }

  static async getShipments(userId: string): Promise<Shipment[]> {
    if (!db) throw new Error('Firebase not configured');

    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      expectedDeliveryDate: doc.data().expectedDeliveryDate?.toDate() || new Date(),
      actualDeliveryDate: doc.data().actualDeliveryDate?.toDate() || undefined,
    })) as Shipment[];
  }

  static async getShipment(shipmentId: string): Promise<Shipment | null> {
    if (!db) throw new Error('Firebase not configured');

    const docRef = doc(db, COLLECTION_NAME, shipmentId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      expectedDeliveryDate: data.expectedDeliveryDate?.toDate() || new Date(),
      actualDeliveryDate: data.actualDeliveryDate?.toDate() || undefined,
    } as Shipment;
  }

  static async updateShipment(shipmentId: string, data: UpdateShipmentData): Promise<void> {
    if (!db) throw new Error('Firebase not configured');

    const updateData: any = {
      ...data,
      updatedAt: Timestamp.now()
    };

    if (data.actualDeliveryDate) {
      updateData.actualDeliveryDate = Timestamp.fromDate(data.actualDeliveryDate);
    }

    const docRef = doc(db, COLLECTION_NAME, shipmentId);
    await updateDoc(docRef, updateData);
  }

  static async deleteShipment(shipmentId: string): Promise<void> {
    if (!db) throw new Error('Firebase not configured');

    const docRef = doc(db, COLLECTION_NAME, shipmentId);
    await deleteDoc(docRef);
  }

  static async updateExceptionCount(shipmentId: string, count: number): Promise<void> {
    if (!db) throw new Error('Firebase not configured');

    const docRef = doc(db, COLLECTION_NAME, shipmentId);
    await updateDoc(docRef, {
      exceptionCount: count,
      updatedAt: Timestamp.now(),
      status: count > 0 ? ShipmentStatus.EXCEPTION : ShipmentStatus.IN_TRANSIT
    });
  }

  static async getShipmentsByStatus(userId: string, status: ShipmentStatus): Promise<Shipment[]> {
    if (!db) throw new Error('Firebase not configured');

    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      expectedDeliveryDate: doc.data().expectedDeliveryDate?.toDate() || new Date(),
      actualDeliveryDate: doc.data().actualDeliveryDate?.toDate() || undefined,
    })) as Shipment[];
  }
}
