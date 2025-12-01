'use client';

import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  writeBatch,
  getDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  DeliveryConfirmationForm, 
  Delivery, 
  ShipmentIssue, 
  PurchaseOrder,
  Material,
  DeliveryLineItem
} from '@/types/delivery';
import { 
  hasDeliveryIssue, 
  generateIssueDescription, 
  getIssueType, 
  calculateQuantityDifference,
  calculateNewInventoryQuantity,
  getDeliveryStatus
} from '@/lib/delivery-utils';

/**
 * Process a delivery confirmation and handle all related updates
 */
export async function processDeliveryConfirmation(
  deliveryForm: DeliveryConfirmationForm,
  userId: string
): Promise<{ deliveryId: string; issuesCreated: number; inventoryUpdated: number }> {
  if (!db) {
    throw new Error('Firebase not configured');
  }

  const batch = writeBatch(db);
  let issuesCreated = 0;
  let inventoryUpdated = 0;

  try {
    // 1. Get the purchase order details
    const poDoc = await getDoc(doc(db, 'purchaseOrders', deliveryForm.purchaseOrderId));
    if (!poDoc.exists()) {
      throw new Error('Purchase order not found');
    }
    
    const purchaseOrder = { id: poDoc.id, ...poDoc.data() } as PurchaseOrder;

    // 2. Create delivery line items with proper IDs
    const deliveryLineItems: DeliveryLineItem[] = deliveryForm.lineItems.map((formItem, index) => {
      const poLineItem = purchaseOrder.lineItems.find(item => item.id === formItem.poLineItemId);
      if (!poLineItem) {
        throw new Error(`PO line item not found: ${formItem.poLineItemId}`);
      }

      return {
        id: `dli_${Date.now()}_${index}`,
        poLineItemId: formItem.poLineItemId,
        materialId: poLineItem.materialId,
        materialName: poLineItem.materialName,
        expectedQuantity: poLineItem.expectedQuantity,
        actualQuantity: formItem.actualQuantity,
        status: formItem.status,
        notes: formItem.notes,
        damageDescription: formItem.damageDescription
      };
    });

    // 3. Create the delivery record
    const deliveryData: Omit<Delivery, 'id'> = {
      purchaseOrderId: deliveryForm.purchaseOrderId,
      poNumber: purchaseOrder.poNumber,
      deliveryDate: deliveryForm.deliveryDate,
      receivedBy: deliveryForm.receivedBy,
      lineItems: deliveryLineItems,
      status: getDeliveryStatus(deliveryLineItems),
      createdAt: new Date(),
      userId,
      notes: deliveryForm.notes
    };

    const deliveryRef = doc(collection(db, 'deliveries'));
    batch.set(deliveryRef, deliveryData);

    // 4. Create shipment issues for problematic line items
    const shipmentIssues: ShipmentIssue[] = [];
    
    for (const lineItem of deliveryLineItems) {
      if (hasDeliveryIssue(lineItem.status)) {
        const issueData: Omit<ShipmentIssue, 'id'> = {
          deliveryId: deliveryRef.id,
          purchaseOrderId: deliveryForm.purchaseOrderId,
          poLineItemId: lineItem.poLineItemId,
          materialId: lineItem.materialId,
          materialName: lineItem.materialName,
          issueType: getIssueType(lineItem.status),
          expectedQuantity: lineItem.expectedQuantity,
          actualQuantity: lineItem.actualQuantity,
          quantityDifference: calculateQuantityDifference(lineItem.expectedQuantity, lineItem.actualQuantity),
          description: generateIssueDescription(lineItem, lineItem.materialName),
          status: 'open',
          createdAt: new Date(),
          userId
        };

        const issueRef = doc(collection(db, 'shipmentIssues'));
        batch.set(issueRef, issueData);
        shipmentIssues.push({ id: issueRef.id, ...issueData });
        issuesCreated++;
      }
    }

    // 5. Update material inventory quantities
    const materialUpdates = new Map<string, number>();
    
    // Group line items by material to calculate total quantity changes
    for (const lineItem of deliveryLineItems) {
      const currentChange = materialUpdates.get(lineItem.materialId) || 0;
      materialUpdates.set(lineItem.materialId, currentChange + lineItem.actualQuantity);
    }

    // Update each material's inventory
    for (const [materialId, quantityToAdd] of materialUpdates) {
      try {
        const materialDoc = await getDoc(doc(db, 'materials', materialId));
        if (materialDoc.exists()) {
          const currentMaterial = materialDoc.data() as Material;
          const newQuantity = calculateNewInventoryQuantity(currentMaterial.quantity, quantityToAdd);
          
          batch.update(doc(db, 'materials', materialId), {
            quantity: newQuantity
          });
          inventoryUpdated++;
        }
      } catch (error) {
        console.error(`Error updating material ${materialId}:`, error);
        // Continue with other updates even if one fails
      }
    }

    // 6. Update purchase order status
    const newPOStatus = determineNewPOStatus(purchaseOrder, deliveryLineItems);
    if (newPOStatus !== purchaseOrder.status) {
      batch.update(doc(db, 'purchaseOrders', deliveryForm.purchaseOrderId), {
        status: newPOStatus
      });
    }

    // 7. Commit all changes atomically
    await batch.commit();

    return {
      deliveryId: deliveryRef.id,
      issuesCreated,
      inventoryUpdated
    };

  } catch (error) {
    console.error('Error processing delivery confirmation:', error);
    throw error;
  }
}

