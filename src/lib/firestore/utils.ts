import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  QueryConstraint,
  DocumentSnapshot,
  QuerySnapshot,
  WriteBatch,
  writeBatch,
  runTransaction,
  Transaction,
  Timestamp,
  serverTimestamp,
  CollectionReference,
  DocumentReference
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AuditFields } from '@/types/domain';

// Error classes
export class FirestoreError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'FirestoreError';
  }
}

export class DocumentNotFoundError extends FirestoreError {
  constructor(collection: string, id: string) {
    super(`Document not found: ${collection}/${id}`);
    this.name = 'DocumentNotFoundError';
  }
}

export class ValidationError extends FirestoreError {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Generic CRUD operations
export async function createDocument<T extends AuditFields>(
  collection: CollectionReference<T>,
  data: Omit<T, 'id' | keyof AuditFields>,
  userId: string,
  customId?: string
): Promise<string> {
  try {
    const now = serverTimestamp() as Timestamp;
    const documentData = {
      ...data,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId
    } as T;

    if (customId) {
      const docRef = doc(collection, customId);
      await setDoc(docRef, documentData);
      return customId;
    } else {
      const docRef = await addDoc(collection, documentData);
      return docRef.id;
    }
  } catch (error) {
    throw new FirestoreError(`Failed to create document: ${error}`);
  }
}

export async function getDocument<T>(
  collection: CollectionReference<T>,
  id: string
): Promise<T> {
  try {
    const docRef = doc(collection, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new DocumentNotFoundError(collection.path, id);
    }
    
    return { id: docSnap.id, ...docSnap.data() } as T;
  } catch (error) {
    if (error instanceof DocumentNotFoundError) {
      throw error;
    }
    throw new FirestoreError(`Failed to get document: ${error}`);
  }
}

export async function updateDocument<T extends AuditFields>(
  collection: CollectionReference<T>,
  id: string,
  data: Partial<Omit<T, 'id' | 'createdAt' | 'createdBy'>>,
  userId: string
): Promise<void> {
  try {
    const docRef = doc(collection, id);
    const updateData = {
      ...data,
      updatedAt: serverTimestamp(),
      updatedBy: userId
    };
    
    await updateDoc(docRef, updateData);
  } catch (error) {
    throw new FirestoreError(`Failed to update document: ${error}`);
  }
}

export async function deleteDocument<T>(
  collection: CollectionReference<T>,
  id: string
): Promise<void> {
  try {
    const docRef = doc(collection, id);
    await deleteDoc(docRef);
  } catch (error) {
    throw new FirestoreError(`Failed to delete document: ${error}`);
  }
}

// Query builders
export interface QueryOptions {
  limit?: number;
  orderBy?: { field: string; direction?: 'asc' | 'desc' }[];
  where?: { field: string; operator: any; value: any }[];
  startAfter?: DocumentSnapshot;
}

export function buildQuery<T>(
  collection: CollectionReference<T>,
  options: QueryOptions = {}
): ReturnType<typeof query> {
  const constraints: QueryConstraint[] = [];

  // Add where clauses
  if (options.where) {
    options.where.forEach(({ field, operator, value }) => {
      constraints.push(where(field, operator, value));
    });
  }

  // Add order by clauses
  if (options.orderBy) {
    options.orderBy.forEach(({ field, direction = 'asc' }) => {
      constraints.push(orderBy(field, direction));
    });
  }

  // Add pagination
  if (options.startAfter) {
    constraints.push(startAfter(options.startAfter));
  }

  // Add limit
  if (options.limit) {
    constraints.push(limit(options.limit));
  }

  return query(collection, ...constraints);
}

export async function queryDocuments<T>(
  collection: CollectionReference<T>,
  options: QueryOptions = {}
): Promise<T[]> {
  try {
    const q = buildQuery(collection, options);
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as T));
  } catch (error) {
    throw new FirestoreError(`Failed to query documents: ${error}`);
  }
}

// Batch operations
export class BatchOperations {
  private batch: WriteBatch;
  private operationCount = 0;
  private readonly MAX_OPERATIONS = 500; // Firestore limit

