import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  startAfter,
  DocumentSnapshot,
  QueryConstraint,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { Requisition, RequisitionStatus, RequisitionPriority } from '@/types/requisition';
import { User, UserRole } from '@/types/user';

// Collection names
export const COLLECTIONS = {
  USERS: 'users',
  REQUISITIONS: 'requisitions',
  APPROVAL_WORKFLOWS: 'approval_workflows',
  NOTIFICATIONS: 'notifications',
  AUDIT_LOGS: 'audit_logs'
} as const;

// Firestore utility functions
export class FirestoreService {
  // Generic CRUD operations
  static async create<T>(collectionName: string, data: Omit<T, 'id'>): Promise<string> {
    if (!db) throw new Error('Firestore not configured');
    
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return docRef.id;
  }

  static async update<T>(collectionName: string, id: string, data: Partial<T>): Promise<void> {
    if (!db) throw new Error('Firestore not configured');
    
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date()
    });
  }

  static async delete(collectionName: string, id: string): Promise<void> {
    if (!db) throw new Error('Firestore not configured');
    
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
  }

  static async getById<T>(collectionName: string, id: string): Promise<T | null> {
    if (!db) throw new Error('Firestore not configured');
    
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as T;
    }
    return null;
  }

  static async getMany<T>(
    collectionName: string, 
    constraints: QueryConstraint[] = [],
    pageSize?: number,
    lastDoc?: DocumentSnapshot
  ): Promise<{ data: T[]; lastDoc?: DocumentSnapshot }> {
    if (!db) throw new Error('Firestore not configured');
    
    let queryConstraints = [...constraints];
    
    if (pageSize) {
      queryConstraints.push(limit(pageSize));
    }
    
    if (lastDoc) {
      queryConstraints.push(startAfter(lastDoc));
    }
    
    const q = query(collection(db, collectionName), ...queryConstraints);
    const querySnapshot = await getDocs(q);
    
    const data = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as T[];
    
    const newLastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
    
    return { data, lastDoc: newLastDoc };
  }
}

// Requisition-specific operations
export class RequisitionService extends FirestoreService {
  static async createRequisition(requisition: Omit<Requisition, 'id'>): Promise<string> {
    return this.create<Requisition>(COLLECTIONS.REQUISITIONS, requisition);
  }

  static async updateRequisition(id: string, updates: Partial<Requisition>): Promise<void> {
    return this.update<Requisition>(COLLECTIONS.REQUISITIONS, id, updates);
  }

  static async getRequisition(id: string): Promise<Requisition | null> {
    return this.getById<Requisition>(COLLECTIONS.REQUISITIONS, id);
  }

  static async getRequisitionsByUser(
    userId: string, 
    pageSize: number = 20,
    lastDoc?: DocumentSnapshot
  ): Promise<{ data: Requisition[]; lastDoc?: DocumentSnapshot }> {
    return this.getMany<Requisition>(
      COLLECTIONS.REQUISITIONS,
      [
        where('requesterId', '==', userId),
        orderBy('createdAt', 'desc')
      ],
      pageSize,
      lastDoc
    );
  }

  static async getRequisitionsByStatus(
    status: RequisitionStatus,
    pageSize: number = 20,
    lastDoc?: DocumentSnapshot
  ): Promise<{ data: Requisition[]; lastDoc?: DocumentSnapshot }> {
    return this.getMany<Requisition>(
      COLLECTIONS.REQUISITIONS,
      [
        where('status', '==', status),
        orderBy('createdAt', 'desc')
      ],
      pageSize,
      lastDoc
    );
  }

  static async getPendingApprovals(
    userRole: UserRole,
    userId: string,
    pageSize: number = 20,
    lastDoc?: DocumentSnapshot
  ): Promise<{ data: Requisition[]; lastDoc?: DocumentSnapshot }> {
    // This would need more complex logic based on approval workflow
    // For now, return requisitions that are submitted or under review
    const statuses = [RequisitionStatus.SUBMITTED, RequisitionStatus.UNDER_REVIEW];
    
    return this.getMany<Requisition>(
      COLLECTIONS.REQUISITIONS,
      [
        where('status', 'in', statuses),
        orderBy('createdAt', 'desc')
      ],
      pageSize,
      lastDoc
    );
  }

