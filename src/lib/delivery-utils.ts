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
  getDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Shipment, 
  Delivery, 
  ShipmentEvent, 
  ShipmentStatus, 
  DeliveryStatus,
  ShipmentEventType,
  DeliveryFilters 
} from '@/types/delivery';

// Collection names
export const COLLECTIONS = {
  SHIPMENTS: 'shipments',
  DELIVERIES: 'deliveries',
  SHIPMENT_EVENTS: 'shipmentEvents',
} as const;

// Shipment operations
export async function createShipment(shipmentData: Omit<Shipment, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  if (!db) throw new Error('Firebase not configured');
  
  const now = new Date();
  const docRef = await addDoc(collection(db, COLLECTIONS.SHIPMENTS), {
    ...shipmentData,
    expectedDeliveryDate: Timestamp.fromDate(shipmentData.expectedDeliveryDate),
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  });
  
  // Create initial shipment event
  await createShipmentEvent({
    shipmentId: docRef.id,
    eventType: 'shipment_created',
    userId: shipmentData.userId,
    userName: 'System', // You might want to get actual user name
    description: `Shipment created for project ${shipmentData.projectName}`,
  });
  
  return docRef.id;
}

export async function getShipmentsByDate(date: Date, projectId?: string): Promise<Shipment[]> {
  if (!db) return [];
  
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  let q = query(
    collection(db, COLLECTIONS.SHIPMENTS),
    where('expectedDeliveryDate', '>=', Timestamp.fromDate(startOfDay)),
    where('expectedDeliveryDate', '<=', Timestamp.fromDate(endOfDay)),
    orderBy('expectedDeliveryDate', 'asc')
  );
  
  if (projectId) {
    q = query(q, where('projectId', '==', projectId));
  }
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    expectedDeliveryDate: doc.data().expectedDeliveryDate.toDate(),
    createdAt: doc.data().createdAt.toDate(),
    updatedAt: doc.data().updatedAt.toDate(),
  })) as Shipment[];
}

export async function getTodaysDeliveries(projectId?: string): Promise<Shipment[]> {
  return getShipmentsByDate(new Date(), projectId);
}

export async function updateShipmentStatus(shipmentId: string, status: ShipmentStatus, userId: string, userName: string): Promise<void> {
  if (!db) throw new Error('Firebase not configured');
  
  const shipmentRef = doc(db, COLLECTIONS.SHIPMENTS, shipmentId);
  await updateDoc(shipmentRef, {
    status,
    updatedAt: Timestamp.fromDate(new Date()),
  });
  
  // Create status update event
  await createShipmentEvent({
    shipmentId,
    eventType: status === 'delivered_confirmed' ? 'delivered_confirmed' : 'shipment_updated',
    userId,
    userName,
    description: `Shipment status updated to ${status}`,
  });
}

// Delivery operations
export async function createDelivery(deliveryData: Omit<Delivery, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  if (!db) throw new Error('Firebase not configured');
  
  const now = new Date();
  const docRef = await addDoc(collection(db, COLLECTIONS.DELIVERIES), {
    ...deliveryData,
    actualDeliveryDate: Timestamp.fromDate(deliveryData.actualDeliveryDate),
    photos: deliveryData.photos.map(photo => ({
      ...photo,
      uploadedAt: Timestamp.fromDate(photo.uploadedAt),
    })),
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  });
  
  // Update shipment status
  await updateShipmentStatus(
    deliveryData.shipmentId, 
    'delivered_confirmed', 
    deliveryData.receivedBy, 
    deliveryData.receivedByName
  );
  
  // Create delivery confirmation event
  await createShipmentEvent({
    shipmentId: deliveryData.shipmentId,
    deliveryId: docRef.id,
    eventType: 'delivered_confirmed',
    userId: deliveryData.receivedBy,
    userName: deliveryData.receivedByName,
    description: `Delivery confirmed at ${deliveryData.onSiteLocation}`,
    metadata: {
      materialsCount: deliveryData.materialsReceived.length,
      photosCount: deliveryData.photos.length,
    },
  });
  
  return docRef.id;
}

export async function getDeliveryByShipmentId(shipmentId: string): Promise<Delivery | null> {
  if (!db) return null;
  
  const q = query(
    collection(db, COLLECTIONS.DELIVERIES),
    where('shipmentId', '==', shipmentId)
  );
  
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) return null;
  
  const doc = querySnapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
    actualDeliveryDate: doc.data().actualDeliveryDate.toDate(),
    photos: doc.data().photos.map((photo: any) => ({
      ...photo,
      uploadedAt: photo.uploadedAt.toDate(),
    })),
    createdAt: doc.data().createdAt.toDate(),
    updatedAt: doc.data().updatedAt.toDate(),
  } as Delivery;
}

// Shipment Event operations
export async function createShipmentEvent(eventData: Omit<ShipmentEvent, 'id' | 'timestamp'>): Promise<string> {
  if (!db) throw new Error('Firebase not configured');
  
  const docRef = await addDoc(collection(db, COLLECTIONS.SHIPMENT_EVENTS), {
    ...eventData,
    timestamp: Timestamp.fromDate(new Date()),
  });
  
  return docRef.id;
}

export async function getShipmentEvents(shipmentId: string): Promise<ShipmentEvent[]> {
  if (!db) return [];
  
  const q = query(
    collection(db, COLLECTIONS.SHIPMENT_EVENTS),
    where('shipmentId', '==', shipmentId),
    orderBy('timestamp', 'desc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    timestamp: doc.data().timestamp.toDate(),
  })) as ShipmentEvent[];
}

// Utility functions
export function getStatusColor(status: ShipmentStatus): string {
  const statusColors: Record<ShipmentStatus, string> = {
    pending: 'bg-gray-100 text-gray-800',
    in_transit: 'bg-blue-100 text-blue-800',
    out_for_delivery: 'bg-yellow-100 text-yellow-800',
    delivered: 'bg-green-100 text-green-800',
    delivered_confirmed: 'bg-green-100 text-green-800',
    partially_delivered: 'bg-orange-100 text-orange-800',
    delayed: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
  };
  
  return statusColors[status] || 'bg-gray-100 text-gray-800';
}

export function getStatusLabel(status: ShipmentStatus): string {
  const statusLabels: Record<ShipmentStatus, string> = {
    pending: 'Pending',
    in_transit: 'In Transit',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
    delivered_confirmed: 'Confirmed',
    partially_delivered: 'Partially Delivered',
    delayed: 'Delayed',
    cancelled: 'Cancelled',
  };
  
  return statusLabels[status] || status;
}

export function isDeliveryOverdue(expectedDate: Date): boolean {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const deliveryDate = new Date(expectedDate.getFullYear(), expectedDate.getMonth(), expectedDate.getDate());
  
  return deliveryDate < today;
}

export function formatDeliveryDate(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const deliveryDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  if (deliveryDate.getTime() === today.getTime()) {
    return 'Today';
  } else if (deliveryDate.getTime() === today.getTime() + 24 * 60 * 60 * 1000) {
    return 'Tomorrow';
  } else if (deliveryDate.getTime() === today.getTime() - 24 * 60 * 60 * 1000) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString();
  }
}
