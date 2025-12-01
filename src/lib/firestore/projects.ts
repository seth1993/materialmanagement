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
  limit,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Project, ProjectCreateInput, ProjectUpdateInput, ProjectStatus } from '@/types/project';

const PROJECTS_COLLECTION = 'projects';

/**
 * Convert Firestore document to Project interface
 */
function firestoreToProject(doc: any): Project {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name,
    description: data.description,
    status: data.status as ProjectStatus,
    startDate: data.startDate?.toDate(),
    endDate: data.endDate?.toDate(),
    location: data.location,
    contractor: data.contractor,
    budget: data.budget,
    externalId: data.externalId,
    externalPlatform: data.externalPlatform,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    userId: data.userId,
    syncedAt: data.syncedAt?.toDate()
  };
}

/**
 * Convert Project to Firestore document data
 */
function projectToFirestore(project: Partial<Project>) {
  const data: any = { ...project };
  
  // Convert dates to Firestore Timestamps
  if (data.startDate) data.startDate = Timestamp.fromDate(data.startDate);
  if (data.endDate) data.endDate = Timestamp.fromDate(data.endDate);
  if (data.createdAt) data.createdAt = Timestamp.fromDate(data.createdAt);
  if (data.updatedAt) data.updatedAt = Timestamp.fromDate(data.updatedAt);
  if (data.syncedAt) data.syncedAt = Timestamp.fromDate(data.syncedAt);
  
  // Remove id field as it's handled separately
  delete data.id;
  
  return data;
}

/**
 * Create a new project
 */
export async function createProject(userId: string, projectData: ProjectCreateInput): Promise<string> {
  if (!db) throw new Error('Firestore not initialized');
  
  const now = new Date();
  const project: Omit<Project, 'id'> = {
    ...projectData,
    status: projectData.status || ProjectStatus.PLANNING,
    createdAt: now,
    updatedAt: now,
    userId
  };
  
  const docRef = await addDoc(collection(db, PROJECTS_COLLECTION), projectToFirestore(project));
  return docRef.id;
}

/**
 * Update an existing project
 */
export async function updateProject(projectId: string, updates: ProjectUpdateInput): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');
  
  const updateData = {
    ...updates,
    updatedAt: new Date()
  };
  
  const docRef = doc(db, PROJECTS_COLLECTION, projectId);
  await updateDoc(docRef, projectToFirestore(updateData));
}

/**
 * Delete a project
 */
export async function deleteProject(projectId: string): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');
  
  const docRef = doc(db, PROJECTS_COLLECTION, projectId);
  await deleteDoc(docRef);
}

/**
 * Get a project by ID
 */
export async function getProject(projectId: string): Promise<Project | null> {
  if (!db) throw new Error('Firestore not initialized');
  
  const docRef = doc(db, PROJECTS_COLLECTION, projectId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return firestoreToProject(docSnap);
  }
  
  return null;
}

/**
 * Get all projects for a user
 */
export async function getUserProjects(userId: string): Promise<Project[]> {
  if (!db) throw new Error('Firestore not initialized');
  
  const q = query(
    collection(db, PROJECTS_COLLECTION),
    where('userId', '==', userId),
    orderBy('updatedAt', 'desc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(firestoreToProject);
}

/**
 * Get projects by external platform
 */
export async function getProjectsByPlatform(userId: string, platform: string): Promise<Project[]> {
  if (!db) throw new Error('Firestore not initialized');
  
  const q = query(
    collection(db, PROJECTS_COLLECTION),
    where('userId', '==', userId),
    where('externalPlatform', '==', platform),
    orderBy('updatedAt', 'desc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(firestoreToProject);
}

/**
 * Find project by external ID
 */
export async function getProjectByExternalId(userId: string, externalId: string, platform: string): Promise<Project | null> {
  if (!db) throw new Error('Firestore not initialized');
  
  const q = query(
    collection(db, PROJECTS_COLLECTION),
    where('userId', '==', userId),
    where('externalId', '==', externalId),
    where('externalPlatform', '==', platform),
    limit(1)
  );
  
  const querySnapshot = await getDocs(q);
  
  if (!querySnapshot.empty) {
    return firestoreToProject(querySnapshot.docs[0]);
  }
  
  return null;
}

/**
 * Create or update a project from external sync
 */
export async function upsertProjectFromSync(
  userId: string, 
  externalId: string, 
  platform: string, 
  projectData: ProjectCreateInput
): Promise<{ projectId: string; isNew: boolean }> {
  if (!db) throw new Error('Firestore not initialized');
  
  // Check if project already exists
  const existingProject = await getProjectByExternalId(userId, externalId, platform);
  
  const now = new Date();
  
  if (existingProject) {
    // Update existing project
    const updates: ProjectUpdateInput & { syncedAt: Date } = {
      ...projectData,
      syncedAt: now
    };
    
    await updateProject(existingProject.id, updates);
    return { projectId: existingProject.id, isNew: false };
  } else {
    // Create new project
    const newProjectData: ProjectCreateInput & { externalId: string; externalPlatform: string; syncedAt: Date } = {
      ...projectData,
      externalId,
      externalPlatform: platform,
      syncedAt: now
    };
    
    const projectId = await createProject(userId, newProjectData);
    return { projectId, isNew: true };
  }
}

/**
 * Get projects that need syncing (haven't been synced recently)
 */
export async function getProjectsNeedingSync(userId: string, platform: string, maxAge: number = 24 * 60 * 60 * 1000): Promise<Project[]> {
  if (!db) throw new Error('Firestore not initialized');
  
  const cutoffDate = new Date(Date.now() - maxAge);
  
  const q = query(
    collection(db, PROJECTS_COLLECTION),
    where('userId', '==', userId),
    where('externalPlatform', '==', platform),
    where('syncedAt', '<', Timestamp.fromDate(cutoffDate)),
    orderBy('syncedAt', 'asc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(firestoreToProject);
}
