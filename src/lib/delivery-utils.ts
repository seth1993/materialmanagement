import { DeliveryLineItemStatus, ShipmentIssue, DeliveryLineItem } from '@/types/delivery';

/**
 * Calculate the quantity difference for a delivery line item
 */
export const calculateQuantityDifference = (expected: number, actual: number): number => {
  return actual - expected;
};

/**
 * Determine if a delivery line item has issues that require a ShipmentIssue record
 */
export const hasDeliveryIssue = (status: DeliveryLineItemStatus): boolean => {
  return status !== 'ok';
};

/**
 * Generate a description for a shipment issue based on the delivery line item
 */
export const generateIssueDescription = (
  lineItem: DeliveryLineItem,
  materialName: string
): string => {
  const { status, expectedQuantity, actualQuantity, damageDescription } = lineItem;
  
  switch (status) {
    case 'short':
      return `Short delivery: Expected ${expectedQuantity}, received ${actualQuantity} of ${materialName}`;
    case 'over':
      return `Over delivery: Expected ${expectedQuantity}, received ${actualQuantity} of ${materialName}`;
    case 'damaged':
      const baseDescription = `Damaged delivery: ${actualQuantity} units of ${materialName} received damaged`;
      return damageDescription ? `${baseDescription}. Details: ${damageDescription}` : baseDescription;
    default:
      return `Issue with delivery of ${materialName}`;
  }
};

/**
 * Determine the issue type for a shipment issue
 */
export const getIssueType = (status: DeliveryLineItemStatus): 'short' | 'over' | 'damaged' => {
  if (status === 'ok') {
    throw new Error('Cannot create issue for OK status');
  }
  return status;
};

/**
 * Calculate the new inventory quantity after a delivery
 */
export const calculateNewInventoryQuantity = (
  currentQuantity: number,
  actualDeliveredQuantity: number
): number => {
  return Math.max(0, currentQuantity + actualDeliveredQuantity);
};

/**
 * Validate a PO number format (simple validation)
 */
export const validatePONumber = (poNumber: string): boolean => {
  // Basic validation: not empty and reasonable length
  return poNumber.trim().length > 0 && poNumber.trim().length <= 50;
};

/**
 * Format a PO number for display
 */
export const formatPONumber = (poNumber: string): string => {
  return poNumber.trim().toUpperCase();
};

/**
 * Generate a unique line item ID
 */
export const generateLineItemId = (): string => {
  return `li_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Check if a delivery is complete (all line items confirmed)
 */
export const isDeliveryComplete = (lineItems: DeliveryLineItem[]): boolean => {
  return lineItems.length > 0 && lineItems.every(item => item.status !== undefined);
};

/**
 * Check if a delivery has any issues
 */
export const deliveryHasIssues = (lineItems: DeliveryLineItem[]): boolean => {
  return lineItems.some(item => hasDeliveryIssue(item.status));
};

/**
 * Get delivery status based on line items
 */
export const getDeliveryStatus = (lineItems: DeliveryLineItem[]): 'pending' | 'confirmed' | 'issues' => {
  if (!isDeliveryComplete(lineItems)) {
    return 'pending';
  }
  
  return deliveryHasIssues(lineItems) ? 'issues' : 'confirmed';
};

/**
 * Format date for display in delivery forms
 */
export const formatDeliveryDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Parse date from form input
 */
export const parseFormDate = (dateString: string): Date => {
  return new Date(dateString);
};

/**
 * Validate delivery line item data
 */
export const validateDeliveryLineItem = (item: DeliveryLineItem): string[] => {
  const errors: string[] = [];
  
  if (item.actualQuantity < 0) {
    errors.push('Actual quantity cannot be negative');
  }
  
  if (item.status === 'damaged' && !item.damageDescription?.trim()) {
    errors.push('Damage description is required for damaged items');
  }
  
  if (item.status === 'short' && item.actualQuantity >= item.expectedQuantity) {
    errors.push('Actual quantity should be less than expected for short deliveries');
  }
  
  if (item.status === 'over' && item.actualQuantity <= item.expectedQuantity) {
    errors.push('Actual quantity should be more than expected for over deliveries');
  }
  
  return errors;
};
