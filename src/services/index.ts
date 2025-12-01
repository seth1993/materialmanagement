// Export all services for easy importing
export { BaseService } from './BaseService';
export { MaterialService, materialService } from './MaterialService';
export { UserService, userService } from './UserService';

// Export service types and errors
export {
  FirestoreError,
  DocumentNotFoundError,
  ValidationError,
  QueryOptions
} from '@/lib/firestore/utils';

// Service factory for dependency injection (if needed)
export class ServiceFactory {
  private static instances = new Map<string, any>();

  static getInstance<T>(serviceClass: new () => T): T {
    const className = serviceClass.name;
    if (!this.instances.has(className)) {
      this.instances.set(className, new serviceClass());
    }
    return this.instances.get(className);
  }

  static clearInstances(): void {
    this.instances.clear();
  }
}
