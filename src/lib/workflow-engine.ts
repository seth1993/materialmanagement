import { 
  Requisition, 
  RequisitionStatus, 
  ApprovalAction, 
  ApprovalHistoryEntry,
  canTransitionTo 
} from '@/types/requisition';
import { User, UserRole, getRolePermissions } from '@/types/user';
import { 
  STATUS_TRANSITIONS, 
  APPROVAL_LEVELS, 
  WORKFLOW_CONFIG,
  ApprovalLevel 
} from '@/constants/workflow-states';
import { RequisitionService, AuditService } from './firestore-collections';

export interface WorkflowTransitionResult {
  success: boolean;
  newStatus?: RequisitionStatus;
  errors: string[];
  warnings: string[];
  nextApprovers?: User[];
  requiresAdditionalApproval?: boolean;
}

export interface ApprovalRequest {
  requisitionId: string;
  approverId: string;
  action: ApprovalAction;
  comments?: string;
  attachments?: string[];
}

export class WorkflowEngine {
  /**
   * Validates if a user can perform a specific action on a requisition
   */
  static canUserPerformAction(
    user: User,
    requisition: Requisition,
    targetStatus: RequisitionStatus
  ): { canPerform: boolean; reason?: string } {
    // Check if the transition is valid
    if (!canTransitionTo(requisition.status, targetStatus)) {
      return {
        canPerform: false,
        reason: `Invalid transition from ${requisition.status} to ${targetStatus}`
      };
    }

    // Check if user has the required role
    const transitionRules = STATUS_TRANSITIONS[requisition.status];
    if (!transitionRules.userRoles.includes(user.role)) {
      return {
        canPerform: false,
        reason: `User role ${user.role} cannot perform this action`
      };
    }

    // Check approval limits for approval actions
    if (targetStatus === RequisitionStatus.APPROVED) {
      const permissions = getRolePermissions(user.role);
      if (permissions.maxApprovalValue && requisition.totalValue > permissions.maxApprovalValue) {
        return {
          canPerform: false,
          reason: `Requisition value $${requisition.totalValue} exceeds user approval limit $${permissions.maxApprovalValue}`
        };
      }
    }

    // Check if user is the requester (can't approve own requisition)
    if (user.uid === requisition.requesterId && targetStatus === RequisitionStatus.APPROVED) {
      return {
        canPerform: false,
        reason: 'Users cannot approve their own requisitions'
      };
    }

    return { canPerform: true };
  }

  /**
   * Determines the required approval level based on requisition value and other factors
   */
  static getRequiredApprovalLevel(requisition: Requisition): ApprovalLevel[] {
    const requiredLevels: ApprovalLevel[] = [];

    // Add levels based on value thresholds
    for (const level of APPROVAL_LEVELS) {
      if (!level.minApprovalLimit || requisition.totalValue >= level.minApprovalLimit) {
        requiredLevels.push(level);
      }
    }

    // Sort by level to ensure proper order
    return requiredLevels.sort((a, b) => a.level - b.level);
  }

  /**
   * Determines if PM approval is required based on value and other criteria
   */
  static requiresPMApproval(requisition: Requisition): boolean {
    return requisition.totalValue >= WORKFLOW_CONFIG.APPROVAL_THRESHOLDS.STANDARD_APPROVER;
  }

  /**
   * Gets the next approvers for a requisition based on current status and workflow rules
   */
  static async getNextApprovers(requisition: Requisition): Promise<User[]> {
    const requiredLevels = this.getRequiredApprovalLevel(requisition);
    const currentLevel = requisition.currentApprovalStep || 1;
    
    // Find the current approval level
    const currentApprovalLevel = requiredLevels.find(level => level.level === currentLevel);
    if (!currentApprovalLevel) {
      return [];
    }

    // Get users with the required roles for this level
    const approvers: User[] = [];
    
    // This would typically query the database for users with appropriate roles
    // For now, we'll return an empty array as this would need actual user data
    // In a real implementation, you'd query UserService.getUsersByRole()
    
    return approvers;
  }

