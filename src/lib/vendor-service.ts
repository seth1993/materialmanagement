// Vendor service layer for Firestore operations

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
  limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Vendor, 
  MaterialVendor
} from '@/types/procurement';
import { 
  COLLECTIONS, 
  vendorConverter,
  materialVendorConverter
} from '@/lib/firestore-collections';
import { createAuditLog } from '@/lib/procurement-service';

// Create a new vendor
export const createVendor = async (
  vendorData: Omit<Vendor, 'id' | 'createdAt' | 'updatedAt'>,
  userId: string,
  performedByName?: string
): Promise<string> => {
  if (!db) throw new Error('Firebase not configured');
  
  const now = new Date();
  
  const vendor: Omit<Vendor, 'id'> = {
    ...vendorData,
    createdAt: now,
    updatedAt: now,
    userId
  };
  
  const docRef = await addDoc(
    collection(db, COLLECTIONS.VENDORS).withConverter(vendorConverter),
    vendor
  );
  
  // Create audit log
  await createAuditLog({
    entityType: 'vendor',
    entityId: docRef.id,
    action: 'created',
    newValues: vendor,
    performedBy: userId,
    performedByName,
    timestamp: now,
    userId
  });
  
  return docRef.id;
};

// Update vendor
export const updateVendor = async (
  vendorId: string,
  updates: Partial<Vendor>,
  userId: string,
  performedByName?: string
): Promise<void> => {
  if (!db) throw new Error('Firebase not configured');
  
  const docRef = doc(db, COLLECTIONS.VENDORS, vendorId);
  const oldDoc = await getDoc(docRef);
  
  if (!oldDoc.exists()) {
    throw new Error('Vendor not found');
  }
  
  const oldData = oldDoc.data();
  const now = new Date();
  
  const updateData = {
    ...updates,
    updatedAt: now
  };
  
  await updateDoc(docRef, updateData);
  
  // Create audit log
  await createAuditLog({
    entityType: 'vendor',
    entityId: vendorId,
    action: 'updated',
    oldValues: oldData,
    newValues: updateData,
    performedBy: userId,
    performedByName,
    timestamp: now,
    userId: oldData.userId
  });
};

// Get vendor by ID
export const getVendorById = async (vendorId: string): Promise<Vendor | null> => {
  if (!db) return null;
  
  const docRef = doc(db, COLLECTIONS.VENDORS, vendorId);
  const docSnap = await getDoc(docRef.withConverter(vendorConverter));
  
  return docSnap.exists() ? docSnap.data() : null;
};

