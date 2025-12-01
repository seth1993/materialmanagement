import { Timestamp } from 'firebase/firestore';

// Material interface (extending the existing one)
export interface Material {
  id: string;
  name: string;
  quantity: number;
  category: string;
  createdAt: Date;
  userId: string;
}

// Purchase Order Line Item
export interface POLineItem {
  id: string;
  materialId: string;
  materialName: string;
  expectedQuantity: number;
  unitPrice?: number;
  notes?: string;
}

// Purchase Order
export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId?: string;
  supplierName: string;
  jobsiteId?: string;
  jobsiteName: string;
  expectedDeliveryDate: Date;
  status: 'pending' | 'partial' | 'delivered' | 'cancelled';
  lineItems: POLineItem[];
  createdAt: Date;
  createdBy: string;
  userId: string;
  notes?: string;
}

// Delivery Line Item Status
export type DeliveryLineItemStatus = 'ok' | 'short' | 'over' | 'damaged';

// Delivery Line Item
export interface DeliveryLineItem {
  id: string;
  poLineItemId: string;
  materialId: string;
  materialName: string;
  expectedQuantity: number;
  actualQuantity: number;
  status: DeliveryLineItemStatus;
  notes?: string;
  damageDescription?: string;
}

// Delivery
export interface Delivery {
  id: string;
  purchaseOrderId: string;
  poNumber: string;
  deliveryDate: Date;
  receivedBy: string;
  lineItems: DeliveryLineItem[];
  status: 'pending' | 'confirmed' | 'issues';
  createdAt: Date;
  userId: string;
  notes?: string;
}

// Shipment Issue
export interface ShipmentIssue {
  id: string;
  deliveryId: string;
  purchaseOrderId: string;
  poLineItemId: string;
  materialId: string;
  materialName: string;
  issueType: 'short' | 'over' | 'damaged';
  expectedQuantity: number;
  actualQuantity: number;
  quantityDifference: number;
  description: string;
  status: 'open' | 'resolved' | 'closed';
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolutionNotes?: string;
  userId: string;
}

// Form interfaces for creating/editing
export interface CreatePOLineItemForm {
  materialId: string;
  materialName: string;
  expectedQuantity: number;
  unitPrice?: number;
  notes?: string;
}

export interface CreatePurchaseOrderForm {
  poNumber: string;
  supplierName: string;
  jobsiteName: string;
  expectedDeliveryDate: Date;
  lineItems: CreatePOLineItemForm[];
  notes?: string;
}

export interface DeliveryConfirmationForm {
  purchaseOrderId: string;
  deliveryDate: Date;
  receivedBy: string;
  lineItems: {
    poLineItemId: string;
    status: DeliveryLineItemStatus;
    actualQuantity: number;
    notes?: string;
    damageDescription?: string;
  }[];
  notes?: string;
}
