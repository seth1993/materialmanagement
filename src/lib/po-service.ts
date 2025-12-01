import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  writeBatch,
  runTransaction,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  PurchaseOrder, 
  POLine, 
  POWithLines, 
  CreatePORequest, 
  CreateReceiptRequest,
  Receipt,
  ReceiptLine,
  InventoryMovement,
  POStatus,
  POLineStatus
} from '@/types';

// Collection names
const COLLECTIONS = {
  PURCHASE_ORDERS: 'purchaseOrders',
  PO_LINES: 'poLines',
  RECEIPTS: 'receipts',
  RECEIPT_LINES: 'receiptLines',
  INVENTORY_MOVEMENTS: 'inventoryMovements',
  MATERIALS: 'materials'
} as const;

// Utility function to convert Firestore timestamp to Date
const timestampToDate = (timestamp: any): Date => {
  if (timestamp?.toDate) {
    return timestamp.toDate();
  }
  return timestamp instanceof Date ? timestamp : new Date(timestamp);
};

// Utility function to convert Date to Firestore timestamp
const dateToTimestamp = (date: Date): Timestamp => {
  return Timestamp.fromDate(date);
};

// Purchase Order CRUD operations
export const poService = {
  // Create a new Purchase Order with lines
  async createPO(poData: CreatePORequest, userId: string): Promise<string> {
    if (!db) throw new Error('Firebase not configured');

    return await runTransaction(db, async (transaction) => {
      // Create the PO document
      const poRef = doc(collection(db, COLLECTIONS.PURCHASE_ORDERS));
      const now = new Date();
      
      const po: Omit<PurchaseOrder, 'id'> = {
        poNumber: poData.poNumber,
        supplierName: poData.supplierName,
        status: 'draft' as POStatus,
        orderDate: poData.orderDate,
        expectedDeliveryDate: poData.expectedDeliveryDate,
        notes: poData.notes,
        createdAt: now,
        updatedAt: now,
        userId,
        totalOrderedQuantity: poData.lines.reduce((sum, line) => sum + line.orderedQuantity, 0),
        totalReceivedQuantity: 0,
        isFullyReceived: false
      };

      transaction.set(poRef, {
        ...po,
        orderDate: dateToTimestamp(po.orderDate),
        expectedDeliveryDate: po.expectedDeliveryDate ? dateToTimestamp(po.expectedDeliveryDate) : null,
        createdAt: dateToTimestamp(po.createdAt),
        updatedAt: dateToTimestamp(po.updatedAt)
      });

      // Create PO lines
      poData.lines.forEach((lineData, index) => {
        const lineRef = doc(collection(db, COLLECTIONS.PO_LINES));
        const line: Omit<POLine, 'id'> = {
          poId: poRef.id,
          lineNumber: index + 1,
          materialId: lineData.materialId,
          materialName: lineData.materialName,
          materialSku: lineData.materialSku,
          description: lineData.description,
          orderedQuantity: lineData.orderedQuantity,
          receivedQuantity: 0,
          remainingQuantity: lineData.orderedQuantity,
          unitPrice: lineData.unitPrice,
          totalPrice: lineData.totalPrice,
          unit: lineData.unit,
          status: 'open' as POLineStatus,
          createdAt: now,
          updatedAt: now
        };

        transaction.set(lineRef, {
          ...line,
          createdAt: dateToTimestamp(line.createdAt),
          updatedAt: dateToTimestamp(line.updatedAt)
        });
      });

      return poRef.id;
    });
  },

  // Get a single PO with its lines
  async getPOWithLines(poId: string, userId: string): Promise<POWithLines | null> {
    if (!db) throw new Error('Firebase not configured');

    try {
      // Get PO document
      const poDoc = await getDoc(doc(db, COLLECTIONS.PURCHASE_ORDERS, poId));
      if (!poDoc.exists()) return null;

      const poData = poDoc.data();
      
      // Check if user owns this PO
      if (poData.userId !== userId) return null;

      // Get PO lines
      const linesQuery = query(
        collection(db, COLLECTIONS.PO_LINES),
        where('poId', '==', poId),
        orderBy('lineNumber')
      );
      const linesSnapshot = await getDocs(linesQuery);
      
      const lines: POLine[] = linesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: timestampToDate(doc.data().createdAt),
        updatedAt: timestampToDate(doc.data().updatedAt)
      })) as POLine[];

      const po: POWithLines = {
        id: poDoc.id,
        ...poData,
        orderDate: timestampToDate(poData.orderDate),
        expectedDeliveryDate: poData.expectedDeliveryDate ? timestampToDate(poData.expectedDeliveryDate) : undefined,
        createdAt: timestampToDate(poData.createdAt),
        updatedAt: timestampToDate(poData.updatedAt),
        lines
      } as POWithLines;

      return po;
    } catch (error) {
      console.error('Error fetching PO with lines:', error);
      throw error;
    }
  },

  // Get all POs for a user
  async getUserPOs(userId: string): Promise<PurchaseOrder[]> {
    if (!db) throw new Error('Firebase not configured');

    try {
      const q = query(
        collection(db, COLLECTIONS.PURCHASE_ORDERS),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        orderDate: timestampToDate(doc.data().orderDate),
        expectedDeliveryDate: doc.data().expectedDeliveryDate ? timestampToDate(doc.data().expectedDeliveryDate) : undefined,
        createdAt: timestampToDate(doc.data().createdAt),
        updatedAt: timestampToDate(doc.data().updatedAt)
      })) as PurchaseOrder[];
    } catch (error) {
      console.error('Error fetching user POs:', error);
      throw error;
    }
  },

  // Update PO status
  async updatePOStatus(poId: string, status: POStatus, userId: string): Promise<void> {
    if (!db) throw new Error('Firebase not configured');

    const poRef = doc(db, COLLECTIONS.PURCHASE_ORDERS, poId);
    const poDoc = await getDoc(poRef);
    
    if (!poDoc.exists() || poDoc.data().userId !== userId) {
      throw new Error('PO not found or access denied');
    }

    await updateDoc(poRef, {
      status,
      updatedAt: dateToTimestamp(new Date())
    });
  },

  // Delete PO and its lines
  async deletePO(poId: string, userId: string): Promise<void> {
    if (!db) throw new Error('Firebase not configured');

    return await runTransaction(db, async (transaction) => {
      const poRef = doc(db, COLLECTIONS.PURCHASE_ORDERS, poId);
      const poDoc = await transaction.get(poRef);
      
      if (!poDoc.exists() || poDoc.data().userId !== userId) {
        throw new Error('PO not found or access denied');
      }

      // Delete PO lines
      const linesQuery = query(
        collection(db, COLLECTIONS.PO_LINES),
        where('poId', '==', poId)
      );
      const linesSnapshot = await getDocs(linesQuery);
      
      linesSnapshot.docs.forEach(doc => {
        transaction.delete(doc.ref);
      });

      // Delete PO
      transaction.delete(poRef);
    });
  }
};

