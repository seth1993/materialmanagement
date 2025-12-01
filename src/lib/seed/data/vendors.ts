import { Vendor } from '@/types/domain';

export const sampleVendors: Array<Omit<Vendor, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>> = [
  {
    name: 'BuildMart Supply Co.',
    description: 'Leading supplier of construction materials and hardware',
    contactPerson: 'John Smith',
    email: 'orders@buildmart.com',
    phone: '+1-555-BUILD',
    website: 'https://buildmart.com',
    address: {
      street: '1234 Industrial Way',
      city: 'Construction City',
      state: 'CA',
      zipCode: '90210',
      country: 'USA'
    },
    taxId: '12-3456789',
    paymentTerms: 'Net 30',
    rating: 4.5,
    isActive: true,
    organizationId: 'acme-construction',
    tags: ['construction', 'materials', 'hardware']
  },
  {
    name: 'ElectroMax Components',
    description: 'Electrical components and supplies distributor',
    contactPerson: 'Sarah Johnson',
    email: 'sales@electromax.com',
    phone: '+1-555-ELECT',
    website: 'https://electromax.com',
    address: {
      street: '5678 Electric Avenue',
      city: 'Voltage City',
      state: 'TX',
      zipCode: '75001',
      country: 'USA'
    },
    taxId: '98-7654321',
    paymentTerms: 'Net 15',
    rating: 4.8,
    isActive: true,
    organizationId: 'acme-construction',
    tags: ['electrical', 'components', 'wire']
  },
  {
    name: 'Steel & More Inc.',
    description: 'Steel and metal fabrication supplier',
    contactPerson: 'Mike Rodriguez',
    email: 'info@steelandmore.com',
    phone: '+1-555-STEEL',
    website: 'https://steelandmore.com',
    address: {
      street: '9012 Steel Drive',
      city: 'Metal City',
      state: 'PA',
      zipCode: '15001',
      country: 'USA'
    },
    taxId: '45-6789012',
    paymentTerms: 'Net 45',
    rating: 4.2,
    isActive: true,
    organizationId: 'acme-construction',
    tags: ['steel', 'metal', 'fabrication']
  },
  {
    name: 'TechNet Solutions',
    description: 'Network equipment and IT hardware supplier',
    contactPerson: 'Lisa Chen',
    email: 'orders@technetsolutions.com',
    phone: '+1-555-TECH1',
    website: 'https://technetsolutions.com',
    address: {
      street: '3456 Technology Blvd',
      city: 'Silicon Valley',
      state: 'CA',
      zipCode: '94025',
      country: 'USA'
    },
    taxId: '67-8901234',
    paymentTerms: 'Net 30',
    rating: 4.7,
    isActive: true,
    organizationId: 'tech-solutions',
    tags: ['networking', 'IT', 'hardware']
  },
  {
    name: 'DataCom Express',
    description: 'Data communications and networking specialist',
    contactPerson: 'Robert Kim',
    email: 'sales@datacomexpress.com',
    phone: '+1-555-DATA1',
    website: 'https://datacomexpress.com',
    address: {
      street: '7890 Data Center Way',
      city: 'Network City',
      state: 'WA',
      zipCode: '98001',
      country: 'USA'
    },
    taxId: '23-4567890',
    paymentTerms: 'Net 15',
    rating: 4.6,
    isActive: true,
    organizationId: 'tech-solutions',
    tags: ['data', 'communications', 'fiber']
  },
  {
    name: 'Industrial Metals Corp',
    description: 'Industrial metals and raw materials supplier',
    contactPerson: 'David Wilson',
    email: 'procurement@industrialmetals.com',
    phone: '+1-555-METAL',
    website: 'https://industrialmetals.com',
    address: {
      street: '1111 Industrial Park',
      city: 'Manufacturing City',
      state: 'TX',
      zipCode: '75001',
      country: 'USA'
    },
    taxId: '89-0123456',
    paymentTerms: 'Net 60',
    rating: 4.3,
    isActive: true,
    organizationId: 'manufacturing-corp',
    tags: ['metals', 'raw materials', 'industrial']
  },
  {
    name: 'Precision Alloys Ltd',
    description: 'Specialty alloys and precision metals',
    contactPerson: 'Jennifer Martinez',
    email: 'orders@precisionalloys.com',
    phone: '+1-555-ALLOY',
    website: 'https://precisionalloys.com',
    address: {
      street: '2222 Alloy Street',
      city: 'Precision City',
      state: 'OH',
      zipCode: '44001',
      country: 'USA'
    },
    taxId: '34-5678901',
    paymentTerms: 'Net 30',
    rating: 4.9,
    isActive: true,
    organizationId: 'manufacturing-corp',
    tags: ['alloys', 'precision', 'specialty']
  },
  {
    name: 'SafetyFirst Equipment',
    description: 'Personal protective equipment and safety supplies',
    contactPerson: 'Tom Anderson',
    email: 'safety@safetyfirst.com',
    phone: '+1-555-SAFE1',
    website: 'https://safetyfirst.com',
    address: {
      street: '4444 Safety Boulevard',
      city: 'Protection City',
      state: 'FL',
      zipCode: '33001',
      country: 'USA'
    },
    taxId: '56-7890123',
    paymentTerms: 'Net 30',
    rating: 4.4,
    isActive: true,
    organizationId: 'acme-construction',
    tags: ['safety', 'ppe', 'protection']
  },
  {
    name: 'Global Tool Supply',
    description: 'Professional tools and equipment distributor',
    contactPerson: 'Amanda Brown',
    email: 'tools@globaltoolsupply.com',
    phone: '+1-555-TOOLS',
    website: 'https://globaltoolsupply.com',
    address: {
      street: '6666 Tool Drive',
      city: 'Equipment City',
      state: 'MI',
      zipCode: '48001',
      country: 'USA'
    },
    taxId: '78-9012345',
    paymentTerms: 'Net 30',
    rating: 4.1,
    isActive: true,
    organizationId: 'acme-construction',
    tags: ['tools', 'equipment', 'professional']
  },
  {
    name: 'Office Depot Pro',
    description: 'Office supplies and business equipment',
    contactPerson: 'Kevin Lee',
    email: 'business@officedepotpro.com',
    phone: '+1-555-OFFICE',
    website: 'https://officedepotpro.com',
    address: {
      street: '8888 Office Park',
      city: 'Business City',
      state: 'NY',
      zipCode: '10001',
      country: 'USA'
    },
    taxId: '90-1234567',
    paymentTerms: 'Net 15',
    rating: 3.9,
    isActive: true,
    organizationId: 'tech-solutions',
    tags: ['office', 'supplies', 'business']
  }
];