  constructor() {
    if (!db) throw new Error('Firestore not initialized');
    this.batch = writeBatch(db);
  }

  create<T extends AuditFields>(
    collection: CollectionReference<T>,
    data: Omit<T, 'id' | keyof AuditFields>,
    userId: string,
    customId?: string
  ): string {
    this.checkOperationLimit();
    
    const now = serverTimestamp() as Timestamp;
    const documentData = {
      ...data,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId
    } as T;

    const docRef = customId ? doc(collection, customId) : doc(collection);
    this.batch.set(docRef, documentData);
    this.operationCount++;
    
    return docRef.id;
  }

  update<T extends AuditFields>(
    collection: CollectionReference<T>,
    id: string,
    data: Partial<Omit<T, 'id' | 'createdAt' | 'createdBy'>>,
    userId: string
  ): void {
    this.checkOperationLimit();
    
    const docRef = doc(collection, id);
    const updateData = {
      ...data,
      updatedAt: serverTimestamp(),
      updatedBy: userId
    };
    
    this.batch.update(docRef, updateData);
    this.operationCount++;
  }

  delete<T>(collection: CollectionReference<T>, id: string): void {
    this.checkOperationLimit();
    
    const docRef = doc(collection, id);
    this.batch.delete(docRef);
    this.operationCount++;
  }

  async commit(): Promise<void> {
    try {
      await this.batch.commit();
      this.operationCount = 0;
    } catch (error) {
      throw new FirestoreError(`Failed to commit batch: ${error}`);
    }
  }

  private checkOperationLimit(): void {
    if (this.operationCount >= this.MAX_OPERATIONS) {
      throw new FirestoreError(`Batch operation limit exceeded (${this.MAX_OPERATIONS})`);
    }
  }

  getOperationCount(): number {
    return this.operationCount;
  }
}

// Transaction helpers
export async function runTransactionWithRetry<T>(
  operation: (transaction: Transaction) => Promise<T>,
  maxRetries = 3
): Promise<T> {
  if (!db) throw new Error('Firestore not initialized');
  
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await runTransaction(db, operation);
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on certain errors
      if (error instanceof ValidationError || error instanceof DocumentNotFoundError) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
      }
    }
  }
  
  throw new FirestoreError(`Transaction failed after ${maxRetries} attempts: ${lastError.message}`);
}

// Utility functions
export function generateId(): string {
  return doc(collection(db!, 'temp')).id;
}

export function isValidFirestoreId(id: string): boolean {
  // Firestore document IDs must be valid UTF-8 characters and cannot contain forward slashes
  return typeof id === 'string' && id.length > 0 && !id.includes('/');
}

export function sanitizeForFirestore(data: any): any {
  if (data === null || data === undefined) {
    return null;
  }
  
  if (Array.isArray(data)) {
    return data.map(sanitizeForFirestore);
  }
  
  if (typeof data === 'object' && data.constructor === Object) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      // Skip undefined values
      if (value !== undefined) {
        sanitized[key] = sanitizeForFirestore(value);
      }
    }
    return sanitized;
  }
  
  return data;
}

// Pagination helpers
export interface PaginationResult<T> {
  data: T[];
  hasMore: boolean;
  lastDoc?: DocumentSnapshot;
  total?: number;
}

export async function paginateQuery<T>(
  collection: CollectionReference<T>,
  options: QueryOptions & { pageSize?: number } = {}
): Promise<PaginationResult<T>> {
  const pageSize = options.pageSize || 20;
  const queryOptions = { ...options, limit: pageSize + 1 }; // Get one extra to check if there are more
  
  try {
    const results = await queryDocuments(collection, queryOptions);
    const hasMore = results.length > pageSize;
    const data = hasMore ? results.slice(0, pageSize) : results;
    
    return {
      data,
      hasMore,
      lastDoc: hasMore ? undefined : undefined // Would need to store the actual DocumentSnapshot
    };
  } catch (error) {
    throw new FirestoreError(`Failed to paginate query: ${error}`);
  }
}
