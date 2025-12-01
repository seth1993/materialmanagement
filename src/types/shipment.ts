export interface Shipment {
  id: string;
  userId: string;
  requisitionId?: string;
  trackingNumber: string;
  status: ShipmentStatus;
  origin: string;
  destination: string;
  estimatedDelivery: Date;
  actualDelivery?: Date;
  carrier: string;
  items: ShipmentItem[];
  issues: ShipmentIssue[];
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
}

export enum ShipmentStatus {
  PENDING = 'pending',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  DELAYED = 'delayed',
  LOST = 'lost',
  DAMAGED = 'damaged',
  RETURNED = 'returned',
}

export interface ShipmentItem {
  materialName: string;
  quantity: number;
  category: string;
  condition: 'good' | 'damaged' | 'missing';
}

export interface ShipmentIssue {
  id: string;
  type: ShipmentIssueType;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  reportedBy: string;
  reportedAt: Date;
  resolvedAt?: Date;
  resolution?: string;
}

export enum ShipmentIssueType {
  DELAY = 'delay',
  DAMAGE = 'damage',
  MISSING_ITEMS = 'missing_items',
  WRONG_DELIVERY = 'wrong_delivery',
  QUALITY_ISSUE = 'quality_issue',
  DOCUMENTATION_ERROR = 'documentation_error',
}

export interface CreateShipmentData {
  requisitionId?: string;
  trackingNumber: string;
  origin: string;
  destination: string;
  estimatedDelivery: Date;
  carrier: string;
  items: ShipmentItem[];
  notes?: string;
}

export interface CreateShipmentIssueData {
  type: ShipmentIssueType;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}
