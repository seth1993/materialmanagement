// Procurement service layer for Firestore operations

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
  writeBatch,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Requisition, 
  RequisitionStatus, 
  RequisitionLine,
  Priority,
  ProcurementAuditLog
} from '@/types/procurement';
import { 
  COLLECTIONS, 
  requisitionConverter,
  auditLogConverter
} from '@/lib/firestore-collections';

// Generate unique requisition number
export const generateRequisitionNumber = async (userId: string): Promise<string> => {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  
  // Query for existing requisitions this month to get next number
  const q = query(
    collection(db, COLLECTIONS.REQUISITIONS),
    where('userId', '==', userId),
    where('requisitionNumber', '>=', `REQ-${year}${month}-`),
    where('requisitionNumber', '<', `REQ-${year}${month}-Z`),
    orderBy('requisitionNumber', 'desc'),
    limit(1)
  );
  
  const snapshot = await getDocs(q);
  let nextNumber = 1;
  
  if (!snapshot.empty) {
    const lastReq = snapshot.docs[0].data();
    const lastNumber = lastReq.requisitionNumber.split('-').pop();
    nextNumber = parseInt(lastNumber || '0') + 1;
  }
  
  return `REQ-${year}${month}-${String(nextNumber).padStart(4, '0')}`;
};

// Create a new requisition
export const createRequisition = async (
  requisitionData: Omit<Requisition, 'id' | 'requisitionNumber' | 'createdAt' | 'updatedAt'>,
  userId: string
): Promise<string> => {
  if (!db) throw new Error('Firebase not configured');
  
  const requisitionNumber = await generateRequisitionNumber(userId);
  const now = new Date();
  
  // Calculate remaining quantities for lines
  const processedLines: RequisitionLine[] = requisitionData.lines.map(line => ({
    ...line,
    id: line.id || crypto.randomUUID(),
    convertedQuantity: 0,
    remainingQuantity: line.quantity,
    isFullyConverted: false
  }));
  
  const requisition: Omit<Requisition, 'id'> = {
    ...requisitionData,
    requisitionNumber,
    lines: processedLines,
    createdAt: now,
    updatedAt: now,
    userId
  };
  
  const docRef = await addDoc(
    collection(db, COLLECTIONS.REQUISITIONS).withConverter(requisitionConverter),
    requisition
  );
  
  // Create audit log
  await createAuditLog({
    entityType: 'requisition',
    entityId: docRef.id,
    action: 'created',
    newValues: requisition,
    performedBy: userId,
    performedByName: requisitionData.requestedByName,
    timestamp: now,
    userId
  });
  
  return docRef.id;
};

// Update requisition
export const updateRequisition = async (
  requisitionId: string,
  updates: Partial<Requisition>,
  userId: string,
  performedByName?: string
): Promise<void> => {
  if (!db) throw new Error('Firebase not configured');
  
  const docRef = doc(db, COLLECTIONS.REQUISITIONS, requisitionId);
  const oldDoc = await getDoc(docRef);
  
  if (!oldDoc.exists()) {
    throw new Error('Requisition not found');
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
    entityType: 'requisition',
    entityId: requisitionId,
    action: 'updated',
    oldValues: oldData,
    newValues: updateData,
    performedBy: userId,
    performedByName,
    timestamp: now,
    userId: oldData.userId
  });
};

// Approve requisition
export const approveRequisition = async (
  requisitionId: string,
  approvedBy: string,
  approvedByName?: string,
  notes?: string
): Promise<void> => {
  if (!db) throw new Error('Firebase not configured');
  
  const updates = {
    status: RequisitionStatus.APPROVED,
    approvedBy,
    approvedByName,
    approvedAt: new Date(),
    rejectedBy: undefined,
    rejectedByName: undefined,
    rejectedAt: undefined,
    rejectionReason: undefined
  };
  
  await updateRequisition(requisitionId, updates, approvedBy, approvedByName);
};

// Reject requisition
export const rejectRequisition = async (
  requisitionId: string,
  rejectedBy: string,
  rejectionReason: string,
  rejectedByName?: string
): Promise<void> => {
  if (!db) throw new Error('Firebase not configured');
  
  const updates = {
    status: RequisitionStatus.REJECTED,
    rejectedBy,
    rejectedByName,
    rejectedAt: new Date(),
    rejectionReason,
    approvedBy: undefined,
    approvedByName: undefined,
    approvedAt: undefined
  };
  
  await updateRequisition(requisitionId, updates, rejectedBy, rejectedByName);
};

// Get requisitions by status
export const getRequisitionsByStatus = async (
  status: RequisitionStatus,
  userId: string,
  limitCount: number = 50
): Promise<Requisition[]> => {
  if (!db) return [];
  
  const q = query(
    collection(db, COLLECTIONS.REQUISITIONS).withConverter(requisitionConverter),
    where('userId', '==', userId),
    where('status', '==', status),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data());
};

