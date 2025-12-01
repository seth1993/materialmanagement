import { Migration, migrationManager } from './index';
import { db } from '@/lib/firebase';
import { doc, setDoc, collection } from 'firebase/firestore';
import { COLLECTIONS } from '@/lib/firestore/collections';

const initialSchemaMigration: Migration = {
  id: '001-initial-schema',
  name: 'initial-schema',
  description: 'Create initial collections and indexes for the materials platform',
  version: '1.0.0',
  up: async () => {
    if (!db) {
      throw new Error('Firestore not initialized');
    }

    console.log('Creating initial schema...');

    // Create initial documents in each collection to ensure they exist
    // Firestore creates collections automatically when first document is added
    
    // Create a system organization
    const systemOrgRef = doc(db, COLLECTIONS.ORGANIZATIONS, 'system');
    await setDoc(systemOrgRef, {
      name: 'System Organization',
      description: 'Default system organization for initial setup',
      isActive: true,
      settings: {
        allowSelfRegistration: false,
        defaultUserRole: 'user',
        requireApprovalForRequisitions: true,
        autoCreatePurchaseOrders: false,
        inventoryTrackingEnabled: true,
        multiLocationEnabled: true
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
      updatedBy: 'system'
    });

    // Create a default inventory location
    const defaultLocationRef = doc(db, COLLECTIONS.INVENTORY_LOCATIONS, 'default-warehouse');
    await setDoc(defaultLocationRef, {
      name: 'Default Warehouse',
      description: 'Default inventory location',
      type: 'warehouse',
      isActive: true,
      organizationId: 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
      updatedBy: 'system'
    });

    // Create sample material categories document for reference
    const categoriesRef = doc(db, 'system', 'material-categories');
    await setDoc(categoriesRef, {
      categories: [
        'Construction Materials',
        'Electrical Components',
        'Plumbing Supplies',
        'Hardware',
        'Tools',
        'Safety Equipment',
        'Office Supplies',
        'Maintenance Supplies',
        'Raw Materials',
        'Finished Goods'
      ],
      units: [
        'each',
        'kg',
        'lbs',
        'g',
        'oz',
        'm',
        'ft',
        'in',
        'cm',
        'mm',
        'l',
        'gal',
        'ml',
        'sqm',
        'sqft',
        'box',
        'pack',
        'roll',
        'sheet',
        'bundle'
      ],
      updatedAt: new Date()
    });

    // Create system settings document
    const settingsRef = doc(db, 'system', 'settings');
    await setDoc(settingsRef, {
      version: '1.0.0',
      initialized: true,
      initializedAt: new Date(),
      features: {
        inventoryTracking: true,
        procurement: true,
        projectManagement: true,
        vendorManagement: true,
        reporting: true
      },
      defaults: {
        currency: 'USD',
        dateFormat: 'MM/DD/YYYY',
        timeZone: 'UTC'
      }
    });

    console.log('Initial schema created successfully.');
  },
  down: async () => {
    // Note: Firestore doesn't support dropping collections easily
    // This would require deleting all documents in each collection
    console.log('Rollback not implemented for initial schema migration.');
  }
};

// Register the migration
migrationManager.register(initialSchemaMigration);

export default initialSchemaMigration;
