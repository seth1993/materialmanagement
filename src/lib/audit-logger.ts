import { collection, addDoc, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface AuditEvent {
  action: string;
  userId: string;
  targetUserId?: string;
  resource?: string;
  resourceId?: string;
  details: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogQuery {
  userId?: string;
  action?: string;
  resource?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

// Log an audit event to Firestore
export async function logAuditEvent(event: AuditEvent): Promise<void> {
  if (!db) {
    console.warn('Firestore not initialized, skipping audit log');
    return;
  }

  try {
    // Add browser information if available
    const auditData = {
      ...event,
      timestamp: event.timestamp,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      // Note: IP address would need to be added server-side for security
    };

    await addDoc(collection(db, 'audit_logs'), auditData);
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Don't throw error to avoid breaking the main application flow
  }
}

// Query audit logs
export async function queryAuditLogs(queryParams: AuditLogQuery = {}): Promise<AuditEvent[]> {
  if (!db) {
    console.warn('Firestore not initialized, returning empty audit logs');
    return [];
  }

  try {
    let q = query(collection(db, 'audit_logs'));

    // Add filters
    if (queryParams.userId) {
      q = query(q, where('userId', '==', queryParams.userId));
    }

    if (queryParams.action) {
      q = query(q, where('action', '==', queryParams.action));
    }

    if (queryParams.resource) {
      q = query(q, where('resource', '==', queryParams.resource));
    }

    if (queryParams.startDate) {
      q = query(q, where('timestamp', '>=', queryParams.startDate));
    }

    if (queryParams.endDate) {
      q = query(q, where('timestamp', '<=', queryParams.endDate));
    }

    // Order by timestamp (most recent first)
    q = query(q, orderBy('timestamp', 'desc'));

    // Apply limit
    if (queryParams.limit) {
      q = query(q, limit(queryParams.limit));
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      ...doc.data(),
      timestamp: doc.data().timestamp.toDate(),
    })) as AuditEvent[];
  } catch (error) {
    console.error('Failed to query audit logs:', error);
    return [];
  }
}

// Log permission denial
export async function logPermissionDenial(
  userId: string,
  action: string,
  resource: string,
  requiredPermission: string,
  userRole?: string
): Promise<void> {
  await logAuditEvent({
    action: 'PERMISSION_DENIED',
    userId,
    resource,
    details: {
      deniedAction: action,
      requiredPermission,
      userRole,
      reason: 'Insufficient permissions',
    },
    timestamp: new Date(),
  });
}

// Log successful permission check
export async function logPermissionGranted(
  userId: string,
  action: string,
  resource: string,
  permission: string,
  userRole?: string
): Promise<void> {
  await logAuditEvent({
    action: 'PERMISSION_GRANTED',
    userId,
    resource,
    details: {
      grantedAction: action,
      permission,
      userRole,
    },
    timestamp: new Date(),
  });
}

// Log security events
export async function logSecurityEvent(
  type: 'SUSPICIOUS_ACTIVITY' | 'FAILED_LOGIN' | 'ACCOUNT_LOCKED' | 'PASSWORD_RESET',
  userId: string,
  details: Record<string, any>
): Promise<void> {
  await logAuditEvent({
    action: `SECURITY_${type}`,
    userId,
    details,
    timestamp: new Date(),
  });
}

// Common audit actions
export const AUDIT_ACTIONS = {
  // Authentication
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  USER_REGISTERED: 'USER_REGISTERED',
  USER_CREATED: 'USER_CREATED',
  
  // Role Management
  ROLE_CHANGED: 'ROLE_CHANGED',
  ROLE_ASSIGNED: 'ROLE_ASSIGNED',
  
  // Permissions
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  PERMISSION_GRANTED: 'PERMISSION_GRANTED',
  
  // Material Management
  MATERIAL_CREATED: 'MATERIAL_CREATED',
  MATERIAL_UPDATED: 'MATERIAL_UPDATED',
  MATERIAL_DELETED: 'MATERIAL_DELETED',
  MATERIAL_REQUEST_CREATED: 'MATERIAL_REQUEST_CREATED',
  MATERIAL_REQUEST_APPROVED: 'MATERIAL_REQUEST_APPROVED',
  MATERIAL_REQUEST_REJECTED: 'MATERIAL_REQUEST_REJECTED',
  
  // Inventory
  INVENTORY_UPDATED: 'INVENTORY_UPDATED',
  INVENTORY_TRANSFER: 'INVENTORY_TRANSFER',
  
  // Security
  SECURITY_SUSPICIOUS_ACTIVITY: 'SECURITY_SUSPICIOUS_ACTIVITY',
  SECURITY_FAILED_LOGIN: 'SECURITY_FAILED_LOGIN',
  SECURITY_ACCOUNT_LOCKED: 'SECURITY_ACCOUNT_LOCKED',
  SECURITY_PASSWORD_RESET: 'SECURITY_PASSWORD_RESET',
} as const;
