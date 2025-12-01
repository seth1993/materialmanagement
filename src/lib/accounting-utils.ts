import { PurchaseOrder, Receipt, PurchaseOrderCSVRow, ReceiptCSVRow } from '@/types/accounting';

export const generatePONumber = (): string => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `PO-${timestamp}-${random}`;
};

export const generateReceiptNumber = (): string => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `REC-${timestamp}-${random}`;
};

export const calculateLineItemTotal = (quantity: number, unitPrice: number): number => {
  return Math.round(quantity * unitPrice * 100) / 100;
};

export const calculateTax = (subtotal: number, taxRate: number = 0.08): number => {
  return Math.round(subtotal * taxRate * 100) / 100;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US');
};

export const formatDateForCSV = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const convertPurchaseOrderToCSVRow = (po: PurchaseOrder): PurchaseOrderCSVRow[] => {
  return po.lineItems.map(lineItem => ({
    poNumber: po.poNumber,
    vendorName: po.vendor?.name || '',
    vendorTaxId: po.vendor?.taxId || '',
    projectName: po.project?.name || '',
    projectCode: po.project?.projectCode || '',
    orderDate: formatDateForCSV(po.orderDate),
    description: lineItem.description,
    quantity: lineItem.quantity,
    unitPrice: lineItem.unitPrice,
    totalPrice: lineItem.totalPrice,
    costCode: lineItem.costCode?.code || '',
    costCodeName: lineItem.costCode?.name || '',
    taxable: lineItem.taxable,
    taxAmount: lineItem.taxable ? calculateTax(lineItem.totalPrice) : 0,
    subtotal: po.subtotal,
    totalAmount: po.totalAmount,
    status: po.status,
  }));
};

export const convertReceiptToCSVRow = (receipt: Receipt): ReceiptCSVRow[] => {
  return receipt.lineItems.map(lineItem => ({
    receiptNumber: receipt.receiptNumber,
    invoiceNumber: receipt.invoiceNumber || '',
    vendorName: receipt.vendor?.name || '',
    vendorTaxId: receipt.vendor?.taxId || '',
    projectName: receipt.project?.name || '',
    projectCode: receipt.project?.projectCode || '',
    receiptDate: formatDateForCSV(receipt.receiptDate),
    description: lineItem.description,
    quantity: lineItem.quantity,
    unitPrice: lineItem.unitPrice,
    totalPrice: lineItem.totalPrice,
    costCode: lineItem.costCode?.code || '',
    costCodeName: lineItem.costCode?.name || '',
    taxable: lineItem.taxable,
    taxAmount: lineItem.taxable ? calculateTax(lineItem.totalPrice) : 0,
    subtotal: receipt.subtotal,
    totalAmount: receipt.totalAmount,
    paymentStatus: receipt.paymentStatus,
    paymentDate: receipt.paymentDate ? formatDateForCSV(receipt.paymentDate) : '',
  }));
};

export const validatePurchaseOrder = (po: Partial<PurchaseOrder>): string[] => {
  const errors: string[] = [];
  
  if (!po.poNumber?.trim()) {
    errors.push('PO Number is required');
  }
  
  if (!po.vendorId?.trim()) {
    errors.push('Vendor is required');
  }
  
  if (!po.orderDate) {
    errors.push('Order date is required');
  }
  
  if (!po.lineItems || po.lineItems.length === 0) {
    errors.push('At least one line item is required');
  }
  
  if (po.lineItems) {
    po.lineItems.forEach((item, index) => {
      if (!item.description?.trim()) {
        errors.push(`Line item ${index + 1}: Description is required`);
      }
      if (!item.quantity || item.quantity <= 0) {
        errors.push(`Line item ${index + 1}: Quantity must be greater than 0`);
      }
      if (!item.unitPrice || item.unitPrice <= 0) {
        errors.push(`Line item ${index + 1}: Unit price must be greater than 0`);
      }
    });
  }
  
  return errors;
};

export const validateReceipt = (receipt: Partial<Receipt>): string[] => {
  const errors: string[] = [];
  
  if (!receipt.receiptNumber?.trim()) {
    errors.push('Receipt Number is required');
  }
  
  if (!receipt.vendorId?.trim()) {
    errors.push('Vendor is required');
  }
  
  if (!receipt.receiptDate) {
    errors.push('Receipt date is required');
  }
  
  if (!receipt.lineItems || receipt.lineItems.length === 0) {
    errors.push('At least one line item is required');
  }
  
  if (receipt.lineItems) {
    receipt.lineItems.forEach((item, index) => {
      if (!item.description?.trim()) {
        errors.push(`Line item ${index + 1}: Description is required`);
      }
      if (!item.quantity || item.quantity <= 0) {
        errors.push(`Line item ${index + 1}: Quantity must be greater than 0`);
      }
      if (!item.unitPrice || item.unitPrice <= 0) {
        errors.push(`Line item ${index + 1}: Unit price must be greater than 0`);
      }
    });
  }
  
  return errors;
};
