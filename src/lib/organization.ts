import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { 
  Organization, 
  OrganizationMember, 
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  OrganizationPlan,
  OrganizationRole 
} from '@/types/organization';

export class OrganizationService {
  private static readonly ORGANIZATIONS_COLLECTION = 'organizations';
  private static readonly MEMBERS_COLLECTION = 'organization_members';

  /**
   * Create a new organization
   */
  static async createOrganization(
    ownerId: string, 
    request: CreateOrganizationRequest
  ): Promise<Organization> {
    if (!db) throw new Error('Firestore not initialized');

    const now = new Date();
    const organizationData = {
      name: request.name,
      description: request.description || '',
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
      ownerId,
      settings: {
        allowPublicSignup: false,
        requireEmailVerification: true,
        defaultMemberRole: OrganizationRole.MEMBER,
        features: {
          materialManagement: true,
          reporting: true,
          apiAccess: false,
          customFields: false
        },
        ...request.settings
      },
      memberCount: 1,
      isActive: true,
      plan: OrganizationPlan.FREE
    };

    const docRef = await addDoc(collection(db, this.ORGANIZATIONS_COLLECTION), organizationData);
    
    // Add the owner as the first member
    await this.addMember(docRef.id, {
      userId: ownerId,
      role: OrganizationRole.OWNER,
      isActive: true
    });

    return {
      id: docRef.id,
      ...organizationData,
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Get organization by ID
   */
  static async getOrganization(organizationId: string): Promise<Organization | null> {
    if (!db) throw new Error('Firestore not initialized');

    const docRef = doc(db, this.ORGANIZATIONS_COLLECTION, organizationId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate()
    } as Organization;
  }

  /**
   * Update organization
   */
  static async updateOrganization(
    organizationId: string, 
    request: UpdateOrganizationRequest
  ): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');

    const docRef = doc(db, this.ORGANIZATIONS_COLLECTION, organizationId);
    const updateData = {
      ...request,
      updatedAt: Timestamp.fromDate(new Date())
    };

    await updateDoc(docRef, updateData);
  }

  /**
   * Get user's organizations
   */
  static async getUserOrganizations(userId: string): Promise<Organization[]> {
    if (!db) throw new Error('Firestore not initialized');

    const membersQuery = query(
      collection(db, this.MEMBERS_COLLECTION),
      where('userId', '==', userId),
      where('isActive', '==', true)
    );

    const membersSnapshot = await getDocs(membersQuery);
    const organizationIds = membersSnapshot.docs.map(doc => doc.data().organizationId);

    if (organizationIds.length === 0) {
      return [];
    }

    // Get organizations for each membership
    const organizations: Organization[] = [];
    for (const orgId of organizationIds) {
      const org = await this.getOrganization(orgId);
      if (org) {
        organizations.push(org);
      }
    }

    return organizations;
  }

  /**
   * Add member to organization
   */
  static async addMember(
    organizationId: string, 
    memberData: {
      userId: string;
      email?: string;
      displayName?: string;
      role: OrganizationRole;
      isActive: boolean;
      invitedBy?: string;
    }
  ): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');

    const now = new Date();
    const member = {
      organizationId,
      userId: memberData.userId,
      email: memberData.email || '',
      displayName: memberData.displayName || '',
      role: memberData.role,
      joinedAt: Timestamp.fromDate(now),
      isActive: memberData.isActive,
      invitedBy: memberData.invitedBy
    };

    await addDoc(collection(db, this.MEMBERS_COLLECTION), member);

    // Update organization member count
    const orgRef = doc(db, this.ORGANIZATIONS_COLLECTION, organizationId);
    const orgSnap = await getDoc(orgRef);
    if (orgSnap.exists()) {
      const currentCount = orgSnap.data().memberCount || 0;
      await updateDoc(orgRef, { 
        memberCount: currentCount + 1,
        updatedAt: Timestamp.fromDate(now)
      });
    }
  }

  /**
   * Get organization members
   */
  static async getOrganizationMembers(organizationId: string): Promise<OrganizationMember[]> {
    if (!db) throw new Error('Firestore not initialized');

    const membersQuery = query(
      collection(db, this.MEMBERS_COLLECTION),
      where('organizationId', '==', organizationId),
      where('isActive', '==', true),
      orderBy('joinedAt', 'desc')
    );

    const snapshot = await getDocs(membersQuery);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        joinedAt: data.joinedAt.toDate(),
        lastActiveAt: data.lastActiveAt?.toDate()
      } as OrganizationMember;
    });
  }

  /**
   * Check if user is member of organization
   */
  static async isUserMember(userId: string, organizationId: string): Promise<boolean> {
    if (!db) throw new Error('Firestore not initialized');

    const membersQuery = query(
      collection(db, this.MEMBERS_COLLECTION),
      where('userId', '==', userId),
      where('organizationId', '==', organizationId),
      where('isActive', '==', true)
    );

    const snapshot = await getDocs(membersQuery);
    return !snapshot.empty;
  }

  /**
   * Get user's role in organization
   */
  static async getUserRole(userId: string, organizationId: string): Promise<OrganizationRole | null> {
    if (!db) throw new Error('Firestore not initialized');

    const membersQuery = query(
      collection(db, this.MEMBERS_COLLECTION),
      where('userId', '==', userId),
      where('organizationId', '==', organizationId),
      where('isActive', '==', true)
    );

    const snapshot = await getDocs(membersQuery);
    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data().role as OrganizationRole;
  }
}