  static async searchRequisitions(
    searchTerm: string,
    filters: {
      status?: RequisitionStatus[];
      priority?: RequisitionPriority[];
      department?: string;
      dateFrom?: Date;
      dateTo?: Date;
    } = {},
    pageSize: number = 20,
    lastDoc?: DocumentSnapshot
  ): Promise<{ data: Requisition[]; lastDoc?: DocumentSnapshot }> {
    const constraints: QueryConstraint[] = [];

    // Add filters
    if (filters.status && filters.status.length > 0) {
      constraints.push(where('status', 'in', filters.status));
    }

    if (filters.priority && filters.priority.length > 0) {
      constraints.push(where('priority', 'in', filters.priority));
    }

    if (filters.department) {
      constraints.push(where('department', '==', filters.department));
    }

    if (filters.dateFrom) {
      constraints.push(where('createdAt', '>=', Timestamp.fromDate(filters.dateFrom)));
    }

    if (filters.dateTo) {
      constraints.push(where('createdAt', '<=', Timestamp.fromDate(filters.dateTo)));
    }

    // Note: Firestore doesn't support full-text search natively
    // For production, you'd want to use Algolia or similar service
    // For now, we'll just apply filters and order by creation date
    constraints.push(orderBy('createdAt', 'desc'));

    return this.getMany<Requisition>(
      COLLECTIONS.REQUISITIONS,
      constraints,
      pageSize,
      lastDoc
    );
  }
}

// User-specific operations
export class UserService extends FirestoreService {
  static async createUser(user: Omit<User, 'id'>): Promise<string> {
    return this.create<User>(COLLECTIONS.USERS, user);
  }

  static async updateUser(id: string, updates: Partial<User>): Promise<void> {
    return this.update<User>(COLLECTIONS.USERS, id, updates);
  }

  static async getUser(id: string): Promise<User | null> {
    return this.getById<User>(COLLECTIONS.USERS, id);
  }

  static async getUsersByRole(
    role: UserRole,
    pageSize: number = 50
  ): Promise<{ data: User[]; lastDoc?: DocumentSnapshot }> {
    return this.getMany<User>(
      COLLECTIONS.USERS,
      [
        where('role', '==', role),
        orderBy('displayName', 'asc')
      ],
      pageSize
    );
  }

  static async getApprovers(
    minApprovalLimit?: number
  ): Promise<{ data: User[]; lastDoc?: DocumentSnapshot }> {
    const constraints: QueryConstraint[] = [
      where('role', 'in', [UserRole.APPROVER, UserRole.PROJECT_MANAGER, UserRole.ADMIN]),
      orderBy('approvalLimit', 'desc')
    ];

    if (minApprovalLimit) {
      constraints.push(where('approvalLimit', '>=', minApprovalLimit));
    }

    return this.getMany<User>(COLLECTIONS.USERS, constraints);
  }
}

// Audit logging
export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditService extends FirestoreService {
  static async logAction(
    userId: string,
    userName: string,
    action: string,
    resourceType: string,
    resourceId: string,
    details: Record<string, any> = {}
  ): Promise<void> {
    const auditLog: Omit<AuditLog, 'id'> = {
      userId,
      userName,
      action,
      resourceType,
      resourceId,
      details,
      timestamp: new Date()
    };

    await this.create<AuditLog>(COLLECTIONS.AUDIT_LOGS, auditLog);
  }

  static async getAuditLogs(
    resourceType?: string,
    resourceId?: string,
    pageSize: number = 50,
    lastDoc?: DocumentSnapshot
  ): Promise<{ data: AuditLog[]; lastDoc?: DocumentSnapshot }> {
    const constraints: QueryConstraint[] = [orderBy('timestamp', 'desc')];

    if (resourceType) {
      constraints.unshift(where('resourceType', '==', resourceType));
    }

    if (resourceId) {
      constraints.unshift(where('resourceId', '==', resourceId));
    }

    return this.getMany<AuditLog>(COLLECTIONS.AUDIT_LOGS, constraints, pageSize, lastDoc);
  }
}
