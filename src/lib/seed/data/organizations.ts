import { Organization, UserRole } from '@/types/domain';

export const sampleOrganizations: Array<Omit<Organization, 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'> & { id: string }> = [
  {
    id: 'acme-construction',
    name: 'ACME Construction Co.',
    description: 'Leading construction company specializing in commercial and residential projects',
    address: {
      street: '123 Builder Street',
      city: 'Construction City',
      state: 'CA',
      zipCode: '90210',
      country: 'USA'
    },
    contactEmail: 'info@acmeconstruction.com',
    contactPhone: '+1-555-0123',
    website: 'https://acmeconstruction.com',
    isActive: true,
    settings: {
      allowSelfRegistration: true,
      defaultUserRole: UserRole.USER,
      requireApprovalForRequisitions: true,
      autoCreatePurchaseOrders: false,
      inventoryTrackingEnabled: true,
      multiLocationEnabled: true
    }
  },
  {
    id: 'tech-solutions',
    name: 'Tech Solutions Inc.',
    description: 'Technology solutions provider for enterprise clients',
    address: {
      street: '456 Innovation Drive',
      city: 'Silicon Valley',
      state: 'CA',
      zipCode: '94025',
      country: 'USA'
    },
    contactEmail: 'contact@techsolutions.com',
    contactPhone: '+1-555-0456',
    website: 'https://techsolutions.com',
    isActive: true,
    settings: {
      allowSelfRegistration: false,
      defaultUserRole: UserRole.USER,
      requireApprovalForRequisitions: false,
      autoCreatePurchaseOrders: true,
      inventoryTrackingEnabled: true,
      multiLocationEnabled: false
    }
  },
  {
    id: 'manufacturing-corp',
    name: 'Global Manufacturing Corp',
    description: 'Large-scale manufacturing company with multiple facilities worldwide',
    address: {
      street: '789 Industrial Blvd',
      city: 'Manufacturing City',
      state: 'TX',
      zipCode: '75001',
      country: 'USA'
    },
    contactEmail: 'info@globalmanufacturing.com',
    contactPhone: '+1-555-0789',
    website: 'https://globalmanufacturing.com',
    isActive: true,
    settings: {
      allowSelfRegistration: false,
      defaultUserRole: UserRole.VIEWER,
      requireApprovalForRequisitions: true,
      autoCreatePurchaseOrders: false,
      inventoryTrackingEnabled: true,
      multiLocationEnabled: true
    }
  }
];
