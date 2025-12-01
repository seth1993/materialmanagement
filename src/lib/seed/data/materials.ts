import { Material } from '@/types/domain';

export const sampleMaterials: Array<Omit<Material, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>> = [
  // Construction Materials
  {
    name: 'Portland Cement',
    description: 'Type I Portland cement for general construction use',
    sku: 'CEM-001',
    category: 'Construction Materials',
    subcategory: 'Cement',
    unit: 'bag',
    unitCost: 12.50,
    currency: 'USD',
    specifications: {
      weight: '94 lbs',
      type: 'Type I',
      compressiveStrength: '4000 psi'
    },
    tags: ['cement', 'construction', 'concrete'],
    isActive: true,
    organizationId: 'acme-construction',
    trackInventory: true,
    minimumStock: 50,
    maximumStock: 500,
    reorderPoint: 100,
    reorderQuantity: 200
  },
  {
    name: 'Rebar #4',
    description: '#4 Grade 60 rebar, 20 ft length',
    sku: 'REB-004',
    category: 'Construction Materials',
    subcategory: 'Reinforcement',
    unit: 'each',
    unitCost: 8.75,
    currency: 'USD',
    specifications: {
      diameter: '0.5 inch',
      length: '20 ft',
      grade: 'Grade 60'
    },
    tags: ['rebar', 'reinforcement', 'steel'],
    isActive: true,
    organizationId: 'acme-construction',
    trackInventory: true,
    minimumStock: 100,
    maximumStock: 1000,
    reorderPoint: 200,
    reorderQuantity: 500
  },
  {
    name: '2x4 Lumber SPF',
    description: 'Spruce-Pine-Fir dimensional lumber, 8 ft length',
    sku: 'LUM-2x4-8',
    category: 'Construction Materials',
    subcategory: 'Lumber',
    unit: 'each',
    unitCost: 4.25,
    currency: 'USD',
    specifications: {
      dimensions: '2" x 4" x 8\'',
      species: 'Spruce-Pine-Fir',
      grade: 'Construction'
    },
    tags: ['lumber', 'wood', 'framing'],
    isActive: true,
    organizationId: 'acme-construction',
    trackInventory: true,
    minimumStock: 200,
    maximumStock: 2000,
    reorderPoint: 500,
    reorderQuantity: 1000
  },

  // Electrical Components
  {
    name: '12 AWG THHN Wire',
    description: 'Copper THHN building wire, 500 ft spool',
    sku: 'WIRE-12-THHN',
    category: 'Electrical Components',
    subcategory: 'Wire & Cable',
    unit: 'spool',
    unitCost: 89.99,
    currency: 'USD',
    specifications: {
      gauge: '12 AWG',
      insulation: 'THHN',
      conductor: 'Copper',
      length: '500 ft'
    },
    tags: ['wire', 'electrical', 'copper'],
    isActive: true,
    organizationId: 'acme-construction',
    trackInventory: true,
    minimumStock: 10,
    maximumStock: 100,
    reorderPoint: 25,
    reorderQuantity: 50
  },
  {
    name: '20A Circuit Breaker',
    description: 'Single pole 20 amp circuit breaker',
    sku: 'CB-20A-1P',
    category: 'Electrical Components',
    subcategory: 'Circuit Protection',
    unit: 'each',
    unitCost: 15.50,
    currency: 'USD',
    specifications: {
      amperage: '20A',
      poles: '1',
      voltage: '120/240V',
      type: 'Standard'
    },
    tags: ['breaker', 'electrical', 'protection'],
    isActive: true,
    organizationId: 'acme-construction',
    trackInventory: true,
    minimumStock: 20,
    maximumStock: 200,
    reorderPoint: 50,
    reorderQuantity: 100
  },

  // Hardware
  {
    name: 'Hex Bolt 1/2" x 6"',
    description: 'Grade 5 hex bolt with nut and washer',
    sku: 'BOLT-HEX-12-6',
    category: 'Hardware',
    subcategory: 'Fasteners',
    unit: 'each',
    unitCost: 2.25,
    currency: 'USD',
    specifications: {
      diameter: '1/2 inch',
      length: '6 inch',
      grade: 'Grade 5',
      finish: 'Zinc plated'
    },
    tags: ['bolt', 'fastener', 'hardware'],
    isActive: true,
    organizationId: 'acme-construction',
    trackInventory: true,
    minimumStock: 100,
    maximumStock: 1000,
    reorderPoint: 250,
    reorderQuantity: 500
  },

  // Tech Solutions Materials
  {
    name: 'Cat6 Ethernet Cable',
    description: 'Category 6 UTP ethernet cable, 1000 ft box',
    sku: 'CAB-CAT6-1000',
    category: 'Networking',
    subcategory: 'Cables',
    unit: 'box',
    unitCost: 125.00,
    currency: 'USD',
    specifications: {
      category: 'Cat6',
      type: 'UTP',
      length: '1000 ft',
      color: 'Blue'
    },
    tags: ['cable', 'networking', 'ethernet'],
    isActive: true,
    organizationId: 'tech-solutions',
    trackInventory: true,
    minimumStock: 5,
    maximumStock: 50,
    reorderPoint: 10,
    reorderQuantity: 20
  },
  {
    name: 'Network Switch 24-Port',
    description: '24-port gigabit managed network switch',
    sku: 'SW-24P-GIG',
    category: 'Networking',
    subcategory: 'Switches',
    unit: 'each',
    unitCost: 299.99,
    currency: 'USD',
    specifications: {
      ports: '24',
      speed: 'Gigabit',
      type: 'Managed',
      poe: 'No'
    },
    tags: ['switch', 'networking', 'gigabit'],
    isActive: true,
    organizationId: 'tech-solutions',
    trackInventory: true,
    minimumStock: 2,
    maximumStock: 20,
    reorderPoint: 5,
    reorderQuantity: 10
  },

  // Manufacturing Materials
  {
    name: 'Steel Sheet 16 Gauge',
    description: 'Cold rolled steel sheet, 4x8 ft',
    sku: 'STL-16G-4x8',
    category: 'Raw Materials',
    subcategory: 'Steel',
    unit: 'sheet',
    unitCost: 45.00,
    currency: 'USD',
    specifications: {
      gauge: '16',
      dimensions: '4\' x 8\'',
      type: 'Cold rolled',
      finish: 'Mill finish'
    },
    tags: ['steel', 'sheet', 'raw material'],
    isActive: true,
    organizationId: 'manufacturing-corp',
    trackInventory: true,
    minimumStock: 50,
    maximumStock: 500,
    reorderPoint: 100,
    reorderQuantity: 200
  },
  {
    name: 'Aluminum Angle 2x2x1/8',
    description: 'Aluminum angle, 2" x 2" x 1/8", 20 ft length',
    sku: 'ALU-ANG-2x2-18',
    category: 'Raw Materials',
    subcategory: 'Aluminum',
    unit: 'each',
    unitCost: 28.50,
    currency: 'USD',
    specifications: {
      dimensions: '2" x 2" x 1/8"',
      length: '20 ft',
      alloy: '6061-T6',
      finish: 'Mill finish'
    },
    tags: ['aluminum', 'angle', 'structural'],
    isActive: true,
    organizationId: 'manufacturing-corp',
    trackInventory: true,
    minimumStock: 25,
    maximumStock: 250,
    reorderPoint: 50,
    reorderQuantity: 100
  },

  // Safety Equipment
  {
    name: 'Hard Hat Class E',
    description: 'Class E hard hat with 4-point suspension',
    sku: 'PPE-HAT-CE',
    category: 'Safety Equipment',
    subcategory: 'Head Protection',
    unit: 'each',
    unitCost: 18.99,
    currency: 'USD',
    specifications: {
      class: 'Class E',
      suspension: '4-point',
      color: 'White',
      standard: 'ANSI Z89.1'
    },
    tags: ['ppe', 'safety', 'hard hat'],
    isActive: true,
    organizationId: 'acme-construction',
    trackInventory: true,
    minimumStock: 20,
    maximumStock: 100,
    reorderPoint: 30,
    reorderQuantity: 50
  },
  {
    name: 'Safety Glasses Clear',
    description: 'Clear safety glasses with side shields',
    sku: 'PPE-GLASS-CLR',
    category: 'Safety Equipment',
    subcategory: 'Eye Protection',
    unit: 'each',
    unitCost: 8.50,
    currency: 'USD',
    specifications: {
      lens: 'Clear polycarbonate',
      frame: 'Black nylon',
      standard: 'ANSI Z87.1',
      coating: 'Anti-fog'
    },
    tags: ['ppe', 'safety', 'glasses'],
    isActive: true,
    organizationId: 'acme-construction',
    trackInventory: true,
    minimumStock: 50,
    maximumStock: 200,
    reorderPoint: 75,
    reorderQuantity: 100
  }
];
