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
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Project, 
  MaterialGroup, 
  Material, 
  CreateProjectData, 
  CreateMaterialGroupData, 
  CreateMaterialData 
} from '@/types/project';
import { 
  Vendor, 
  VendorQuote, 
  MaterialVendorSelection,
  CreateVendorData,
  VendorQuoteInput 
} from '@/types/vendor';

// Helper function to convert Firestore timestamp to Date
const timestampToDate = (timestamp: any): Date => {
  if (timestamp?.toDate) {
    return timestamp.toDate();
  }
  return timestamp instanceof Date ? timestamp : new Date(timestamp);
};

// Projects
export const createProject = async (userId: string, data: CreateProjectData): Promise<string> => {
  if (!db) throw new Error('Firebase not configured');
  
  const projectData = {
    ...data,
    userId,
    status: 'active' as const,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  
  const docRef = await addDoc(collection(db, 'projects'), projectData);
  return docRef.id;
};

export const getProjectsByUser = async (userId: string): Promise<Project[]> => {
  if (!db) return [];
  
  const q = query(
    collection(db, 'projects'), 
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: timestampToDate(doc.data().createdAt),
    updatedAt: timestampToDate(doc.data().updatedAt),
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
    createdAt: timestampToDate(docSnap.data().createdAt),
    updatedAt: timestampToDate(docSnap.data().updatedAt),
  } as Project;
};

export const updateProject = async (projectId: string, data: Partial<CreateProjectData>): Promise<void> => {
  if (!db) throw new Error('Firebase not configured');
  
  const docRef = doc(db, 'projects', projectId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
};

export const deleteProject = async (projectId: string): Promise<void> => {
  if (!db) throw new Error('Firebase not configured');
  
  const docRef = doc(db, 'projects', projectId);
  await deleteDoc(docRef);
};

// Material Groups
export const createMaterialGroup = async (projectId: string, data: CreateMaterialGroupData): Promise<string> => {
  if (!db) throw new Error('Firebase not configured');
  
  const groupData = {
    ...data,
    projectId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  
  const docRef = await addDoc(collection(db, 'materialGroups'), groupData);
  return docRef.id;
};

export const getMaterialGroupsByProject = async (projectId: string): Promise<MaterialGroup[]> => {
  if (!db) return [];
  
  const q = query(
    collection(db, 'materialGroups'), 
    where('projectId', '==', projectId),
    orderBy('createdAt', 'desc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: timestampToDate(doc.data().createdAt),
    updatedAt: timestampToDate(doc.data().updatedAt),
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
    createdAt: timestampToDate(docSnap.data().createdAt),
    updatedAt: timestampToDate(docSnap.data().updatedAt),
  } as MaterialGroup;
};

export const updateMaterialGroup = async (groupId: string, data: Partial<CreateMaterialGroupData>): Promise<void> => {
  if (!db) throw new Error('Firebase not configured');
  
  const docRef = doc(db, 'materialGroups', groupId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
};

export const deleteMaterialGroup = async (groupId: string): Promise<void> => {
  if (!db) throw new Error('Firebase not configured');
  
  const docRef = doc(db, 'materialGroups', groupId);
  await deleteDoc(docRef);
};

// Materials
export const createMaterial = async (materialGroupId: string, data: CreateMaterialData): Promise<string> => {
  if (!db) throw new Error('Firebase not configured');
  
  const materialData = {
    ...data,
    materialGroupId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  
  const docRef = await addDoc(collection(db, 'materials'), materialData);
  return docRef.id;
};

export const getMaterialsByGroup = async (materialGroupId: string): Promise<Material[]> => {
  if (!db) return [];
  
  const q = query(
    collection(db, 'materials'), 
    where('materialGroupId', '==', materialGroupId),
    orderBy('createdAt', 'desc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: timestampToDate(doc.data().createdAt),
    updatedAt: timestampToDate(doc.data().updatedAt),
  })) as Material[];
};

export const getMaterial = async (materialId: string): Promise<Material | null> => {
  if (!db) return null;
  
  const docRef = doc(db, 'materials', materialId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) return null;
  
  return {
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: timestampToDate(doc.data().createdAt),
    updatedAt: timestampToDate(doc.data().updatedAt),
  } as Material;
};

export const updateMaterial = async (materialId: string, data: Partial<CreateMaterialData>): Promise<void> => {
  if (!db) throw new Error('Firebase not configured');
  
  const docRef = doc(db, 'materials', materialId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
};

export const deleteMaterial = async (materialId: string): Promise<void> => {
  if (!db) throw new Error('Firebase not configured');
  
  const docRef = doc(db, 'materials', materialId);
  await deleteDoc(docRef);
};

// Vendors
export const createVendor = async (userId: string, data: CreateVendorData): Promise<string> => {
  if (!db) throw new Error('Firebase not configured');
  
  const vendorData = {
    ...data,
    userId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  
  const docRef = await addDoc(collection(db, 'vendors'), vendorData);
  return docRef.id;
};

export const getVendorsByUser = async (userId: string): Promise<Vendor[]> => {
  if (!db) return [];
  
  const q = query(
    collection(db, 'vendors'), 
    where('userId', '==', userId),
    orderBy('name', 'asc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: timestampToDate(doc.data().createdAt),
    updatedAt: timestampToDate(doc.data().updatedAt),
  })) as Vendor[];
};

export const getVendor = async (vendorId: string): Promise<Vendor | null> => {
  if (!db) return null;
  
  const docRef = doc(db, 'vendors', vendorId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) return null;
  
  return {
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: timestampToDate(docSnap.data().createdAt),
    updatedAt: timestampToDate(docSnap.data().updatedAt),
  } as Vendor;
};

// Vendor Quotes
export const createVendorQuote = async (materialId: string, data: VendorQuoteInput): Promise<string> => {
  if (!db) throw new Error('Firebase not configured');
  
  const quoteData = {
    ...data,
    materialId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    validUntil: data.validUntil ? Timestamp.fromDate(data.validUntil) : null,
  };
  
  const docRef = await addDoc(collection(db, 'vendorQuotes'), quoteData);
  return docRef.id;
};

export const getVendorQuotesByMaterial = async (materialId: string): Promise<VendorQuote[]> => {
  if (!db) return [];
  
  const q = query(
    collection(db, 'vendorQuotes'), 
    where('materialId', '==', materialId),
    orderBy('price', 'asc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: timestampToDate(doc.data().createdAt),
    updatedAt: timestampToDate(doc.data().updatedAt),
    validUntil: doc.data().validUntil ? timestampToDate(doc.data().validUntil) : undefined,
  })) as VendorQuote[];
};

export const updateVendorQuote = async (quoteId: string, data: Partial<VendorQuoteInput>): Promise<void> => {
  if (!db) throw new Error('Firebase not configured');
  
  const updateData: any = {
    ...data,
    updatedAt: Timestamp.now(),
  };
  
  if (data.validUntil) {
    updateData.validUntil = Timestamp.fromDate(data.validUntil);
  }
  
  const docRef = doc(db, 'vendorQuotes', quoteId);
  await updateDoc(docRef, updateData);
};

export const deleteVendorQuote = async (quoteId: string): Promise<void> => {
  if (!db) throw new Error('Firebase not configured');
  
  const docRef = doc(db, 'vendorQuotes', quoteId);
  await deleteDoc(docRef);
};

// Material Vendor Selections
export const saveMaterialVendorSelection = async (
  materialId: string, 
  selectedVendorId: string, 
  selectedQuoteId: string,
  reason?: string
): Promise<string> => {
  if (!db) throw new Error('Firebase not configured');
  
  const selectionData = {
    materialId,
    selectedVendorId,
    selectedQuoteId,
    reason,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  
  const docRef = await addDoc(collection(db, 'materialVendorSelections'), selectionData);
  return docRef.id;
};

export const getMaterialVendorSelection = async (materialId: string): Promise<MaterialVendorSelection | null> => {
  if (!db) return null;
  
  const q = query(
    collection(db, 'materialVendorSelections'), 
    where('materialId', '==', materialId)
  );
  
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) return null;
  
  const doc = querySnapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
    createdAt: timestampToDate(doc.data().createdAt),
    updatedAt: timestampToDate(doc.data().updatedAt),
  } as MaterialVendorSelection;
};
