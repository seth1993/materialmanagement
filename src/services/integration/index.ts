import { BaseIntegrationService } from './BaseIntegrationService';
import { MockConstructionService } from './MockConstructionService';
import { IntegrationConfig, IntegrationPlatform } from '@/types/integration';

/**
 * Factory function to create integration service instances
 */
export function createIntegrationService(config: IntegrationConfig): BaseIntegrationService {
  switch (config.platform) {
    case IntegrationPlatform.MOCK_CONSTRUCTION:
      return new MockConstructionService(config);
    
    case IntegrationPlatform.PROCORE:
      // TODO: Implement ProcoreService
      throw new Error('Procore integration not yet implemented');
    
    case IntegrationPlatform.AUTODESK_CONSTRUCTION_CLOUD:
      // TODO: Implement AutodeskService
      throw new Error('Autodesk Construction Cloud integration not yet implemented');
    
    case IntegrationPlatform.BUILDERTREND:
      // TODO: Implement BuildertrendService
      throw new Error('Buildertrend integration not yet implemented');
    
    case IntegrationPlatform.CUSTOM:
      // TODO: Implement CustomService
      throw new Error('Custom integration not yet implemented');
    
    default:
      throw new Error(`Unsupported integration platform: ${config.platform}`);
  }
}

/**
 * Get available integration platforms
 */
export function getAvailablePlatforms(): Array<{ value: IntegrationPlatform; label: string; description: string }> {
  return [
    {
      value: IntegrationPlatform.MOCK_CONSTRUCTION,
      label: 'Mock Construction Platform',
      description: 'Demo platform for testing integration functionality'
    },
    {
      value: IntegrationPlatform.PROCORE,
      label: 'Procore',
      description: 'Leading construction management platform'
    },
    {
      value: IntegrationPlatform.AUTODESK_CONSTRUCTION_CLOUD,
      label: 'Autodesk Construction Cloud',
      description: 'Comprehensive construction management suite'
    },
    {
      value: IntegrationPlatform.BUILDERTREND,
      label: 'Buildertrend',
      description: 'Cloud-based construction management software'
    },
    {
      value: IntegrationPlatform.CUSTOM,
      label: 'Custom Integration',
      description: 'Custom API integration for proprietary systems'
    }
  ];
}

export { BaseIntegrationService, MockConstructionService };
