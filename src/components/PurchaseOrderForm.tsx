'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Material, CreatePurchaseOrderForm, CreatePOLineItemForm } from '@/types/delivery';
import { generateLineItemId, validatePONumber, formatPONumber } from '@/lib/delivery-utils';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface PurchaseOrderFormProps {
  onSubmit: (formData: CreatePurchaseOrderForm) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function PurchaseOrderForm({ onSubmit, onCancel, loading = false }: PurchaseOrderFormProps) {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(true);
  
  const [formData, setFormData] = useState<CreatePurchaseOrderForm>({
    poNumber: '',
    supplierName: '',
    jobsiteName: '',
    expectedDeliveryDate: new Date(),
    lineItems: [],
    notes: ''
  });

  const [newLineItem, setNewLineItem] = useState<CreatePOLineItemForm>({
    materialId: '',
    materialName: '',
    expectedQuantity: 0,
    unitPrice: 0,
    notes: ''
  });

  const [errors, setErrors] = useState<string[]>([]);

  // Fetch available materials
  useEffect(() => {
    const fetchMaterials = async () => {
      if (!user || !db) {
        setMaterials([]);
        setLoadingMaterials(false);
        return;
      }

      try {
        const q = query(collection(db, 'materials'), where('userId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        const materialsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        })) as Material[];
        setMaterials(materialsData);
      } catch (error) {
        console.error('Error fetching materials:', error);
      } finally {
        setLoadingMaterials(false);
      }
    };

    fetchMaterials();
  }, [user]);

  const handleMaterialSelect = (materialId: string) => {
    const selectedMaterial = materials.find(m => m.id === materialId);
    if (selectedMaterial) {
      setNewLineItem({
        ...newLineItem,
        materialId: selectedMaterial.id,
        materialName: selectedMaterial.name
      });
    }
  };

  const addLineItem = () => {
    const lineItemErrors: string[] = [];
    
    if (!newLineItem.materialId) {
      lineItemErrors.push('Please select a material');
    }
    
    if (newLineItem.expectedQuantity <= 0) {
      lineItemErrors.push('Expected quantity must be greater than 0');
    }

    // Check if material is already in line items
    if (formData.lineItems.some(item => item.materialId === newLineItem.materialId)) {
      lineItemErrors.push('Material is already added to this PO');
    }

    if (lineItemErrors.length > 0) {
      setErrors(lineItemErrors);
      return;
    }

    setFormData({
      ...formData,
      lineItems: [...formData.lineItems, { ...newLineItem, id: generateLineItemId() }]
    });

    // Reset new line item form
    setNewLineItem({
      materialId: '',
      materialName: '',
      expectedQuantity: 0,
      unitPrice: 0,
      notes: ''
    });
    setErrors([]);
  };

  const removeLineItem = (index: number) => {
    setFormData({
      ...formData,
      lineItems: formData.lineItems.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formErrors: string[] = [];
    
    if (!validatePONumber(formData.poNumber)) {
      formErrors.push('Please enter a valid PO number');
    }
    
    if (!formData.supplierName.trim()) {
      formErrors.push('Please enter supplier name');
    }
    
    if (!formData.jobsiteName.trim()) {
      formErrors.push('Please enter jobsite name');
    }
    
    if (formData.lineItems.length === 0) {
      formErrors.push('Please add at least one line item');
    }

    if (formErrors.length > 0) {
      setErrors(formErrors);
      return;
    }

    try {
      await onSubmit({
        ...formData,
        poNumber: formatPONumber(formData.poNumber)
      });
    } catch (error) {
      console.error('Error submitting PO:', error);
      setErrors(['Failed to create purchase order. Please try again.']);
    }
  };

  if (loadingMaterials) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center justify-center">
          <LoadingSpinner className="mr-2" />
          <span>Loading materials...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-6">Create Purchase Order</h2>
      
      {errors.length > 0 && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <ul className="list-disc list-inside text-red-700">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic PO Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PO Number *
            </label>
            <input
              type="text"
              value={formData.poNumber}
              onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="PO-2024-001"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expected Delivery Date *
            </label>
            <input
              type="date"
              value={formData.expectedDeliveryDate.toISOString().split('T')[0]}
              onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: new Date(e.target.value) })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Supplier Name *
            </label>
            <input
              type="text"
              value={formData.supplierName}
              onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ABC Supply Co."
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Jobsite Name *
            </label>
            <input
              type="text"
              value={formData.jobsiteName}
              onChange={(e) => setFormData({ ...formData, jobsiteName: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Main Street Project"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Additional notes..."
          />
        </div>

        {/* Line Items Section */}
        <div>
          <h3 className="text-lg font-medium mb-4">Line Items</h3>
          
          {/* Add Line Item Form */}
          <div className="bg-gray-50 p-4 rounded-md mb-4">
            <h4 className="text-md font-medium mb-3">Add Line Item</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Material
                </label>
                <select
                  value={newLineItem.materialId}
                  onChange={(e) => handleMaterialSelect(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select material...</option>
                  {materials.map((material) => (
                    <option key={material.id} value={material.id}>
                      {material.name} ({material.category})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expected Quantity
                </label>
                <input
                  type="number"
                  value={newLineItem.expectedQuantity}
                  onChange={(e) => setNewLineItem({ ...newLineItem, expectedQuantity: parseInt(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit Price (optional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newLineItem.unitPrice}
                  onChange={(e) => setNewLineItem({ ...newLineItem, unitPrice: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>
              
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={addLineItem}
                  className="w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Add Item
                </button>
              </div>
            </div>
            
            {newLineItem.materialId && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={newLineItem.notes}
                  onChange={(e) => setNewLineItem({ ...newLineItem, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Additional notes for this item..."
                />
              </div>
            )}
          </div>

          {/* Line Items List */}
          {formData.lineItems.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-200 rounded-md">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Material</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Quantity</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Unit Price</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Notes</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.lineItems.map((item, index) => (
                    <tr key={index} className="border-t border-gray-200">
                      <td className="px-4 py-2 text-sm">{item.materialName}</td>
                      <td className="px-4 py-2 text-sm">{item.expectedQuantity}</td>
                      <td className="px-4 py-2 text-sm">
                        {item.unitPrice ? `$${item.unitPrice.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-4 py-2 text-sm">{item.notes || '-'}</td>
                      <td className="px-4 py-2 text-sm">
                        <button
                          type="button"
                          onClick={() => removeLineItem(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || formData.lineItems.length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {loading && <LoadingSpinner size="sm" className="mr-2" />}
            {loading ? 'Creating...' : 'Create Purchase Order'}
          </button>
        </div>
      </form>
    </div>
  );
}