// Receiving operations
export const receivingService = {
  // Process receipt against PO
  async processReceipt(receiptData: CreateReceiptRequest, userId: string): Promise<string> {
    if (!db) throw new Error('Firebase not configured');

    return await runTransaction(db, async (transaction) => {
      // Verify PO exists and user has access
      const poRef = doc(db, COLLECTIONS.PURCHASE_ORDERS, receiptData.poId);
      const poDoc = await transaction.get(poRef);
      
      if (!poDoc.exists() || poDoc.data().userId !== userId) {
        throw new Error('PO not found or access denied');
      }

      // Get PO lines to validate receipt quantities
      const linesQuery = query(
        collection(db, COLLECTIONS.PO_LINES),
        where('poId', '==', receiptData.poId)
      );
      const linesSnapshot = await getDocs(linesQuery);
      const poLines = new Map(linesSnapshot.docs.map(doc => [doc.id, { ref: doc.ref, data: doc.data() }]));

      // Create receipt document
      const receiptRef = doc(collection(db, COLLECTIONS.RECEIPTS));
      const now = new Date();
      const receiptNumber = `RCP-${Date.now()}`;

      const receipt: Omit<Receipt, 'id'> = {
        receiptNumber,
        poId: receiptData.poId,
        shipmentId: receiptData.shipmentId,
        receivedDate: receiptData.receivedDate,
        receivedBy: userId,
        notes: receiptData.notes,
        createdAt: now,
        userId
      };

      transaction.set(receiptRef, {
        ...receipt,
        receivedDate: dateToTimestamp(receipt.receivedDate),
        createdAt: dateToTimestamp(receipt.createdAt)
      });

      // Process each receipt line
      let totalReceivedInThisReceipt = 0;
      
      for (const lineItem of receiptData.lineItems) {
        const poLineData = poLines.get(lineItem.poLineId);
        if (!poLineData) {
          throw new Error(`PO line ${lineItem.poLineId} not found`);
        }

        const currentReceived = poLineData.data.receivedQuantity || 0;
        const newReceivedQuantity = currentReceived + lineItem.receivedQuantity;
        const remainingQuantity = poLineData.data.orderedQuantity - newReceivedQuantity;

        // Validate we're not over-receiving
        if (newReceivedQuantity > poLineData.data.orderedQuantity) {
          throw new Error(`Cannot receive ${lineItem.receivedQuantity} - would exceed ordered quantity for ${poLineData.data.materialName}`);
        }

        // Create receipt line
        const receiptLineRef = doc(collection(db, COLLECTIONS.RECEIPT_LINES));
        const receiptLine: Omit<ReceiptLine, 'id'> = {
          receiptId: receiptRef.id,
          poLineId: lineItem.poLineId,
          materialId: poLineData.data.materialId,
          materialName: poLineData.data.materialName,
          materialSku: poLineData.data.materialSku,
          receivedQuantity: lineItem.receivedQuantity,
          unit: poLineData.data.unit,
          qualityStatus: lineItem.qualityStatus || 'accepted',
          notes: lineItem.notes,
          createdAt: now
        };

        transaction.set(receiptLineRef, {
          ...receiptLine,
          createdAt: dateToTimestamp(receiptLine.createdAt)
        });

        // Update PO line
        const newStatus: POLineStatus = remainingQuantity === 0 ? 'fully_received' : 'partially_received';
        transaction.update(poLineData.ref, {
          receivedQuantity: newReceivedQuantity,
          remainingQuantity,
          status: newStatus,
          updatedAt: dateToTimestamp(now)
        });

        // Create inventory movement if quality is accepted
        if (receiptLine.qualityStatus === 'accepted') {
          const movementRef = doc(collection(db, COLLECTIONS.INVENTORY_MOVEMENTS));
          const movement: Omit<InventoryMovement, 'id'> = {
            materialId: poLineData.data.materialId,
            materialName: poLineData.data.materialName,
            materialSku: poLineData.data.materialSku,
            movementType: 'receipt',
            quantity: lineItem.receivedQuantity,
            unit: poLineData.data.unit,
            referenceType: 'receipt',
            referenceId: receiptRef.id,
            previousQuantity: 0, // Will be updated when we update material inventory
            newQuantity: 0, // Will be updated when we update material inventory
            notes: `Receipt from PO ${poDoc.data().poNumber}`,
            createdAt: now,
            userId
          };

          transaction.set(movementRef, {
            ...movement,
            createdAt: dateToTimestamp(movement.createdAt)
          });

          // Update material inventory if materialId exists
          if (poLineData.data.materialId) {
            const materialRef = doc(db, COLLECTIONS.MATERIALS, poLineData.data.materialId);
            const materialDoc = await transaction.get(materialRef);
            
            if (materialDoc.exists()) {
              const currentQuantity = materialDoc.data().quantity || 0;
              const newQuantity = currentQuantity + lineItem.receivedQuantity;
              
              transaction.update(materialRef, {
                quantity: newQuantity
              });

              // Update the movement with actual quantities
              transaction.update(movementRef, {
                previousQuantity: currentQuantity,
                newQuantity
              });
            }
          }
        }

        totalReceivedInThisReceipt += lineItem.receivedQuantity;
      }

      // Update PO status based on all lines
      const allLines = Array.from(poLines.values());
      const totalOrdered = allLines.reduce((sum, line) => sum + line.data.orderedQuantity, 0);
      const totalReceived = allLines.reduce((sum, line) => sum + (line.data.receivedQuantity || 0), 0) + totalReceivedInThisReceipt;
      
      let newPOStatus: POStatus;
      if (totalReceived === 0) {
        newPOStatus = 'approved';
      } else if (totalReceived >= totalOrdered) {
        newPOStatus = 'fully_received';
      } else {
        newPOStatus = 'partially_received';
      }

      transaction.update(poRef, {
        status: newPOStatus,
        totalReceivedQuantity: totalReceived,
        isFullyReceived: totalReceived >= totalOrdered,
        updatedAt: dateToTimestamp(now)
      });

      return receiptRef.id;
    });
  },

  // Get receipts for a PO
  async getPOReceipts(poId: string, userId: string): Promise<Receipt[]> {
    if (!db) throw new Error('Firebase not configured');

    try {
      const q = query(
        collection(db, COLLECTIONS.RECEIPTS),
        where('poId', '==', poId),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        receivedDate: timestampToDate(doc.data().receivedDate),
        createdAt: timestampToDate(doc.data().createdAt)
      })) as Receipt[];
    } catch (error) {
      console.error('Error fetching PO receipts:', error);
      throw error;
    }
  }
};

