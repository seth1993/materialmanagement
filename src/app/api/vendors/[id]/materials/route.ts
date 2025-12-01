import { NextRequest, NextResponse } from 'next/server';
import { VendorService, VendorMaterialService } from '@/lib/vendor-service';
import { CreateVendorMaterialRequest } from '@/types/vendor';
import { getUserFromRequest } from '@/lib/auth-middleware';

// GET /api/vendors/[id]/materials - Get all materials for a vendor
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if vendor exists
    const vendor = await VendorService.getVendorById(params.id);
    if (!vendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      );
    }

    const vendorMaterials = await VendorMaterialService.getVendorMaterials(params.id);
    return NextResponse.json({ vendorMaterials });
  } catch (error) {
    console.error('Error fetching vendor materials:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendor materials' },
      { status: 500 }
    );
  }
}

// POST /api/vendors/[id]/materials - Create vendor material pricing
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if vendor exists
    const vendor = await VendorService.getVendorById(params.id);
    if (!vendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['materialId', 'basePrice', 'currency', 'leadTimeDays'];
    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate numeric fields
    if (typeof body.basePrice !== 'number' || body.basePrice < 0) {
      return NextResponse.json(
        { error: 'Base price must be a non-negative number' },
        { status: 400 }
      );
    }

    if (typeof body.leadTimeDays !== 'number' || body.leadTimeDays < 0) {
      return NextResponse.json(
        { error: 'Lead time days must be a non-negative number' },
        { status: 400 }
      );
    }

    if (body.minimumOrderQuantity !== undefined && 
        (typeof body.minimumOrderQuantity !== 'number' || body.minimumOrderQuantity < 0)) {
      return NextResponse.json(
        { error: 'Minimum order quantity must be a non-negative number' },
        { status: 400 }
      );
    }

    const materialData: CreateVendorMaterialRequest = {
      materialId: body.materialId,
      vendorPartNumber: body.vendorPartNumber,
      basePrice: body.basePrice,
      currency: body.currency,
      leadTimeDays: body.leadTimeDays,
      minimumOrderQuantity: body.minimumOrderQuantity,
    };

    const vendorMaterialId = await VendorMaterialService.createVendorMaterial(
      params.id,
      materialData,
      user.uid
    );
    
    return NextResponse.json(
      { message: 'Vendor material created successfully', vendorMaterialId },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating vendor material:', error);
    return NextResponse.json(
      { error: 'Failed to create vendor material' },
      { status: 500 }
    );
  }
}

// PUT /api/vendors/[id]/materials - Bulk update vendor materials
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if vendor exists
    const vendor = await VendorService.getVendorById(params.id);
    if (!vendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    
    // Validate that updates is an array
    if (!Array.isArray(body.updates)) {
      return NextResponse.json(
        { error: 'Updates must be an array' },
        { status: 400 }
      );
    }

    // Validate each update
    for (const update of body.updates) {
      if (!update.vendorMaterialId) {
        return NextResponse.json(
          { error: 'Each update must include vendorMaterialId' },
          { status: 400 }
        );
      }

      if (update.data.basePrice !== undefined && 
          (typeof update.data.basePrice !== 'number' || update.data.basePrice < 0)) {
        return NextResponse.json(
          { error: 'Base price must be a non-negative number' },
          { status: 400 }
        );
      }

      if (update.data.leadTimeDays !== undefined && 
          (typeof update.data.leadTimeDays !== 'number' || update.data.leadTimeDays < 0)) {
        return NextResponse.json(
          { error: 'Lead time days must be a non-negative number' },
          { status: 400 }
        );
      }

      if (update.data.minimumOrderQuantity !== undefined && 
          (typeof update.data.minimumOrderQuantity !== 'number' || update.data.minimumOrderQuantity < 0)) {
        return NextResponse.json(
          { error: 'Minimum order quantity must be a non-negative number' },
          { status: 400 }
        );
      }
    }

    await VendorMaterialService.bulkUpdateVendorMaterials(
      params.id,
      body.updates,
      user.uid
    );
    
    return NextResponse.json({ message: 'Vendor materials updated successfully' });
  } catch (error) {
    console.error('Error updating vendor materials:', error);
    return NextResponse.json(
      { error: 'Failed to update vendor materials' },
      { status: 500 }
    );
  }
}
