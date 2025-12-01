import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PurchaseOrder } from '@/types/po';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: typeof autoTable;
  }
}

export interface CompanyInfo {
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  phone?: string;
  email?: string;
  website?: string;
  logo?: string; // Base64 encoded image or URL
}

// Default company info - this should be configurable in a real app
const DEFAULT_COMPANY_INFO: CompanyInfo = {
  name: 'Stike Materials',
  address: {
    street: '123 Business Ave',
    city: 'Business City',
    state: 'BC',
    zipCode: '12345',
    country: 'USA'
  },
  phone: '(555) 123-4567',
  email: 'orders@stikematerials.com',
  website: 'www.stikematerials.com'
};

export class PDFGenerator {
  private doc: jsPDF;
  private companyInfo: CompanyInfo;

  constructor(companyInfo: CompanyInfo = DEFAULT_COMPANY_INFO) {
    this.doc = new jsPDF();
    this.companyInfo = companyInfo;
  }

  async generatePOPDF(po: PurchaseOrder): Promise<Blob> {
    try {
      // Reset document
      this.doc = new jsPDF();
      
      // Add header
      this.addHeader();
      
      // Add PO details
      this.addPODetails(po);
      
      // Add vendor information
      this.addVendorInfo(po);
      
      // Add ship-to information
      this.addShipToInfo(po);
      
      // Add line items table
      this.addLineItemsTable(po);
      
      // Add totals
      this.addTotals(po);
      
      // Add terms and notes
      this.addTermsAndNotes(po);
      
      // Add footer
      this.addFooter();
      
      // Return as blob
      return new Blob([this.doc.output('blob')], { type: 'application/pdf' });
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate PDF');
    }
  }

  private addHeader(): void {
    const { doc } = this;
    
    // Company name
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(this.companyInfo.name, 20, 25);
    
    // Company address
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const addressLines = [
      this.companyInfo.address.street,
      `${this.companyInfo.address.city}, ${this.companyInfo.address.state} ${this.companyInfo.address.zipCode}`,
      this.companyInfo.address.country
    ];
    
    let yPos = 35;
    addressLines.forEach(line => {
      doc.text(line, 20, yPos);
      yPos += 5;
    });
    
    if (this.companyInfo.phone) {
      doc.text(`Phone: ${this.companyInfo.phone}`, 20, yPos);
      yPos += 5;
    }
    
    if (this.companyInfo.email) {
      doc.text(`Email: ${this.companyInfo.email}`, 20, yPos);
      yPos += 5;
    }
    
    if (this.companyInfo.website) {
      doc.text(`Website: ${this.companyInfo.website}`, 20, yPos);
    }
    
    // Purchase Order title
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('PURCHASE ORDER', 120, 25);
    
    // Add a line separator
    doc.setLineWidth(0.5);
    doc.line(20, 75, 190, 75);
  }

  private addPODetails(po: PurchaseOrder): void {
    const { doc } = this;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    
    // PO Number
    doc.text('PO Number:', 120, 40);
    doc.setFont('helvetica', 'normal');
    doc.text(po.poNumber, 150, 40);
    
    // Order Date
    doc.setFont('helvetica', 'bold');
    doc.text('Order Date:', 120, 50);
    doc.setFont('helvetica', 'normal');
    doc.text(po.orderDate.toLocaleDateString(), 150, 50);
    
    // Requested Delivery Date
    if (po.requestedDeliveryDate) {
      doc.setFont('helvetica', 'bold');
      doc.text('Delivery Date:', 120, 60);
      doc.setFont('helvetica', 'normal');
      doc.text(po.requestedDeliveryDate.toLocaleDateString(), 150, 60);
    }
    
    // Status
    doc.setFont('helvetica', 'bold');
    doc.text('Status:', 120, 70);
    doc.setFont('helvetica', 'normal');
    doc.text(po.status.toUpperCase(), 150, 70);
  }

  private addVendorInfo(po: PurchaseOrder): void {
    const { doc } = this;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('VENDOR:', 20, 90);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    let yPos = 100;
    
    if (po.vendor) {
      doc.text(po.vendor.name, 20, yPos);
      yPos += 5;
      
      // Vendor address
      doc.text(po.vendor.address.street, 20, yPos);
      yPos += 5;
      doc.text(`${po.vendor.address.city}, ${po.vendor.address.state} ${po.vendor.address.zipCode}`, 20, yPos);
      yPos += 5;
      doc.text(po.vendor.address.country, 20, yPos);
      yPos += 10;
      
      // Primary contact
      if (po.vendor.primaryContact) {
        doc.setFont('helvetica', 'bold');
        doc.text('Contact:', 20, yPos);
        doc.setFont('helvetica', 'normal');
        yPos += 5;
        doc.text(po.vendor.primaryContact.name, 20, yPos);
        yPos += 5;
        doc.text(po.vendor.primaryContact.email, 20, yPos);
        if (po.vendor.primaryContact.phone) {
          yPos += 5;
          doc.text(po.vendor.primaryContact.phone, 20, yPos);
        }
      }
    }
  }

