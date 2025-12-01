import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SyncLog, SyncStatus, SyncError } from '@/types/integration';

const SYNC_LOGS_COLLECTION = 'syncLogs';

/**
 * Convert Firestore document to SyncLog interface
 */
function firestoreToSyncLog(doc: any): SyncLog {
  const data = doc.data();
  return {
    id: doc.id,
    integrationId: data.integrationId,
    status: data.status as SyncStatus,
    startedAt: data.startedAt?.toDate() || new Date(),
    completedAt: data.completedAt?.toDate(),
    projectsProcessed: data.projectsProcessed || 0,
    projectsCreated: data.projectsCreated || 0,
    projectsUpdated: data.projectsUpdated || 0,
    projectsSkipped: data.projectsSkipped || 0,
    errors: data.errors || [],
    userId: data.userId
  };
}

/**
 * Convert SyncLog to Firestore document data
 */
function syncLogToFirestore(syncLog: Partial<SyncLog>) {
  const data: any = { ...syncLog };
  
  // Convert dates to Firestore Timestamps
  if (data.startedAt) data.startedAt = Timestamp.fromDate(data.startedAt);
  if (data.completedAt) data.completedAt = Timestamp.fromDate(data.completedAt);
  
  // Convert error timestamps
  if (data.errors) {
    data.errors = data.errors.map((error: SyncError) => ({
      ...error,
      timestamp: error.timestamp instanceof Date ? Timestamp.fromDate(error.timestamp) : error.timestamp
    }));
  }
  
  // Remove id field as it's handled separately
  delete data.id;
  
  return data;
}

/**
 * Create a new sync log entry
 */
export async function createSyncLog(
  userId: string,
  integrationId: string,
  status: SyncStatus = SyncStatus.PENDING
): Promise<string> {
  if (!db) throw new Error('Firestore not initialized');
  
  const syncLog: Omit<SyncLog, 'id'> = {
    integrationId,
    status,
    startedAt: new Date(),
    projectsProcessed: 0,
    projectsCreated: 0,
    projectsUpdated: 0,
    projectsSkipped: 0,
    errors: [],
    userId
  };
  
  const docRef = await addDoc(collection(db, SYNC_LOGS_COLLECTION), syncLogToFirestore(syncLog));
  return docRef.id;
}

/**
 * Update an existing sync log
 */
export async function updateSyncLog(
  syncLogId: string,
  updates: Partial<Omit<SyncLog, 'id' | 'userId' | 'integrationId' | 'startedAt'>>
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');
  
  const docRef = doc(db, SYNC_LOGS_COLLECTION, syncLogId);
  await updateDoc(docRef, syncLogToFirestore(updates));
}

/**
 * Complete a sync log with final status and stats
 */
export async function completeSyncLog(
  syncLogId: string,
  status: SyncStatus,
  stats: {
    projectsProcessed: number;
    projectsCreated: number;
    projectsUpdated: number;
    projectsSkipped: number;
  },
  errors: SyncError[] = []
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');
  
  const updates = {
    status,
    completedAt: new Date(),
    ...stats,
    errors
  };
  
  await updateSyncLog(syncLogId, updates);
}

/**
 * Add an error to a sync log
 */
export async function addSyncError(syncLogId: string, error: SyncError): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');
  
  // Get current sync log
  const syncLog = await getSyncLog(syncLogId);
  if (!syncLog) throw new Error('Sync log not found');
  
  // Add new error to existing errors
  const updatedErrors = [...syncLog.errors, error];
  
  await updateSyncLog(syncLogId, { errors: updatedErrors });
}

/**
 * Get a sync log by ID
 */
export async function getSyncLog(syncLogId: string): Promise<SyncLog | null> {
  if (!db) throw new Error('Firestore not initialized');
  
  const docRef = doc(db, SYNC_LOGS_COLLECTION, syncLogId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return firestoreToSyncLog(docSnap);
  }
  
  return null;
}

/**
 * Get sync logs for a user
 */
export async function getUserSyncLogs(userId: string, limitCount: number = 50): Promise<SyncLog[]> {
  if (!db) throw new Error('Firestore not initialized');
  
  const q = query(
    collection(db, SYNC_LOGS_COLLECTION),
    where('userId', '==', userId),
    orderBy('startedAt', 'desc'),
    limit(limitCount)
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(firestoreToSyncLog);
}

/**
 * Get sync logs for a specific integration
 */
export async function getIntegrationSyncLogs(integrationId: string, limitCount: number = 20): Promise<SyncLog[]> {
  if (!db) throw new Error('Firestore not initialized');
  
  const q = query(
    collection(db, SYNC_LOGS_COLLECTION),
    where('integrationId', '==', integrationId),
    orderBy('startedAt', 'desc'),
    limit(limitCount)
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(firestoreToSyncLog);
}

/**
 * Get the latest sync log for an integration
 */
export async function getLatestSyncLog(integrationId: string): Promise<SyncLog | null> {
  if (!db) throw new Error('Firestore not initialized');
  
  const q = query(
    collection(db, SYNC_LOGS_COLLECTION),
    where('integrationId', '==', integrationId),
    orderBy('startedAt', 'desc'),
    limit(1)
  );
  
  const querySnapshot = await getDocs(q);
  
  if (!querySnapshot.empty) {
    return firestoreToSyncLog(querySnapshot.docs[0]);
  }
  
  return null;
}

/**
 * Get sync logs by status
 */
export async function getSyncLogsByStatus(userId: string, status: SyncStatus, limitCount: number = 20): Promise<SyncLog[]> {
  if (!db) throw new Error('Firestore not initialized');
  
  const q = query(
    collection(db, SYNC_LOGS_COLLECTION),
    where('userId', '==', userId),
    where('status', '==', status),
    orderBy('startedAt', 'desc'),
    limit(limitCount)
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(firestoreToSyncLog);
}

/**
 * Get failed sync logs for troubleshooting
 */
export async function getFailedSyncLogs(userId: string, limitCount: number = 10): Promise<SyncLog[]> {
  return getSyncLogsByStatus(userId, SyncStatus.FAILED, limitCount);
}

/**
 * Get in-progress sync logs
 */
export async function getInProgressSyncLogs(userId: string): Promise<SyncLog[]> {
  return getSyncLogsByStatus(userId, SyncStatus.IN_PROGRESS, 10);
}

/**
 * Check if there's an active sync for an integration
 */
export async function hasActiveSyncLog(integrationId: string): Promise<boolean> {
  if (!db) throw new Error('Firestore not initialized');
  
  const q = query(
    collection(db, SYNC_LOGS_COLLECTION),
    where('integrationId', '==', integrationId),
    where('status', 'in', [SyncStatus.PENDING, SyncStatus.IN_PROGRESS]),
    limit(1)
  );
  
  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
}