// Get all active vendors for a user
export const getActiveVendors = async (userId: string): Promise<Vendor[]> => {
  if (!db) return [];
  
  const q = query(
    collection(db, COLLECTIONS.VENDORS).withConverter(vendorConverter),
    where('userId', '==', userId),
    where('isActive', '==', true),
    orderBy('name', 'asc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data());
};

// Get all vendors for a user (including inactive)
export const getAllVendors = async (userId: string): Promise<Vendor[]> => {
  if (!db) return [];
  
  const q = query(
    collection(db, COLLECTIONS.VENDORS).withConverter(vendorConverter),
    where('userId', '==', userId),
    orderBy('name', 'asc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data());
};

// Search vendors by name
export const searchVendorsByName = async (
  searchTerm: string,
  userId: string,
  activeOnly: boolean = true
): Promise<Vendor[]> => {
  if (!db) return [];
  
  const vendors = activeOnly ? await getActiveVendors(userId) : await getAllVendors(userId);
  
  return vendors.filter(vendor => 
    vendor.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
};

// Deactivate vendor (soft delete)
export const deactivateVendor = async (
  vendorId: string,
  userId: string,
  performedByName?: string
): Promise<void> => {
  await updateVendor(vendorId, { isActive: false }, userId, performedByName);
};

// Reactivate vendor
export const reactivateVendor = async (
  vendorId: string,
  userId: string,
  performedByName?: string
): Promise<void> => {
  await updateVendor(vendorId, { isActive: true }, userId, performedByName);
};

// Delete vendor (hard delete - only if no associated records)
export const deleteVendor = async (
  vendorId: string,
  userId: string,
  performedByName?: string
): Promise<void> => {
  if (!db) throw new Error('Firebase not configured');
  
  // Check if vendor has any associated purchase orders
  const poQuery = query(
    collection(db, COLLECTIONS.PURCHASE_ORDERS),
    where('vendorId', '==', vendorId),
    limit(1)
  );
  
  const poSnapshot = await getDocs(poQuery);
  if (!poSnapshot.empty) {
    throw new Error('Cannot delete vendor with associated purchase orders');
  }
  
  // Check if vendor has any material relationships
  const mvQuery = query(
    collection(db, COLLECTIONS.MATERIAL_VENDORS),
    where('vendorId', '==', vendorId),
    limit(1)
  );
  
  const mvSnapshot = await getDocs(mvQuery);
  if (!mvSnapshot.empty) {
    throw new Error('Cannot delete vendor with material relationships');
  }
  
  const docRef = doc(db, COLLECTIONS.VENDORS, vendorId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    throw new Error('Vendor not found');
  }
  
  const vendorData = docSnap.data();
  
  await deleteDoc(docRef);
  
  // Create audit log
  await createAuditLog({
    entityType: 'vendor',
    entityId: vendorId,
    action: 'deleted',
    oldValues: vendorData,
    performedBy: userId,
    performedByName,
    timestamp: new Date(),
    userId: vendorData.userId
  });
};

// Material-Vendor relationship functions

// Create material-vendor relationship
export const createMaterialVendorRelationship = async (
  materialId: string,
  vendorId: string,
  isPreferred: boolean = false,
  lastPrice?: number,
  leadTimeDays?: number
): Promise<string> => {
  if (!db) throw new Error('Firebase not configured');
  
  const relationship: Omit<MaterialVendor, 'id'> = {
    materialId,
    vendorId,
    isPreferred,
    lastPrice,
    lastOrderDate: lastPrice ? new Date() : undefined,
    leadTimeDays
  };
  
  const docRef = await addDoc(
    collection(db, COLLECTIONS.MATERIAL_VENDORS).withConverter(materialVendorConverter),
    relationship
  );
  
  return docRef.id;
};

// Get vendors for a material
export const getVendorsForMaterial = async (materialId: string): Promise<(MaterialVendor & { vendor?: Vendor })[]> => {
  if (!db) return [];
  
  const q = query(
    collection(db, COLLECTIONS.MATERIAL_VENDORS).withConverter(materialVendorConverter),
    where('materialId', '==', materialId),
    orderBy('isPreferred', 'desc')
  );
  
  const snapshot = await getDocs(q);
  const relationships = snapshot.docs.map(doc => doc.data());
  
  // Fetch vendor details for each relationship
  const relationshipsWithVendors = await Promise.all(
    relationships.map(async (rel) => {
      const vendor = await getVendorById(rel.vendorId);
      return { ...rel, vendor };
    })
  );
  
  return relationshipsWithVendors;
};

// Get materials for a vendor
export const getMaterialsForVendor = async (vendorId: string): Promise<MaterialVendor[]> => {
  if (!db) return [];
  
  const q = query(
    collection(db, COLLECTIONS.MATERIAL_VENDORS).withConverter(materialVendorConverter),
    where('vendorId', '==', vendorId),
    orderBy('isPreferred', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data());
};

// Get preferred vendor for a material
export const getPreferredVendorForMaterial = async (materialId: string): Promise<Vendor | null> => {
  if (!db) return null;
  
  const q = query(
    collection(db, COLLECTIONS.MATERIAL_VENDORS).withConverter(materialVendorConverter),
    where('materialId', '==', materialId),
    where('isPreferred', '==', true),
    limit(1)
  );
  
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) return null;
  
  const relationship = snapshot.docs[0].data();
  return await getVendorById(relationship.vendorId);
};

// Update material-vendor relationship
export const updateMaterialVendorRelationship = async (
  relationshipId: string,
  updates: Partial<MaterialVendor>
): Promise<void> => {
  if (!db) throw new Error('Firebase not configured');
  
  const docRef = doc(db, COLLECTIONS.MATERIAL_VENDORS, relationshipId);
  await updateDoc(docRef, updates);
};

// Remove material-vendor relationship
export const removeMaterialVendorRelationship = async (
  relationshipId: string
): Promise<void> => {
  if (!db) throw new Error('Firebase not configured');
  
  const docRef = doc(db, COLLECTIONS.MATERIAL_VENDORS, relationshipId);
  await deleteDoc(docRef);
};

// Set preferred vendor for a material (removes preferred status from others)
export const setPreferredVendorForMaterial = async (
  materialId: string,
  vendorId: string
): Promise<void> => {
  if (!db) throw new Error('Firebase not configured');
  
  // First, remove preferred status from all vendors for this material
  const q = query(
    collection(db, COLLECTIONS.MATERIAL_VENDORS),
    where('materialId', '==', materialId),
    where('isPreferred', '==', true)
  );
  
  const snapshot = await getDocs(q);
  const batch = db.batch ? db.batch() : null;
  
  if (batch) {
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { isPreferred: false });
    });
    
    // Set the new preferred vendor
    const newPreferredQuery = query(
      collection(db, COLLECTIONS.MATERIAL_VENDORS),
      where('materialId', '==', materialId),
      where('vendorId', '==', vendorId),
      limit(1)
    );
    
    const newPreferredSnapshot = await getDocs(newPreferredQuery);
    if (!newPreferredSnapshot.empty) {
      batch.update(newPreferredSnapshot.docs[0].ref, { isPreferred: true });
    }
    
    await batch.commit();
  }
};
