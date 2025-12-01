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
import { Shipment, ShipmentEvent, ShipmentStatus, ShipmentFilter } from '@/types/shipment';

export const getStatusColor = (status: ShipmentStatus): string => {
  switch (status) {
    case 'created':
      return 'bg-gray-100 text-gray-800';
    case 'shipped':
      return 'bg-blue-100 text-blue-800';
    case 'out_for_delivery':
      return 'bg-yellow-100 text-yellow-800';
    case 'delivered':
      return 'bg-green-100 text-green-800';
    case 'delayed':
      return 'bg-red-100 text-red-800';
    case 'cancelled':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getStatusLabel = (status: ShipmentStatus): string => {
  switch (status) {
    case 'created':
      return 'Created';
    case 'shipped':
      return 'Shipped';
    case 'out_for_delivery':
      return 'Out for Delivery';
    case 'delivered':
      return 'Delivered';
    case 'delayed':
      return 'Delayed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
};

export const createShipment = async (shipmentData: Omit<Shipment, 'id' | 'events' | 'createdAt' | 'updatedAt'>) => {
  if (!db) throw new Error('Firebase not configured');

  const now = new Date();
  const shipment = {
    ...shipmentData,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(collection(db, 'shipments'), shipment);
  
  // Create initial event
  await addShipmentEvent(docRef.id, {
    status: 'created',
    description: 'Shipment created',
    timestamp: now,
    createdBy: shipmentData.userId,
  });

  return docRef.id;
};

export const addShipmentEvent = async (
  shipmentId: string, 
  eventData: Omit<ShipmentEvent, 'id' | 'shipmentId'>
) => {
  if (!db) throw new Error('Firebase not configured');

  const event = {
    ...eventData,
    shipmentId,
    timestamp: eventData.timestamp || new Date(),
  };

  // Add event to events collection
  await addDoc(collection(db, 'shipmentEvents'), event);

  // Update shipment status and updatedAt
  const shipmentRef = doc(db, 'shipments', shipmentId);
  await updateDoc(shipmentRef, {
    status: eventData.status,
    updatedAt: new Date(),
  });
};

export const getShipments = async (userId: string, filters?: ShipmentFilter): Promise<Shipment[]> => {
  if (!db) throw new Error('Firebase not configured');

  let q = query(
    collection(db, 'shipments'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  // Apply filters
  if (filters?.status) {
    q = query(q, where('status', '==', filters.status));
  }

  if (filters?.carrier) {
    q = query(q, where('carrier', '==', filters.carrier));
  }

  const querySnapshot = await getDocs(q);
  const shipments: Shipment[] = [];

  for (const docSnapshot of querySnapshot.docs) {
    const shipmentData = docSnapshot.data();
    
    // Get events for this shipment
    const eventsQuery = query(
      collection(db, 'shipmentEvents'),
      where('shipmentId', '==', docSnapshot.id),
      orderBy('timestamp', 'asc')
    );
    
    const eventsSnapshot = await getDocs(eventsQuery);
    const events = eventsSnapshot.docs.map(eventDoc => ({
      id: eventDoc.id,
      ...eventDoc.data(),
      timestamp: eventDoc.data().timestamp?.toDate() || new Date(),
    })) as ShipmentEvent[];

    shipments.push({
      id: docSnapshot.id,
      ...shipmentData,
      createdAt: shipmentData.createdAt?.toDate() || new Date(),
      updatedAt: shipmentData.updatedAt?.toDate() || new Date(),
      estimatedDelivery: shipmentData.estimatedDelivery?.toDate(),
      actualDelivery: shipmentData.actualDelivery?.toDate(),
      events,
    } as Shipment);
  }

  // Apply client-side filters
  let filteredShipments = shipments;

  if (filters?.searchTerm) {
    const searchTerm = filters.searchTerm.toLowerCase();
    filteredShipments = shipments.filter(shipment =>
      shipment.trackingNumber.toLowerCase().includes(searchTerm) ||
      shipment.carrier.toLowerCase().includes(searchTerm) ||
      shipment.origin.toLowerCase().includes(searchTerm) ||
      shipment.destination.toLowerCase().includes(searchTerm)
    );
  }

  if (filters?.dateRange) {
    filteredShipments = filteredShipments.filter(shipment =>
      shipment.createdAt >= filters.dateRange!.start &&
      shipment.createdAt <= filters.dateRange!.end
    );
  }

  return filteredShipments;
};

export const getShipmentById = async (shipmentId: string): Promise<Shipment | null> => {
  if (!db) throw new Error('Firebase not configured');

  const shipmentDoc = await getDoc(doc(db, 'shipments', shipmentId));
  
  if (!shipmentDoc.exists()) {
    return null;
  }

  const shipmentData = shipmentDoc.data();

  // Get events for this shipment
  const eventsQuery = query(
    collection(db, 'shipmentEvents'),
    where('shipmentId', '==', shipmentId),
    orderBy('timestamp', 'asc')
  );
  
  const eventsSnapshot = await getDocs(eventsQuery);
  const events = eventsSnapshot.docs.map(eventDoc => ({
    id: eventDoc.id,
    ...eventDoc.data(),
    timestamp: eventDoc.data().timestamp?.toDate() || new Date(),
  })) as ShipmentEvent[];

  return {
    id: shipmentDoc.id,
    ...shipmentData,
    createdAt: shipmentData.createdAt?.toDate() || new Date(),
    updatedAt: shipmentData.updatedAt?.toDate() || new Date(),
    estimatedDelivery: shipmentData.estimatedDelivery?.toDate(),
    actualDelivery: shipmentData.actualDelivery?.toDate(),
    events,
  } as Shipment;
};

export const updateShipmentStatus = async (
  shipmentId: string,
  status: ShipmentStatus,
  description: string,
  userId: string,
  location?: string,
  notes?: string
) => {
  await addShipmentEvent(shipmentId, {
    status,
    description,
    timestamp: new Date(),
    location,
    notes,
    createdBy: userId,
  });
};
