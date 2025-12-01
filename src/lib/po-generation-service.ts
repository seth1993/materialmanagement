// Purchase Order generation service

import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  runTransaction,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  PurchaseOrder, 
  PurchaseOrderLine, 
  PurchaseOrderStatus,
  Requisition,
  RequisitionLine,
  Vendor,
  VendorGroup,
  POGenerationRequest,
  POGenerationResult
} from '@/types/procurement';
import { 
  COLLECTIONS, 
  purchaseOrderConverter
} from '@/lib/firestore-collections';
import { generatePONumber, getProcurementConfig } from '@/lib/po-number-generator';
import { updateRequisitionLineConversion, createAuditLog } from '@/lib/procurement-service';
import { getVendorById } from '@/lib/vendor-service';

// Group requisition lines by vendor
export const groupRequisitionLinesByVendor = async (
  requisitions: Requisition[]
): Promise<VendorGroup[]> => {
  const vendorGroups = new Map<string, VendorGroup>();
  
  for (const requisition of requisitions) {
    for (const line of requisition.lines) {
      // Only include lines that have remaining quantity
      if (line.remainingQuantity <= 0) continue;
      
      const vendorId = line.vendorId || 'unassigned';
      
      if (!vendorGroups.has(vendorId)) {
        vendorGroups.set(vendorId, {
          vendorId,
          vendor: undefined,
          requisitionLines: [],
          estimatedTotal: 0
        });
      }
      
      const group = vendorGroups.get(vendorId)!;
      
      // Add line with requisition context
      const lineWithContext = {
        ...line,
        requisitionId: requisition.id,
        requisitionNumber: requisition.requisitionNumber
      };
      
      group.requisitionLines.push(lineWithContext);
      group.estimatedTotal += (line.estimatedTotal || 0);
    }
  }
  
  // Fetch vendor details for each group
  const groups = Array.from(vendorGroups.values());
  for (const group of groups) {
    if (group.vendorId !== 'unassigned') {
      group.vendor = await getVendorById(group.vendorId);
    }
  }
  
  // Sort groups: assigned vendors first, then unassigned
  return groups.sort((a, b) => {
    if (a.vendorId === 'unassigned' && b.vendorId !== 'unassigned') return 1;
    if (a.vendorId !== 'unassigned' && b.vendorId === 'unassigned') return -1;
    return (a.vendor?.name || '').localeCompare(b.vendor?.name || '');
  });
};

// Create a purchase order from a vendor group
export const createPurchaseOrderFromGroup = async (
  vendorGroup: VendorGroup,
  userId: string,
  createdByName?: string,
  notes?: string
): Promise<PurchaseOrder> => {
  if (!db) throw new Error('Firebase not configured');
  
  if (vendorGroup.vendorId === 'unassigned') {
    throw new Error('Cannot create PO for unassigned vendor');
  }
  
  if (vendorGroup.requisitionLines.length === 0) {
    throw new Error('Cannot create PO with no lines');
  }
  
  const config = await getProcurementConfig(userId);
  const poNumber = await generatePONumber(userId);
  const vendor = vendorGroup.vendor || await getVendorById(vendorGroup.vendorId);
  
  if (!vendor) {
    throw new Error('Vendor not found');
  }
  
  // Create PO lines from requisition lines
  const poLines: PurchaseOrderLine[] = vendorGroup.requisitionLines.map(line => ({
    id: crypto.randomUUID(),
    materialName: line.materialName,
    description: line.description,
    quantity: line.remainingQuantity, // Use remaining quantity
    unitPrice: line.unitPrice,
    totalPrice: line.unitPrice ? line.unitPrice * line.remainingQuantity : undefined,
    requisitionId: line.requisitionId,
    requisitionLineId: line.id,
    notes: line.notes
  }));
  
  // Calculate totals
  const subtotal = poLines.reduce((sum, line) => sum + (line.totalPrice || 0), 0);
  const totalAmount = subtotal; // Add tax calculation here if needed
  
  const now = new Date();
  
  const purchaseOrder: Omit<PurchaseOrder, 'id'> = {
    poNumber,
    title: `Purchase Order for ${vendor.name}`,
    description: notes,
    status: config.requireApprovalForPO ? PurchaseOrderStatus.PENDING : PurchaseOrderStatus.APPROVED,
    vendorId: vendor.id,
    vendor,
    lines: poLines,
    subtotal,
    totalAmount,
    currency: config.defaultCurrency,
    paymentTerms: vendor.paymentTerms,
    createdBy: userId,
    createdByName,
    linkedRequisitionIds: [...new Set(vendorGroup.requisitionLines.map(line => line.requisitionId))],
    notes,
    createdAt: now,
    updatedAt: now,
    userId
  };
  
  const docRef = await addDoc(
    collection(db, COLLECTIONS.PURCHASE_ORDERS).withConverter(purchaseOrderConverter),
    purchaseOrder
  );
  
  const createdPO: PurchaseOrder = {
    id: docRef.id,
    ...purchaseOrder
  };
  
  // Create audit log
  await createAuditLog({
    entityType: 'purchase_order',
    entityId: docRef.id,
    action: 'created',
    newValues: purchaseOrder,
    performedBy: userId,
    performedByName: createdByName,
    timestamp: now,
    userId
  });
  
  return createdPO;
};

