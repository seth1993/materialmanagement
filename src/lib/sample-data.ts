import { 
  collection, 
  addDoc, 
  doc, 
  setDoc,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function createSampleProject(userId: string) {
  const projectId = 'sample-project-' + Date.now();
  
  // Create sample project
  await setDoc(doc(db, 'projects', projectId), {
    name: 'Office Building Construction',
    description: 'Construction of a 5-story office building in downtown',
    budget: 500000,
    status: 'active',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    userId,
    startDate: Timestamp.fromDate(new Date('2024-01-01')),
    endDate: Timestamp.fromDate(new Date('2024-12-31')),
    location: 'Downtown District',
    projectManager: 'John Smith'
  });

  // Create sample vendors
  const vendors = [
    { id: 'vendor-1', name: 'Steel Supply Co.', contactEmail: 'orders@steelsupply.com' },
    { id: 'vendor-2', name: 'Concrete Masters', contactEmail: 'sales@concretemasters.com' },
    { id: 'vendor-3', name: 'Electrical Solutions', contactEmail: 'info@electricalsolutions.com' },
    { id: 'vendor-4', name: 'Plumbing Pro', contactEmail: 'orders@plumbingpro.com' },
    { id: 'vendor-5', name: 'Hardware Plus', contactEmail: 'sales@hardwareplus.com' }
  ];

  for (const vendor of vendors) {
    await setDoc(doc(db, 'vendors', vendor.id), {
      ...vendor,
      contactPhone: '+1-555-0123',
      address: '123 Business St, City, State 12345',
      paymentTerms: 'Net 30',
      rating: 4.5,
      isActive: true,
      createdAt: Timestamp.now(),
      userId,
      projectId
    });
  }

  // Create sample material groups
  const materialGroups = [
    { id: 'group-1', name: 'Structural Steel', color: '#3b82f6' },
    { id: 'group-2', name: 'Concrete & Cement', color: '#10b981' },
    { id: 'group-3', name: 'Electrical Components', color: '#f59e0b' },
    { id: 'group-4', name: 'Plumbing Fixtures', color: '#ef4444' },
    { id: 'group-5', name: 'Hardware & Fasteners', color: '#8b5cf6' }
  ];

  for (const group of materialGroups) {
    await setDoc(doc(db, 'materialGroups', group.id), {
      ...group,
      description: `Materials for ${group.name.toLowerCase()}`,
      projectId,
      userId,
      createdAt: Timestamp.now()
    });
  }

  // Create sample purchase orders
  const purchaseOrders = [
    {
      poNumber: 'PO-2024-001',
      vendorId: 'vendor-1',
      vendorName: 'Steel Supply Co.',
      status: 'completed',
      orderDate: Timestamp.fromDate(new Date('2024-02-15')),
      items: [
        {
          id: 'item-1',
          materialId: 'mat-1',
          materialName: 'I-Beam Steel 12"',
          quantity: 50,
          unitPrice: 450,
          totalPrice: 22500,
          receivedQuantity: 50,
          materialGroupId: 'group-1'
        }
      ],
      subtotal: 22500,
      tax: 1800,
      total: 24300
    },
    {
      poNumber: 'PO-2024-002',
      vendorId: 'vendor-2',
      vendorName: 'Concrete Masters',
      status: 'completed',
      orderDate: Timestamp.fromDate(new Date('2024-03-01')),
      items: [
        {
          id: 'item-2',
          materialId: 'mat-2',
          materialName: 'Ready Mix Concrete',
          quantity: 100,
          unitPrice: 120,
          totalPrice: 12000,
          receivedQuantity: 100,
          materialGroupId: 'group-2'
        }
      ],
      subtotal: 12000,
      tax: 960,
      total: 12960
    },
    {
      poNumber: 'PO-2024-003',
      vendorId: 'vendor-3',
      vendorName: 'Electrical Solutions',
      status: 'partially_received',
      orderDate: Timestamp.fromDate(new Date('2024-03-15')),
      items: [
        {
          id: 'item-3',
          materialId: 'mat-3',
          materialName: 'Electrical Wire 12 AWG',
          quantity: 1000,
          unitPrice: 2.5,
          totalPrice: 2500,
          receivedQuantity: 750,
          materialGroupId: 'group-3'
        }
      ],
      subtotal: 2500,
      tax: 200,
      total: 2700
    },
    {
      poNumber: 'PO-2024-004',
      vendorId: 'vendor-4',
      vendorName: 'Plumbing Pro',
      status: 'sent',
      orderDate: Timestamp.fromDate(new Date('2024-04-01')),
      items: [
        {
          id: 'item-4',
          materialId: 'mat-4',
          materialName: 'Copper Pipes 1"',
          quantity: 200,
          unitPrice: 15,
          totalPrice: 3000,
          receivedQuantity: 0,
          materialGroupId: 'group-4'
        }
      ],
      subtotal: 3000,
      tax: 240,
      total: 3240
    },
    {
      poNumber: 'PO-2024-005',
      vendorId: 'vendor-5',
      vendorName: 'Hardware Plus',
      status: 'completed',
      orderDate: Timestamp.fromDate(new Date('2024-04-10')),
      items: [
        {
          id: 'item-5',
          materialId: 'mat-5',
          materialName: 'Bolts & Screws Assorted',
          quantity: 500,
          unitPrice: 1.2,
          totalPrice: 600,
          receivedQuantity: 500,
          materialGroupId: 'group-5'
        }
      ],
      subtotal: 600,
      tax: 48,
      total: 648
    }
  ];

  for (const po of purchaseOrders) {
    await addDoc(collection(db, 'purchaseOrders'), {
      ...po,
      projectId,
      userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
  }

  // Create sample requisitions
  const requisitions = [
    {
      title: 'Additional Steel Beams',
      description: 'Need more steel beams for the upper floors',
      status: 'pending',
      priority: 'high',
      requestedBy: 'Site Manager',
      requestedDate: Timestamp.fromDate(new Date('2024-04-15')),
      items: [
        {
          id: 'req-item-1',
          materialId: 'mat-6',
          materialName: 'I-Beam Steel 10"',
          quantity: 25,
          unitPrice: 400,
          totalPrice: 10000,
          materialGroupId: 'group-1'
        }
      ],
      totalAmount: 10000
    },
    {
      title: 'Electrical Conduits',
      description: 'Conduits for electrical wiring installation',
      status: 'approved',
      priority: 'medium',
      requestedBy: 'Electrical Foreman',
      requestedDate: Timestamp.fromDate(new Date('2024-04-20')),
      items: [
        {
          id: 'req-item-2',
          materialId: 'mat-7',
          materialName: 'PVC Conduit 2"',
          quantity: 100,
          unitPrice: 8,
          totalPrice: 800,
          materialGroupId: 'group-3'
        }
      ],
      totalAmount: 800
    }
  ];

  for (const req of requisitions) {
    await addDoc(collection(db, 'requisitions'), {
      ...req,
      projectId,
      userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
  }

  // Create sample shipments
  const shipments = [
    {
      purchaseOrderId: 'po-ref-1',
      trackingNumber: 'TRK123456789',
      carrier: 'FastShip Logistics',
      status: 'in_transit',
      shippedDate: Timestamp.fromDate(new Date('2024-04-18')),
      expectedDeliveryDate: Timestamp.fromDate(new Date('2024-04-22')),
      items: [
        {
          id: 'ship-item-1',
          materialId: 'mat-8',
          materialName: 'Insulation Panels',
          quantity: 50,
          condition: 'good'
        }
      ],
      notes: 'Fragile items - handle with care'
    }
  ];

  for (const shipment of shipments) {
    await addDoc(collection(db, 'shipments'), {
      ...shipment,
      projectId,
      userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
  }

  // Create sample issues
  const issues = [
    {
      title: 'Delayed Steel Delivery',
      description: 'Steel beams delivery is delayed by 2 weeks due to supplier issues',
      type: 'delivery',
      priority: 'high',
      status: 'open',
      reportedBy: 'Project Manager',
      reportedDate: Timestamp.fromDate(new Date('2024-04-16')),
      relatedEntityType: 'vendor',
      relatedEntityId: 'vendor-1'
    },
    {
      title: 'Quality Issue with Concrete',
      description: 'Some concrete batches do not meet strength requirements',
      type: 'quality',
      priority: 'critical',
      status: 'in_progress',
      reportedBy: 'Quality Inspector',
      reportedDate: Timestamp.fromDate(new Date('2024-04-12')),
      relatedEntityType: 'vendor',
      relatedEntityId: 'vendor-2'
    }
  ];

  for (const issue of issues) {
    await addDoc(collection(db, 'issues'), {
      ...issue,
      projectId,
      userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
  }

  return projectId;
}

export async function createSampleData(userId: string) {
  try {
    const projectId = await createSampleProject(userId);
    console.log('Sample data created successfully for project:', projectId);
    return projectId;
  } catch (error) {
    console.error('Error creating sample data:', error);
    throw error;
  }
}
