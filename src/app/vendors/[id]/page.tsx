'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import VendorMaterialPricing from '@/components/VendorMaterialPricing';
import { Vendor } from '@/types/vendor';

interface VendorDetailPageProps {
  params: { id: string };
}

export default function VendorDetailPage({ params }: VendorDetailPageProps) {
  const { user, loading: authLoading } = useAuth();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVendor = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/vendors/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Vendor not found');
        }
        throw new Error('Failed to fetch vendor');
      }

      const data = await response.json();
      setVendor(data.vendor);
    } catch (error) {
      console.error('Error fetching vendor:', error);
      setError(error instanceof Error ? error.message : 'Failed to load vendor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchVendor();
    }
  }, [params.id, user, authLoading]);

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <LoadingSpinner className="mx-auto" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Please sign in to view vendor details.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <LoadingSpinner className="mx-auto" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
        <div className="mt-4">
          <a
            href="/vendors"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Vendors
          </a>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-8">
          <p className="text-gray-600">Vendor not found.</p>
          <div className="mt-4">
            <a
              href="/vendors"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              ← Back to Vendors
            </a>
          </div>
        </div>
      </div>
    );
  }

  const primaryContact = vendor.contacts.find(contact => contact.isPrimary);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <a
                href="/vendors"
                className="text-blue-600 hover:text-blue-800 font-medium mb-2 inline-block"
              >
                ← Back to Vendors
              </a>
              <h1 className="text-3xl font-bold text-gray-900">{vendor.name}</h1>
              <p className="text-gray-600">Code: {vendor.code}</p>
            </div>
            <div className="flex space-x-3">
              <a
                href={`/vendors/${vendor.id}/edit`}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
              >
                Edit Vendor
              </a>
              <span className={`inline-flex items-center px-3 py-2 rounded-full text-sm font-medium ${
                vendor.isActive 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {vendor.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        {/* Vendor Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Basic Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
            
            {vendor.description && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700">Description</h3>
                <p className="mt-1 text-sm text-gray-900">{vendor.description}</p>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-medium text-gray-700">Address</h3>
                <p className="mt-1 text-sm text-gray-900">
                  {vendor.address.street}<br />
                  {vendor.address.city}, {vendor.address.state} {vendor.address.zipCode}<br />
                  {vendor.address.country}
                </p>
              </div>

              {vendor.website && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Website</h3>
                  <a
                    href={vendor.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 text-sm text-blue-600 hover:text-blue-800"
                  >
                    {vendor.website}
                  </a>
                </div>
              )}

              {vendor.taxId && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Tax ID</h3>
                  <p className="mt-1 text-sm text-gray-900">{vendor.taxId}</p>
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium text-gray-700">Default Lead Time</h3>
                <p className="mt-1 text-sm text-gray-900">{vendor.defaultLeadTimeDays} days</p>
              </div>
            </div>
          </div>

          {/* Contacts */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Contacts</h2>
            <div className="space-y-4">
              {vendor.contacts.map((contact, index) => (
                <div key={contact.id} className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900">{contact.name}</h3>
                    {contact.isPrimary && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Primary
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{contact.role}</p>
                  <div className="mt-1 space-y-1">
                    <p className="text-sm text-gray-900">
                      <a href={`mailto:${contact.email}`} className="text-blue-600 hover:text-blue-800">
                        {contact.email}
                      </a>
                    </p>
                    {contact.phone && (
                      <p className="text-sm text-gray-900">
                        <a href={`tel:${contact.phone}`} className="text-blue-600 hover:text-blue-800">
                          {contact.phone}
                        </a>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Terms */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Terms</h2>
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-medium text-gray-700">Payment Terms</h3>
                <p className="mt-1 text-sm text-gray-900">{vendor.terms.paymentTerms}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700">Shipping Terms</h3>
                <p className="mt-1 text-sm text-gray-900">{vendor.terms.shippingTerms}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700">Currency</h3>
                <p className="mt-1 text-sm text-gray-900">{vendor.terms.currency}</p>
              </div>

              {vendor.terms.minimumOrderValue && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Minimum Order Value</h3>
                  <p className="mt-1 text-sm text-gray-900">
                    {vendor.terms.currency} {vendor.terms.minimumOrderValue.toFixed(2)}
                  </p>
                </div>
              )}

              {vendor.terms.discountTerms && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Discount Terms</h3>
                  <p className="mt-1 text-sm text-gray-900">{vendor.terms.discountTerms}</p>
                </div>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Metadata</h2>
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-medium text-gray-700">Created</h3>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(vendor.createdAt).toLocaleDateString()} at {new Date(vendor.createdAt).toLocaleTimeString()}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700">Last Updated</h3>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(vendor.updatedAt).toLocaleDateString()} at {new Date(vendor.updatedAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Material Pricing */}
        <div className="bg-white shadow rounded-lg p-6">
          <VendorMaterialPricing vendorId={vendor.id} vendorName={vendor.name} />
        </div>
      </div>
    </div>
  );
}