  private addShipToInfo(po: PurchaseOrder): void {
    const { doc } = this;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('SHIP TO:', 120, 90);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    let yPos = 100;
    
    if (po.shipTo.name) {
      doc.text(po.shipTo.name, 120, yPos);
      yPos += 5;
    }
    
    doc.text(po.shipTo.street, 120, yPos);
    yPos += 5;
    doc.text(`${po.shipTo.city}, ${po.shipTo.state} ${po.shipTo.zipCode}`, 120, yPos);
    yPos += 5;
    doc.text(po.shipTo.country, 120, yPos);
  }

  private addLineItemsTable(po: PurchaseOrder): void {
    const { doc } = this;
    
    const tableData = po.lineItems.map(item => [
      item.description,
      item.quantity.toString(),
      item.unit,
      `$${item.unitPrice.toFixed(2)}`,
      `$${item.totalPrice.toFixed(2)}`
    ]);
    
    autoTable(doc, {
      startY: 150,
      head: [['Description', 'Qty', 'Unit', 'Unit Price', 'Total']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: 255,
        fontStyle: 'bold'
      },
      columnStyles: {
        1: { halign: 'center' }, // Quantity
        2: { halign: 'center' }, // Unit
        3: { halign: 'right' },  // Unit Price
        4: { halign: 'right' }   // Total
      },
      styles: {
        fontSize: 10,
        cellPadding: 5
      }
    });
  }

  private addTotals(po: PurchaseOrder): void {
    const { doc } = this;
    
    // Get the Y position after the table
    const finalY = (doc as any).lastAutoTable.finalY || 200;
    let yPos = finalY + 20;
    
    doc.setFontSize(10);
    
    // Subtotal
    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal:', 140, yPos);
    doc.text(`$${po.subtotal.toFixed(2)}`, 170, yPos);
    yPos += 8;
    
    // Tax
    if (po.taxAmount && po.taxAmount > 0) {
      doc.text(`Tax (${po.taxRate}%):`, 140, yPos);
      doc.text(`$${po.taxAmount.toFixed(2)}`, 170, yPos);
      yPos += 8;
    }
    
    // Shipping
    if (po.shippingAmount && po.shippingAmount > 0) {
      doc.text('Shipping:', 140, yPos);
      doc.text(`$${po.shippingAmount.toFixed(2)}`, 170, yPos);
      yPos += 8;
    }
    
    // Total
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('TOTAL:', 140, yPos);
    doc.text(`$${po.totalAmount.toFixed(2)}`, 170, yPos);
    
    // Add a line above total
    doc.setLineWidth(0.5);
    doc.line(140, yPos - 3, 185, yPos - 3);
  }

  private addTermsAndNotes(po: PurchaseOrder): void {
    const { doc } = this;
    
    // Get the Y position after totals
    const finalY = (doc as any).lastAutoTable?.finalY || 200;
    let yPos = finalY + 60;
    
    // Check if we need a new page
    if (yPos > 250) {
      doc.addPage();
      yPos = 30;
    }
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    
    // Terms
    doc.text('TERMS:', 20, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(po.terms, 20, yPos);
    yPos += 15;
    
    // Notes
    if (po.notes) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('NOTES:', 20, yPos);
      yPos += 10;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      // Split notes into lines if too long
      const splitNotes = doc.splitTextToSize(po.notes, 170);
      doc.text(splitNotes, 20, yPos);
    }
  }

  private addFooter(): void {
    const { doc } = this;
    
    const pageCount = doc.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Add page number
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Page ${i} of ${pageCount}`, 170, 285);
      
      // Add generation timestamp
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 285);
    }
  }

  // Utility method to download the PDF
  static async downloadPOPDF(po: PurchaseOrder, filename?: string): Promise<void> {
    const generator = new PDFGenerator();
    const pdfBlob = await generator.generatePOPDF(po);
    
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `PO-${po.poNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Utility method to get PDF as base64 for email attachments
  static async getPOPDFAsBase64(po: PurchaseOrder): Promise<string> {
    const generator = new PDFGenerator();
    const pdfBlob = await generator.generatePOPDF(po);
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(pdfBlob);
    });
  }
}
