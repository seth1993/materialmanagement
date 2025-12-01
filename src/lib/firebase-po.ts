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
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import { db } from './firebase';
import { 
  PurchaseOrder, 
  CreatePOData, 
  UpdatePOData, 
  POSummary, 
  POLineItem,
  POEmailHistory 
} from '@/types/po';
import { vendorService } from './firebase-vendor';

const POS_COLLECTION = 'purchaseOrders';
const COUNTERS_COLLECTION = 'counters';

// Helper function to convert Firestore data to PurchaseOrder
const convertFirestoreToPO = (id: string, data: any): PurchaseOrder => {
  return {
    ...data,
    id,
    orderDate: data.orderDate?.toDate() || new Date(),
    requestedDeliveryDate: data.requestedDeliveryDate?.toDate() || null,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    emailHistory: data.emailHistory?.map((email: any) => ({
      ...email,
      sentAt: email.sentAt?.toDate() || new Date(),
    })) || [],
  } as PurchaseOrder;
};

// Helper function to convert PurchaseOrder to Firestore data
const convertPOToFirestore = (po: CreatePOData | UpdatePOData) => {
  return {
    ...po,
    updatedAt: serverTimestamp(),
    orderDate: po.orderDate ? Timestamp.fromDate(po.orderDate) : undefined,
    requestedDeliveryDate: po.requestedDeliveryDate ? Timestamp.fromDate(po.requestedDeliveryDate) : null,
  };
};

// Generate unique PO number
const generatePONumber = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const counterDocRef = doc(db, COUNTERS_COLLECTION, 'poCounter');
  
  return await runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterDocRef);
    
    let nextNumber = 1;
    if (counterDoc.exists()) {
      const data = counterDoc.data();
      nextNumber = (data.count || 0) + 1;
    }
    
    transaction.set(counterDocRef, { count: nextNumber }, { merge: true });
    
    return `PO-${year}-${nextNumber.toString().padStart(4, '0')}`;
  });
};

// Calculate totals for line items
const calculateTotals = (lineItems: POLineItem[], taxRate?: number, shippingAmount?: number) => {
  const subtotal = lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const taxAmount = taxRate ? subtotal * (taxRate / 100) : 0;
  const shipping = shippingAmount || 0;
  const totalAmount = subtotal + taxAmount + shipping;
  
  return {
    subtotal,
    taxAmount,
    totalAmount
  };
};

