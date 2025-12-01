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
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { Vendor, CreateVendorData, UpdateVendorData } from '@/types/vendor';

const VENDORS_COLLECTION = 'vendors';

// Helper function to convert Firestore data to Vendor
const convertFirestoreToVendor = (id: string, data: any): Vendor => {
  return {
    ...data,
    id,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  } as Vendor;
};

// Helper function to convert Vendor to Firestore data
const convertVendorToFirestore = (vendor: CreateVendorData | UpdateVendorData) => {
  return {
    ...vendor,
    updatedAt: serverTimestamp(),
  };
};

export const vendorService = {
  // Create a new vendor
  async createVendor(vendorData: CreateVendorData, userId: string): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, VENDORS_COLLECTION), {
        ...convertVendorToFirestore(vendorData),
        isActive: true,
        createdAt: serverTimestamp(),
        createdBy: userId,
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating vendor:', error);
      throw new Error('Failed to create vendor');
    }
  },

  // Get vendor by ID
  async getVendor(vendorId: string): Promise<Vendor | null> {
    try {
      const docRef = doc(db, VENDORS_COLLECTION, vendorId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return convertFirestoreToVendor(docSnap.id, docSnap.data());
      }
      return null;
    } catch (error) {
      console.error('Error getting vendor:', error);
      throw new Error('Failed to get vendor');
    }
  },

  // Get all vendors
  async getVendors(activeOnly: boolean = true): Promise<Vendor[]> {
    try {
      let q = query(
        collection(db, VENDORS_COLLECTION),
        orderBy('name', 'asc')
      );

      if (activeOnly) {
        q = query(
          collection(db, VENDORS_COLLECTION),
          where('isActive', '==', true),
          orderBy('name', 'asc')
        );
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => 
        convertFirestoreToVendor(doc.id, doc.data())
      );
    } catch (error) {
      console.error('Error getting vendors:', error);
      throw new Error('Failed to get vendors');
    }
  },

  // Search vendors by name
  async searchVendors(searchTerm: string, activeOnly: boolean = true): Promise<Vendor[]> {
    try {
      // Note: This is a simple search. For more advanced search, consider using Algolia or similar
      const vendors = await this.getVendors(activeOnly);
      return vendors.filter(vendor => 
        vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.code?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } catch (error) {
      console.error('Error searching vendors:', error);
      throw new Error('Failed to search vendors');
    }
  },

  // Update vendor
  async updateVendor(vendorId: string, updateData: UpdateVendorData): Promise<void> {
    try {
      const docRef = doc(db, VENDORS_COLLECTION, vendorId);
      await updateDoc(docRef, convertVendorToFirestore(updateData));
    } catch (error) {
      console.error('Error updating vendor:', error);
      throw new Error('Failed to update vendor');
    }
  },

  // Soft delete vendor (set isActive to false)
  async deactivateVendor(vendorId: string): Promise<void> {
    try {
      await this.updateVendor(vendorId, { isActive: false });
    } catch (error) {
      console.error('Error deactivating vendor:', error);
      throw new Error('Failed to deactivate vendor');
    }
  },

  // Hard delete vendor (use with caution)
  async deleteVendor(vendorId: string): Promise<void> {
    try {
      const docRef = doc(db, VENDORS_COLLECTION, vendorId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting vendor:', error);
      throw new Error('Failed to delete vendor');
    }
  },

  // Check if vendor code is unique
  async isVendorCodeUnique(code: string, excludeVendorId?: string): Promise<boolean> {
    try {
      const q = query(
        collection(db, VENDORS_COLLECTION),
        where('code', '==', code)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (excludeVendorId) {
        return querySnapshot.docs.every(doc => doc.id === excludeVendorId);
      }
      
      return querySnapshot.empty;
    } catch (error) {
      console.error('Error checking vendor code uniqueness:', error);
      throw new Error('Failed to check vendor code uniqueness');
    }
  },

  // Get vendors with pagination
  async getVendorsPaginated(pageSize: number = 20, activeOnly: boolean = true): Promise<Vendor[]> {
    try {
      let q = query(
        collection(db, VENDORS_COLLECTION),
        orderBy('name', 'asc'),
        limit(pageSize)
      );

      if (activeOnly) {
        q = query(
          collection(db, VENDORS_COLLECTION),
          where('isActive', '==', true),
          orderBy('name', 'asc'),
          limit(pageSize)
        );
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => 
        convertFirestoreToVendor(doc.id, doc.data())
      );
    } catch (error) {
      console.error('Error getting paginated vendors:', error);
      throw new Error('Failed to get paginated vendors');
    }
  }
};
