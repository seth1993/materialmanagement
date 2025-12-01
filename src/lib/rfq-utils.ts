import { collection, addDoc, getDocs, doc, updateDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { RFQ, RFQStatus, Vendor, VendorResponse, CreateRFQRequest, RFQSummary } from '@/types/rfq';

export class RFQService {
  // Create a new RFQ
  static async createRFQ(request: CreateRFQRequest, userId: string): Promise<string> {
    if (!db) throw new Error('Firebase not configured');

    const rfqData = {
      ...request,
      status: RFQStatus.DRAFT,
      lineItems: [], // Will be populated from materials
      responses: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      userId,
    };

    const docRef = await addDoc(collection(db, 'rfqs'), rfqData);
    return docRef.id;
  }

  // Get all RFQs for a user
  static async getUserRFQs(userId: string): Promise<RFQSummary[]> {
    if (!db) throw new Error('Firebase not configured');

    const q = query(
      collection(db, 'rfqs'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        status: data.status,
        vendorCount: data.vendorIds?.length || 0,
        responseCount: data.responses?.length || 0,
        createdAt: data.createdAt?.toDate() || new Date(),
        dueDate: data.dueDate?.toDate(),
      } as RFQSummary;
    });
  }

  // Get a specific RFQ by ID
  static async getRFQById(rfqId: string, userId: string): Promise<RFQ | null> {
    if (!db) throw new Error('Firebase not configured');

    const q = query(
      collection(db, 'rfqs'),
      where('userId', '==', userId)
    );

    const querySnapshot = await getDocs(q);
    const rfqDoc = querySnapshot.docs.find(doc => doc.id === rfqId);

    if (!rfqDoc) return null;

    const data = rfqDoc.data();
    return {
      id: rfqDoc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      deliveryDate: data.deliveryDate?.toDate(),
      sentAt: data.sentAt?.toDate(),
      dueDate: data.dueDate?.toDate(),
    } as RFQ;
  }

  // Update RFQ status
  static async updateRFQStatus(rfqId: string, status: RFQStatus): Promise<void> {
    if (!db) throw new Error('Firebase not configured');

    const rfqRef = doc(db, 'rfqs', rfqId);
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (status === RFQStatus.SENT) {
      updateData.sentAt = new Date();
    }

    await updateDoc(rfqRef, updateData);
  }

  // Add vendor response to RFQ
  static async addVendorResponse(rfqId: string, response: Omit<VendorResponse, 'id' | 'rfqId' | 'createdAt' | 'updatedAt'>): Promise<void> {
    if (!db) throw new Error('Firebase not configured');

    const responseData = {
      ...response,
      rfqId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await addDoc(collection(db, 'vendor_responses'), responseData);

    // Update RFQ status to responded if it was sent
    const rfq = await this.getRFQById(rfqId, response.vendorId); // Note: This needs proper user validation
    if (rfq && rfq.status === RFQStatus.SENT) {
      await this.updateRFQStatus(rfqId, RFQStatus.RESPONDED);
    }
  }
}

export class VendorService {
  // Create a new vendor
  static async createVendor(vendor: Omit<Vendor, 'id' | 'createdAt' | 'updatedAt'>, userId: string): Promise<string> {
    if (!db) throw new Error('Firebase not configured');

    const vendorData = {
      ...vendor,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId,
    };

    const docRef = await addDoc(collection(db, 'vendors'), vendorData);
    return docRef.id;
  }

  // Get all vendors for a user
  static async getUserVendors(userId: string): Promise<Vendor[]> {
    if (!db) throw new Error('Firebase not configured');

    const q = query(
      collection(db, 'vendors'),
      where('userId', '==', userId),
      orderBy('name', 'asc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as Vendor[];
  }

  // Get vendors by specialty
  static async getVendorsBySpecialty(userId: string, specialty: string): Promise<Vendor[]> {
    if (!db) throw new Error('Firebase not configured');

    const q = query(
      collection(db, 'vendors'),
      where('userId', '==', userId),
      where('specialties', 'array-contains', specialty)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as Vendor[];
  }
}

// Utility functions for RFQ status and formatting
export const getRFQStatusColor = (status: RFQStatus): string => {
  switch (status) {
    case RFQStatus.DRAFT:
      return 'bg-gray-100 text-gray-800';
    case RFQStatus.SENT:
      return 'bg-blue-100 text-blue-800';
    case RFQStatus.RESPONDED:
      return 'bg-green-100 text-green-800';
    case RFQStatus.CLOSED:
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const formatRFQStatus = (status: RFQStatus): string => {
  switch (status) {
    case RFQStatus.DRAFT:
      return 'Draft';
    case RFQStatus.SENT:
      return 'Sent';
    case RFQStatus.RESPONDED:
      return 'Responded';
    case RFQStatus.CLOSED:
      return 'Closed';
    default:
      return 'Unknown';
  }
};
