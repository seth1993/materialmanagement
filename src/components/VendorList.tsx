'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Vendor } from '@/types/vendor';

export default function VendorList() {
  const { user, loading: authLoading } = useAuth();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch vendors from API
  const fetchVendors = async () => {
    if (!user) {
      setVendors([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/vendors', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch vendors');
      }

      const data = await response.json();
      setVendors(data.vendors);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      setError('Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  // Delete vendor
  const deleteVendor = async (vendorId: string) => {
    if (!user || !confirm('Are you sure you want to delete this vendor?')) {
      return;
    }

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/vendors/${vendorId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete vendor');
      }

      // Refresh the vendor list
      await fetchVendors();
    } catch (error) {
      console.error('Error deleting vendor:', error);
      setError('Failed to delete vendor');
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchVendors();
    }
  }, [user, authLoading]);

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
        <p className="text-gray-600">Please sign in to view vendors.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Vendors</h1>
        <a
          href="/vendors/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
        >
          Add New Vendor
        </a>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner className="mx-auto" />
        </div>
      ) : vendors.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">No vendors found.</p>
          <a
            href="/vendors/new"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
          >
            Add Your First Vendor
          </a>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {vendors.map((vendor) => (
              <li key={vendor.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            {vendor.name}
                          </h3>
                          <p className="text-sm text-gray-500">
                            Code: {vendor.code}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            vendor.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {vendor.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500">
                            📍 {vendor.address.city}, {vendor.address.state}, {vendor.address.country}
                          </p>
                          <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                            📞 {vendor.contacts.find(c => c.isPrimary)?.name || 'No primary contact'}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                          <p>
                            Lead Time: {vendor.defaultLeadTimeDays} days
                          </p>
                        </div>
                      </div>

                      {vendor.description && (
                        <p className="mt-2 text-sm text-gray-600">
                          {vendor.description}
                        </p>
                      )}

                      <div className="mt-3 flex items-center space-x-4">
                        <a
                          href={`/vendors/${vendor.id}`}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          View Details
                        </a>
                        <a
                          href={`/vendors/${vendor.id}/edit`}
                          className="text-green-600 hover:text-green-800 text-sm font-medium"
                        >
                          Edit
                        </a>
                        <button
                          onClick={() => deleteVendor(vendor.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
