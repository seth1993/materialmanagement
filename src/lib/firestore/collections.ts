import { collection, CollectionReference, DocumentReference } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  User,
  Organization,
  Project,
  Material,
  ProjectMaterialGroup,
  Vendor,
  VendorMaterial,
  Requisition,
  PurchaseOrder,
  Shipment,
  InventoryLocation,
  InventoryLot,
  InventoryMovement
} from '@/types/domain';

// Collection names - centralized for consistency
export const COLLECTIONS = {
  USERS: 'users',
  ORGANIZATIONS: 'organizations',
  PROJECTS: 'projects',
  MATERIALS: 'materials',
  PROJECT_MATERIAL_GROUPS: 'projectMaterialGroups',
  VENDORS: 'vendors',
  VENDOR_MATERIALS: 'vendorMaterials',
  REQUISITIONS: 'requisitions',
  PURCHASE_ORDERS: 'purchaseOrders',
  SHIPMENTS: 'shipments',
  INVENTORY_LOCATIONS: 'inventoryLocations',
  INVENTORY_LOTS: 'inventoryLots',
  INVENTORY_MOVEMENTS: 'inventoryMovements',
  // Legacy collection for backward compatibility
  LEGACY_MATERIALS: 'materials'
} as const;

// Type-safe collection references
export function getUsersCollection(): CollectionReference<User> {
  if (!db) throw new Error('Firestore not initialized');
  return collection(db, COLLECTIONS.USERS) as CollectionReference<User>;
}

export function getOrganizationsCollection(): CollectionReference<Organization> {
  if (!db) throw new Error('Firestore not initialized');
  return collection(db, COLLECTIONS.ORGANIZATIONS) as CollectionReference<Organization>;
}

export function getProjectsCollection(): CollectionReference<Project> {
  if (!db) throw new Error('Firestore not initialized');
  return collection(db, COLLECTIONS.PROJECTS) as CollectionReference<Project>;
}

export function getMaterialsCollection(): CollectionReference<Material> {
  if (!db) throw new Error('Firestore not initialized');
  return collection(db, COLLECTIONS.MATERIALS) as CollectionReference<Material>;
}

export function getProjectMaterialGroupsCollection(): CollectionReference<ProjectMaterialGroup> {
  if (!db) throw new Error('Firestore not initialized');
  return collection(db, COLLECTIONS.PROJECT_MATERIAL_GROUPS) as CollectionReference<ProjectMaterialGroup>;
}

export function getVendorsCollection(): CollectionReference<Vendor> {
  if (!db) throw new Error('Firestore not initialized');
  return collection(db, COLLECTIONS.VENDORS) as CollectionReference<Vendor>;
}

export function getVendorMaterialsCollection(): CollectionReference<VendorMaterial> {
  if (!db) throw new Error('Firestore not initialized');
  return collection(db, COLLECTIONS.VENDOR_MATERIALS) as CollectionReference<VendorMaterial>;
}

export function getRequisitionsCollection(): CollectionReference<Requisition> {
  if (!db) throw new Error('Firestore not initialized');
  return collection(db, COLLECTIONS.REQUISITIONS) as CollectionReference<Requisition>;
}

export function getPurchaseOrdersCollection(): CollectionReference<PurchaseOrder> {
  if (!db) throw new Error('Firestore not initialized');
  return collection(db, COLLECTIONS.PURCHASE_ORDERS) as CollectionReference<PurchaseOrder>;
}

export function getShipmentsCollection(): CollectionReference<Shipment> {
  if (!db) throw new Error('Firestore not initialized');
  return collection(db, COLLECTIONS.SHIPMENTS) as CollectionReference<Shipment>;
}

export function getInventoryLocationsCollection(): CollectionReference<InventoryLocation> {
  if (!db) throw new Error('Firestore not initialized');
  return collection(db, COLLECTIONS.INVENTORY_LOCATIONS) as CollectionReference<InventoryLocation>;
}

export function getInventoryLotsCollection(): CollectionReference<InventoryLot> {
  if (!db) throw new Error('Firestore not initialized');
  return collection(db, COLLECTIONS.INVENTORY_LOTS) as CollectionReference<InventoryLot>;
}

