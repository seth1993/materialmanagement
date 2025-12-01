export enum EntityType {
  MATERIAL = 'material',
  REQUISITION = 'requisition',
  PURCHASE_ORDER = 'purchase_order',
  SHIPMENT = 'shipment',
  INVENTORY_MOVEMENT = 'inventory_movement',
}

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  STATUS_CHANGE = 'status_change',
  APPROVE = 'approve',
  REJECT = 'reject',
  SUBMIT = 'submit',
  CANCEL = 'cancel',
}

export interface AuditLog {
  id?: string;
  userId: string;
  userEmail: string;
  userName?: string;
  timestamp: Date;
  entityType: EntityType;
  entityId: string;
  action: AuditAction;
  details: AuditDetails;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditDetails {
  // Previous state (for updates)
  previousState?: Record<string, any>;
  // New state (for creates/updates)
  newState?: Record<string, any>;
  // Additional context or reason
  reason?: string;
  // Changed fields (for updates)
  changedFields?: string[];
  // Status change specific
  fromStatus?: string;
  toStatus?: string;
  // Additional metadata
  metadata?: Record<string, any>;
}

export interface AuditLogFilter {
  startDate?: Date;
  endDate?: Date;
  entityType?: EntityType;
  action?: AuditAction;
  userId?: string;
  entityId?: string;
  limit?: number;
  offset?: number;
}

export interface AuditLogQuery {
  filters: AuditLogFilter;
  orderBy?: 'timestamp' | 'entityType' | 'action';
  orderDirection?: 'asc' | 'desc';
}

// Helper type for creating audit logs
export interface CreateAuditLogParams {
  userId: string;
  userEmail: string;
  userName?: string;
  entityType: EntityType;
  entityId: string;
  action: AuditAction;
  details: AuditDetails;
  ipAddress?: string;
  userAgent?: string;
}