export const poService = {
  // Create a new purchase order
  async createPO(poData: CreatePOData, userId: string): Promise<string> {
    try {
      // Generate line item IDs and calculate totals
      const lineItems: POLineItem[] = poData.lineItems.map((item, index) => ({
        ...item,
        id: `line-${index + 1}`,
        totalPrice: item.quantity * item.unitPrice
      }));

      const { subtotal, taxAmount, totalAmount } = calculateTotals(
        lineItems, 
        poData.taxRate, 
        poData.shippingAmount
      );

      const poNumber = await generatePONumber();

      const docRef = await addDoc(collection(db, POS_COLLECTION), {
        ...convertPOToFirestore(poData),
        poNumber,
        status: 'draft',
        lineItems,
        subtotal,
        taxAmount,
        totalAmount,
        emailHistory: [],
        createdAt: serverTimestamp(),
        createdBy: userId,
        lastModifiedBy: userId,
      });

      return docRef.id;
    } catch (error) {
      console.error('Error creating PO:', error);
      throw new Error('Failed to create purchase order');
    }
  },

  // Get PO by ID
  async getPO(poId: string, includeVendor: boolean = false): Promise<PurchaseOrder | null> {
    try {
      const docRef = doc(db, POS_COLLECTION, poId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const po = convertFirestoreToPO(docSnap.id, docSnap.data());
        
        if (includeVendor) {
          const vendor = await vendorService.getVendor(po.vendorId);
          po.vendor = vendor || undefined;
        }
        
        return po;
      }
      return null;
    } catch (error) {
      console.error('Error getting PO:', error);
      throw new Error('Failed to get purchase order');
    }
  },

  // Get all POs
  async getPOs(includeVendor: boolean = false): Promise<PurchaseOrder[]> {
    try {
      const q = query(
        collection(db, POS_COLLECTION),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const pos = querySnapshot.docs.map(doc => 
        convertFirestoreToPO(doc.id, doc.data())
      );

      if (includeVendor) {
        // Fetch vendor data for each PO
        for (const po of pos) {
          const vendor = await vendorService.getVendor(po.vendorId);
          po.vendor = vendor || undefined;
        }
      }

      return pos;
    } catch (error) {
      console.error('Error getting POs:', error);
      throw new Error('Failed to get purchase orders');
    }
  },

  // Get PO summaries (lightweight version for lists)
  async getPOSummaries(): Promise<POSummary[]> {
    try {
      const q = query(
        collection(db, POS_COLLECTION),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const summaries: POSummary[] = [];

      for (const docSnap of querySnapshot.docs) {
        const data = docSnap.data();
        const vendor = await vendorService.getVendor(data.vendorId);
        
        summaries.push({
          id: docSnap.id,
          poNumber: data.poNumber,
          status: data.status,
          vendorName: vendor?.name || 'Unknown Vendor',
          orderDate: data.orderDate?.toDate() || new Date(),
          totalAmount: data.totalAmount || 0,
          lineItemCount: data.lineItems?.length || 0,
        });
      }

      return summaries;
    } catch (error) {
      console.error('Error getting PO summaries:', error);
      throw new Error('Failed to get purchase order summaries');
    }
  },

  // Update PO
  async updatePO(poId: string, updateData: UpdatePOData, userId: string): Promise<void> {
    try {
      const docRef = doc(db, POS_COLLECTION, poId);
      
      // If line items are being updated, recalculate totals
      let updatePayload: any = {
        ...convertPOToFirestore(updateData),
        lastModifiedBy: userId,
      };

      if (updateData.lineItems) {
        const lineItems: POLineItem[] = updateData.lineItems.map((item, index) => ({
          ...item,
          id: `line-${index + 1}`,
          totalPrice: item.quantity * item.unitPrice
        }));

        const { subtotal, taxAmount, totalAmount } = calculateTotals(
          lineItems, 
          updateData.taxRate, 
          updateData.shippingAmount
        );

        updatePayload = {
          ...updatePayload,
          lineItems,
          subtotal,
          taxAmount,
          totalAmount,
        };
      }

      await updateDoc(docRef, updatePayload);
    } catch (error) {
      console.error('Error updating PO:', error);
      throw new Error('Failed to update purchase order');
    }
  },

  // Add email history entry
  async addEmailHistory(poId: string, emailData: Omit<POEmailHistory, 'id'>): Promise<void> {
    try {
      const docRef = doc(db, POS_COLLECTION, poId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Purchase order not found');
      }

      const currentData = docSnap.data();
      const emailHistory = currentData.emailHistory || [];
      
      const newEmailEntry: POEmailHistory = {
        ...emailData,
        id: `email-${Date.now()}`,
        sentAt: emailData.sentAt,
      };

      emailHistory.push({
        ...newEmailEntry,
        sentAt: Timestamp.fromDate(newEmailEntry.sentAt),
      });

      await updateDoc(docRef, {
        emailHistory,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error adding email history:', error);
      throw new Error('Failed to add email history');
    }
  },

  // Update PO status
  async updatePOStatus(poId: string, status: string, userId: string): Promise<void> {
    try {
      await this.updatePO(poId, { status: status as any }, userId);
    } catch (error) {
      console.error('Error updating PO status:', error);
      throw new Error('Failed to update purchase order status');
    }
  },

  // Delete PO
  async deletePO(poId: string): Promise<void> {
    try {
      const docRef = doc(db, POS_COLLECTION, poId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting PO:', error);
      throw new Error('Failed to delete purchase order');
    }
  },

  // Get POs by vendor
  async getPOsByVendor(vendorId: string): Promise<PurchaseOrder[]> {
    try {
      const q = query(
        collection(db, POS_COLLECTION),
        where('vendorId', '==', vendorId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => 
        convertFirestoreToPO(doc.id, doc.data())
      );
    } catch (error) {
      console.error('Error getting POs by vendor:', error);
      throw new Error('Failed to get purchase orders by vendor');
    }
  },

  // Get POs by status
  async getPOsByStatus(status: string): Promise<PurchaseOrder[]> {
    try {
      const q = query(
        collection(db, POS_COLLECTION),
        where('status', '==', status),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => 
        convertFirestoreToPO(doc.id, doc.data())
      );
    } catch (error) {
      console.error('Error getting POs by status:', error);
      throw new Error('Failed to get purchase orders by status');
    }
  }
};
