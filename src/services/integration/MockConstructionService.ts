import { BaseIntegrationService } from './BaseIntegrationService';
import { ExternalProject } from '@/types/project';
import { IntegrationConfig } from '@/types/integration';

export class MockConstructionService extends BaseIntegrationService {
  private mockProjects: ExternalProject[] = [
    {
      id: 'mock-1',
      name: 'Downtown Office Complex',
      description: 'Modern 15-story office building with retail space on ground floor',
      status: 'in_progress',
      startDate: '2024-01-15',
      endDate: '2024-12-31',
      location: '123 Main St, Downtown',
      contractor: 'ABC Construction Co.',
      budget: 2500000,
      lastModified: new Date().toISOString()
    },
    {
      id: 'mock-2',
      name: 'Residential Housing Development',
      description: '50-unit residential complex with amenities',
      status: 'planning',
      startDate: '2024-03-01',
      endDate: '2025-06-30',
      location: '456 Oak Avenue, Suburbs',
      contractor: 'XYZ Builders Inc.',
      budget: 8000000,
      lastModified: new Date().toISOString()
    },
    {
      id: 'mock-3',
      name: 'Highway Bridge Renovation',
      description: 'Complete renovation of the historic Main Street bridge',
      status: 'completed',
      startDate: '2023-06-01',
      endDate: '2024-02-28',
      location: 'Main Street Bridge',
      contractor: 'Infrastructure Solutions LLC',
      budget: 1200000,
      lastModified: new Date().toISOString()
    },
    {
      id: 'mock-4',
      name: 'Shopping Mall Expansion',
      description: 'Adding new wing with 20 additional retail spaces',
      status: 'on_hold',
      startDate: '2024-02-01',
      endDate: '2024-10-31',
      location: 'Westfield Shopping Center',
      contractor: 'Commercial Builders Group',
      budget: 3500000,
      lastModified: new Date().toISOString()
    },
    {
      id: 'mock-5',
      name: 'School Modernization Project',
      description: 'Complete renovation of elementary school facilities',
      status: 'in_progress',
      startDate: '2024-05-01',
      endDate: '2024-08-31',
      location: 'Lincoln Elementary School',
      contractor: 'Educational Facilities Corp.',
      budget: 950000,
      lastModified: new Date().toISOString()
    }
  ];

  constructor(config: IntegrationConfig) {
    super(config);
  }

  async testConnection(): Promise<boolean> {
    // Simulate API call delay
    await this.delay(500);
    
    // Mock connection test - always succeeds for demo
    return true;
  }

  async fetchProjects(): Promise<ExternalProject[]> {
    // Simulate API call delay
    await this.delay(1000);
    
    try {
      // Return mock projects with current timestamp
      return this.mockProjects.map(project => ({
        ...project,
        lastModified: new Date().toISOString()
      }));
    } catch (error) {
      this.handleApiError(error, 'fetchProjects');
    }
  }

  async fetchProject(externalId: string): Promise<ExternalProject | null> {
    // Simulate API call delay
    await this.delay(300);
    
    try {
      const project = this.mockProjects.find(p => p.id === externalId);
      return project ? {
        ...project,
        lastModified: new Date().toISOString()
      } : null;
    } catch (error) {
      this.handleApiError(error, 'fetchProject');
    }
  }

  getPlatformName(): string {
    return 'Mock Construction Platform';
  }

  async validateConfig(): Promise<{ valid: boolean; errors: string[] }> {
    // Simulate validation delay
    await this.delay(200);
    
    const errors: string[] = [];
    
    // Mock validation - check if basic config is present
    if (!this.config.credentials.apiKey) {
      errors.push('API Key is required');
    }
    
    if (!this.config.settings.syncFrequency) {
      errors.push('Sync frequency must be specified');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  async getLastSyncTimestamp(): Promise<Date | null> {
    // Simulate API call delay
    await this.delay(200);
    
    // Return the last sync time from config or null if never synced
    return this.config.lastSyncAt || null;
  }

  /**
   * Utility method to simulate API delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Add a new mock project (for testing purposes)
   */
  addMockProject(project: Omit<ExternalProject, 'lastModified'>): void {
    this.mockProjects.push({
      ...project,
      lastModified: new Date().toISOString()
    });
  }

  /**
   * Update a mock project (for testing purposes)
   */
  updateMockProject(id: string, updates: Partial<ExternalProject>): boolean {
    const index = this.mockProjects.findIndex(p => p.id === id);
    if (index !== -1) {
      this.mockProjects[index] = {
        ...this.mockProjects[index],
        ...updates,
        lastModified: new Date().toISOString()
      };
      return true;
    }
    return false;
  }
}
