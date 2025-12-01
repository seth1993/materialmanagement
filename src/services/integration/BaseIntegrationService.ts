import { ExternalProject } from '@/types/project';
import { IntegrationConfig, SyncResult } from '@/types/integration';

export abstract class BaseIntegrationService {
  protected config: IntegrationConfig;

  constructor(config: IntegrationConfig) {
    this.config = config;
  }

  /**
   * Test the connection to the external platform
   */
  abstract testConnection(): Promise<boolean>;

  /**
   * Fetch all projects from the external platform
   */
  abstract fetchProjects(): Promise<ExternalProject[]>;

  /**
   * Fetch a specific project by its external ID
   */
  abstract fetchProject(externalId: string): Promise<ExternalProject | null>;

  /**
   * Get the platform name
   */
  abstract getPlatformName(): string;

  /**
   * Validate the configuration
   */
  abstract validateConfig(): Promise<{ valid: boolean; errors: string[] }>;

  /**
   * Get the last sync timestamp from the external platform
   */
  abstract getLastSyncTimestamp(): Promise<Date | null>;

  /**
   * Transform external project data to our internal format
   */
  protected transformExternalProject(externalProject: ExternalProject): ExternalProject {
    // Base transformation - can be overridden by specific implementations
    return {
      ...externalProject,
      // Ensure required fields are present
      id: externalProject.id,
      name: externalProject.name || 'Untitled Project',
      status: externalProject.status || 'unknown'
    };
  }

  /**
   * Handle API errors consistently
   */
  protected handleApiError(error: any, context: string): never {
    console.error(`${this.getPlatformName()} API Error in ${context}:`, error);
    throw new Error(`${this.getPlatformName()} integration error: ${error.message || 'Unknown error'}`);
  }
}
