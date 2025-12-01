import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  updateDoc,
  doc, 
  query, 
  where, 
  orderBy,
  limit,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  InventoryLocation,
  InventoryLot,
  InventoryMovement,
  MaterialBalance,
  InventoryFilter,
  MovementFilter,
  LocationType,
  MovementType
} from '@/types/inventory';

// Collection names
const COLLECTIONS = {
  LOCATIONS: 'inventory_locations',
  LOTS: 'inventory_lots',
  MOVEMENTS: 'inventory_movements',
  MATERIALS: 'materials'
} as const;

// ===== LOCATION SERVICES =====

export async function createLocation(
  userId: string,
  locationData: Omit<InventoryLocation, 'id' | 'createdAt' | 'updatedAt' | 'userId'>
): Promise<string> {
  if (!db) throw new Error('Firebase not configured');

  const now = new Date();
  const docRef = await addDoc(collection(db, COLLECTIONS.LOCATIONS), {
    ...locationData,
    userId,
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now)
  });

  return docRef.id;
}

export async function getLocations(userId: string): Promise<InventoryLocation[]> {
  if (!db) return [];

  const q = query(
    collection(db, COLLECTIONS.LOCATIONS),
    where('userId', '==', userId),
    where('isActive', '==', true),
    orderBy('name')
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date()
  })) as InventoryLocation[];
}

export async function updateLocation(
  locationId: string,
  updates: Partial<Omit<InventoryLocation, 'id' | 'createdAt' | 'userId'>>
): Promise<void> {
  if (!db) throw new Error('Firebase not configured');

  const locationRef = doc(db, COLLECTIONS.LOCATIONS, locationId);
  await updateDoc(locationRef, {
    ...updates,
    updatedAt: Timestamp.fromDate(new Date())
  });
}

export async function deleteLocation(locationId: string): Promise<void> {
  if (!db) throw new Error('Firebase not configured');

  // Soft delete by setting isActive to false
  await updateLocation(locationId, { isActive: false });
}

// ===== LOT SERVICES =====

export async function createLot(
  userId: string,
  lotData: Omit<InventoryLot, 'id' | 'createdAt' | 'updatedAt' | 'userId'>
): Promise<string> {
  if (!db) throw new Error('Firebase not configured');

  const now = new Date();
  const docRef = await addDoc(collection(db, COLLECTIONS.LOTS), {
    ...lotData,
    userId,
    receivedDate: Timestamp.fromDate(lotData.receivedDate),
    expirationDate: lotData.expirationDate ? Timestamp.fromDate(lotData.expirationDate) : null,
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now)
  });

  return docRef.id;
}

export async function getLots(userId: string, materialId?: string): Promise<InventoryLot[]> {
  if (!db) return [];

  let q = query(
    collection(db, COLLECTIONS.LOTS),
    where('userId', '==', userId),
    where('isActive', '==', true)
  );

  if (materialId) {
    q = query(q, where('materialId', '==', materialId));
  }

  q = query(q, orderBy('receivedDate', 'desc'));

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    receivedDate: doc.data().receivedDate?.toDate() || new Date(),
    expirationDate: doc.data().expirationDate?.toDate() || null,
    createdAt: doc.data().createdAt?.toDate() || new Date(),
    updatedAt: doc.data().updatedAt?.toDate() || new Date()
  })) as InventoryLot[];
}

// ===== MOVEMENT SERVICES =====

export async function createMovement(
  userId: string,
  movementData: Omit<InventoryMovement, 'id' | 'createdAt' | 'userId'>
): Promise<string> {
  if (!db) throw new Error('Firebase not configured');

  // Validate movement data
  if (movementData.quantity <= 0) {
    throw new Error('Movement quantity must be positive');
  }

  if (movementData.movementType === 'transfer' && 
      (!movementData.fromLocationId || !movementData.toLocationId)) {
    throw new Error('Transfer movements require both from and to locations');
  }

  if (movementData.movementType === 'transfer' && 
      movementData.fromLocationId === movementData.toLocationId) {
    throw new Error('Cannot transfer to the same location');
  }

  const now = new Date();
  const docRef = await addDoc(collection(db, COLLECTIONS.MOVEMENTS), {
    ...movementData,
    userId,
    createdAt: Timestamp.fromDate(now)
  });

  return docRef.id;
}

export async function getMovements(
  userId: string,
  filter?: MovementFilter
): Promise<InventoryMovement[]> {
  if (!db) return [];

  let q = query(
    collection(db, COLLECTIONS.MOVEMENTS),
    where('userId', '==', userId)
  );

  // Apply filters
  if (filter?.materialIds && filter.materialIds.length > 0) {
    q = query(q, where('materialId', 'in', filter.materialIds));
  }

  if (filter?.locationIds && filter.locationIds.length > 0) {
    // Note: Firestore doesn't support OR queries easily, so we'll filter in memory
  }

  if (filter?.movementTypes && filter.movementTypes.length > 0) {
    q = query(q, where('movementType', 'in', filter.movementTypes));
  }

  q = query(q, orderBy('createdAt', 'desc'), limit(1000));

  const querySnapshot = await getDocs(q);
  let movements = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date()
  })) as InventoryMovement[];

  // Apply additional filters in memory
  if (filter?.locationIds && filter.locationIds.length > 0) {
    movements = movements.filter(movement => 
      filter.locationIds!.includes(movement.fromLocationId || '') ||
      filter.locationIds!.includes(movement.toLocationId || '')
    );
  }

  if (filter?.dateFrom) {
    movements = movements.filter(movement => 
      movement.createdAt >= filter.dateFrom!
    );
  }

  if (filter?.dateTo) {
    movements = movements.filter(movement => 
      movement.createdAt <= filter.dateTo!
    );
  }

  if (filter?.searchTerm) {
    const searchLower = filter.searchTerm.toLowerCase();
    movements = movements.filter(movement =>
      movement.materialName.toLowerCase().includes(searchLower) ||
      movement.notes?.toLowerCase().includes(searchLower) ||
      movement.referenceNumber?.toLowerCase().includes(searchLower)
    );
  }

  return movements;
}

