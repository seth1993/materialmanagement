// Firestore collection names and configuration

export const COLLECTIONS = {
  MATERIALS: 'materials',
  REQUISITIONS: 'requisitions',
  PURCHASE_ORDERS: 'purchaseOrders',
  VENDORS: 'vendors',
  MATERIAL_VENDORS: 'materialVendors',
  PROCUREMENT_CONFIG: 'procurementConfig',
  AUDIT_LOGS: 'auditLogs'
} as const;

// Firestore document converters for proper date handling
import { 
  DocumentData, 
  QueryDocumentSnapshot, 
  SnapshotOptions,
  Timestamp 
} from 'firebase/firestore';
import { 
  Requisition, 
  PurchaseOrder, 
  Vendor, 
  ProcurementAuditLog,
  ProcurementConfig,
  MaterialVendor
} from '@/types/procurement';

// Helper function to convert Firestore timestamps to Date objects
const convertTimestamps = (data: any): any => {
  if (!data) return data;
  
  const converted = { ...data };
  
  // Convert common timestamp fields
  const timestampFields = [
    'createdAt', 'updatedAt', 'approvedAt', 'rejectedAt', 
    'sentAt', 'deliveryDate', 'requiredDate', 'urgencyDate',
    'lastOrderDate', 'timestamp'
  ];
  
  timestampFields.forEach(field => {
    if (converted[field] && converted[field].toDate) {
      converted[field] = converted[field].toDate();
    }
  });
  
  // Convert nested arrays with timestamps (like requisition lines)
  if (converted.lines && Array.isArray(converted.lines)) {
    converted.lines = converted.lines.map((line: any) => convertTimestamps(line));
  }
  
  return converted;
};

// Requisition converter
export const requisitionConverter = {
  toFirestore(requisition: Requisition): DocumentData {
    const data = { ...requisition };
    
    // Convert Date objects to Firestore Timestamps
    if (data.createdAt) data.createdAt = Timestamp.fromDate(data.createdAt);
    if (data.updatedAt) data.updatedAt = Timestamp.fromDate(data.updatedAt);
    if (data.approvedAt) data.approvedAt = Timestamp.fromDate(data.approvedAt);
    if (data.rejectedAt) data.rejectedAt = Timestamp.fromDate(data.rejectedAt);
    if (data.requiredDate) data.requiredDate = Timestamp.fromDate(data.requiredDate);
    
    // Convert dates in lines
    if (data.lines) {
      data.lines = data.lines.map(line => ({
        ...line,
        urgencyDate: line.urgencyDate ? Timestamp.fromDate(line.urgencyDate) : undefined
      }));
    }
    
    return data;
  },
  
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): Requisition {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      ...convertTimestamps(data)
    } as Requisition;
  }
};

// Purchase Order converter
export const purchaseOrderConverter = {
  toFirestore(purchaseOrder: PurchaseOrder): DocumentData {
    const data = { ...purchaseOrder };
    
    // Convert Date objects to Firestore Timestamps
    if (data.createdAt) data.createdAt = Timestamp.fromDate(data.createdAt);
    if (data.updatedAt) data.updatedAt = Timestamp.fromDate(data.updatedAt);
    if (data.approvedAt) data.approvedAt = Timestamp.fromDate(data.approvedAt);
    if (data.sentAt) data.sentAt = Timestamp.fromDate(data.sentAt);
    if (data.deliveryDate) data.deliveryDate = Timestamp.fromDate(data.deliveryDate);
    
    return data;
  },
  
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): PurchaseOrder {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      ...convertTimestamps(data)
    } as PurchaseOrder;
  }
};

// Vendor converter
export const vendorConverter = {
  toFirestore(vendor: Vendor): DocumentData {
    const data = { ...vendor };
    
    if (data.createdAt) data.createdAt = Timestamp.fromDate(data.createdAt);
    if (data.updatedAt) data.updatedAt = Timestamp.fromDate(data.updatedAt);
    
    return data;
  },
  
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): Vendor {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      ...convertTimestamps(data)
    } as Vendor;
  }
};

// Material Vendor converter
export const materialVendorConverter = {
  toFirestore(materialVendor: MaterialVendor): DocumentData {
    const data = { ...materialVendor };
    
    if (data.lastOrderDate) data.lastOrderDate = Timestamp.fromDate(data.lastOrderDate);
    
    return data;
  },
  
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): MaterialVendor {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      ...convertTimestamps(data)
    } as MaterialVendor;
  }
};

// Audit Log converter
export const auditLogConverter = {
  toFirestore(auditLog: ProcurementAuditLog): DocumentData {
    const data = { ...auditLog };
    
    if (data.timestamp) data.timestamp = Timestamp.fromDate(data.timestamp);
    
    return data;
  },
  
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): ProcurementAuditLog {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      ...convertTimestamps(data)
    } as ProcurementAuditLog;
  }
};

// Procurement Config converter
export const procurementConfigConverter = {
  toFirestore(config: ProcurementConfig): DocumentData {
    return { ...config };
  },
  
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): ProcurementConfig {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      ...data
    } as ProcurementConfig;
  }
};

// Default procurement configuration
export const DEFAULT_PROCUREMENT_CONFIG: ProcurementConfig = {
  poNumberFormat: {
    prefix: 'PO',
    numberLength: 6,
    includeYear: true,
    includeMonth: false,
    separator: '-',
    currentCounter: 1
  },
  defaultCurrency: 'USD',
  requireApprovalForPO: true,
  autoAssignVendors: false,
  allowPartialConversion: true
};

// Firestore indexes that should be created for optimal performance
export const RECOMMENDED_INDEXES = [
  // Requisitions
  { collection: 'requisitions', fields: ['userId', 'status'] },
  { collection: 'requisitions', fields: ['status', 'createdAt'] },
  { collection: 'requisitions', fields: ['requestedBy', 'status'] },
  { collection: 'requisitions', fields: ['approvedBy', 'approvedAt'] },
  
  // Purchase Orders
  { collection: 'purchaseOrders', fields: ['userId', 'status'] },
  { collection: 'purchaseOrders', fields: ['vendorId', 'status'] },
  { collection: 'purchaseOrders', fields: ['createdBy', 'createdAt'] },
  { collection: 'purchaseOrders', fields: ['status', 'createdAt'] },
  
  // Vendors
  { collection: 'vendors', fields: ['userId', 'isActive'] },
  { collection: 'vendors', fields: ['name', 'isActive'] },
  
  // Material Vendors
  { collection: 'materialVendors', fields: ['materialId', 'isPreferred'] },
  { collection: 'materialVendors', fields: ['vendorId', 'isPreferred'] },
  
  // Audit Logs
  { collection: 'auditLogs', fields: ['entityType', 'entityId'] },
  { collection: 'auditLogs', fields: ['performedBy', 'timestamp'] },
  { collection: 'auditLogs', fields: ['userId', 'timestamp'] }
];