  /**
   * Processes a workflow transition (submit, approve, reject, etc.)
   */
  static async processTransition(
    requisition: Requisition,
    targetStatus: RequisitionStatus,
    user: User,
    comments?: string
  ): Promise<WorkflowTransitionResult> {
    const result: WorkflowTransitionResult = {
      success: false,
      errors: [],
      warnings: []
    };

    try {
      // Validate the transition
      const canPerform = this.canUserPerformAction(user, requisition, targetStatus);
      if (!canPerform.canPerform) {
        result.errors.push(canPerform.reason || 'Action not permitted');
        return result;
      }

      // Validate required fields
      const transitionRules = STATUS_TRANSITIONS[requisition.status];
      const missingFields = this.validateRequiredFields(requisition, transitionRules.requiredFields);
      if (missingFields.length > 0) {
        result.errors.push(`Missing required fields: ${missingFields.join(', ')}`);
        return result;
      }

      // Create approval history entry
      const historyEntry: ApprovalHistoryEntry = {
        id: `${Date.now()}-${user.uid}`,
        approverId: user.uid,
        approverName: user.displayName || user.email,
        approverRole: user.role,
        action: this.getApprovalAction(targetStatus),
        comments,
        timestamp: new Date(),
        previousStatus: requisition.status,
        newStatus: targetStatus,
        approvalLevel: requisition.currentApprovalStep || 1
      };

      // Update requisition
      const updates: Partial<Requisition> = {
        status: targetStatus,
        updatedAt: new Date(),
        approvalHistory: [...requisition.approvalHistory, historyEntry]
      };

      // Set status-specific timestamps
      switch (targetStatus) {
        case RequisitionStatus.SUBMITTED:
          updates.submittedAt = new Date();
          updates.requiresPMApproval = this.requiresPMApproval(requisition);
          break;
        case RequisitionStatus.APPROVED:
          updates.approvedAt = new Date();
          break;
        case RequisitionStatus.REJECTED:
          updates.rejectedAt = new Date();
          break;
        case RequisitionStatus.CONVERTED_TO_PO:
          updates.convertedToPOAt = new Date();
          break;
      }

      // Determine next approval step
      if (targetStatus === RequisitionStatus.UNDER_REVIEW || targetStatus === RequisitionStatus.APPROVED) {
        const requiredLevels = this.getRequiredApprovalLevel(requisition);
        const currentStep = requisition.currentApprovalStep || 1;
        
        if (targetStatus === RequisitionStatus.APPROVED && currentStep < requiredLevels.length) {
          // Move to next approval level
          updates.currentApprovalStep = currentStep + 1;
          updates.status = RequisitionStatus.UNDER_REVIEW; // Keep in review for next level
          result.requiresAdditionalApproval = true;
        }
      }

      // Update in database
      await RequisitionService.updateRequisition(requisition.id, updates);

      // Log the action
      await AuditService.logAction(
        user.uid,
        user.displayName || user.email,
        `requisition_${this.getApprovalAction(targetStatus)}`,
        'requisition',
        requisition.id,
        {
          previousStatus: requisition.status,
          newStatus: targetStatus,
          comments,
          approvalLevel: requisition.currentApprovalStep || 1
        }
      );

      result.success = true;
      result.newStatus = updates.status;
      
      // Get next approvers if still in review
      if (updates.status === RequisitionStatus.UNDER_REVIEW) {
        result.nextApprovers = await this.getNextApprovers({
          ...requisition,
          ...updates
        } as Requisition);
      }

      return result;

    } catch (error) {
      console.error('Error processing workflow transition:', error);
      result.errors.push('Failed to process workflow transition');
      return result;
    }
  }

  /**
   * Processes an approval request
   */
  static async processApproval(request: ApprovalRequest): Promise<WorkflowTransitionResult> {
    try {
      const requisition = await RequisitionService.getRequisition(request.requisitionId);
      if (!requisition) {
        return {
          success: false,
          errors: ['Requisition not found'],
          warnings: []
        };
      }

      // Get the approver user (this would need to be fetched from UserService)
      // For now, we'll create a mock user
      const approver: User = {
        uid: request.approverId,
        email: 'approver@example.com',
        displayName: 'Approver',
        photoURL: null,
        role: UserRole.APPROVER,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      let targetStatus: RequisitionStatus;
      switch (request.action) {
        case ApprovalAction.APPROVED:
          targetStatus = RequisitionStatus.APPROVED;
          break;
        case ApprovalAction.REJECTED:
          targetStatus = RequisitionStatus.REJECTED;
          break;
        case ApprovalAction.RETURNED_FOR_REVISION:
          targetStatus = RequisitionStatus.DRAFT;
          break;
        default:
          return {
            success: false,
            errors: ['Invalid approval action'],
            warnings: []
          };
      }

      return await this.processTransition(requisition, targetStatus, approver, request.comments);

    } catch (error) {
      console.error('Error processing approval:', error);
      return {
        success: false,
        errors: ['Failed to process approval'],
        warnings: []
      };
    }
  }

  /**
   * Validates required fields for a transition
   */
  private static validateRequiredFields(requisition: Requisition, requiredFields: string[]): string[] {
    const missingFields: string[] = [];

    for (const field of requiredFields) {
      switch (field) {
        case 'title':
          if (!requisition.title?.trim()) missingFields.push('title');
          break;
        case 'description':
          if (!requisition.description?.trim()) missingFields.push('description');
          break;
        case 'items':
          if (!requisition.items?.length) missingFields.push('items');
          break;
        case 'justification':
          if (!requisition.justification?.trim()) missingFields.push('justification');
          break;
        case 'totalValue':
          if (!requisition.totalValue || requisition.totalValue <= 0) missingFields.push('totalValue');
          break;
        case 'poNumber':
          if (!requisition.poNumber?.trim()) missingFields.push('poNumber');
          break;
      }
    }

    return missingFields;
  }

  /**
   * Maps status to approval action
   */
  private static getApprovalAction(status: RequisitionStatus): ApprovalAction {
    switch (status) {
      case RequisitionStatus.SUBMITTED:
        return ApprovalAction.SUBMITTED;
      case RequisitionStatus.APPROVED:
        return ApprovalAction.APPROVED;
      case RequisitionStatus.REJECTED:
        return ApprovalAction.REJECTED;
      case RequisitionStatus.DRAFT:
        return ApprovalAction.RETURNED_FOR_REVISION;
      case RequisitionStatus.CONVERTED_TO_PO:
        return ApprovalAction.CONVERTED_TO_PO;
      default:
        return ApprovalAction.SUBMITTED;
    }
  }

  /**
   * Checks if a requisition needs escalation based on time and priority
   */
  static needsEscalation(requisition: Requisition): boolean {
    if (requisition.status !== RequisitionStatus.UNDER_REVIEW) {
      return false;
    }

    const submittedAt = requisition.submittedAt;
    if (!submittedAt) {
      return false;
    }

    const hoursSinceSubmission = (Date.now() - submittedAt.getTime()) / (1000 * 60 * 60);
    const escalationConfig = WORKFLOW_CONFIG.PRIORITY_ESCALATION[requisition.priority];
    
    return hoursSinceSubmission >= escalationConfig.autoEscalateAfterHours;
  }
}
