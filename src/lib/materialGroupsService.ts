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
  onSnapshot,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  ProjectMaterialGroup,
  MaterialLine,
  ProjectMaterialGroupFormData,
  MaterialLineFormData,
  MaterialGroupWithLines
} from '@/types/materialGroups';

// Collection names
const MATERIAL_GROUPS_COLLECTION = 'projectMaterialGroups';
const MATERIAL_LINES_COLLECTION = 'materialLines';

// Helper function to convert Firestore timestamp to Date
const convertTimestamp = (timestamp: any): Date => {
  if (timestamp && timestamp.toDate) {
    return timestamp.toDate();
  }
  return new Date();
};

// Material Groups CRUD Operations

export const createMaterialGroup = async (
  projectId: string,
  userId: string,
  data: ProjectMaterialGroupFormData
): Promise<string> => {
  if (!db) {
    throw new Error('Firebase not configured');
  }

  const now = new Date();
  const materialGroup = {
    ...data,
    projectId,
    userId,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(collection(db, MATERIAL_GROUPS_COLLECTION), materialGroup);
  return docRef.id;
};

export const updateMaterialGroup = async (
  groupId: string,
  data: Partial<ProjectMaterialGroupFormData>
): Promise<void> => {
  if (!db) {
    throw new Error('Firebase not configured');
  }

  const groupRef = doc(db, MATERIAL_GROUPS_COLLECTION, groupId);
  await updateDoc(groupRef, {
    ...data,
    updatedAt: new Date(),
  });
};

export const deleteMaterialGroup = async (groupId: string): Promise<void> => {
  if (!db) {
    throw new Error('Firebase not configured');
  }

  const batch = writeBatch(db);

  // Delete the material group
  const groupRef = doc(db, MATERIAL_GROUPS_COLLECTION, groupId);
  batch.delete(groupRef);

  // Delete all associated material lines
  const linesQuery = query(
    collection(db, MATERIAL_LINES_COLLECTION),
    where('materialGroupId', '==', groupId)
  );
  const linesSnapshot = await getDocs(linesQuery);
  
  linesSnapshot.docs.forEach((lineDoc) => {
    batch.delete(lineDoc.ref);
  });

  await batch.commit();
};

export const getMaterialGroup = async (groupId: string): Promise<ProjectMaterialGroup | null> => {
  if (!db) {
    throw new Error('Firebase not configured');
  }

  const groupRef = doc(db, MATERIAL_GROUPS_COLLECTION, groupId);
  const groupSnap = await getDoc(groupRef);

  if (!groupSnap.exists()) {
    return null;
  }

  const data = groupSnap.data();
  return {
    id: groupSnap.id,
    ...data,
    createdAt: convertTimestamp(data.createdAt),
    updatedAt: convertTimestamp(data.updatedAt),
  } as ProjectMaterialGroup;
};

export const getMaterialGroups = async (
  projectId: string,
  userId: string
): Promise<ProjectMaterialGroup[]> => {
  if (!db) {
    throw new Error('Firebase not configured');
  }

  const q = query(
    collection(db, MATERIAL_GROUPS_COLLECTION),
    where('projectId', '==', projectId),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt),
    } as ProjectMaterialGroup;
  });
};

// Material Lines CRUD Operations

export const createMaterialLine = async (
  materialGroupId: string,
  data: MaterialLineFormData
): Promise<string> => {
  if (!db) {
    throw new Error('Firebase not configured');
  }

  const now = new Date();
  const materialLine = {
    ...data,
    materialGroupId,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(collection(db, MATERIAL_LINES_COLLECTION), materialLine);
  return docRef.id;
};

export const updateMaterialLine = async (
  lineId: string,
  data: Partial<MaterialLineFormData>
): Promise<void> => {
  if (!db) {
    throw new Error('Firebase not configured');
  }

  const lineRef = doc(db, MATERIAL_LINES_COLLECTION, lineId);
  await updateDoc(lineRef, {
    ...data,
    updatedAt: new Date(),
  });
};

export const deleteMaterialLine = async (lineId: string): Promise<void> => {
  if (!db) {
    throw new Error('Firebase not configured');
  }

  const lineRef = doc(db, MATERIAL_LINES_COLLECTION, lineId);
  await deleteDoc(lineRef);
};

export const getMaterialLines = async (materialGroupId: string): Promise<MaterialLine[]> => {
  if (!db) {
    throw new Error('Firebase not configured');
  }

  const q = query(
    collection(db, MATERIAL_LINES_COLLECTION),
    where('materialGroupId', '==', materialGroupId),
    orderBy('createdAt', 'asc')
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: convertTimestamp(data.createdAt),
      updatedAt: convertTimestamp(data.updatedAt),
    } as MaterialLine;
  });
};

// Combined operations

export const getMaterialGroupWithLines = async (groupId: string): Promise<MaterialGroupWithLines | null> => {
  const group = await getMaterialGroup(groupId);
  if (!group) {
    return null;
  }

  const lines = await getMaterialLines(groupId);
  return {
    ...group,
    lines,
  };
};

// Real-time subscriptions

export const subscribeMaterialGroups = (
  projectId: string,
  userId: string,
  callback: (groups: ProjectMaterialGroup[]) => void
): (() => void) => {
  if (!db) {
    throw new Error('Firebase not configured');
  }

  const q = query(
    collection(db, MATERIAL_GROUPS_COLLECTION),
    where('projectId', '==', projectId),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (querySnapshot) => {
    const groups = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
      } as ProjectMaterialGroup;
    });
    callback(groups);
  });
};

export const subscribeMaterialLines = (
  materialGroupId: string,
  callback: (lines: MaterialLine[]) => void
): (() => void) => {
  if (!db) {
    throw new Error('Firebase not configured');
  }

  const q = query(
    collection(db, MATERIAL_LINES_COLLECTION),
    where('materialGroupId', '==', materialGroupId),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(q, (querySnapshot) => {
    const lines = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
      } as MaterialLine;
    });
    callback(lines);
  });
};
