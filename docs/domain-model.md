# Materials Platform Domain Model

This document describes the comprehensive domain model for the materials management platform, including all entities, relationships, and business rules.

## Overview

The materials platform is designed to support complex materials management workflows including:

- **User & Organization Management**: Multi-tenant architecture with role-based access control
- **Materials Catalog**: Comprehensive material definitions with specifications and inventory settings
- **Project Management**: Project-based material planning and tracking
- **Vendor Management**: Vendor relationships and material sourcing
- **Procurement**: Requisitions, purchase orders, and approval workflows
- **Inventory Management**: Multi-location inventory tracking with lot management
- **Shipping & Receiving**: Shipment tracking and receiving workflows

## Core Entities

### User Management

#### User
Represents a user in the system with role-based permissions.

```typescript
interface User {
  id: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  role: UserRole; // ADMIN, MANAGER, USER, VIEWER
  organizationId: string;
  isActive: boolean;
  lastLoginAt?: Timestamp;
  profileImageUrl?: string;
  phoneNumber?: string;
  department?: string;
  jobTitle?: string;
  // Audit fields
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
}
```

**Key Features:**
- Role-based access control with hierarchical permissions
- Organization-scoped access
- Profile management with optional fields
- Audit trail for all changes

#### Organization
Represents a tenant in the multi-tenant system.

```typescript
interface Organization {
  id: string;
  name: string;
  description?: string;
  address?: Address;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  logoUrl?: string;
  isActive: boolean;
  settings: OrganizationSettings;
  // Audit fields
}
```

**Key Features:**
- Multi-tenant isolation
- Configurable organization settings
- Contact information and branding

### Materials Catalog

#### Material
Core entity representing a material or item in the catalog.

```typescript
interface Material {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  category: string;
  subcategory?: string;
  unit: string; // e.g., 'each', 'kg', 'lbs', 'm', 'ft'
  unitCost?: number;
  currency?: string;
  specifications?: Record<string, any>;
  tags?: string[];
  isActive: boolean;
  organizationId: string;
  
  // Vendor information
  preferredVendorId?: string;
  alternateVendorIds?: string[];
  
  // Inventory settings
  trackInventory: boolean;
  minimumStock?: number;
  maximumStock?: number;
  reorderPoint?: number;
  reorderQuantity?: number;
  
  // Audit fields
}
```

**Key Features:**
- Flexible categorization system
- Vendor relationships
- Inventory tracking configuration
- Custom specifications and metadata
- Multi-unit support

### Project Management

#### Project
Represents a project that consumes materials.

```typescript
interface Project {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  managerId: string; // User ID
  status: ProjectStatus;
  startDate?: Timestamp;
  endDate?: Timestamp;
  budget?: number;
  currency?: string;
  location?: Address;
  tags?: string[];
  isActive: boolean;
  // Audit fields
}
```

#### ProjectMaterialGroup
Groups related materials for a project with estimated quantities and costs.

```typescript
interface ProjectMaterialGroup {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  lines: ProjectMaterialLine[];
  totalEstimatedCost?: number;
  currency?: string;
  isActive: boolean;
  // Audit fields
}
```

### Vendor Management

#### Vendor
Represents a supplier or vendor.

```typescript
interface Vendor {
  id: string;
  name: string;
  description?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: Address;
  taxId?: string;
  paymentTerms?: string;
  rating?: number; // 1-5 stars
  isActive: boolean;
  organizationId: string;
  tags?: string[];
  // Audit fields
}
```

#### VendorMaterial
Links vendors to materials with pricing and lead time information.

```typescript
interface VendorMaterial {
  id: string;
  vendorId: string;
  materialId: string;
  vendorSku?: string;
  vendorPartNumber?: string;
  unitCost: number;
  currency: string;
  minimumOrderQuantity?: number;
  leadTimeDays?: number;
  isPreferred: boolean;
  isActive: boolean;
  lastUpdatedPrice?: Timestamp;
  notes?: string;
  // Audit fields
}
```

### Procurement

#### Requisition
Represents a request for materials with approval workflow.

```typescript
interface Requisition {
  id: string;
  number: string; // Auto-generated requisition number
  projectId?: string;
  requestedById: string; // User ID
  approvedById?: string; // User ID
  status: RequisitionStatus;
  priority: Priority;
  requestedDate: Timestamp;
  requiredDate?: Timestamp;
  approvedDate?: Timestamp;
  lines: RequisitionLine[];
  totalEstimatedCost?: number;
  currency?: string;
  notes?: string;
  organizationId: string;
  // Audit fields
}
```

#### PurchaseOrder
Represents an order placed with a vendor.

```typescript
interface PurchaseOrder {
  id: string;
  number: string; // Auto-generated PO number
  vendorId: string;
  projectId?: string;
  createdById: string; // User ID
  status: PurchaseOrderStatus;
  orderDate: Timestamp;
  expectedDeliveryDate?: Timestamp;
  lines: PurchaseOrderLine[];
  subtotal: number;
  taxAmount?: number;
  shippingAmount?: number;
  totalAmount: number;
  currency: string;
  notes?: string;
  organizationId: string;
  deliveryAddress?: Address;
  deliveryInstructions?: string;
  // Audit fields
}
```

### Inventory Management

#### InventoryLocation
Represents a physical location where inventory is stored.

