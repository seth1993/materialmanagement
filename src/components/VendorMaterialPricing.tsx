'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { VendorMaterial, CreateVendorMaterialRequest } from '@/types/vendor';

interface VendorMaterialPricingProps {
  vendorId: string;
  vendorName: string;
}

export default function VendorMaterialPricing({ vendorId, vendorName }: VendorMaterialPricingProps) {
  const { user } = useAuth();
  const [vendorMaterials, setVendorMaterials] = useState<VendorMaterial[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [newMaterial, setNewMaterial] = useState<CreateVendorMaterialRequest>({
    materialId: '',
    vendorPartNumber: '',
    basePrice: 0,
    currency: 'USD',
    leadTimeDays: 7,
    minimumOrderQuantity: undefined,
  });

  // Fetch vendor materials
  const fetchVendorMaterials = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/vendors/${vendorId}/materials`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch vendor materials');
      }

      const data = await response.json();
      setVendorMaterials(data.vendorMaterials);
    } catch (error) {
      console.error('Error fetching vendor materials:', error);
      setError('Failed to load vendor materials');
    } finally {
      setLoading(false);
    }
  };

  // Add new vendor material
  const addVendorMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to add materials');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/vendors/${vendorId}/materials`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newMaterial),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add material');
      }

      // Reset form and refresh list
      setNewMaterial({
        materialId: '',
        vendorPartNumber: '',
        basePrice: 0,
        currency: 'USD',
        leadTimeDays: 7,
        minimumOrderQuantity: undefined,
      });
      setShowAddForm(false);
      await fetchVendorMaterials();
    } catch (error) {
      console.error('Error adding vendor material:', error);
      setError(error instanceof Error ? error.message : 'Failed to add material');
    } finally {
      setLoading(false);
    }
  };

  // Update vendor material
  const updateVendorMaterial = async (vendorMaterialId: string, updates: Partial<CreateVendorMaterialRequest>) => {
    if (!user) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/vendors/${vendorId}/materials`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          updates: [{ vendorMaterialId, data: updates }]
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update material');
      }

      await fetchVendorMaterials();
      setEditingId(null);
    } catch (error) {
      console.error('Error updating vendor material:', error);
      setError(error instanceof Error ? error.message : 'Failed to update material');
    }
  };

  // Delete vendor material
  const deleteVendorMaterial = async (vendorMaterialId: string) => {
    if (!user || !confirm('Are you sure you want to remove this material pricing?')) {
      return;
    }

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/vendors/${vendorId}/materials`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          updates: [{ vendorMaterialId, data: { isActive: false } }]
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete material');
      }

      await fetchVendorMaterials();
    } catch (error) {
      console.error('Error deleting vendor material:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete material');
    }
  };

  useEffect(() => {
    fetchVendorMaterials();
  }, [vendorId, user]);

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Please sign in to view vendor materials.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-gray-900">
          Material Pricing for {vendorName}
        </h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
        >
          {showAddForm ? 'Cancel' : 'Add Material'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Add Material Form */}
      {showAddForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Add New Material Pricing</h4>
          <form onSubmit={addVendorMaterial} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="materialId" className="block text-sm font-medium text-gray-700">
                  Material ID *
                </label>
                <input
                  type="text"
                  id="materialId"
                  required
                  value={newMaterial.materialId}
                  onChange={(e) => setNewMaterial(prev => ({ ...prev, materialId: e.target.value }))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter material ID"
                />
              </div>

              <div>
                <label htmlFor="vendorPartNumber" className="block text-sm font-medium text-gray-700">
                  Vendor Part Number
                </label>
                <input
                  type="text"
                  id="vendorPartNumber"
                  value={newMaterial.vendorPartNumber || ''}
                  onChange={(e) => setNewMaterial(prev => ({ ...prev, vendorPartNumber: e.target.value }))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Vendor's part number"
                />
              </div>

              <div>
                <label htmlFor="basePrice" className="block text-sm font-medium text-gray-700">
                  Base Price *
                </label>
                <input
                  type="number"
                  id="basePrice"
                  required
                  min="0"
                  step="0.01"
                  value={newMaterial.basePrice}
                  onChange={(e) => setNewMaterial(prev => ({ ...prev, basePrice: parseFloat(e.target.value) || 0 }))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="currency" className="block text-sm font-medium text-gray-700">
                  Currency *
                </label>
                <select
                  id="currency"
                  required
                  value={newMaterial.currency}
                  onChange={(e) => setNewMaterial(prev => ({ ...prev, currency: e.target.value }))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="CAD">CAD</option>
                  <option value="GBP">GBP</option>
                  <option value="JPY">JPY</option>
                </select>
              </div>

              <div>
                <label htmlFor="leadTimeDays" className="block text-sm font-medium text-gray-700">
                  Lead Time (Days) *
                </label>
                <input
                  type="number"
                  id="leadTimeDays"
                  required
                  min="0"
                  value={newMaterial.leadTimeDays}
                  onChange={(e) => setNewMaterial(prev => ({ ...prev, leadTimeDays: parseInt(e.target.value) || 0 }))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="minimumOrderQuantity" className="block text-sm font-medium text-gray-700">
                  Minimum Order Quantity
                </label>
                <input
                  type="number"
                  id="minimumOrderQuantity"
                  min="0"
                  value={newMaterial.minimumOrderQuantity || ''}
                  onChange={(e) => setNewMaterial(prev => ({ 
                    ...prev, 
                    minimumOrderQuantity: e.target.value ? parseInt(e.target.value) : undefined 
                  }))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading && <LoadingSpinner size="sm" className="mr-2" />}
                Add Material
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Materials List */}
      {loading && !showAddForm ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner className="mx-auto" />
        </div>
      ) : vendorMaterials.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">No materials found for this vendor.</p>
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
            >
              Add First Material
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {vendorMaterials.map((material) => (
              <li key={material.id}>
                <div className="px-4 py-4 sm:px-6">
                  {editingId === material.id ? (
                    <EditMaterialForm
                      material={material}
                      onSave={(updates) => updateVendorMaterial(material.id, updates)}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-lg font-medium text-gray-900">
                              {material.materialName}
                            </h4>
                            <p className="text-sm text-gray-500">
                              Material ID: {material.materialId}
                            </p>
                            {material.vendorPartNumber && (
                              <p className="text-sm text-gray-500">
                                Vendor Part: {material.vendorPartNumber}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold text-gray-900">
                              {material.currency} {material.basePrice.toFixed(2)}
                            </p>
                            <p className="text-sm text-gray-500">
                              Lead Time: {material.leadTimeDays} days
                            </p>
                            {material.minimumOrderQuantity && (
                              <p className="text-sm text-gray-500">
                                Min Order: {material.minimumOrderQuantity}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="mt-2 flex items-center text-sm text-gray-500">
                          <p>
                            Last updated: {new Date(material.lastUpdated).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="mt-3 flex items-center space-x-4">
                          <button
                            onClick={() => setEditingId(material.id)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteVendorMaterial(material.id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Edit Material Form Component
interface EditMaterialFormProps {
  material: VendorMaterial;
  onSave: (updates: Partial<CreateVendorMaterialRequest>) => void;
  onCancel: () => void;
}

function EditMaterialForm({ material, onSave, onCancel }: EditMaterialFormProps) {
  const [formData, setFormData] = useState({
    vendorPartNumber: material.vendorPartNumber || '',
    basePrice: material.basePrice,
    currency: material.currency,
    leadTimeDays: material.leadTimeDays,
    minimumOrderQuantity: material.minimumOrderQuantity || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      vendorPartNumber: formData.vendorPartNumber,
      basePrice: formData.basePrice,
      currency: formData.currency,
      leadTimeDays: formData.leadTimeDays,
      minimumOrderQuantity: formData.minimumOrderQuantity ? parseInt(formData.minimumOrderQuantity.toString()) : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Vendor Part Number
          </label>
          <input
            type="text"
            value={formData.vendorPartNumber}
            onChange={(e) => setFormData(prev => ({ ...prev, vendorPartNumber: e.target.value }))}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Base Price *
          </label>
          <input
            type="number"
            required
            min="0"
            step="0.01"
            value={formData.basePrice}
            onChange={(e) => setFormData(prev => ({ ...prev, basePrice: parseFloat(e.target.value) || 0 }))}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Currency *
          </label>
          <select
            required
            value={formData.currency}
            onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="CAD">CAD</option>
            <option value="GBP">GBP</option>
            <option value="JPY">JPY</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Lead Time (Days) *
          </label>
          <input
            type="number"
            required
            min="0"
            value={formData.leadTimeDays}
            onChange={(e) => setFormData(prev => ({ ...prev, leadTimeDays: parseInt(e.target.value) || 0 }))}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Minimum Order Quantity
          </label>
          <input
            type="number"
            min="0"
            value={formData.minimumOrderQuantity}
            onChange={(e) => setFormData(prev => ({ ...prev, minimumOrderQuantity: e.target.value }))}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="bg-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700"
        >
          Save Changes
        </button>
      </div>
    </form>
  );
}
