import { Timestamp } from 'firebase/firestore';
import {
  UserRef,
  OrganizationRef,
  ProjectRef,
  MaterialRef,
  VendorRef,
  InventoryLocationRef,
  InventoryLotRef,
  AuditFields,
  ProjectStatus,
  RequisitionStatus,
  PurchaseOrderStatus,
  ShipmentStatus,
  InventoryMovementType,
  UserRole,
  Priority
} from './firestore';

// Core domain entities

export interface User extends AuditFields {
  id: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  organizationId: string;
  isActive: boolean;
  lastLoginAt?: Timestamp;
  profileImageUrl?: string;
  phoneNumber?: string;
  department?: string;
  jobTitle?: string;
}

export interface Organization extends AuditFields {
  id: string;
  name: string;
  description?: string;
  address?: Address;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  logoUrl?: string;
  isActive: boolean;
  settings: OrganizationSettings;
}

export interface OrganizationSettings {
  allowSelfRegistration: boolean;
  defaultUserRole: UserRole;
  requireApprovalForRequisitions: boolean;
  autoCreatePurchaseOrders: boolean;
  inventoryTrackingEnabled: boolean;
  multiLocationEnabled: boolean;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface Project extends AuditFields {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  managerId: string; // User ID
  status: ProjectStatus;
  startDate?: Timestamp;
  endDate?: Timestamp;
  budget?: number;
  currency?: string;
  location?: Address;
  tags?: string[];
  isActive: boolean;
}

export interface Material extends AuditFields {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  category: string;
  subcategory?: string;
  unit: string; // e.g., 'each', 'kg', 'lbs', 'm', 'ft'
  unitCost?: number;
  currency?: string;
  specifications?: Record<string, any>;
  tags?: string[];
  isActive: boolean;
  organizationId: string;
  // Vendor information
  preferredVendorId?: string;
  alternateVendorIds?: string[];
  // Inventory settings
  trackInventory: boolean;
  minimumStock?: number;
  maximumStock?: number;
  reorderPoint?: number;
  reorderQuantity?: number;
}

export interface ProjectMaterialGroup extends AuditFields {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  lines: ProjectMaterialLine[];
  totalEstimatedCost?: number;
  currency?: string;
  isActive: boolean;
}

export interface ProjectMaterialLine {
  id: string;
  materialId: string;
  quantity: number;
  estimatedUnitCost?: number;
  totalEstimatedCost?: number;
  notes?: string;
  priority: Priority;
  requiredDate?: Timestamp;
}

export interface Vendor extends AuditFields {
  id: string;
  name: string;
  description?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: Address;
  taxId?: string;
  paymentTerms?: string;
  rating?: number; // 1-5 stars
  isActive: boolean;
  organizationId: string;
  tags?: string[];
}

export interface VendorMaterial extends AuditFields {
  id: string;
  vendorId: string;
  materialId: string;
  vendorSku?: string;
  vendorPartNumber?: string;
  unitCost: number;
  currency: string;
  minimumOrderQuantity?: number;
  leadTimeDays?: number;
  isPreferred: boolean;
  isActive: boolean;
  lastUpdatedPrice?: Timestamp;
  notes?: string;
}

export interface Requisition extends AuditFields {
  id: string;
  number: string; // Auto-generated requisition number
  projectId?: string;
  requestedById: string; // User ID
  approvedById?: string; // User ID
  status: RequisitionStatus;
  priority: Priority;
  requestedDate: Timestamp;
  requiredDate?: Timestamp;
  approvedDate?: Timestamp;
  lines: RequisitionLine[];
  totalEstimatedCost?: number;
  currency?: string;
  notes?: string;
  organizationId: string;
}

export interface RequisitionLine {
  id: string;
  materialId: string;
  quantity: number;
  estimatedUnitCost?: number;
  totalEstimatedCost?: number;
  notes?: string;
  approvedQuantity?: number;
  purchaseOrderLineId?: string; // Reference to PO line when ordered
}

export interface PurchaseOrder extends AuditFields {
  id: string;
  number: string; // Auto-generated PO number
  vendorId: string;
  projectId?: string;
  createdById: string; // User ID
  status: PurchaseOrderStatus;
  orderDate: Timestamp;
  expectedDeliveryDate?: Timestamp;
  lines: PurchaseOrderLine[];
  subtotal: number;
  taxAmount?: number;
  shippingAmount?: number;
  totalAmount: number;
  currency: string;
  notes?: string;
  organizationId: string;
  // Delivery information
  deliveryAddress?: Address;
  deliveryInstructions?: string;
}

export interface PurchaseOrderLine {
  id: string;
  materialId: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  receivedQuantity?: number;
  notes?: string;
  requisitionLineIds?: string[]; // References to requisition lines
}

export interface Shipment extends AuditFields {
  id: string;
  number: string; // Tracking or shipment number
  purchaseOrderId: string;
  vendorId: string;
  status: ShipmentStatus;
  shippedDate?: Timestamp;
  expectedDeliveryDate?: Timestamp;
  actualDeliveryDate?: Timestamp;
  trackingNumber?: string;
  carrier?: string;
  events: ShipmentEvent[];
  organizationId: string;
  deliveryAddress?: Address;
  notes?: string;
}

export interface ShipmentEvent {
  id: string;
  timestamp: Timestamp;
  status: ShipmentStatus;
  location?: string;
  description: string;
  createdById: string; // User ID
}

export interface InventoryLocation extends AuditFields {
  id: string;
  name: string;
  description?: string;
  type: 'warehouse' | 'site' | 'office' | 'vehicle' | 'other';
  address?: Address;
  contactPerson?: string;
  contactPhone?: string;
  isActive: boolean;
  organizationId: string;
  parentLocationId?: string; // For hierarchical locations
}

export interface InventoryLot extends AuditFields {
  id: string;
  materialId: string;
  locationId: string;
  lotNumber?: string;
  batchNumber?: string;
  serialNumber?: string;
  quantity: number;
  unitCost?: number;
  totalCost?: number;
  currency?: string;
  receivedDate?: Timestamp;
  expirationDate?: Timestamp;
  purchaseOrderLineId?: string;
  shipmentId?: string;
  isActive: boolean;
  organizationId: string;
  notes?: string;
}

export interface InventoryMovement extends AuditFields {
  id: string;
  type: InventoryMovementType;
  materialId: string;
  fromLocationId?: string;
  toLocationId?: string;
  fromLotId?: string;
  toLotId?: string;
  quantity: number;
  unitCost?: number;
  totalCost?: number;
  currency?: string;
  movementDate: Timestamp;
  reason: string;
  referenceType?: 'requisition' | 'purchase_order' | 'shipment' | 'adjustment' | 'transfer';
  referenceId?: string;
  performedById: string; // User ID
  organizationId: string;
  notes?: string;
}

// Aggregate/computed types for reporting and analytics
export interface MaterialInventorySummary {
  materialId: string;
  totalQuantity: number;
  totalValue: number;
  currency: string;
  locations: {
    locationId: string;
    quantity: number;
    value: number;
  }[];
  lastMovementDate?: Timestamp;
  averageUnitCost?: number;
}

export interface ProjectMaterialSummary {
  projectId: string;
  totalMaterials: number;
  totalEstimatedCost: number;
  totalActualCost: number;
  currency: string;
  materialsRequested: number;
  materialsOrdered: number;
  materialsReceived: number;
  completionPercentage: number;
}

export interface VendorPerformanceSummary {
  vendorId: string;
  totalOrders: number;
  totalValue: number;
  currency: string;
  averageLeadTime: number;
  onTimeDeliveryRate: number;
  qualityRating: number;
  lastOrderDate?: Timestamp;
}
