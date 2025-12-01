import { UserRole, hasRolePermission, canManageRole } from '@/types/roles';
import { Permission, hasPermission, getRolePermissions } from '@/types/permissions';
import { AppUser } from '@/types/auth';

// Role validation utilities
export function validateUserRole(role: string): role is UserRole {
  return Object.values(UserRole).includes(role as UserRole);
}

// Check if a user has a specific role
export function hasRole(user: AppUser | null, role: UserRole): boolean {
  if (!user || !user.role) {
    return false;
  }
  return user.role === role;
}

// Check if a user has a role with equal or higher permissions
export function hasMinimumRole(user: AppUser | null, minimumRole: UserRole): boolean {
  if (!user || !user.role) {
    return false;
  }
  return hasRolePermission(user.role, minimumRole);
}

// Check if a user can perform a specific action based on their role
export function canPerformAction(user: AppUser | null, permission: Permission): boolean {
  if (!user || !user.role) {
    return false;
  }
  return hasPermission(user.role, permission);
}

// Check if a user can manage another user's role
export function canUserManageRole(manager: AppUser | null, targetRole: UserRole): boolean {
  if (!manager || !manager.role) {
    return false;
  }
  return canManageRole(manager.role, targetRole);
}

// Get all permissions for a user
export function getUserPermissions(user: AppUser | null): Permission[] {
  if (!user || !user.role) {
    return [];
  }
  return getRolePermissions(user.role);
}

// Check if a user is an admin
export function isAdmin(user: AppUser | null): boolean {
  return hasRole(user, UserRole.ADMIN);
}

// Check if a user is authenticated
export function isAuthenticated(user: AppUser | null): boolean {
  return user !== null && user.uid !== undefined;
}

// Role-based route access control
export interface RoutePermission {
  path: string;
  requiredRole?: UserRole;
  requiredPermission?: Permission;
  adminOnly?: boolean;
}

// Define route permissions
export const ROUTE_PERMISSIONS: RoutePermission[] = [
  // Admin routes
  { path: '/admin', adminOnly: true },
  { path: '/admin/users', adminOnly: true },
  { path: '/admin/roles', adminOnly: true },
  { path: '/admin/audit', adminOnly: true },
  
  // Role-specific routes
  { path: '/materials/approve', requiredPermission: Permission.APPROVE_MATERIAL_REQUEST },
  { path: '/inventory/manage', requiredPermission: Permission.MANAGE_INVENTORY },
  { path: '/reports/financial', requiredPermission: Permission.VIEW_FINANCIAL_REPORTS },
  { path: '/suppliers', requiredPermission: Permission.VIEW_SUPPLIERS },
  
  // Minimum role requirements
  { path: '/materials/create', requiredRole: UserRole.FIELD },
  { path: '/inventory', requiredRole: UserRole.FIELD },
  { path: '/profile', requiredRole: UserRole.FIELD }, // Any authenticated user
];

// Check if a user can access a specific route
export function canAccessRoute(user: AppUser | null, path: string): boolean {
  const routePermission = ROUTE_PERMISSIONS.find(route => 
    path.startsWith(route.path)
  );

  if (!routePermission) {
    // If no specific permission is defined, allow access for authenticated users
    return isAuthenticated(user);
  }

  // Check admin-only routes
  if (routePermission.adminOnly) {
    return isAdmin(user);
  }

  // Check specific permission requirements
  if (routePermission.requiredPermission) {
    return canPerformAction(user, routePermission.requiredPermission);
  }

  // Check minimum role requirements
  if (routePermission.requiredRole) {
    return hasMinimumRole(user, routePermission.requiredRole);
  }

  // Default to requiring authentication
  return isAuthenticated(user);
}

// Get user role display information
export function getUserRoleInfo(user: AppUser | null) {
  if (!user || !user.role) {
    return {
      role: null,
      displayName: 'No Role',
      permissions: [],
      canManageUsers: false,
      isAdmin: false,
    };
  }

  return {
    role: user.role,
    displayName: user.role,
    permissions: getUserPermissions(user),
    canManageUsers: canPerformAction(user, Permission.MANAGE_USERS),
    isAdmin: isAdmin(user),
  };
}

// Role hierarchy utilities
export function getRoleLevel(role: UserRole): number {
  const roleLevels = {
    [UserRole.FIELD]: 1,
    [UserRole.PURCHASING]: 2,
    [UserRole.WAREHOUSE]: 3,
    [UserRole.ACCOUNTING]: 4,
    [UserRole.ADMIN]: 5,
  };
  return roleLevels[role];
}

// Get roles that a user can assign to others
export function getAssignableRoles(user: AppUser | null): UserRole[] {
  if (!user || !user.role) {
    return [];
  }

  if (isAdmin(user)) {
    return Object.values(UserRole);
  }

  // Users can only assign roles lower than their own
  const userLevel = getRoleLevel(user.role);
  return Object.values(UserRole).filter(role => 
    getRoleLevel(role) < userLevel
  );
}

// Permission checking with detailed results
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  requiredRole?: UserRole;
  requiredPermission?: Permission;
}

export function checkPermissionDetailed(
  user: AppUser | null,
  permission: Permission
): PermissionCheckResult {
  if (!user) {
    return {
      allowed: false,
      reason: 'User not authenticated',
    };
  }

  if (!user.role) {
    return {
      allowed: false,
      reason: 'User has no role assigned',
    };
  }

  if (hasPermission(user.role, permission)) {
    return {
      allowed: true,
    };
  }

  return {
    allowed: false,
    reason: 'Insufficient permissions',
    requiredPermission: permission,
  };
}

// Route access checking with detailed results
export function checkRouteAccessDetailed(
  user: AppUser | null,
  path: string
): PermissionCheckResult {
  const routePermission = ROUTE_PERMISSIONS.find(route => 
    path.startsWith(route.path)
  );

  if (!routePermission) {
    if (isAuthenticated(user)) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: 'Authentication required',
    };
  }

  if (routePermission.adminOnly) {
    if (isAdmin(user)) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: 'Admin access required',
      requiredRole: UserRole.ADMIN,
    };
  }

  if (routePermission.requiredPermission) {
    return checkPermissionDetailed(user, routePermission.requiredPermission);
  }

  if (routePermission.requiredRole) {
    if (hasMinimumRole(user, routePermission.requiredRole)) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: 'Insufficient role level',
      requiredRole: routePermission.requiredRole,
    };
  }

  if (isAuthenticated(user)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: 'Authentication required',
  };
}