```typescript
interface InventoryLocation {
  id: string;
  name: string;
  description?: string;
  type: 'warehouse' | 'site' | 'office' | 'vehicle' | 'other';
  address?: Address;
  contactPerson?: string;
  contactPhone?: string;
  isActive: boolean;
  organizationId: string;
  parentLocationId?: string; // For hierarchical locations
  // Audit fields
}
```

#### InventoryLot
Represents a specific lot or batch of material at a location.

```typescript
interface InventoryLot {
  id: string;
  materialId: string;
  locationId: string;
  lotNumber?: string;
  batchNumber?: string;
  serialNumber?: string;
  quantity: number;
  unitCost?: number;
  totalCost?: number;
  currency?: string;
  receivedDate?: Timestamp;
  expirationDate?: Timestamp;
  purchaseOrderLineId?: string;
  shipmentId?: string;
  isActive: boolean;
  organizationId: string;
  notes?: string;
  // Audit fields
}
```

#### InventoryMovement
Tracks all inventory movements for audit and reporting.

```typescript
interface InventoryMovement {
  id: string;
  type: InventoryMovementType; // RECEIPT, ISSUE, TRANSFER, ADJUSTMENT, RETURN
  materialId: string;
  fromLocationId?: string;
  toLocationId?: string;
  fromLotId?: string;
  toLotId?: string;
  quantity: number;
  unitCost?: number;
  totalCost?: number;
  currency?: string;
  movementDate: Timestamp;
  reason: string;
  referenceType?: 'requisition' | 'purchase_order' | 'shipment' | 'adjustment' | 'transfer';
  referenceId?: string;
  performedById: string; // User ID
  organizationId: string;
  notes?: string;
  // Audit fields
}
```

### Shipping & Receiving

#### Shipment
Represents a shipment from a vendor.

```typescript
interface Shipment {
  id: string;
  number: string; // Tracking or shipment number
  purchaseOrderId: string;
  vendorId: string;
  status: ShipmentStatus;
  shippedDate?: Timestamp;
  expectedDeliveryDate?: Timestamp;
  actualDeliveryDate?: Timestamp;
  trackingNumber?: string;
  carrier?: string;
  events: ShipmentEvent[];
  organizationId: string;
  deliveryAddress?: Address;
  notes?: string;
  // Audit fields
}
```

## Entity Relationships

### Primary Relationships

1. **Organization → Users**: One-to-many relationship where each user belongs to one organization
2. **Organization → Materials**: One-to-many relationship for organization-specific material catalogs
3. **User → Projects**: Many-to-many relationship with project managers and team members
4. **Project → ProjectMaterialGroups**: One-to-many relationship for project material planning
5. **Material → VendorMaterials**: One-to-many relationship for vendor pricing
6. **Vendor → VendorMaterials**: One-to-many relationship for vendor catalogs
7. **Requisition → PurchaseOrder**: Many-to-many relationship through requisition lines
8. **PurchaseOrder → Shipments**: One-to-many relationship for order fulfillment
9. **Material → InventoryLots**: One-to-many relationship for inventory tracking
10. **InventoryLocation → InventoryLots**: One-to-many relationship for location-based inventory

### Data Flow

```
Requisition → Approval → PurchaseOrder → Shipment → Receipt → InventoryMovement → InventoryLot
```

## Business Rules

### User Management
- Users can only access data within their organization
- Role hierarchy: ADMIN > MANAGER > USER > VIEWER
- Users can be deactivated but not deleted (soft delete)

### Materials
- Material names must be unique within an organization
- SKUs must be unique within an organization if provided
- Materials can have multiple vendor relationships
- Inventory tracking is optional per material

### Projects
- Projects must have a manager (User with MANAGER or ADMIN role)
- Project materials are estimated quantities and costs
- Projects can span multiple locations

### Procurement
- Requisitions require approval based on organization settings
- Purchase orders are created from approved requisitions
- Purchase order numbers are auto-generated and unique

### Inventory
- Inventory movements create an audit trail
- Lot numbers track specific batches of materials
- Locations can be hierarchical (warehouse → aisle → shelf)

### Vendors
- Vendor materials link vendors to specific materials with pricing
- Multiple vendors can supply the same material
- Preferred vendors are used for automatic PO generation

## Security & Access Control

### Organization Isolation
- All data is scoped to organizations
- Users cannot access data from other organizations
- Cross-organization queries are prevented at the service layer

### Role-Based Access Control
- **ADMIN**: Full access to all organization data
- **MANAGER**: Can manage projects, approve requisitions, manage users
- **USER**: Can create requisitions, view assigned projects, manage materials
- **VIEWER**: Read-only access to assigned data

### Data Privacy
- Audit fields track all changes
- Soft deletes preserve data integrity
- Personal information is protected according to privacy policies

## Performance Considerations

### Firestore Optimization
- Collections are designed for efficient queries
- Composite indexes are used for complex queries
- Denormalization is used where appropriate for read performance

### Caching Strategy
- Material catalogs are cached for performance
- User permissions are cached per session
- Frequently accessed reference data is cached

### Scalability
- Horizontal scaling through organization partitioning
- Batch operations for bulk data processing
- Pagination for large result sets

## Migration Strategy

### Schema Evolution
- Migrations are versioned and tracked
- Backward compatibility is maintained
- Data transformations are handled gracefully

### Data Migration
- Legacy data can be imported through migration scripts
- Validation ensures data integrity during migration
- Rollback procedures are available for failed migrations