export function getInventoryMovementsCollection(): CollectionReference<InventoryMovement> {
  if (!db) throw new Error('Firestore not initialized');
  return collection(db, COLLECTIONS.INVENTORY_MOVEMENTS) as CollectionReference<InventoryMovement>;
}

// Subcollection helpers for nested data
export function getProjectMaterialGroupsSubcollection(projectId: string): CollectionReference<ProjectMaterialGroup> {
  if (!db) throw new Error('Firestore not initialized');
  return collection(db, COLLECTIONS.PROJECTS, projectId, 'materialGroups') as CollectionReference<ProjectMaterialGroup>;
}

export function getVendorMaterialsSubcollection(vendorId: string): CollectionReference<VendorMaterial> {
  if (!db) throw new Error('Firestore not initialized');
  return collection(db, COLLECTIONS.VENDORS, vendorId, 'materials') as CollectionReference<VendorMaterial>;
}

export function getInventoryLotsSubcollection(locationId: string): CollectionReference<InventoryLot> {
  if (!db) throw new Error('Firestore not initialized');
  return collection(db, COLLECTIONS.INVENTORY_LOCATIONS, locationId, 'lots') as CollectionReference<InventoryLot>;
}

// Document reference helpers
export function getUserDocRef(userId: string): DocumentReference<User> {
  if (!db) throw new Error('Firestore not initialized');
  return collection(db, COLLECTIONS.USERS).doc(userId) as DocumentReference<User>;
}

export function getOrganizationDocRef(orgId: string): DocumentReference<Organization> {
  if (!db) throw new Error('Firestore not initialized');
  return collection(db, COLLECTIONS.ORGANIZATIONS).doc(orgId) as DocumentReference<Organization>;
}

export function getProjectDocRef(projectId: string): DocumentReference<Project> {
  if (!db) throw new Error('Firestore not initialized');
  return collection(db, COLLECTIONS.PROJECTS).doc(projectId) as DocumentReference<Project>;
}

export function getMaterialDocRef(materialId: string): DocumentReference<Material> {
  if (!db) throw new Error('Firestore not initialized');
  return collection(db, COLLECTIONS.MATERIALS).doc(materialId) as DocumentReference<Material>;
}

export function getVendorDocRef(vendorId: string): DocumentReference<Vendor> {
  if (!db) throw new Error('Firestore not initialized');
  return collection(db, COLLECTIONS.VENDORS).doc(vendorId) as DocumentReference<Vendor>;
}

export function getRequisitionDocRef(requisitionId: string): DocumentReference<Requisition> {
  if (!db) throw new Error('Firestore not initialized');
  return collection(db, COLLECTIONS.REQUISITIONS).doc(requisitionId) as DocumentReference<Requisition>;
}

export function getPurchaseOrderDocRef(poId: string): DocumentReference<PurchaseOrder> {
  if (!db) throw new Error('Firestore not initialized');
  return collection(db, COLLECTIONS.PURCHASE_ORDERS).doc(poId) as DocumentReference<PurchaseOrder>;
}

export function getShipmentDocRef(shipmentId: string): DocumentReference<Shipment> {
  if (!db) throw new Error('Firestore not initialized');
  return collection(db, COLLECTIONS.SHIPMENTS).doc(shipmentId) as DocumentReference<Shipment>;
}

export function getInventoryLocationDocRef(locationId: string): DocumentReference<InventoryLocation> {
  if (!db) throw new Error('Firestore not initialized');
  return collection(db, COLLECTIONS.INVENTORY_LOCATIONS).doc(locationId) as DocumentReference<InventoryLocation>;
}

export function getInventoryLotDocRef(lotId: string): DocumentReference<InventoryLot> {
  if (!db) throw new Error('Firestore not initialized');
  return collection(db, COLLECTIONS.INVENTORY_LOTS).doc(lotId) as DocumentReference<InventoryLot>;
}

export function getInventoryMovementDocRef(movementId: string): DocumentReference<InventoryMovement> {
  if (!db) throw new Error('Firestore not initialized');
  return collection(db, COLLECTIONS.INVENTORY_MOVEMENTS).doc(movementId) as DocumentReference<InventoryMovement>;
}
