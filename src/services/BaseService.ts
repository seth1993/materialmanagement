import { CollectionReference } from 'firebase/firestore';
import {
  createDocument,
  getDocument,
  updateDocument,
  deleteDocument,
  queryDocuments,
  QueryOptions,
  FirestoreError,
  DocumentNotFoundError,
  ValidationError
} from '@/lib/firestore/utils';
import { AuditFields } from '@/types/domain';

/**
 * Base service class providing common CRUD operations for all entities
 */
export abstract class BaseService<T extends AuditFields> {
  protected abstract collection: CollectionReference<T>;
  protected abstract entityName: string;

  /**
   * Create a new entity
   */
  async create(
    data: Omit<T, 'id' | keyof AuditFields>,
    userId: string,
    customId?: string
  ): Promise<string> {
    try {
      this.validateCreateData(data);
      return await createDocument(this.collection, data, userId, customId);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new FirestoreError(`Failed to create ${this.entityName}: ${error}`);
    }
  }

  /**
   * Get an entity by ID
   */
  async getById(id: string): Promise<T> {
    try {
      return await getDocument(this.collection, id);
    } catch (error) {
      if (error instanceof DocumentNotFoundError) {
        throw new DocumentNotFoundError(this.entityName, id);
      }
      throw new FirestoreError(`Failed to get ${this.entityName}: ${error}`);
    }
  }

  /**
   * Update an entity
   */
  async update(
    id: string,
    data: Partial<Omit<T, 'id' | 'createdAt' | 'createdBy'>>,
    userId: string
  ): Promise<void> {
    try {
      this.validateUpdateData(data);
      await updateDocument(this.collection, id, data, userId);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new FirestoreError(`Failed to update ${this.entityName}: ${error}`);
    }
  }

  /**
   * Delete an entity
   */
  async delete(id: string): Promise<void> {
    try {
      await deleteDocument(this.collection, id);
    } catch (error) {
      throw new FirestoreError(`Failed to delete ${this.entityName}: ${error}`);
    }
  }

  /**
   * Query entities with options
   */
  async query(options: QueryOptions = {}): Promise<T[]> {
    try {
      return await queryDocuments(this.collection, options);
    } catch (error) {
      throw new FirestoreError(`Failed to query ${this.entityName}: ${error}`);
    }
  }

  /**
   * Get entities by organization ID
   */
  async getByOrganizationId(organizationId: string, options: Omit<QueryOptions, 'where'> = {}): Promise<T[]> {
    const queryOptions: QueryOptions = {
      ...options,
      where: [
        { field: 'organizationId', operator: '==', value: organizationId },
        ...(options.where || [])
      ]
    };
    return this.query(queryOptions);
  }

  /**
   * Get active entities (where isActive = true)
   */
  async getActive(options: Omit<QueryOptions, 'where'> = {}): Promise<T[]> {
    const queryOptions: QueryOptions = {
      ...options,
      where: [
        { field: 'isActive', operator: '==', value: true },
        ...(options.where || [])
      ]
    };
    return this.query(queryOptions);
  }

  /**
   * Get active entities by organization ID
   */
  async getActiveByOrganizationId(organizationId: string, options: Omit<QueryOptions, 'where'> = {}): Promise<T[]> {
    const queryOptions: QueryOptions = {
      ...options,
      where: [
        { field: 'organizationId', operator: '==', value: organizationId },
        { field: 'isActive', operator: '==', value: true },
        ...(options.where || [])
      ]
    };
    return this.query(queryOptions);
  }

  /**
   * Soft delete an entity (set isActive to false)
   */
  async softDelete(id: string, userId: string): Promise<void> {
    await this.update(id, { isActive: false } as Partial<T>, userId);
  }

  /**
   * Restore a soft-deleted entity (set isActive to true)
   */
  async restore(id: string, userId: string): Promise<void> {
    await this.update(id, { isActive: true } as Partial<T>, userId);
  }

  /**
   * Check if an entity exists
   */
  async exists(id: string): Promise<boolean> {
    try {
      await this.getById(id);
      return true;
    } catch (error) {
      if (error instanceof DocumentNotFoundError) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Validate data before creating - override in subclasses
   */
  protected validateCreateData(data: Omit<T, 'id' | keyof AuditFields>): void {
    // Base validation - override in subclasses for specific validation
    if (!data) {
      throw new ValidationError('Data is required');
    }
  }

  /**
   * Validate data before updating - override in subclasses
   */
  protected validateUpdateData(data: Partial<Omit<T, 'id' | 'createdAt' | 'createdBy'>>): void {
    // Base validation - override in subclasses for specific validation
    if (!data || Object.keys(data).length === 0) {
      throw new ValidationError('Update data is required');
    }
  }

  /**
   * Get the collection reference
   */
  protected getCollection(): CollectionReference<T> {
    return this.collection;
  }
}
