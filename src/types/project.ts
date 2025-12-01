export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  startDate?: Date;
  endDate?: Date;
  location?: string;
  contractor?: string;
  budget?: number;
  externalId?: string; // ID from external construction platform
  externalPlatform?: string; // Name of the external platform
  createdAt: Date;
  updatedAt: Date;
  userId: string; // Owner of the project
  syncedAt?: Date; // Last time this project was synced from external platform
}

export enum ProjectStatus {
  PLANNING = 'planning',
  IN_PROGRESS = 'in_progress',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export interface ProjectCreateInput {
  name: string;
  description?: string;
  status?: ProjectStatus;
  startDate?: Date;
  endDate?: Date;
  location?: string;
  contractor?: string;
  budget?: number;
}

export interface ProjectUpdateInput {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  startDate?: Date;
  endDate?: Date;
  location?: string;
  contractor?: string;
  budget?: number;
}

// External platform project data structure
export interface ExternalProject {
  id: string;
  name: string;
  description?: string;
  status: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  contractor?: string;
  budget?: number;
  lastModified?: string;
  [key: string]: any; // Allow for platform-specific fields
}
