export interface IntegrationConfig {
  id: string;
  name: string;
  platform: IntegrationPlatform;
  isEnabled: boolean;
  credentials: IntegrationCredentials;
  settings: IntegrationSettings;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  lastSyncAt?: Date;
}

export enum IntegrationPlatform {
  MOCK_CONSTRUCTION = 'mock_construction',
  PROCORE = 'procore',
  AUTODESK_CONSTRUCTION_CLOUD = 'autodesk_construction_cloud',
  BUILDERTREND = 'buildertrend',
  CUSTOM = 'custom'
}

export interface IntegrationCredentials {
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  baseUrl?: string;
  username?: string;
  password?: string;
  [key: string]: any; // Allow for platform-specific credentials
}

export interface IntegrationSettings {
  syncFrequency: SyncFrequency;
  autoSync: boolean;
  syncProjects: boolean;
  syncMaterials: boolean;
  conflictResolution: ConflictResolution;
  [key: string]: any; // Allow for platform-specific settings
}

export enum SyncFrequency {
  MANUAL = 'manual',
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly'
}

export enum ConflictResolution {
  EXTERNAL_WINS = 'external_wins',
  LOCAL_WINS = 'local_wins',
  MANUAL_REVIEW = 'manual_review'
}

export interface SyncLog {
  id: string;
  integrationId: string;
  status: SyncStatus;
  startedAt: Date;
  completedAt?: Date;
  projectsProcessed: number;
  projectsCreated: number;
  projectsUpdated: number;
  projectsSkipped: number;
  errors: SyncError[];
  userId: string;
}

export enum SyncStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface SyncError {
  message: string;
  code?: string;
  projectId?: string;
  timestamp: Date;
  details?: any;
}

export interface SyncResult {
  success: boolean;
  projectsProcessed: number;
  projectsCreated: number;
  projectsUpdated: number;
  projectsSkipped: number;
  errors: SyncError[];
  duration: number; // in milliseconds
}