// ===== BALANCE CALCULATION SERVICES =====

export async function calculateMaterialBalances(
  userId: string,
  filter?: InventoryFilter
): Promise<MaterialBalance[]> {
  if (!db) return [];

  // Get all movements for the user
  const movements = await getMovements(userId);
  const locations = await getLocations(userId);
  
  // Create a map of location names for quick lookup
  const locationMap = new Map(locations.map(loc => [loc.id, loc.name]));

  // Group movements by material and location
  const balanceMap = new Map<string, MaterialBalance>();

  for (const movement of movements) {
    const { materialId, materialName, quantity, movementType, createdAt } = movement;
    
    // Determine which location(s) are affected
    const affectedLocations: Array<{ locationId: string; quantityChange: number }> = [];

    switch (movementType) {
      case 'receipt':
        if (movement.toLocationId) {
          affectedLocations.push({
            locationId: movement.toLocationId,
            quantityChange: quantity
          });
        }
        break;
      
      case 'usage':
      case 'loss':
      case 'sale':
        if (movement.fromLocationId) {
          affectedLocations.push({
            locationId: movement.fromLocationId,
            quantityChange: -quantity
          });
        }
        break;
      
      case 'transfer':
        if (movement.fromLocationId) {
          affectedLocations.push({
            locationId: movement.fromLocationId,
            quantityChange: -quantity
          });
        }
        if (movement.toLocationId) {
          affectedLocations.push({
            locationId: movement.toLocationId,
            quantityChange: quantity
          });
        }
        break;
      
      case 'adjustment':
        // For adjustments, we need to determine if it's positive or negative
        // based on the presence of from/to location
        if (movement.toLocationId) {
          affectedLocations.push({
            locationId: movement.toLocationId,
            quantityChange: quantity
          });
        } else if (movement.fromLocationId) {
          affectedLocations.push({
            locationId: movement.fromLocationId,
            quantityChange: -quantity
          });
        }
        break;
      
      case 'return':
        if (movement.toLocationId) {
          affectedLocations.push({
            locationId: movement.toLocationId,
            quantityChange: quantity
          });
        }
        break;
    }

    // Update balances for affected locations
    for (const { locationId, quantityChange } of affectedLocations) {
      const key = `${materialId}-${locationId}`;
      const existing = balanceMap.get(key);
      
      if (existing) {
        existing.quantity += quantityChange;
        if (!existing.lastMovementDate || createdAt > existing.lastMovementDate) {
          existing.lastMovementDate = createdAt;
        }
      } else {
        balanceMap.set(key, {
          materialId,
          materialName,
          locationId,
          locationName: locationMap.get(locationId) || 'Unknown Location',
          quantity: quantityChange,
          lastMovementDate: createdAt
        });
      }
    }
  }

  // Convert map to array and apply filters
  let balances = Array.from(balanceMap.values());

  // Apply filters
  if (filter?.locationIds && filter.locationIds.length > 0) {
    balances = balances.filter(balance => 
      filter.locationIds!.includes(balance.locationId)
    );
  }

  if (filter?.materialIds && filter.materialIds.length > 0) {
    balances = balances.filter(balance => 
      filter.materialIds!.includes(balance.materialId)
    );
  }

  if (filter?.searchTerm) {
    const searchLower = filter.searchTerm.toLowerCase();
    balances = balances.filter(balance =>
      balance.materialName.toLowerCase().includes(searchLower) ||
      balance.locationName.toLowerCase().includes(searchLower)
    );
  }

  if (!filter?.showZeroQuantity) {
    balances = balances.filter(balance => balance.quantity > 0);
  }

  // Sort by material name, then location name
  balances.sort((a, b) => {
    const materialCompare = a.materialName.localeCompare(b.materialName);
    if (materialCompare !== 0) return materialCompare;
    return a.locationName.localeCompare(b.locationName);
  });

  return balances;
}

// ===== UTILITY FUNCTIONS =====

export function getLocationTypeLabel(type: LocationType): string {
  switch (type) {
    case 'warehouse': return 'Warehouse';
    case 'jobsite': return 'Job Site';
    case 'truck': return 'Truck';
    default: return type;
  }
}

export function getMovementTypeLabel(type: MovementType): string {
  switch (type) {
    case 'receipt': return 'Receipt';
    case 'transfer': return 'Transfer';
    case 'adjustment': return 'Adjustment';
    case 'usage': return 'Usage';
    case 'return': return 'Return';
    case 'loss': return 'Loss';
    case 'sale': return 'Sale';
    default: return type;
  }
}

export function getMovementTypeColor(type: MovementType): string {
  switch (type) {
    case 'receipt': return 'text-green-600 bg-green-100';
    case 'transfer': return 'text-blue-600 bg-blue-100';
    case 'adjustment': return 'text-yellow-600 bg-yellow-100';
    case 'usage': return 'text-red-600 bg-red-100';
    case 'return': return 'text-green-600 bg-green-100';
    case 'loss': return 'text-red-600 bg-red-100';
    case 'sale': return 'text-purple-600 bg-purple-100';
    default: return 'text-gray-600 bg-gray-100';
  }
}
