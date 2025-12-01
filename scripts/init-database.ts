#!/usr/bin/env tsx

/**
 * Database initialization script
 * 
 * This script initializes the Firestore database with the required schema,
 * runs migrations, and optionally seeds with sample data.
 * 
 * Usage:
 *   npm run init-db
 *   npm run init-db -- --seed
 *   npm run init-db -- --seed --clear
 */

import { migrationManager } from '../src/lib/migrations';
import { databaseSeeder } from '../src/lib/seed';

// Import migrations to register them
import '../src/lib/migrations/001-initial-schema';

interface InitOptions {
  seed?: boolean;
  clear?: boolean;
  help?: boolean;
}

function parseArgs(): InitOptions {
  const args = process.argv.slice(2);
  const options: InitOptions = {};

  for (const arg of args) {
    switch (arg) {
      case '--seed':
        options.seed = true;
        break;
      case '--clear':
        options.clear = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }

  return options;
}

function showHelp() {
  console.log(`
Database Initialization Script

Usage:
  npm run init-db [options]

Options:
  --seed     Seed the database with sample data
  --clear    Clear existing data before seeding (use with caution!)
  --help     Show this help message

Examples:
  npm run init-db                    # Initialize schema only
  npm run init-db -- --seed          # Initialize schema and seed data
  npm run init-db -- --seed --clear  # Clear data, initialize schema, and seed
`);
}

async function initializeDatabase(options: InitOptions) {
  console.log('🚀 Starting database initialization...');
  console.log('Options:', options);

  try {
    // Run migrations
    console.log('\n📋 Running database migrations...');
    await migrationManager.initializeDatabase('init-script');

    // Show migration status
    const status = await migrationManager.getStatus();
    console.log(`✅ Migrations completed: ${status.appliedMigrations}/${status.totalMigrations}`);

    if (options.seed) {
      console.log('\n🌱 Seeding database with sample data...');
      await databaseSeeder.seed({
        organizations: true,
        users: true,
        materials: true,
        vendors: true,
        projects: false,
        inventory: false,
        clearExisting: options.clear
      });

      // Show seeding status
      const seedStatus = await databaseSeeder.getStatus();
      console.log('📊 Seeding completed:');
      console.log(`  - Organizations: ${seedStatus.counts.organizations}`);
      console.log(`  - Users: ${seedStatus.counts.users}`);
      console.log(`  - Materials: ${seedStatus.counts.materials}`);
      console.log(`  - Vendors: ${seedStatus.counts.vendors}`);
    }

    console.log('\n🎉 Database initialization completed successfully!');
    
    if (!options.seed) {
      console.log('\n💡 Tip: Run with --seed flag to add sample data for development');
    }

  } catch (error) {
    console.error('\n❌ Database initialization failed:', error);
    process.exit(1);
  }
}

async function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    return;
  }

  // Validate Firebase configuration
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    console.error('❌ Firebase configuration missing. Please set environment variables.');
    console.log('Required environment variables:');
    console.log('  - NEXT_PUBLIC_FIREBASE_API_KEY');
    console.log('  - NEXT_PUBLIC_FIREBASE_PROJECT_ID');
    console.log('  - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');
    console.log('  - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET');
    console.log('  - NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID');
    console.log('  - NEXT_PUBLIC_FIREBASE_APP_ID');
    process.exit(1);
  }

  await initializeDatabase(options);
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}