// Get approved requisitions ready for PO generation
export const getApprovedRequisitions = async (userId: string): Promise<Requisition[]> => {
  if (!db) return [];
  
  const q = query(
    collection(db, COLLECTIONS.REQUISITIONS).withConverter(requisitionConverter),
    where('userId', '==', userId),
    where('status', 'in', [RequisitionStatus.APPROVED, RequisitionStatus.PARTIALLY_CONVERTED]),
    orderBy('approvedAt', 'asc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data()).filter(req => {
    // Only include requisitions that have unconverted lines
    return req.lines.some(line => line.remainingQuantity > 0);
  });
};

// Get requisition by ID
export const getRequisitionById = async (requisitionId: string): Promise<Requisition | null> => {
  if (!db) return null;
  
  const docRef = doc(db, COLLECTIONS.REQUISITIONS, requisitionId);
  const docSnap = await getDoc(docRef.withConverter(requisitionConverter));
  
  return docSnap.exists() ? docSnap.data() : null;
};

// Get user's requisitions
export const getUserRequisitions = async (
  userId: string,
  limitCount: number = 50
): Promise<Requisition[]> => {
  if (!db) return [];
  
  const q = query(
    collection(db, COLLECTIONS.REQUISITIONS).withConverter(requisitionConverter),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data());
};

// Update requisition line conversion status
export const updateRequisitionLineConversion = async (
  requisitionId: string,
  lineId: string,
  convertedQuantity: number,
  userId: string
): Promise<void> => {
  if (!db) throw new Error('Firebase not configured');
  
  return runTransaction(db, async (transaction) => {
    const docRef = doc(db, COLLECTIONS.REQUISITIONS, requisitionId);
    const docSnap = await transaction.get(docRef);
    
    if (!docSnap.exists()) {
      throw new Error('Requisition not found');
    }
    
    const requisition = docSnap.data() as Requisition;
    const lineIndex = requisition.lines.findIndex(line => line.id === lineId);
    
    if (lineIndex === -1) {
      throw new Error('Requisition line not found');
    }
    
    const line = requisition.lines[lineIndex];
    const newConvertedQuantity = line.convertedQuantity + convertedQuantity;
    
    if (newConvertedQuantity > line.quantity) {
      throw new Error('Cannot convert more than available quantity');
    }
    
    // Update the line
    requisition.lines[lineIndex] = {
      ...line,
      convertedQuantity: newConvertedQuantity,
      remainingQuantity: line.quantity - newConvertedQuantity,
      isFullyConverted: newConvertedQuantity >= line.quantity
    };
    
    // Update requisition status
    const allLinesConverted = requisition.lines.every(l => l.isFullyConverted);
    const anyLineConverted = requisition.lines.some(l => l.convertedQuantity > 0);
    
    let newStatus = requisition.status;
    if (allLinesConverted) {
      newStatus = RequisitionStatus.FULLY_CONVERTED;
    } else if (anyLineConverted) {
      newStatus = RequisitionStatus.PARTIALLY_CONVERTED;
    }
    
    transaction.update(docRef, {
      lines: requisition.lines,
      status: newStatus,
      updatedAt: new Date()
    });
  });
};

// Delete requisition (only if in draft status)
export const deleteRequisition = async (
  requisitionId: string,
  userId: string,
  performedByName?: string
): Promise<void> => {
  if (!db) throw new Error('Firebase not configured');
  
  const docRef = doc(db, COLLECTIONS.REQUISITIONS, requisitionId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    throw new Error('Requisition not found');
  }
  
  const requisition = docSnap.data() as Requisition;
  
  if (requisition.status !== RequisitionStatus.DRAFT) {
    throw new Error('Can only delete draft requisitions');
  }
  
  await deleteDoc(docRef);
  
  // Create audit log
  await createAuditLog({
    entityType: 'requisition',
    entityId: requisitionId,
    action: 'deleted',
    oldValues: requisition,
    performedBy: userId,
    performedByName,
    timestamp: new Date(),
    userId: requisition.userId
  });
};

// Create audit log entry
export const createAuditLog = async (
  logData: Omit<ProcurementAuditLog, 'id'>
): Promise<void> => {
  if (!db) return;
  
  await addDoc(
    collection(db, COLLECTIONS.AUDIT_LOGS).withConverter(auditLogConverter),
    logData
  );
};

// Get audit logs for an entity
export const getAuditLogs = async (
  entityType: 'requisition' | 'purchase_order' | 'vendor',
  entityId: string,
  limitCount: number = 20
): Promise<ProcurementAuditLog[]> => {
  if (!db) return [];
  
  const q = query(
    collection(db, COLLECTIONS.AUDIT_LOGS).withConverter(auditLogConverter),
    where('entityType', '==', entityType),
    where('entityId', '==', entityId),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data());
};
