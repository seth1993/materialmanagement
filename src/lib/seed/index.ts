import { db } from '@/lib/firebase';
import { Timestamp } from 'firebase/firestore';
import { materialService } from '@/services/MaterialService';
import { userService } from '@/services/UserService';

// Import seed data
import { sampleUsers } from './data/users';
import { sampleOrganizations } from './data/organizations';
import { sampleMaterials } from './data/materials';
import { sampleVendors } from './data/vendors';

export interface SeedOptions {
  organizations?: boolean;
  users?: boolean;
  materials?: boolean;
  vendors?: boolean;
  projects?: boolean;
  inventory?: boolean;
  clearExisting?: boolean;
}

export class DatabaseSeeder {
  constructor() {
    if (!db) {
      throw new Error('Firestore not initialized');
    }
  }

  /**
   * Seed the database with sample data
   */
  async seed(options: SeedOptions = {}): Promise<void> {
    const {
      organizations = true,
      users = true,
      materials = true,
      vendors = true,
      projects = false,
      inventory = false,
      clearExisting = false
    } = options;

    console.log('🌱 Starting database seeding...');

    try {
      if (clearExisting) {
        console.log('🧹 Clearing existing data...');
        await this.clearData();
      }

      if (organizations) {
        console.log('🏢 Seeding organizations...');
        await this.seedOrganizations();
      }

      if (users) {
        console.log('👥 Seeding users...');
        await this.seedUsers();
      }

      if (materials) {
        console.log('📦 Seeding materials...');
        await this.seedMaterials();
      }

      if (vendors) {
        console.log('🏪 Seeding vendors...');
        await this.seedVendors();
      }

      if (projects) {
        console.log('🏗️ Seeding projects...');
        await this.seedProjects();
      }

      if (inventory) {
        console.log('📊 Seeding inventory...');
        await this.seedInventory();
      }

      console.log('✅ Database seeding completed successfully!');
    } catch (error) {
      console.error('❌ Database seeding failed:', error);
      throw error;
    }
  }

  /**
   * Clear existing data (use with caution!)
   */
  private async clearData(): Promise<void> {
    // Note: This is a simplified implementation
    // In production, you might want to implement proper data clearing
    console.warn('Data clearing not implemented - would require careful deletion of all documents');
  }

  /**
   * Seed organizations
   */
  private async seedOrganizations(): Promise<void> {
    const { getOrganizationsCollection } = await import('@/lib/firestore/collections');
    const { createDocument } = await import('@/lib/firestore/utils');
    
    const collection = getOrganizationsCollection();
    
    for (const orgData of sampleOrganizations) {
      try {
        await createDocument(collection, orgData, 'seeder', orgData.id);
        console.log(`  ✓ Created organization: ${orgData.name}`);
      } catch (error) {
        console.warn(`  ⚠️ Failed to create organization ${orgData.name}:`, error);
      }
    }
  }

  /**
   * Seed users
   */
  private async seedUsers(): Promise<void> {
    for (const userData of sampleUsers) {
      try {
        await userService.create(userData, 'seeder', userData.id);
        console.log(`  ✓ Created user: ${userData.email}`);
      } catch (error) {
        console.warn(`  ⚠️ Failed to create user ${userData.email}:`, error);
      }
    }
  }

  /**
   * Seed materials
   */
  private async seedMaterials(): Promise<void> {
    for (const materialData of sampleMaterials) {
      try {
        await materialService.create(materialData, 'seeder');
        console.log(`  ✓ Created material: ${materialData.name}`);
      } catch (error) {
        console.warn(`  ⚠️ Failed to create material ${materialData.name}:`, error);
      }
    }
  }

  /**
   * Seed vendors
   */
  private async seedVendors(): Promise<void> {
    const { getVendorsCollection } = await import('@/lib/firestore/collections');
    const { createDocument } = await import('@/lib/firestore/utils');
    
    const collection = getVendorsCollection();
    
    for (const vendorData of sampleVendors) {
      try {
        await createDocument(collection, vendorData, 'seeder');
        console.log(`  ✓ Created vendor: ${vendorData.name}`);
      } catch (error) {
        console.warn(`  ⚠️ Failed to create vendor ${vendorData.name}:`, error);
      }
    }
  }

  /**
   * Seed projects (placeholder)
   */
  private async seedProjects(): Promise<void> {
    console.log('  📝 Project seeding not yet implemented');
  }

  /**
   * Seed inventory (placeholder)
   */
  private async seedInventory(): Promise<void> {
    console.log('  📊 Inventory seeding not yet implemented');
  }

  /**
   * Check if database has been seeded
   */
  async isSeeded(): Promise<boolean> {
    try {
      // Check if we have any materials (simple check)
      const materials = await materialService.query({ limit: 1 });
      return materials.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get seeding status
   */
  async getStatus(): Promise<{
    isSeeded: boolean;
    counts: {
      organizations: number;
      users: number;
      materials: number;
      vendors: number;
    };
  }> {
    try {
      const [materials, users] = await Promise.all([
        materialService.query({ limit: 100 }),
        userService.query({ limit: 100 })
      ]);

      // For organizations and vendors, we'd need to implement similar queries
      // For now, using placeholder counts
      
      return {
        isSeeded: materials.length > 0 || users.length > 0,
        counts: {
          organizations: 0, // Placeholder
          users: users.length,
          materials: materials.length,
          vendors: 0 // Placeholder
        }
      };
    } catch (error) {
      return {
        isSeeded: false,
        counts: {
          organizations: 0,
          users: 0,
          materials: 0,
          vendors: 0
        }
      };
    }
  }
}

// Export singleton instance
export const databaseSeeder = new DatabaseSeeder();

// Convenience function for quick seeding
export async function seedDatabase(options?: SeedOptions): Promise<void> {
  await databaseSeeder.seed(options);
}
