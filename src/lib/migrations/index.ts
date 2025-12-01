import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, getDocs, Timestamp } from 'firebase/firestore';

export interface Migration {
  id: string;
  name: string;
  description: string;
  version: string;
  up: () => Promise<void>;
  down?: () => Promise<void>;
}

export interface MigrationRecord {
  id: string;
  name: string;
  version: string;
  appliedAt: Timestamp;
  appliedBy: string;
}

const MIGRATIONS_COLLECTION = 'migrations';

export class MigrationManager {
  private migrations: Migration[] = [];

  constructor() {
    if (!db) {
      throw new Error('Firestore not initialized');
    }
  }

  /**
   * Register a migration
   */
  register(migration: Migration): void {
    this.migrations.push(migration);
    // Sort by version to ensure proper order
    this.migrations.sort((a, b) => a.version.localeCompare(b.version));
  }

  /**
   * Get all applied migrations
   */
  private async getAppliedMigrations(): Promise<MigrationRecord[]> {
    try {
      const migrationsRef = collection(db!, MIGRATIONS_COLLECTION);
      const snapshot = await getDocs(migrationsRef);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as MigrationRecord));
    } catch (error) {
      console.warn('Could not fetch applied migrations, assuming none applied:', error);
      return [];
    }
  }

  /**
   * Record a migration as applied
   */
  private async recordMigration(migration: Migration, appliedBy: string): Promise<void> {
    const migrationRecord: Omit<MigrationRecord, 'id'> = {
      name: migration.name,
      version: migration.version,
      appliedAt: Timestamp.now(),
      appliedBy
    };

    const migrationRef = doc(db!, MIGRATIONS_COLLECTION, migration.id);
    await setDoc(migrationRef, migrationRecord);
  }

  /**
   * Check if a migration has been applied
   */
  private async isMigrationApplied(migrationId: string): Promise<boolean> {
    try {
      const migrationRef = doc(db!, MIGRATIONS_COLLECTION, migrationId);
      const migrationDoc = await getDoc(migrationRef);
      return migrationDoc.exists();
    } catch (error) {
      return false;
    }
  }

  /**
   * Run pending migrations
   */
  async runPendingMigrations(appliedBy: string = 'system'): Promise<void> {
    console.log('Checking for pending migrations...');
    
    const appliedMigrations = await this.getAppliedMigrations();
    const appliedIds = new Set(appliedMigrations.map(m => m.name));

    const pendingMigrations = this.migrations.filter(m => !appliedIds.has(m.name));

    if (pendingMigrations.length === 0) {
      console.log('No pending migrations found.');
      return;
    }

    console.log(`Found ${pendingMigrations.length} pending migrations.`);

    for (const migration of pendingMigrations) {
      try {
        console.log(`Running migration: ${migration.name} (${migration.version})`);
        await migration.up();
        await this.recordMigration(migration, appliedBy);
        console.log(`✅ Migration ${migration.name} completed successfully.`);
      } catch (error) {
        console.error(`❌ Migration ${migration.name} failed:`, error);
        throw new Error(`Migration ${migration.name} failed: ${error}`);
      }
    }

    console.log('All pending migrations completed successfully.');
  }

  /**
   * Get migration status
   */
  async getStatus(): Promise<{
    totalMigrations: number;
    appliedMigrations: number;
    pendingMigrations: number;
    lastApplied?: MigrationRecord;
  }> {
    const appliedMigrations = await this.getAppliedMigrations();
    const appliedIds = new Set(appliedMigrations.map(m => m.name));
    const pendingCount = this.migrations.filter(m => !appliedIds.has(m.name)).length;

    const lastApplied = appliedMigrations
      .sort((a, b) => b.appliedAt.toMillis() - a.appliedAt.toMillis())[0];

    return {
      totalMigrations: this.migrations.length,
      appliedMigrations: appliedMigrations.length,
      pendingMigrations: pendingCount,
      lastApplied
    };
  }

  /**
   * List all migrations with their status
   */
  async listMigrations(): Promise<Array<{
    migration: Migration;
    applied: boolean;
    appliedAt?: Timestamp;
  }>> {
    const appliedMigrations = await this.getAppliedMigrations();
    const appliedMap = new Map(appliedMigrations.map(m => [m.name, m]));

    return this.migrations.map(migration => ({
      migration,
      applied: appliedMap.has(migration.name),
      appliedAt: appliedMap.get(migration.name)?.appliedAt
    }));
  }

  /**
   * Initialize the database schema (run all migrations)
   */
  async initializeDatabase(appliedBy: string = 'system'): Promise<void> {
    console.log('Initializing database schema...');
    await this.runPendingMigrations(appliedBy);
    console.log('Database initialization completed.');
  }
}

// Global migration manager instance
export const migrationManager = new MigrationManager();
