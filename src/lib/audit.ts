import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  getDocs, 
  Timestamp,
  QueryConstraint,
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  AuditLog, 
  CreateAuditLogParams, 
  AuditLogFilter, 
  AuditLogQuery,
  EntityType,
  AuditAction 
} from '@/types/audit';
import { handleAuditError, safeAsync } from '@/lib/error-handling';

const AUDIT_COLLECTION = 'auditLogs';

/**
 * Creates an audit log entry in Firestore
 */
export async function createAuditLog(params: CreateAuditLogParams): Promise<string | null> {
  if (!db) {
    console.warn('Firebase not configured. Audit log not created.');
    return null;
  }

  return await safeAsync(async () => {
    const auditLog: Omit<AuditLog, 'id'> = {
      ...params,
      timestamp: new Date(),
    };

    const docRef = await addDoc(collection(db, AUDIT_COLLECTION), {
      ...auditLog,
      timestamp: Timestamp.fromDate(auditLog.timestamp),
    });

    console.log('Audit log created:', docRef.id);
    return docRef.id;
  }, null, (error) => handleAuditError(error, 'createAuditLog'));
}

/**
 * Queries audit logs with filtering and pagination
 */
export async function queryAuditLogs(
  queryParams: AuditLogQuery,
  lastDoc?: DocumentSnapshot
): Promise<{ logs: AuditLog[]; hasMore: boolean; lastDoc?: DocumentSnapshot }> {
  if (!db) {
    console.warn('Firebase not configured. Returning empty audit logs.');
    return { logs: [], hasMore: false };
  }

  try {
    const { filters, orderBy: orderByField = 'timestamp', orderDirection = 'desc' } = queryParams;
    const constraints: QueryConstraint[] = [];

    // Add filters
    if (filters.entityType) {
      constraints.push(where('entityType', '==', filters.entityType));
    }
    if (filters.action) {
      constraints.push(where('action', '==', filters.action));
    }
    if (filters.userId) {
      constraints.push(where('userId', '==', filters.userId));
    }
    if (filters.entityId) {
      constraints.push(where('entityId', '==', filters.entityId));
    }
    if (filters.startDate) {
      constraints.push(where('timestamp', '>=', Timestamp.fromDate(filters.startDate)));
    }
    if (filters.endDate) {
      constraints.push(where('timestamp', '<=', Timestamp.fromDate(filters.endDate)));
    }

    // Add ordering
    constraints.push(orderBy(orderByField, orderDirection));

    // Add pagination
    const pageLimit = filters.limit || 50;
    constraints.push(limit(pageLimit + 1)); // Get one extra to check if there are more

    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    const q = query(collection(db, AUDIT_COLLECTION), ...constraints);
    const querySnapshot = await getDocs(q);

    const logs: AuditLog[] = [];
    const docs = querySnapshot.docs;
    const hasMore = docs.length > pageLimit;

    // Process documents (excluding the extra one if present)
    const docsToProcess = hasMore ? docs.slice(0, -1) : docs;
    
    docsToProcess.forEach(doc => {
      const data = doc.data();
      logs.push({
        id: doc.id,
        ...data,
        timestamp: data.timestamp.toDate(),
      } as AuditLog);
    });

    return {
      logs,
      hasMore,
      lastDoc: docsToProcess.length > 0 ? docsToProcess[docsToProcess.length - 1] : undefined,
    };
  } catch (error) {
    console.error('Error querying audit logs:', error);
    return { logs: [], hasMore: false };
  }
}

/**
 * Helper function to log material creation
 */
export async function logMaterialCreate(
  userId: string,
  userEmail: string,
  userName: string | undefined,
  materialId: string,
  materialData: any
): Promise<void> {
  await createAuditLog({
    userId,
    userEmail,
    userName,
    entityType: EntityType.MATERIAL,
    entityId: materialId,
    action: AuditAction.CREATE,
    details: {
      newState: materialData,
      reason: 'Material created by user',
    },
  });
}

/**
 * Helper function to log material update
 */
export async function logMaterialUpdate(
  userId: string,
  userEmail: string,
  userName: string | undefined,
  materialId: string,
  previousData: any,
  newData: any,
  changedFields: string[]
): Promise<void> {
  await createAuditLog({
    userId,
    userEmail,
    userName,
    entityType: EntityType.MATERIAL,
    entityId: materialId,
    action: AuditAction.UPDATE,
    details: {
      previousState: previousData,
      newState: newData,
      changedFields,
      reason: 'Material updated by user',
    },
  });
}

/**
 * Helper function to log material deletion
 */
export async function logMaterialDelete(
  userId: string,
  userEmail: string,
  userName: string | undefined,
  materialId: string,
  materialData: any
): Promise<void> {
  await createAuditLog({
    userId,
    userEmail,
    userName,
    entityType: EntityType.MATERIAL,
    entityId: materialId,
    action: AuditAction.DELETE,
    details: {
      previousState: materialData,
      reason: 'Material deleted by user',
    },
  });
}

/**
 * Helper function to log status changes
 */
export async function logStatusChange(
  userId: string,
  userEmail: string,
  userName: string | undefined,
  entityType: EntityType,
  entityId: string,
  fromStatus: string,
  toStatus: string,
  reason?: string
): Promise<void> {
  await createAuditLog({
    userId,
    userEmail,
    userName,
    entityType,
    entityId,
    action: AuditAction.STATUS_CHANGE,
    details: {
      fromStatus,
      toStatus,
      reason: reason || 'Status changed by user',
    },
  });
}

/**
 * Helper function to get audit logs for a specific entity
 */
export async function getEntityAuditLogs(
  entityType: EntityType,
  entityId: string,
  limitCount: number = 20
): Promise<AuditLog[]> {
  const result = await queryAuditLogs({
    filters: {
      entityType,
      entityId,
      limit: limitCount,
    },
    orderBy: 'timestamp',
    orderDirection: 'desc',
  });

  return result.logs;
}

/**
 * Helper function to get recent audit logs
 */
export async function getRecentAuditLogs(limitCount: number = 50): Promise<AuditLog[]> {
  const result = await queryAuditLogs({
    filters: {
      limit: limitCount,
    },
    orderBy: 'timestamp',
    orderDirection: 'desc',
  });

  return result.logs;
}
