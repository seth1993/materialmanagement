import { NextRequest, NextResponse } from 'next/server';
import { VendorService } from '@/lib/vendor-service';
import { CreateVendorRequest } from '@/types/vendor';
import { getUserFromRequest } from '@/lib/auth-middleware';

// GET /api/vendors - Get all vendors
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const vendors = await VendorService.getVendors();
    return NextResponse.json({ vendors });
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendors' },
      { status: 500 }
    );
  }
}

// POST /api/vendors - Create a new vendor
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['name', 'code', 'address', 'contacts', 'terms', 'defaultLeadTimeDays'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate vendor code uniqueness
    const isCodeUnique = await VendorService.isVendorCodeUnique(body.code);
    if (!isCodeUnique) {
      return NextResponse.json(
        { error: 'Vendor code already exists' },
        { status: 400 }
      );
    }

    // Validate address structure
    const addressFields = ['street', 'city', 'state', 'zipCode', 'country'];
    for (const field of addressFields) {
      if (!body.address[field]) {
        return NextResponse.json(
          { error: `Missing required address field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate contacts
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

    // Validate terms structure
    const termsFields = ['paymentTerms', 'shippingTerms', 'currency'];
    for (const field of termsFields) {
      if (!body.terms[field]) {
        return NextResponse.json(
          { error: `Missing required terms field: ${field}` },
          { status: 400 }
        );
      }
    }

    const vendorData: CreateVendorRequest = {
      name: body.name,
      code: body.code,
      description: body.description,
      address: body.address,
      website: body.website,
      taxId: body.taxId,
      contacts: body.contacts,
      terms: body.terms,
      defaultLeadTimeDays: body.defaultLeadTimeDays,
    };

    const vendorId = await VendorService.createVendor(vendorData, user.uid);
    
    return NextResponse.json(
      { message: 'Vendor created successfully', vendorId },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating vendor:', error);
    return NextResponse.json(
      { error: 'Failed to create vendor' },
      { status: 500 }
    );
  }
}