/**
 * Determine the new status for a purchase order based on delivery
 */
function determineNewPOStatus(
  purchaseOrder: PurchaseOrder, 
  deliveredLineItems: DeliveryLineItem[]
): 'pending' | 'partial' | 'delivered' | 'cancelled' {
  // If all line items have been delivered (regardless of issues), mark as delivered
  const allItemsDelivered = purchaseOrder.lineItems.every(poItem => 
    deliveredLineItems.some(deliveredItem => deliveredItem.poLineItemId === poItem.id)
  );

  if (allItemsDelivered) {
    return 'delivered';
  }

  // If some items have been delivered, mark as partial
  const someItemsDelivered = deliveredLineItems.length > 0;
  if (someItemsDelivered) {
    return 'partial';
  }

  // Otherwise, keep current status
  return purchaseOrder.status;
}

/**
 * Get all deliveries for a user
 */
export async function getUserDeliveries(userId: string): Promise<Delivery[]> {
  if (!db) {
    throw new Error('Firebase not configured');
  }

  try {
    const q = query(
      collection(db, 'deliveries'),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      deliveryDate: doc.data().deliveryDate?.toDate() || new Date(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as Delivery[];
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    throw error;
  }
}

/**
 * Get all shipment issues for a user
 */
export async function getUserShipmentIssues(userId: string): Promise<ShipmentIssue[]> {
  if (!db) {
    throw new Error('Firebase not configured');
  }

  try {
    const q = query(
      collection(db, 'shipmentIssues'),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      resolvedAt: doc.data().resolvedAt?.toDate() || undefined,
    })) as ShipmentIssue[];
  } catch (error) {
    console.error('Error fetching shipment issues:', error);
    throw error;
  }
}

/**
 * Resolve a shipment issue
 */
export async function resolveShipmentIssue(
  issueId: string,
  resolutionNotes: string,
  resolvedBy: string
): Promise<void> {
  if (!db) {
    throw new Error('Firebase not configured');
  }

  try {
    await updateDoc(doc(db, 'shipmentIssues', issueId), {
      status: 'resolved',
      resolvedAt: new Date(),
      resolvedBy,
      resolutionNotes
    });
  } catch (error) {
    console.error('Error resolving shipment issue:', error);
    throw error;
  }
}

/**
 * Get delivery statistics for a user
 */
export async function getDeliveryStatistics(userId: string): Promise<{
  totalDeliveries: number;
  deliveriesWithIssues: number;
  openIssues: number;
  resolvedIssues: number;
}> {
  if (!db) {
    throw new Error('Firebase not configured');
  }

  try {
    const [deliveries, issues] = await Promise.all([
      getUserDeliveries(userId),
      getUserShipmentIssues(userId)
    ]);

    return {
      totalDeliveries: deliveries.length,
      deliveriesWithIssues: deliveries.filter(d => d.status === 'issues').length,
      openIssues: issues.filter(i => i.status === 'open').length,
      resolvedIssues: issues.filter(i => i.status === 'resolved').length
    };
  } catch (error) {
    console.error('Error getting delivery statistics:', error);
    throw error;
  }
}
