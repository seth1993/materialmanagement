import { CollectionReference } from 'firebase/firestore';
import { BaseService } from './BaseService';
import { User, UserRole } from '@/types/domain';
import { getUsersCollection } from '@/lib/firestore/collections';
import { ValidationError } from '@/lib/firestore/utils';

export class UserService extends BaseService<User> {
  protected collection: CollectionReference<User>;
  protected entityName = 'User';

  constructor() {
    super();
    this.collection = getUsersCollection();
  }

  /**
   * Validate user data before creating
   */
  protected validateCreateData(data: Omit<User, 'id' | keyof User['createdAt'] | keyof User['updatedAt'] | keyof User['createdBy'] | keyof User['updatedBy']>): void {
    super.validateCreateData(data);

    if (!data.email?.trim()) {
      throw new ValidationError('Email is required');
    }

    if (!this.isValidEmail(data.email)) {
      throw new ValidationError('Invalid email format');
    }

    if (!data.displayName?.trim()) {
      throw new ValidationError('Display name is required');
    }

    if (!data.organizationId?.trim()) {
      throw new ValidationError('Organization ID is required');
    }

    if (!Object.values(UserRole).includes(data.role)) {
      throw new ValidationError('Invalid user role');
    }
  }

  /**
   * Get user by email
   */
  async getByEmail(email: string): Promise<User | null> {
    const users = await this.query({
      where: [{ field: 'email', operator: '==', value: email.toLowerCase() }],
      limit: 1
    });

    return users.length > 0 ? users[0] : null;
  }

  /**
   * Get users by role
   */
  async getByRole(role: UserRole, organizationId?: string): Promise<User[]> {
    const whereConditions = [
      { field: 'role', operator: '==', value: role },
      { field: 'isActive', operator: '==', value: true }
    ];

    if (organizationId) {
      whereConditions.push({ field: 'organizationId', operator: '==', value: organizationId });
    }

    return this.query({
      where: whereConditions,
      orderBy: [{ field: 'displayName', direction: 'asc' }]
    });
  }

  /**
   * Get users by department
   */
  async getByDepartment(department: string, organizationId: string): Promise<User[]> {
    return this.query({
      where: [
        { field: 'department', operator: '==', value: department },
        { field: 'organizationId', operator: '==', value: organizationId },
        { field: 'isActive', operator: '==', value: true }
      ],
      orderBy: [{ field: 'displayName', direction: 'asc' }]
    });
  }

  /**
   * Search users by name or email
   */
  async search(searchTerm: string, organizationId?: string): Promise<User[]> {
    const whereConditions = [
      { field: 'isActive', operator: '==', value: true }
    ];

    if (organizationId) {
      whereConditions.push({ field: 'organizationId', operator: '==', value: organizationId });
    }

    const users = await this.query({
      where: whereConditions,
      orderBy: [{ field: 'displayName', direction: 'asc' }]
    });

    // Client-side filtering for search
    const searchLower = searchTerm.toLowerCase();
    return users.filter(user => 
      user.displayName.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      (user.firstName && user.firstName.toLowerCase().includes(searchLower)) ||
      (user.lastName && user.lastName.toLowerCase().includes(searchLower))
    );
  }

  /**
   * Update user role
   */
  async updateRole(userId: string, role: UserRole, updatedBy: string): Promise<void> {
    if (!Object.values(UserRole).includes(role)) {
      throw new ValidationError('Invalid user role');
    }

    await this.update(userId, { role }, updatedBy);
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    profileData: {
      displayName?: string;
      firstName?: string;
      lastName?: string;
      phoneNumber?: string;
      department?: string;
      jobTitle?: string;
      profileImageUrl?: string;
    },
    updatedBy: string
  ): Promise<void> {
    // Validate profile data
    if (profileData.displayName !== undefined && !profileData.displayName.trim()) {
      throw new ValidationError('Display name cannot be empty');
    }

    await this.update(userId, profileData, updatedBy);
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId: string): Promise<void> {
    // Use server timestamp for last login
    await this.update(userId, { lastLoginAt: new Date() as any }, userId);
  }

  /**
   * Deactivate user (soft delete)
   */
  async deactivate(userId: string, deactivatedBy: string): Promise<void> {
    await this.update(userId, { isActive: false }, deactivatedBy);
  }

  /**
   * Reactivate user
   */
  async reactivate(userId: string, reactivatedBy: string): Promise<void> {
    await this.update(userId, { isActive: true }, reactivatedBy);
  }

  /**
   * Get unique departments for an organization
   */
  async getDepartments(organizationId: string): Promise<string[]> {
    const users = await this.getActiveByOrganizationId(organizationId);
    const departments = new Set(
      users
        .map(u => u.department)
        .filter(dept => dept !== undefined && dept !== null && dept.trim() !== '')
    );
    return Array.from(departments).sort();
  }

  /**
   * Get unique job titles for an organization
   */
  async getJobTitles(organizationId: string): Promise<string[]> {
    const users = await this.getActiveByOrganizationId(organizationId);
    const jobTitles = new Set(
      users
        .map(u => u.jobTitle)
        .filter(title => title !== undefined && title !== null && title.trim() !== '')
    );
    return Array.from(jobTitles).sort();
  }

  /**
   * Check if user has permission for a specific role
   */
  hasPermission(user: User, requiredRole: UserRole): boolean {
    const roleHierarchy = {
      [UserRole.VIEWER]: 1,
      [UserRole.USER]: 2,
      [UserRole.MANAGER]: 3,
      [UserRole.ADMIN]: 4
    };

    return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
  }

  /**
   * Get users with specific permissions
   */
  async getUsersWithPermission(requiredRole: UserRole, organizationId: string): Promise<User[]> {
    const roleHierarchy = {
      [UserRole.VIEWER]: 1,
      [UserRole.USER]: 2,
      [UserRole.MANAGER]: 3,
      [UserRole.ADMIN]: 4
    };

    const requiredLevel = roleHierarchy[requiredRole];
    const validRoles = Object.entries(roleHierarchy)
      .filter(([_, level]) => level >= requiredLevel)
      .map(([role, _]) => role as UserRole);

    const users = await this.getActiveByOrganizationId(organizationId);
    return users.filter(user => validRoles.includes(user.role));
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

// Export singleton instance
export const userService = new UserService();