// Sample data creation utility
export const sampleDataService = {
  async createSamplePO(userId: string): Promise<string> {
    const samplePO: CreatePORequest = {
      poNumber: `PO-${Date.now()}`,
      supplierName: 'ABC Materials Supply',
      orderDate: new Date(),
      expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      notes: 'Sample purchase order for testing',
      lines: [
        {
          lineNumber: 1,
          materialName: 'Steel Rebar #4',
          materialSku: 'RB-4-20',
          description: '20ft Grade 60 Steel Rebar',
          orderedQuantity: 100,
          unitPrice: 25.50,
          totalPrice: 2550,
          unit: 'pcs'
        },
        {
          lineNumber: 2,
          materialName: 'Concrete Mix',
          materialSku: 'CM-3000',
          description: '3000 PSI Concrete Mix',
          orderedQuantity: 50,
          unitPrice: 120,
          totalPrice: 6000,
          unit: 'bags'
        },
        {
          lineNumber: 3,
          materialName: 'Plywood Sheets',
          materialSku: 'PW-34-48',
          description: '3/4" x 4x8 Plywood Sheets',
          orderedQuantity: 25,
          unitPrice: 45,
          totalPrice: 1125,
          unit: 'sheets'
        }
      ]
    };

    return await poService.createPO(samplePO, userId);
  }
};
