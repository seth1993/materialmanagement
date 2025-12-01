// Re-export all types for easy importing
export * from './domain';
export * from './firestore';

// Legacy Material interface for backward compatibility
export interface LegacyMaterial {
  id: string;
  name: string;
  quantity: number;
  category: string;
  createdAt: Date;
  userId: string;
}
