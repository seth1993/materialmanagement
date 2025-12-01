export interface VendorContact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string; // e.g., 'Sales Rep', 'Account Manager', 'Technical Support'
  isPrimary: boolean;
}

export interface VendorTerms {
  paymentTerms: string; // e.g., 'Net 30', 'Net 60', '2/10 Net 30'
  shippingTerms: string; // e.g., 'FOB Origin', 'FOB Destination', 'CIF'
  minimumOrderValue?: number;
  currency: string; // e.g., 'USD', 'EUR', 'CAD'
  discountTerms?: string;
}

export interface Vendor {
  id: string;
  name: string;
  code: string; // Unique vendor code for easy reference
  description?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  website?: string;
  taxId?: string;
  contacts: VendorContact[];
  terms: VendorTerms;
  defaultLeadTimeDays: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // User ID who created the vendor
}

export interface VendorMaterial {
  id: string;
  vendorId: string;
  materialId: string;
  materialName: string; // Denormalized for easier querying
  vendorPartNumber?: string;
  basePrice: number;
  currency: string;
  leadTimeDays: number;
  minimumOrderQuantity?: number;
  lastUpdated: Date;
  updatedBy: string; // User ID who last updated the pricing
  isActive: boolean;
}

export interface CreateVendorRequest {
  name: string;
  code: string;
  description?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  website?: string;
  taxId?: string;
  contacts: Omit<VendorContact, 'id'>[];
  terms: VendorTerms;
  defaultLeadTimeDays: number;
}

export interface UpdateVendorRequest extends Partial<CreateVendorRequest> {
  isActive?: boolean;
}

export interface CreateVendorMaterialRequest {
  materialId: string;
  vendorPartNumber?: string;
  basePrice: number;
  currency: string;
  leadTimeDays: number;
  minimumOrderQuantity?: number;
}

export interface UpdateVendorMaterialRequest extends Partial<CreateVendorMaterialRequest> {
  isActive?: boolean;
}
