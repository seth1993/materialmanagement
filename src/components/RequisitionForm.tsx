'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { 
  Requisition, 
  RequisitionLine, 
  RequisitionStatus, 
  Priority,
  Vendor 
} from '@/types/procurement';
import { createRequisition } from '@/lib/procurement-service';
import { getActiveVendors } from '@/lib/vendor-service';

interface RequisitionFormProps {
  onSuccess?: (requisitionId: string) => void;
  onCancel?: () => void;
}

export default function RequisitionForm({ onSuccess, onCancel }: RequisitionFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: Priority.MEDIUM,
    requiredDate: '',
    departmentCode: '',
    projectCode: '',
    budgetCode: ''
  });
  
  const [lines, setLines] = useState<Omit<RequisitionLine, 'id' | 'convertedQuantity' | 'remainingQuantity' | 'isFullyConverted'>[]>([
    {
      materialName: '',
      description: '',
      quantity: 1,
      unitPrice: undefined,
      estimatedTotal: undefined,
      vendorId: undefined,
      urgencyDate: undefined,
      notes: ''
    }
  ]);

  // Fetch vendors on component mount
  useEffect(() => {
    const fetchVendors = async () => {
      if (user) {
        try {
          const vendorList = await getActiveVendors(user.uid);
          setVendors(vendorList);
        } catch (error) {
          console.error('Error fetching vendors:', error);
        }
      }
    };

    fetchVendors();
  }, [user]);

  const addLine = () => {
    setLines([...lines, {
      materialName: '',
      description: '',
      quantity: 1,
      unitPrice: undefined,
      estimatedTotal: undefined,
      vendorId: undefined,
      urgencyDate: undefined,
      notes: ''
    }]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const updateLine = (index: number, field: string, value: any) => {
    const updatedLines = [...lines];
    updatedLines[index] = { ...updatedLines[index], [field]: value };
    
    // Auto-calculate estimated total if quantity and unit price are provided
    if (field === 'quantity' || field === 'unitPrice') {
      const line = updatedLines[index];
      if (line.quantity && line.unitPrice) {
        line.estimatedTotal = line.quantity * line.unitPrice;
      }
    }
    
    setLines(updatedLines);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      alert('You must be logged in to create a requisition');
      return;
    }

    // Validate form
    if (!formData.title.trim()) {
      alert('Title is required');
      return;
    }

    if (lines.some(line => !line.materialName.trim())) {
      alert('All lines must have a material name');
      return;
    }

    if (lines.some(line => line.quantity <= 0)) {
      alert('All lines must have a positive quantity');
      return;
    }

    setLoading(true);

    try {
      // Process lines to add required fields
      const processedLines: RequisitionLine[] = lines.map(line => ({
        ...line,
        id: crypto.randomUUID(),
        convertedQuantity: 0,
        remainingQuantity: line.quantity,
        isFullyConverted: false,
        urgencyDate: line.urgencyDate ? new Date(line.urgencyDate) : undefined
      }));

      const requisitionData: Omit<Requisition, 'id' | 'requisitionNumber' | 'createdAt' | 'updatedAt'> = {
        title: formData.title,
        description: formData.description || undefined,
        status: RequisitionStatus.DRAFT,
        priority: formData.priority,
        requestedBy: user.uid,
        requestedByName: user.displayName || user.email || 'Unknown User',
        lines: processedLines,
        totalEstimatedValue: processedLines.reduce((sum, line) => sum + (line.estimatedTotal || 0), 0),
        departmentCode: formData.departmentCode || undefined,
        projectCode: formData.projectCode || undefined,
        budgetCode: formData.budgetCode || undefined,
        requiredDate: formData.requiredDate ? new Date(formData.requiredDate) : undefined,
        userId: user.uid
      };

      const requisitionId = await createRequisition(requisitionData, user.uid);
      
      if (onSuccess) {
        onSuccess(requisitionId);
      } else {
        alert('Requisition created successfully!');
        // Reset form
        setFormData({
          title: '',
          description: '',
          priority: Priority.MEDIUM,
          requiredDate: '',
          departmentCode: '',
          projectCode: '',
          budgetCode: ''
        });
        setLines([{
          materialName: '',
          description: '',
          quantity: 1,
          unitPrice: undefined,
          estimatedTotal: undefined,
          vendorId: undefined,
          urgencyDate: undefined,
          notes: ''
        }]);
      }
    } catch (error) {
      console.error('Error creating requisition:', error);
      alert('Failed to create requisition. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <p className="text-gray-600">Please sign in to create a requisition.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Create New Requisition</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as Priority })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={Priority.LOW}>Low</option>
                <option value={Priority.MEDIUM}>Medium</option>
                <option value={Priority.HIGH}>High</option>
                <option value={Priority.URGENT}>Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Additional Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Required Date
              </label>
              <input
                type="date"
                value={formData.requiredDate}
                onChange={(e) => setFormData({ ...formData, requiredDate: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department Code
              </label>
              <input
                type="text"
                value={formData.departmentCode}
                onChange={(e) => setFormData({ ...formData, departmentCode: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Code
              </label>
              <input
                type="text"
                value={formData.projectCode}
                onChange={(e) => setFormData({ ...formData, projectCode: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Requisition Lines */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Requisition Lines</h3>
              <button
                type="button"
                onClick={addLine}
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Add Line
              </button>
            </div>

            <div className="space-y-4">
              {lines.map((line, index) => (
                <div key={index} className="border border-gray-200 rounded-md p-4">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-medium text-gray-700">Line {index + 1}</h4>
                    {lines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLine(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Material Name *
                      </label>
                      <input
                        type="text"
                        value={line.materialName}
                        onChange={(e) => updateLine(index, 'materialName', e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={line.quantity}
                        onChange={(e) => updateLine(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unit Price
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={line.unitPrice || ''}
                        onChange={(e) => updateLine(index, 'unitPrice', parseFloat(e.target.value) || undefined)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Vendor
                      </label>
                      <select
                        value={line.vendorId || ''}
                        onChange={(e) => updateLine(index, 'vendorId', e.target.value || undefined)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Vendor</option>
                        {vendors.map(vendor => (
                          <option key={vendor.id} value={vendor.id}>
                            {vendor.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Estimated Total
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={line.estimatedTotal || ''}
                        onChange={(e) => updateLine(index, 'estimatedTotal', parseFloat(e.target.value) || undefined)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        readOnly={!!(line.quantity && line.unitPrice)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Urgency Date
                      </label>
                      <input
                        type="date"
                        value={line.urgencyDate || ''}
                        onChange={(e) => updateLine(index, 'urgencyDate', e.target.value || undefined)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={line.description || ''}
                      onChange={(e) => updateLine(index, 'description', e.target.value || undefined)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <input
                      type="text"
                      value={line.notes || ''}
                      onChange={(e) => updateLine(index, 'notes', e.target.value || undefined)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
            >
              {loading && <LoadingSpinner size="sm" className="mr-2" />}
              {loading ? 'Creating...' : 'Create Requisition'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