// Generate purchase orders from selected requisitions
export const generatePurchaseOrders = async (
  request: POGenerationRequest,
  userId: string,
  createdByName?: string
): Promise<POGenerationResult> => {
  if (!db) throw new Error('Firebase not configured');
  
  const result: POGenerationResult = {
    success: false,
    createdPOs: [],
    errors: [],
    partiallyConvertedRequisitions: []
  };
  
  try {
    // Validate vendor groups
    const validGroups = request.vendorGroups.filter(group => {
      if (group.vendorId === 'unassigned') {
        result.errors.push('Cannot create PO for unassigned vendor');
        return false;
      }
      if (group.requisitionLines.length === 0) {
        result.errors.push(`No lines found for vendor ${group.vendor?.name || group.vendorId}`);
        return false;
      }
      return true;
    });
    
    if (validGroups.length === 0) {
      result.errors.push('No valid vendor groups to process');
      return result;
    }
    
    // Create POs for each valid vendor group
    for (const group of validGroups) {
      try {
        const po = await createPurchaseOrderFromGroup(
          group,
          userId,
          createdByName,
          request.notes
        );
        
        result.createdPOs.push(po);
        
        // Update requisition line conversion status
        for (const line of group.requisitionLines) {
          try {
            await updateRequisitionLineConversion(
              line.requisitionId,
              line.id,
              line.remainingQuantity,
              userId
            );
            
            // Track partially converted requisitions
            if (!result.partiallyConvertedRequisitions.includes(line.requisitionId)) {
              result.partiallyConvertedRequisitions.push(line.requisitionId);
            }
          } catch (error) {
            result.errors.push(
              `Failed to update requisition line ${line.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
          }
        }
        
      } catch (error) {
        result.errors.push(
          `Failed to create PO for vendor ${group.vendor?.name || group.vendorId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
    
    result.success = result.createdPOs.length > 0;
    
  } catch (error) {
    result.errors.push(
      `Failed to generate purchase orders: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
  
  return result;
};

// Get purchase orders for a user
export const getUserPurchaseOrders = async (
  userId: string,
  limitCount: number = 50
): Promise<PurchaseOrder[]> => {
  if (!db) return [];
  
  const q = query(
    collection(db, COLLECTIONS.PURCHASE_ORDERS).withConverter(purchaseOrderConverter),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data());
};

// Get purchase orders by status
export const getPurchaseOrdersByStatus = async (
  status: PurchaseOrderStatus,
  userId: string,
  limitCount: number = 50
): Promise<PurchaseOrder[]> => {
  if (!db) return [];
  
  const q = query(
    collection(db, COLLECTIONS.PURCHASE_ORDERS).withConverter(purchaseOrderConverter),
    where('userId', '==', userId),
    where('status', '==', status),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data());
};

// Get purchase order by ID
export const getPurchaseOrderById = async (poId: string): Promise<PurchaseOrder | null> => {
  if (!db) return null;
  
  const docRef = doc(db, COLLECTIONS.PURCHASE_ORDERS, poId);
  const docSnap = await getDoc(docRef.withConverter(purchaseOrderConverter));
  
  return docSnap.exists() ? docSnap.data() : null;
};

// Update purchase order status
export const updatePurchaseOrderStatus = async (
  poId: string,
  status: PurchaseOrderStatus,
  userId: string,
  performedByName?: string,
  notes?: string
): Promise<void> => {
  if (!db) throw new Error('Firebase not configured');
  
  const docRef = doc(db, COLLECTIONS.PURCHASE_ORDERS, poId);
  const oldDoc = await getDoc(docRef);
  
  if (!oldDoc.exists()) {
    throw new Error('Purchase order not found');
  }
  
  const oldData = oldDoc.data();
  const now = new Date();
  
  const updateData: any = {
    status,
    updatedAt: now
  };
  
  // Set specific timestamps based on status
  if (status === PurchaseOrderStatus.APPROVED) {
    updateData.approvedBy = userId;
    updateData.approvedByName = performedByName;
    updateData.approvedAt = now;
  } else if (status === PurchaseOrderStatus.SENT) {
    updateData.sentAt = now;
  }
  
  if (notes) {
    updateData.notes = notes;
  }
  
  await updateDoc(docRef, updateData);
  
  // Create audit log
  await createAuditLog({
    entityType: 'purchase_order',
    entityId: poId,
    action: 'status_updated',
    oldValues: { status: oldData.status },
    newValues: { status },
    performedBy: userId,
    performedByName,
    timestamp: now,
    notes,
    userId: oldData.userId
  });
};

// Update purchase order
export const updatePurchaseOrder = async (
  poId: string,
  updates: Partial<PurchaseOrder>,
  userId: string,
  performedByName?: string
): Promise<void> => {
  if (!db) throw new Error('Firebase not configured');
  
  const docRef = doc(db, COLLECTIONS.PURCHASE_ORDERS, poId);
  const oldDoc = await getDoc(docRef);
  
  if (!oldDoc.exists()) {
    throw new Error('Purchase order not found');
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
    entityType: 'purchase_order',
    entityId: poId,
    action: 'updated',
    oldValues: oldData,
    newValues: updateData,
    performedBy: userId,
    performedByName,
    timestamp: now,
    userId: oldData.userId
  });
};

// Delete purchase order (only if in draft status)
export const deletePurchaseOrder = async (
  poId: string,
  userId: string,
  performedByName?: string
): Promise<void> => {
  if (!db) throw new Error('Firebase not configured');
  
  const docRef = doc(db, COLLECTIONS.PURCHASE_ORDERS, poId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    throw new Error('Purchase order not found');
  }
  
  const po = docSnap.data() as PurchaseOrder;
  
  if (po.status !== PurchaseOrderStatus.DRAFT) {
    throw new Error('Can only delete draft purchase orders');
  }
  
  // TODO: Revert requisition line conversions
  // This would require tracking which lines were converted and reverting them
  
  await deleteDoc(docRef);
  
  // Create audit log
  await createAuditLog({
    entityType: 'purchase_order',
    entityId: poId,
    action: 'deleted',
    oldValues: po,
    performedBy: userId,
    performedByName,
    timestamp: new Date(),
    userId: po.userId
  });
};
