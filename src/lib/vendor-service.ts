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
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Vendor, 
  VendorMaterial, 
  CreateVendorRequest, 
  UpdateVendorRequest,
  CreateVendorMaterialRequest,
  UpdateVendorMaterialRequest,
  VendorContact
} from '@/types/vendor';

// Vendor CRUD Operations
export class VendorService {
  private static VENDORS_COLLECTION = 'vendors';
  private static VENDOR_MATERIALS_COLLECTION = 'vendorMaterials';

  // Create a new vendor
  static async createVendor(vendorData: CreateVendorRequest, userId: string): Promise<string> {
    if (!db) throw new Error('Database not initialized');

    // Generate unique IDs for contacts
    const contactsWithIds = vendorData.contacts.map(contact => ({
      ...contact,
      id: crypto.randomUUID()
    }));

    const vendor: Omit<Vendor, 'id'> = {
      ...vendorData,
      contacts: contactsWithIds,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId
    };

    const docRef = await addDoc(collection(db, this.VENDORS_COLLECTION), {
      ...vendor,
      createdAt: Timestamp.fromDate(vendor.createdAt),
      updatedAt: Timestamp.fromDate(vendor.updatedAt)
    });

    return docRef.id;
  }

  // Get all vendors
  static async getVendors(): Promise<Vendor[]> {
    if (!db) throw new Error('Database not initialized');

    const q = query(
      collection(db, this.VENDORS_COLLECTION),
      where('isActive', '==', true),
      orderBy('name')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    })) as Vendor[];
  }

  // Get vendor by ID
  static async getVendorById(vendorId: string): Promise<Vendor | null> {
    if (!db) throw new Error('Database not initialized');

    const docRef = doc(db, this.VENDORS_COLLECTION, vendorId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return {
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: docSnap.data().createdAt?.toDate() || new Date(),
      updatedAt: docSnap.data().updatedAt?.toDate() || new Date()
    } as Vendor;
  }

  // Update vendor
  static async updateVendor(vendorId: string, updates: UpdateVendorRequest, userId: string): Promise<void> {
    if (!db) throw new Error('Database not initialized');

    // If contacts are being updated, ensure they have IDs
    if (updates.contacts) {
      updates.contacts = updates.contacts.map(contact => ({
        ...contact,
        id: contact.id || crypto.randomUUID()
      })) as VendorContact[];
    }

    const docRef = doc(db, this.VENDORS_COLLECTION, vendorId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date())
    });
  }

  // Soft delete vendor (set isActive to false)
  static async deleteVendor(vendorId: string): Promise<void> {
    if (!db) throw new Error('Database not initialized');

    const docRef = doc(db, this.VENDORS_COLLECTION, vendorId);
    await updateDoc(docRef, {
      isActive: false,
      updatedAt: Timestamp.fromDate(new Date())
    });
  }

  // Check if vendor code is unique
  static async isVendorCodeUnique(code: string, excludeVendorId?: string): Promise<boolean> {
    if (!db) throw new Error('Database not initialized');

    const q = query(
      collection(db, this.VENDORS_COLLECTION),
      where('code', '==', code),
      where('isActive', '==', true)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (excludeVendorId) {
      return querySnapshot.docs.every(doc => doc.id === excludeVendorId);
    }
    
    return querySnapshot.empty;
  }
}

// Vendor Material CRUD Operations
export class VendorMaterialService {
  private static VENDOR_MATERIALS_COLLECTION = 'vendorMaterials';
  private static MATERIALS_COLLECTION = 'materials';

  // Create vendor material pricing
  static async createVendorMaterial(
    vendorId: string, 
    materialData: CreateVendorMaterialRequest, 
    userId: string
  ): Promise<string> {
    if (!db) throw new Error('Database not initialized');

    // Get material name for denormalization
    const materialDoc = await getDoc(doc(db, this.MATERIALS_COLLECTION, materialData.materialId));
    const materialName = materialDoc.exists() ? materialDoc.data().name : 'Unknown Material';

    const vendorMaterial: Omit<VendorMaterial, 'id'> = {
      vendorId,
      materialId: materialData.materialId,
      materialName,
      vendorPartNumber: materialData.vendorPartNumber,
      basePrice: materialData.basePrice,
      currency: materialData.currency,
      leadTimeDays: materialData.leadTimeDays,
      minimumOrderQuantity: materialData.minimumOrderQuantity,
      lastUpdated: new Date(),
      updatedBy: userId,
      isActive: true
    };

    const docRef = await addDoc(collection(db, this.VENDOR_MATERIALS_COLLECTION), {
      ...vendorMaterial,
      lastUpdated: Timestamp.fromDate(vendorMaterial.lastUpdated)
    });

    return docRef.id;
  }

  // Get all vendor materials for a vendor
  static async getVendorMaterials(vendorId: string): Promise<VendorMaterial[]> {
    if (!db) throw new Error('Database not initialized');

    const q = query(
      collection(db, this.VENDOR_MATERIALS_COLLECTION),
      where('vendorId', '==', vendorId),
      where('isActive', '==', true),
      orderBy('materialName')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      lastUpdated: doc.data().lastUpdated?.toDate() || new Date()
    })) as VendorMaterial[];
  }

  // Get vendor materials for a specific material
  static async getVendorMaterialsByMaterial(materialId: string): Promise<VendorMaterial[]> {
    if (!db) throw new Error('Database not initialized');

    const q = query(
      collection(db, this.VENDOR_MATERIALS_COLLECTION),
      where('materialId', '==', materialId),
      where('isActive', '==', true),
      orderBy('basePrice')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      lastUpdated: doc.data().lastUpdated?.toDate() || new Date()
    })) as VendorMaterial[];
  }

  // Update vendor material
  static async updateVendorMaterial(
    vendorMaterialId: string, 
    updates: UpdateVendorMaterialRequest, 
    userId: string
  ): Promise<void> {
    if (!db) throw new Error('Database not initialized');

    const docRef = doc(db, this.VENDOR_MATERIALS_COLLECTION, vendorMaterialId);
    await updateDoc(docRef, {
      ...updates,
      lastUpdated: Timestamp.fromDate(new Date()),
      updatedBy: userId
    });
  }

  // Delete vendor material
  static async deleteVendorMaterial(vendorMaterialId: string): Promise<void> {
    if (!db) throw new Error('Database not initialized');

    const docRef = doc(db, this.VENDOR_MATERIALS_COLLECTION, vendorMaterialId);
    await updateDoc(docRef, {
      isActive: false,
      lastUpdated: Timestamp.fromDate(new Date())
    });
  }

  // Bulk update vendor materials for a vendor
  static async bulkUpdateVendorMaterials(
    vendorId: string, 
    updates: { vendorMaterialId: string; data: UpdateVendorMaterialRequest }[],
    userId: string
  ): Promise<void> {
    if (!db) throw new Error('Database not initialized');

    const batch = writeBatch(db);
    const timestamp = Timestamp.fromDate(new Date());

    updates.forEach(({ vendorMaterialId, data }) => {
      const docRef = doc(db, this.VENDOR_MATERIALS_COLLECTION, vendorMaterialId);
      batch.update(docRef, {
        ...data,
        lastUpdated: timestamp,
        updatedBy: userId
      });
    });

    await batch.commit();
  }
}
