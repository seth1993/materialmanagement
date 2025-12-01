import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy,
  writeBatch,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Project, MaterialGroup, Material } from '@/types/project';

// Project operations
export const createProject = async (userId: string, name: string, description?: string): Promise<string> => {
  if (!db) throw new Error('Firebase not configured');
  
  const projectData = {
    name,
    description: description || '',
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  
  const docRef = await addDoc(collection(db, 'projects'), projectData);
  return docRef.id;
};

export const getProjects = async (userId: string): Promise<Project[]> => {
  if (!db) return [];
  
  const q = query(
    collection(db, 'projects'),
    where('userId', '==', userId),
    orderBy('updatedAt', 'desc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: (doc.data().createdAt as Timestamp)?.toDate() || new Date(),
    updatedAt: (doc.data().updatedAt as Timestamp)?.toDate() || new Date(),
  })) as Project[];
};

export const getProject = async (projectId: string): Promise<Project | null> => {
  if (!db) return null;
  
  const docRef = doc(db, 'projects', projectId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) return null;
  
  return {
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: (docSnap.data().createdAt as Timestamp)?.toDate() || new Date(),
    updatedAt: (docSnap.data().updatedAt as Timestamp)?.toDate() || new Date(),
  } as Project;
};

export const updateProject = async (projectId: string, updates: Partial<Pick<Project, 'name' | 'description'>>): Promise<void> => {
  if (!db) throw new Error('Firebase not configured');
  
  const docRef = doc(db, 'projects', projectId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

export const deleteProject = async (projectId: string): Promise<void> => {
  if (!db) throw new Error('Firebase not configured');
  
  const batch = writeBatch(db);
  
  // Delete all materials in the project
  const materialsQuery = query(collection(db, 'materials'), where('projectId', '==', projectId));
  const materialsSnapshot = await getDocs(materialsQuery);
  materialsSnapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  // Delete all material groups in the project
  const groupsQuery = query(collection(db, 'materialGroups'), where('projectId', '==', projectId));
  const groupsSnapshot = await getDocs(groupsQuery);
  groupsSnapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  // Delete the project
  batch.delete(doc(db, 'projects', projectId));
  
  await batch.commit();
};

// Material Group operations
export const createMaterialGroup = async (projectId: string, name: string, description?: string): Promise<string> => {
  if (!db) throw new Error('Firebase not configured');
  
  const groupData = {
    projectId,
    name,
    description: description || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  
  const docRef = await addDoc(collection(db, 'materialGroups'), groupData);
  return docRef.id;
};

export const getMaterialGroups = async (projectId: string): Promise<MaterialGroup[]> => {
  if (!db) return [];
  
  const q = query(
    collection(db, 'materialGroups'),
    where('projectId', '==', projectId),
    orderBy('name', 'asc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: (doc.data().createdAt as Timestamp)?.toDate() || new Date(),
    updatedAt: (doc.data().updatedAt as Timestamp)?.toDate() || new Date(),
  })) as MaterialGroup[];
};

export const getMaterialGroup = async (groupId: string): Promise<MaterialGroup | null> => {
  if (!db) return null;
  
  const docRef = doc(db, 'materialGroups', groupId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) return null;
  
  return {
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: (docSnap.data().createdAt as Timestamp)?.toDate() || new Date(),
    updatedAt: (docSnap.data().updatedAt as Timestamp)?.toDate() || new Date(),
  } as MaterialGroup;
};

export const updateMaterialGroup = async (groupId: string, updates: Partial<Pick<MaterialGroup, 'name' | 'description'>>): Promise<void> => {
  if (!db) throw new Error('Firebase not configured');
  
  const docRef = doc(db, 'materialGroups', groupId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

export const deleteMaterialGroup = async (groupId: string): Promise<void> => {
  if (!db) throw new Error('Firebase not configured');
  
  const batch = writeBatch(db);
  
  // Delete all materials in the group
  const materialsQuery = query(collection(db, 'materials'), where('materialGroupId', '==', groupId));
  const materialsSnapshot = await getDocs(materialsQuery);
  materialsSnapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  // Delete the material group
  batch.delete(doc(db, 'materialGroups', groupId));
  
  await batch.commit();
};

// Material operations
export const createMaterial = async (materialData: Omit<Material, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  if (!db) throw new Error('Firebase not configured');
  
  const data = {
    ...materialData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  
  const docRef = await addDoc(collection(db, 'materials'), data);
  return docRef.id;
};

export const getMaterials = async (materialGroupId: string): Promise<Material[]> => {
  if (!db) return [];
  
  const q = query(
    collection(db, 'materials'),
    where('materialGroupId', '==', materialGroupId),
    orderBy('name', 'asc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: (doc.data().createdAt as Timestamp)?.toDate() || new Date(),
    updatedAt: (doc.data().updatedAt as Timestamp)?.toDate() || new Date(),
  })) as Material[];
};

export const getMaterialsBySku = async (projectId: string, sku: string): Promise<Material[]> => {
  if (!db) return [];
  
  const q = query(
    collection(db, 'materials'),
    where('projectId', '==', projectId),
    where('sku', '==', sku)
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: (doc.data().createdAt as Timestamp)?.toDate() || new Date(),
    updatedAt: (doc.data().updatedAt as Timestamp)?.toDate() || new Date(),
  })) as Material[];
};

export const updateMaterial = async (materialId: string, updates: Partial<Omit<Material, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  if (!db) throw new Error('Firebase not configured');
  
  const docRef = doc(db, 'materials', materialId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

export const deleteMaterial = async (materialId: string): Promise<void> => {
  if (!db) throw new Error('Firebase not configured');
  
  await deleteDoc(doc(db, 'materials', materialId));
};

// Utility functions
export const findOrCreateMaterialGroup = async (projectId: string, groupName: string): Promise<string> => {
  if (!db) throw new Error('Firebase not configured');
  
  // Try to find existing group
  const q = query(
    collection(db, 'materialGroups'),
    where('projectId', '==', projectId),
    where('name', '==', groupName)
  );
  
  const querySnapshot = await getDocs(q);
  
  if (!querySnapshot.empty) {
    return querySnapshot.docs[0].id;
  }
  
  // Create new group if not found
  return await createMaterialGroup(projectId, groupName);
};
