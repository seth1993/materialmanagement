import { PurchaseOrderCSVRow, ReceiptCSVRow } from '@/types/accounting';

export const convertToCSV = (data: any[], headers: string[]): string => {
  if (data.length === 0) {
    return headers.join(',') + '\n';
  }

  const csvRows = [headers.join(',')];
  
  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header];
      
      // Handle different data types
      if (value === null || value === undefined) {
        return '';
      }
      
      if (typeof value === 'string') {
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }
      
      if (typeof value === 'boolean') {
        return value ? 'TRUE' : 'FALSE';
      }
      
      return String(value);
    });
    
    csvRows.push(values.join(','));
  });
  
  return csvRows.join('\n');
};

export const downloadCSV = (csvContent: string, filename: string): void => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

export const generatePurchaseOrderCSV = (data: PurchaseOrderCSVRow[]): string => {
  const headers = [
    'poNumber',
    'vendorName',
    'vendorTaxId',
    'projectName',
    'projectCode',
    'orderDate',
    'description',
    'quantity',
    'unitPrice',
    'totalPrice',
    'costCode',
    'costCodeName',
    'taxable',
    'taxAmount',
    'subtotal',
    'totalAmount',
    'status'
  ];
  
  return convertToCSV(data, headers);
};

export const generateReceiptCSV = (data: ReceiptCSVRow[]): string => {
  const headers = [
    'receiptNumber',
    'invoiceNumber',
    'vendorName',
    'vendorTaxId',
    'projectName',
    'projectCode',
    'receiptDate',
    'description',
    'quantity',
    'unitPrice',
    'totalPrice',
    'costCode',
    'costCodeName',
    'taxable',
    'taxAmount',
    'subtotal',
    'totalAmount',
    'paymentStatus',
    'paymentDate'
  ];
  
  return convertToCSV(data, headers);
};

export const generateFilename = (type: 'purchase-orders' | 'receipts', startDate: Date, endDate: Date): string => {
  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  const typeLabel = type === 'purchase-orders' ? 'PurchaseOrders' : 'Receipts';
  const start = formatDate(startDate);
  const end = formatDate(endDate);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  
  return `${typeLabel}_${start}_to_${end}_${timestamp}.csv`;
};
