import { CollectionReference } from 'firebase/firestore';
import { BaseService } from './BaseService';
import { Material } from '@/types/domain';
import { getMaterialsCollection } from '@/lib/firestore/collections';
import { QueryOptions, ValidationError } from '@/lib/firestore/utils';

export class MaterialService extends BaseService<Material> {
  protected collection: CollectionReference<Material>;
  protected entityName = 'Material';

  constructor() {
    super();
    this.collection = getMaterialsCollection();
  }

  /**
   * Validate material data before creating
   */
  protected validateCreateData(data: Omit<Material, 'id' | keyof Material['createdAt'] | keyof Material['updatedAt'] | keyof Material['createdBy'] | keyof Material['updatedBy']>): void {
    super.validateCreateData(data);

    if (!data.name?.trim()) {
      throw new ValidationError('Material name is required');
    }

    if (!data.category?.trim()) {
      throw new ValidationError('Material category is required');
    }

    if (!data.unit?.trim()) {
      throw new ValidationError('Material unit is required');
    }

    if (!data.organizationId?.trim()) {
      throw new ValidationError('Organization ID is required');
    }

    if (data.unitCost !== undefined && data.unitCost < 0) {
      throw new ValidationError('Unit cost cannot be negative');
    }

    if (data.minimumStock !== undefined && data.minimumStock < 0) {
      throw new ValidationError('Minimum stock cannot be negative');
    }

    if (data.maximumStock !== undefined && data.maximumStock < 0) {
      throw new ValidationError('Maximum stock cannot be negative');
    }

    if (data.reorderPoint !== undefined && data.reorderPoint < 0) {
      throw new ValidationError('Reorder point cannot be negative');
    }

    if (data.reorderQuantity !== undefined && data.reorderQuantity <= 0) {
      throw new ValidationError('Reorder quantity must be positive');
    }
  }

  /**
   * Get materials by category
   */
  async getByCategory(category: string, organizationId?: string): Promise<Material[]> {
    const whereConditions = [
      { field: 'category', operator: '==', value: category },
      { field: 'isActive', operator: '==', value: true }
    ];

    if (organizationId) {
      whereConditions.push({ field: 'organizationId', operator: '==', value: organizationId });
    }

    return this.query({
      where: whereConditions,
      orderBy: [{ field: 'name', direction: 'asc' }]
    });
  }

  /**
   * Search materials by name or description
   */
  async search(searchTerm: string, organizationId?: string): Promise<Material[]> {
    // Note: Firestore doesn't support full-text search natively
    // This is a basic implementation that searches for exact matches
    // For production, consider using Algolia or similar service
    
    const whereConditions = [
      { field: 'isActive', operator: '==', value: true }
    ];

    if (organizationId) {
      whereConditions.push({ field: 'organizationId', operator: '==', value: organizationId });
    }

    const materials = await this.query({
      where: whereConditions,
      orderBy: [{ field: 'name', direction: 'asc' }]
    });

    // Client-side filtering for search
    const searchLower = searchTerm.toLowerCase();
    return materials.filter(material => 
      material.name.toLowerCase().includes(searchLower) ||
      (material.description && material.description.toLowerCase().includes(searchLower)) ||
      (material.sku && material.sku.toLowerCase().includes(searchLower))
    );
  }

  /**
   * Get materials by vendor
   */
  async getByVendor(vendorId: string, organizationId?: string): Promise<Material[]> {
    const whereConditions = [
      { field: 'preferredVendorId', operator: '==', value: vendorId },
      { field: 'isActive', operator: '==', value: true }
    ];

    if (organizationId) {
      whereConditions.push({ field: 'organizationId', operator: '==', value: organizationId });
    }

    return this.query({
      where: whereConditions,
      orderBy: [{ field: 'name', direction: 'asc' }]
    });
  }

  /**
   * Get materials that need reordering (below reorder point)
   */
  async getMaterialsNeedingReorder(organizationId: string): Promise<Material[]> {
    // This would require inventory tracking to be implemented
    // For now, return materials that have reorder points set
    return this.query({
      where: [
        { field: 'organizationId', operator: '==', value: organizationId },
        { field: 'isActive', operator: '==', value: true },
        { field: 'reorderPoint', operator: '>', value: 0 }
      ],
      orderBy: [{ field: 'name', direction: 'asc' }]
    });
  }

  /**
   * Get materials by tags
   */
  async getByTags(tags: string[], organizationId?: string): Promise<Material[]> {
    const whereConditions = [
      { field: 'isActive', operator: '==', value: true }
    ];

    if (organizationId) {
      whereConditions.push({ field: 'organizationId', operator: '==', value: organizationId });
    }

    // Note: Firestore doesn't support array-contains-any with multiple values efficiently
    // This implementation gets all materials and filters client-side
    const materials = await this.query({
      where: whereConditions,
      orderBy: [{ field: 'name', direction: 'asc' }]
    });

    return materials.filter(material => 
      material.tags && material.tags.some(tag => tags.includes(tag))
    );
  }

  /**
   * Get unique categories for an organization
   */
  async getCategories(organizationId: string): Promise<string[]> {
    const materials = await this.getActiveByOrganizationId(organizationId);
    const categories = new Set(materials.map(m => m.category));
    return Array.from(categories).sort();
  }

  /**
   * Get unique subcategories for a category
   */
  async getSubcategories(category: string, organizationId: string): Promise<string[]> {
    const materials = await this.getByCategory(category, organizationId);
    const subcategories = new Set(
      materials
        .map(m => m.subcategory)
        .filter(sc => sc !== undefined && sc !== null)
    );
    return Array.from(subcategories).sort();
  }

  /**
   * Get unique units used in materials
   */
  async getUnits(organizationId: string): Promise<string[]> {
    const materials = await this.getActiveByOrganizationId(organizationId);
    const units = new Set(materials.map(m => m.unit));
    return Array.from(units).sort();
  }

  /**
   * Update material inventory settings
   */
  async updateInventorySettings(
    materialId: string,
    settings: {
      trackInventory?: boolean;
      minimumStock?: number;
      maximumStock?: number;
      reorderPoint?: number;
      reorderQuantity?: number;
    },
    userId: string
  ): Promise<void> {
    // Validate settings
    if (settings.minimumStock !== undefined && settings.minimumStock < 0) {
      throw new ValidationError('Minimum stock cannot be negative');
    }

    if (settings.maximumStock !== undefined && settings.maximumStock < 0) {
      throw new ValidationError('Maximum stock cannot be negative');
    }

    if (settings.minimumStock !== undefined && settings.maximumStock !== undefined) {
      if (settings.minimumStock > settings.maximumStock) {
        throw new ValidationError('Minimum stock cannot be greater than maximum stock');
      }
    }

    if (settings.reorderPoint !== undefined && settings.reorderPoint < 0) {
      throw new ValidationError('Reorder point cannot be negative');
    }

    if (settings.reorderQuantity !== undefined && settings.reorderQuantity <= 0) {
      throw new ValidationError('Reorder quantity must be positive');
    }

    await this.update(materialId, settings, userId);
  }

  /**
   * Bulk update materials
   */
  async bulkUpdate(
    updates: Array<{ id: string; data: Partial<Omit<Material, 'id' | 'createdAt' | 'createdBy'>> }>,
    userId: string
  ): Promise<void> {
    // For now, update one by one. In production, consider using batch operations
    for (const update of updates) {
      await this.update(update.id, update.data, userId);
    }
  }
}

// Export singleton instance
export const materialService = new MaterialService();
