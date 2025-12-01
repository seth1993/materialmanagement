'use client';

import { useState, useEffect } from 'react';
import { MaterialSelector } from '@/components/forms/MaterialSelector';
import {
  createMaterialLine,
  updateMaterialLine
} from '@/lib/materialGroupsService';
import {
  MaterialLine,
  MaterialLineFormData,
  UNIT_OPTIONS
} from '@/types/materialGroups';

interface MaterialLineFormProps {
  materialGroupId: string;
  editingLine?: MaterialLine | null;
  onSave: () => void;
  onCancel: () => void;
}

export const MaterialLineForm: React.FC<MaterialLineFormProps> = ({
  materialGroupId,
  editingLine,
  onSave,
  onCancel
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<MaterialLineFormData>({
    materialReference: '',
    quantity: 1,
    unit: 'each',
    notes: '',
  });

  // Initialize form data when editing
  useEffect(() => {
    if (editingLine) {
      setFormData({
        materialReference: editingLine.materialReference,
        quantity: editingLine.quantity,
        unit: editingLine.unit,
        notes: editingLine.notes,
      });
    } else {
      setFormData({
        materialReference: '',
        quantity: 1,
        unit: 'each',
        notes: '',
      });
    }
  }, [editingLine]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.materialReference || formData.quantity <= 0) return;

    setLoading(true);
    try {
      if (editingLine) {
        await updateMaterialLine(editingLine.id, formData);
      } else {
        await createMaterialLine(materialGroupId, formData);
      }
      onSave();
    } catch (error) {
      console.error('Error saving material line:', error);
      alert('Failed to save material line. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-semibold">
        {editingLine ? 'Edit Material Line' : 'Add Material Line'}
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Material Reference *
          </label>
          <MaterialSelector
            value={formData.materialReference}
            onChange={(value) => setFormData({ ...formData, materialReference: value })}
            placeholder="Select or enter material reference"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quantity *
          </label>
          <input
            type="number"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
            step="0.01"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Unit *
          </label>
          <select
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            {UNIT_OPTIONS.map(unit => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </select>
        </div>
        
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Optional notes about this material line"
          />
        </div>
      </div>
      
      <div className="flex space-x-3">
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : (editingLine ? 'Update Line' : 'Add Line')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};
