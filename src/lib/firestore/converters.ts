import { 
  DocumentData, 
  FirestoreDataConverter, 
  QueryDocumentSnapshot, 
  SnapshotOptions,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
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
  InventoryMovement,
  AuditFields
} from '@/types/domain';

// Helper function to add audit fields for new documents
export function withAuditFields<T>(data: Omit<T, keyof AuditFields>, userId: string): T & AuditFields {
  const now = serverTimestamp() as Timestamp;
  return {
    ...data,
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
    updatedBy: userId
  } as T & AuditFields;
}

// Helper function to update audit fields for existing documents
export function withUpdatedAuditFields<T extends AuditFields>(data: Partial<T>, userId: string): Partial<T> {
  return {
    ...data,
    updatedAt: serverTimestamp() as Timestamp,
    updatedBy: userId
  };
}

// Generic converter factory
function createConverter<T>(): FirestoreDataConverter<T> {
  return {
    toFirestore(data: T): DocumentData {
      return { ...data };
    },
    fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): T {
      const data = snapshot.data(options);
      return {
        id: snapshot.id,
        ...data
      } as T;
    }
  };
}

// Specific converters for each entity
export const userConverter: FirestoreDataConverter<User> = createConverter<User>();
export const organizationConverter: FirestoreDataConverter<Organization> = createConverter<Organization>();
export const projectConverter: FirestoreDataConverter<Project> = createConverter<Project>();
export const materialConverter: FirestoreDataConverter<Material> = createConverter<Material>();
export const projectMaterialGroupConverter: FirestoreDataConverter<ProjectMaterialGroup> = createConverter<ProjectMaterialGroup>();
export const vendorConverter: FirestoreDataConverter<Vendor> = createConverter<Vendor>();
export const vendorMaterialConverter: FirestoreDataConverter<VendorMaterial> = createConverter<VendorMaterial>();
export const requisitionConverter: FirestoreDataConverter<Requisition> = createConverter<Requisition>();
export const purchaseOrderConverter: FirestoreDataConverter<PurchaseOrder> = createConverter<PurchaseOrder>();
export const shipmentConverter: FirestoreDataConverter<Shipment> = createConverter<Shipment>();
export const inventoryLocationConverter: FirestoreDataConverter<InventoryLocation> = createConverter<InventoryLocation>();
export const inventoryLotConverter: FirestoreDataConverter<InventoryLot> = createConverter<InventoryLot>();
export const inventoryMovementConverter: FirestoreDataConverter<InventoryMovement> = createConverter<InventoryMovement>();

// Legacy material converter for backward compatibility
export const legacyMaterialConverter: FirestoreDataConverter<any> = {
  toFirestore(data: any): DocumentData {
    return { ...data };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): any {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      ...data,
      // Convert Firestore Timestamp to Date for legacy compatibility
      createdAt: data.createdAt?.toDate() || new Date()
    };
  }
};

// Utility functions for data transformation
export function timestampToDate(timestamp: Timestamp | undefined): Date | undefined {
  return timestamp?.toDate();
}

export function dateToTimestamp(date: Date | undefined): Timestamp | undefined {
  return date ? Timestamp.fromDate(date) : undefined;
}

// Validation helpers
export function validateRequiredFields<T>(data: Partial<T>, requiredFields: (keyof T)[]): void {
  const missingFields = requiredFields.filter(field => !data[field]);
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }
}

// Data sanitization helpers
export function sanitizeStringField(value: any): string | undefined {
  if (typeof value === 'string') {
    return value.trim() || undefined;
  }
  return undefined;
}

export function sanitizeNumberField(value: any): number | undefined {
  if (typeof value === 'number' && !isNaN(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return !isNaN(parsed) ? parsed : undefined;
  }
  return undefined;
}

export function sanitizeBooleanField(value: any): boolean {
  return Boolean(value);
}

// Array field helpers
export function sanitizeArrayField<T>(value: any, itemValidator?: (item: any) => T): T[] {
  if (!Array.isArray(value)) {
    return [];
  }
  
  if (itemValidator) {
    return value.map(itemValidator).filter(item => item !== undefined);
  }
  
  return value;
}

// Reference field helpers
export function sanitizeReferenceField(value: any): string | undefined {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  return undefined;
}
