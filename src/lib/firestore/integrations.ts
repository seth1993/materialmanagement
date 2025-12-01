import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  IntegrationConfig, 
  IntegrationPlatform, 
  SyncFrequency, 
  ConflictResolution 
} from '@/types/integration';

const INTEGRATIONS_COLLECTION = 'integrations';

/**
 * Convert Firestore document to IntegrationConfig interface
 */
function firestoreToIntegration(doc: any): IntegrationConfig {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name,
    platform: data.platform as IntegrationPlatform,
    isEnabled: data.isEnabled,
    credentials: data.credentials || {},
    settings: data.settings || {},
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    userId: data.userId,
    lastSyncAt: data.lastSyncAt?.toDate()
  };
}

/**
 * Convert IntegrationConfig to Firestore document data
 */
function integrationToFirestore(integration: Partial<IntegrationConfig>) {
  const data: any = { ...integration };
  
  // Convert dates to Firestore Timestamps
  if (data.createdAt) data.createdAt = Timestamp.fromDate(data.createdAt);
  if (data.updatedAt) data.updatedAt = Timestamp.fromDate(data.updatedAt);
  if (data.lastSyncAt) data.lastSyncAt = Timestamp.fromDate(data.lastSyncAt);
  
  // Remove id field as it's handled separately
  delete data.id;
  
  return data;
}

/**
 * Create a new integration configuration
 */
export async function createIntegration(
  userId: string, 
  name: string, 
  platform: IntegrationPlatform,
  credentials: any = {},
  settings: any = {}
): Promise<string> {
  if (!db) throw new Error('Firestore not initialized');
  
  const now = new Date();
  const integration: Omit<IntegrationConfig, 'id'> = {
    name,
    platform,
    isEnabled: false, // Start disabled until configured
    credentials,
    settings: {
      syncFrequency: SyncFrequency.MANUAL,
      autoSync: false,
      syncProjects: true,
      syncMaterials: false,
      conflictResolution: ConflictResolution.EXTERNAL_WINS,
      ...settings
    },
    createdAt: now,
    updatedAt: now,
    userId
  };
  
  const docRef = await addDoc(collection(db, INTEGRATIONS_COLLECTION), integrationToFirestore(integration));
  return docRef.id;
}

/**
 * Update an existing integration configuration
 */
export async function updateIntegration(
  integrationId: string, 
  updates: Partial<Omit<IntegrationConfig, 'id' | 'userId' | 'createdAt'>>
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');
  
  const updateData = {
    ...updates,
    updatedAt: new Date()
  };
  
  const docRef = doc(db, INTEGRATIONS_COLLECTION, integrationId);
  await updateDoc(docRef, integrationToFirestore(updateData));
}

/**
 * Delete an integration configuration
 */
export async function deleteIntegration(integrationId: string): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');
  
  const docRef = doc(db, INTEGRATIONS_COLLECTION, integrationId);
  await deleteDoc(docRef);
}

/**
 * Get an integration configuration by ID
 */
export async function getIntegration(integrationId: string): Promise<IntegrationConfig | null> {
  if (!db) throw new Error('Firestore not initialized');
  
  const docRef = doc(db, INTEGRATIONS_COLLECTION, integrationId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return firestoreToIntegration(docSnap);
  }
  
  return null;
}

/**
 * Get all integration configurations for a user
 */
export async function getUserIntegrations(userId: string): Promise<IntegrationConfig[]> {
  if (!db) throw new Error('Firestore not initialized');
  
  const q = query(
    collection(db, INTEGRATIONS_COLLECTION),
    where('userId', '==', userId),
    orderBy('updatedAt', 'desc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(firestoreToIntegration);
}

/**
 * Get enabled integration configurations for a user
 */
export async function getEnabledIntegrations(userId: string): Promise<IntegrationConfig[]> {
  if (!db) throw new Error('Firestore not initialized');
  
  const q = query(
    collection(db, INTEGRATIONS_COLLECTION),
    where('userId', '==', userId),
    where('isEnabled', '==', true),
    orderBy('updatedAt', 'desc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(firestoreToIntegration);
}

/**
 * Get integration configurations by platform
 */
export async function getIntegrationsByPlatform(userId: string, platform: IntegrationPlatform): Promise<IntegrationConfig[]> {
  if (!db) throw new Error('Firestore not initialized');
  
  const q = query(
    collection(db, INTEGRATIONS_COLLECTION),
    where('userId', '==', userId),
    where('platform', '==', platform),
    orderBy('updatedAt', 'desc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(firestoreToIntegration);
}

/**
 * Update last sync timestamp for an integration
 */
export async function updateLastSyncTime(integrationId: string, syncTime: Date = new Date()): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');
  
  const docRef = doc(db, INTEGRATIONS_COLLECTION, integrationId);
  await updateDoc(docRef, {
    lastSyncAt: Timestamp.fromDate(syncTime),
    updatedAt: Timestamp.fromDate(new Date())
  });
}

/**
 * Toggle integration enabled status
 */
export async function toggleIntegrationStatus(integrationId: string, isEnabled: boolean): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');
  
  const docRef = doc(db, INTEGRATIONS_COLLECTION, integrationId);
  await updateDoc(docRef, {
    isEnabled,
    updatedAt: Timestamp.fromDate(new Date())
  });
}

/**
 * Update integration credentials
 */
export async function updateIntegrationCredentials(integrationId: string, credentials: any): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');
  
  const docRef = doc(db, INTEGRATIONS_COLLECTION, integrationId);
  await updateDoc(docRef, {
    credentials,
    updatedAt: Timestamp.fromDate(new Date())
  });
}

/**
 * Update integration settings
 */
export async function updateIntegrationSettings(integrationId: string, settings: any): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');
  
  const docRef = doc(db, INTEGRATIONS_COLLECTION, integrationId);
  await updateDoc(docRef, {
    settings,
    updatedAt: Timestamp.fromDate(new Date())
  });
}
