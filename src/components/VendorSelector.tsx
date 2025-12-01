'use client';

import { useState, useEffect } from 'react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Vendor } from '@/types/rfq';
import { VendorService } from '@/lib/rfq-utils';

interface VendorSelectorProps {
  userId: string;
  selectedVendorIds: string[];
  onVendorSelection: (vendorIds: string[]) => void;
}

export default function VendorSelector({
  userId,
  selectedVendorIds,
  onVendorSelection,
}: VendorSelectorProps) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newVendor, setNewVendor] = useState({
    name: '',
    email: '',
    phone: '',
    contactPerson: '',
    specialties: '',
  });

  useEffect(() => {
    fetchVendors();
  }, [userId]);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const vendorList = await VendorService.getUserVendors(userId);
      setVendors(vendorList);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVendorToggle = (vendorId: string) => {
    const isSelected = selectedVendorIds.includes(vendorId);
    if (isSelected) {
      onVendorSelection(selectedVendorIds.filter(id => id !== vendorId));
    } else {
      onVendorSelection([...selectedVendorIds, vendorId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedVendorIds.length === vendors.length) {
      onVendorSelection([]);
    } else {
      onVendorSelection(vendors.map(v => v.id));
    }
  };

  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendor.name || !newVendor.email) return;

    setLoading(true);
    try {
      const specialtiesArray = newVendor.specialties
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      await VendorService.createVendor({
        name: newVendor.name,
        email: newVendor.email,
        phone: newVendor.phone || undefined,
        contactPerson: newVendor.contactPerson || undefined,
        specialties: specialtiesArray,
        userId,
      }, userId);

      setNewVendor({
        name: '',
        email: '',
        phone: '',
        contactPerson: '',
        specialties: '',
      });
      setShowAddForm(false);
      await fetchVendors();
    } catch (error) {
      console.error('Error adding vendor:', error);
      alert('Failed to add vendor. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && vendors.length === 0) {
    return (
      <div className="text-center py-8">
        <LoadingSpinner className="mx-auto mb-4" />
        <p className="text-gray-600">Loading vendors...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Available Vendors</h3>
          <p className="text-sm text-gray-600">
            {selectedVendorIds.length} of {vendors.length} vendors selected
          </p>
        </div>
        <div className="space-x-2">
          {vendors.length > 0 && (
            <button
              onClick={handleSelectAll}
              className="text-sm text-blue-600 hover:text-blue-800 focus:outline-none"
            >
              {selectedVendorIds.length === vendors.length ? 'Deselect All' : 'Select All'}
            </button>
          )}
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Add Vendor
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-gray-50 p-4 rounded-lg border">
          <h4 className="font-medium text-gray-900 mb-3">Add New Vendor</h4>
          <form onSubmit={handleAddVendor} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Vendor Name *"
                value={newVendor.name}
                onChange={(e) => setNewVendor(prev => ({ ...prev, name: e.target.value }))}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <input
                type="email"
                placeholder="Email *"
                value={newVendor.email}
                onChange={(e) => setNewVendor(prev => ({ ...prev, email: e.target.value }))}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <input
                type="tel"
                placeholder="Phone"
                value={newVendor.phone}
                onChange={(e) => setNewVendor(prev => ({ ...prev, phone: e.target.value }))}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Contact Person"
                value={newVendor.contactPerson}
                onChange={(e) => setNewVendor(prev => ({ ...prev, contactPerson: e.target.value }))}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <input
              type="text"
              placeholder="Specialties (comma-separated)"
              value={newVendor.specialties}
              onChange={(e) => setNewVendor(prev => ({ ...prev, specialties: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex space-x-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                {loading ? 'Adding...' : 'Add Vendor'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {vendors.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-600 mb-4">No vendors found. Add your first vendor to get started.</p>
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Add First Vendor
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {vendors.map((vendor) => {
            const isSelected = selectedVendorIds.includes(vendor.id);
            return (
              <div
                key={vendor.id}
                className={`border rounded-lg p-4 transition-all duration-200 ${
                  isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleVendorToggle(vendor.id)}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{vendor.name}</h4>
                      <p className="text-sm text-gray-600">{vendor.email}</p>
                      {vendor.phone && (
                        <p className="text-sm text-gray-600">{vendor.phone}</p>
                      )}
                      {vendor.contactPerson && (
                        <p className="text-sm text-gray-600">Contact: {vendor.contactPerson}</p>
                      )}
                      {vendor.specialties.length > 0 && (
                        <div className="mt-2">
                          <div className="flex flex-wrap gap-1">
                            {vendor.specialties.map((specialty, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                              >
                                {specialty}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {vendor.rating && (
                    <div className="text-sm text-gray-500">
                      ⭐ {vendor.rating.toFixed(1)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedVendorIds.length === 0 && vendors.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            Please select at least one vendor to proceed with the RFQ.
          </p>
        </div>
      )}
    </div>
  );
}
