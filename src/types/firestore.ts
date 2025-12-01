import { Timestamp, DocumentReference } from 'firebase/firestore';

// Base types for Firestore operations
export interface FirestoreDocument {
  id: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AuditFields {
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string; // User ID
  updatedBy: string; // User ID
}

// Reference types for relationships
export type UserRef = DocumentReference;
export type OrganizationRef = DocumentReference;
export type ProjectRef = DocumentReference;
export type MaterialRef = DocumentReference;
export type VendorRef = DocumentReference;
export type InventoryLocationRef = DocumentReference;
export type InventoryLotRef = DocumentReference;

// Utility types for optional audit fields
export type WithAudit<T> = T & AuditFields;
export type WithId<T> = T & { id: string };
export type WithTimestamps<T> = T & { createdAt: Timestamp; updatedAt: Timestamp };

// Status enums
export enum ProjectStatus {
  PLANNING = 'planning',
  ACTIVE = 'active',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum RequisitionStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ORDERED = 'ordered',
  CANCELLED = 'cancelled'
}

export enum PurchaseOrderStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  ACKNOWLEDGED = 'acknowledged',
  PARTIALLY_RECEIVED = 'partially_received',
  RECEIVED = 'received',
  CANCELLED = 'cancelled'
}

export enum ShipmentStatus {
  PENDING = 'pending',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled'
}

export enum InventoryMovementType {
  RECEIPT = 'receipt',
  ISSUE = 'issue',
  TRANSFER = 'transfer',
  ADJUSTMENT = 'adjustment',
  RETURN = 'return'
}

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  USER = 'user',
  VIEWER = 'viewer'
}

// Priority levels
export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}
