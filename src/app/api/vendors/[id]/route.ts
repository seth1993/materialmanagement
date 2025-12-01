import { NextRequest, NextResponse } from 'next/server';
import { VendorService } from '@/lib/vendor-service';
import { UpdateVendorRequest } from '@/types/vendor';
import { getUserFromRequest } from '@/lib/auth-middleware';

// GET /api/vendors/[id] - Get vendor by ID
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

    const vendor = await VendorService.getVendorById(params.id);
    
    if (!vendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ vendor });
  } catch (error) {
    console.error('Error fetching vendor:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendor' },
      { status: 500 }
    );
  }
}

// PUT /api/vendors/[id] - Update vendor
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

    const body = await request.json();

    // Check if vendor exists
    const existingVendor = await VendorService.getVendorById(params.id);
    if (!existingVendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      );
    }

    // Validate vendor code uniqueness if code is being updated
    if (body.code && body.code !== existingVendor.code) {
      const isCodeUnique = await VendorService.isVendorCodeUnique(body.code, params.id);
      if (!isCodeUnique) {
        return NextResponse.json(
          { error: 'Vendor code already exists' },
          { status: 400 }
        );
      }
    }

    // Validate address structure if provided
    if (body.address) {
      const addressFields = ['street', 'city', 'state', 'zipCode', 'country'];
      for (const field of addressFields) {
        if (body.address[field] === undefined || body.address[field] === '') {
          return NextResponse.json(
            { error: `Missing required address field: ${field}` },
            { status: 400 }
          );
        }
      }
    }

    // Validate contacts if provided
    if (body.contacts) {
      if (!Array.isArray(body.contacts) || body.contacts.length === 0) {
        return NextResponse.json(
          { error: 'At least one contact is required' },
          { status: 400 }
        );
      }

      // Validate that at least one contact is primary
      const hasPrimaryContact = body.contacts.some((contact: any) => contact.isPrimary);
      if (!hasPrimaryContact) {
        return NextResponse.json(
          { error: 'At least one contact must be marked as primary' },
          { status: 400 }
        );
      }
    }

    // Validate terms structure if provided
    if (body.terms) {
      const termsFields = ['paymentTerms', 'shippingTerms', 'currency'];
      for (const field of termsFields) {
        if (body.terms[field] === undefined || body.terms[field] === '') {
          return NextResponse.json(
            { error: `Missing required terms field: ${field}` },
            { status: 400 }
          );
        }
      }
    }

    const updateData: UpdateVendorRequest = {
      name: body.name,
      code: body.code,
      description: body.description,
      address: body.address,
      website: body.website,
      taxId: body.taxId,
      contacts: body.contacts,
      terms: body.terms,
      defaultLeadTimeDays: body.defaultLeadTimeDays,
      isActive: body.isActive,
    };

    // Remove undefined fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key as keyof UpdateVendorRequest] === undefined) {
        delete updateData[key as keyof UpdateVendorRequest];
      }
    });

    await VendorService.updateVendor(params.id, updateData, user.uid);
    
    return NextResponse.json({ message: 'Vendor updated successfully' });
  } catch (error) {
    console.error('Error updating vendor:', error);
    return NextResponse.json(
      { error: 'Failed to update vendor' },
      { status: 500 }
    );
  }
}

// DELETE /api/vendors/[id] - Delete vendor (soft delete)
export async function DELETE(
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
    const existingVendor = await VendorService.getVendorById(params.id);
    if (!existingVendor) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      );
    }

    await VendorService.deleteVendor(params.id);
    
    return NextResponse.json({ message: 'Vendor deleted successfully' });
  } catch (error) {
    console.error('Error deleting vendor:', error);
    return NextResponse.json(
      { error: 'Failed to delete vendor' },
      { status: 500 }
    );
  }
}
