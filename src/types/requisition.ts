export interface Requisition {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: RequisitionStatus;
  priority: 'low' | 'medium' | 'high';
  requestedBy: string;
  approvedBy?: string;
  rejectedBy?: string;
  items: RequisitionItem[];
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  notes?: string;
}

export enum RequisitionStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  FULFILLED = 'fulfilled',
}

export interface RequisitionItem {
  materialName: string;
  quantity: number;
  category: string;
  estimatedCost?: number;
  notes?: string;
}

export interface CreateRequisitionData {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  items: RequisitionItem[];
  notes?: string;
}
