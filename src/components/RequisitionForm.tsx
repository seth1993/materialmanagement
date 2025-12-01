'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { MaterialPicker } from '@/components/MaterialPicker';
import { PhotoUploader } from '@/components/PhotoUploader';
import { DatePicker } from '@/components/ui/DatePicker';
import { LocationSelector } from '@/components/ui/LocationSelector';
import { Project, RequisitionFormData, RequisitionFormItem, Material, RequisitionPriority } from '@/types';

interface RequisitionFormProps {
  project: Project;
  onSubmitted: (requisitionId: string) => void;
}

export const RequisitionForm: React.FC<RequisitionFormProps> = ({ project, onSubmitted }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showMaterialPicker, setShowMaterialPicker] = useState(false);
  
  const [formData, setFormData] = useState<RequisitionFormData>({
    title: '',
    description: '',
    items: [],
    needByDate: '',
    dropLocation: '',
    priority: 'medium',
    notes: '',
    attachments: []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.title.trim()) {
          newErrors.title = 'Title is required';
        }
        if (!formData.needByDate) {
          newErrors.needByDate = 'Need by date is required';
        }
        if (!formData.dropLocation.trim()) {
          newErrors.dropLocation = 'Drop location is required';
        }
        break;
      case 2:
        if (formData.items.length === 0) {
          newErrors.items = 'At least one material item is required';
        }
        formData.items.forEach((item, index) => {
          if (item.requestedQuantity <= 0) {
            newErrors[`quantity_${index}`] = 'Quantity must be greater than 0';
          }
        });
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleAddMaterial = (material: Material, quantity: number, source: 'project_group' | 'master_catalog') => {
    const newItem: RequisitionFormItem = {
      materialId: material.id,
      material,
      requestedQuantity: quantity,
      notes: '',
      source,
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
    setShowMaterialPicker(false);
  };

  const handleRemoveItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleUpdateItemQuantity = (index: number, quantity: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, requestedQuantity: quantity } : item
      )
    }));
  };

  const handleUpdateItemNotes = (index: number, notes: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, notes } : item
      )
    }));
  };

  const handleSubmit = async (isDraft: boolean = false) => {
    if (!isDraft && !validateStep(2)) {
      return;
    }

    if (!user || !db) {
      alert('Authentication required');
      return;
    }

    setLoading(true);
    try {
      const requisitionData = {
        projectId: project.id,
        requestedBy: user.uid,
        title: formData.title,
        description: formData.description,
        items: formData.items.map(item => ({
          materialId: item.materialId,
          requestedQuantity: item.requestedQuantity,
          notes: item.notes,
          source: item.source,
          projectMaterialGroupId: item.projectMaterialGroupId,
        })),
        status: isDraft ? 'draft' : 'submitted',
        priority: formData.priority,
        needByDate: new Date(formData.needByDate),
        dropLocation: formData.dropLocation,
        attachments: [], // Will be populated after file uploads
        notes: formData.notes,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: user.uid,
      };

      const docRef = await addDoc(collection(db, 'requisitions'), requisitionData);
      
      // TODO: Handle file uploads to Firebase Storage
      // For now, we'll just submit without attachments
      
      onSubmitted(docRef.id);
    } catch (error) {
      console.error('Error submitting requisition:', error);
      alert('Failed to submit requisition. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-6">
      <div className="flex items-center space-x-4">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center">
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
              ${currentStep >= step 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-600'
              }
            `}>
              {step}
            </div>
            {step < 3 && (
              <div className={`
                w-8 h-0.5 mx-2
                ${currentStep > step ? 'bg-blue-600' : 'bg-gray-200'}
              `} />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
          Requisition Title *
        </label>
        <input
          type="text"
          id="title"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          className={`w-full px-3 py-3 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.title ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="e.g., Concrete supplies for foundation"
        />
        {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          id="description"
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          className="w-full px-3 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Additional details about this requisition..."
        />
      </div>

      <div>
        <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
          Priority
        </label>
        <select
          id="priority"
          value={formData.priority}
          onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as RequisitionPriority }))}
          className="w-full px-3 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>

      <DatePicker
        label="Need By Date *"
        value={formData.needByDate}
        onChange={(date) => setFormData(prev => ({ ...prev, needByDate: date }))}
        error={errors.needByDate}
        required
      />

      <LocationSelector
        label="Drop Location *"
        value={formData.dropLocation}
        onChange={(location) => setFormData(prev => ({ ...prev, dropLocation: location }))}
        projectId={project.id}
        error={errors.dropLocation}
        required
      />
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Materials</h3>
        <button
          type="button"
          onClick={() => setShowMaterialPicker(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Material
        </button>
      </div>

      {errors.items && <p className="text-sm text-red-600">{errors.items}</p>}

      {formData.items.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No materials added yet</p>
          <p className="text-sm text-gray-500 mt-1">Click "Add Material" to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {formData.items.map((item, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{item.material?.name}</h4>
                  <p className="text-sm text-gray-600">{item.material?.category}</p>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                    {item.source === 'project_group' ? 'Project Group' : 'Master Catalog'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity ({item.material?.unit})
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={item.requestedQuantity}
                    onChange={(e) => handleUpdateItemQuantity(index, parseInt(e.target.value) || 0)}
                    className={`w-full px-3 py-2 border rounded-md text-base focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors[`quantity_${index}`] ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors[`quantity_${index}`] && (
                    <p className="mt-1 text-sm text-red-600">{errors[`quantity_${index}`]}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <input
                    type="text"
                    value={item.notes}
                    onChange={(e) => handleUpdateItemNotes(index, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional notes..."
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showMaterialPicker && (
        <MaterialPicker
          projectId={project.id}
          onSelect={handleAddMaterial}
          onClose={() => setShowMaterialPicker(false)}
        />
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
          Additional Notes
        </label>
        <textarea
          id="notes"
          rows={4}
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          className="w-full px-3 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Any additional information or special instructions..."
        />
      </div>

      <PhotoUploader
        onPhotosChange={(files) => setFormData(prev => ({ ...prev, attachments: files }))}
        maxFiles={5}
      />

      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Requisition Summary</h4>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-600">Title:</dt>
            <dd className="text-gray-900">{formData.title}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Priority:</dt>
            <dd className="text-gray-900 capitalize">{formData.priority}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Need By:</dt>
            <dd className="text-gray-900">{formData.needByDate ? new Date(formData.needByDate).toLocaleDateString() : 'Not set'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Drop Location:</dt>
            <dd className="text-gray-900">{formData.dropLocation}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Materials:</dt>
            <dd className="text-gray-900">{formData.items.length} items</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Photos:</dt>
            <dd className="text-gray-900">{formData.attachments.length} attached</dd>
          </div>
        </dl>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-4 sm:p-6">
        {renderStepIndicator()}

        <div className="mb-8">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={handlePrevious}
              className="w-full sm:w-auto px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              Previous
            </button>
          )}

          <div className="flex-1" />

          {currentStep < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Next
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={loading}
                className="w-full sm:w-auto px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50"
              >
                {loading ? <LoadingSpinner size="sm" className="mr-2" /> : null}
                Save as Draft
              </button>
              <button
                type="button"
                onClick={() => handleSubmit(false)}
                disabled={loading}
                className="w-full sm:w-auto px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
              >
                {loading ? <LoadingSpinner size="sm" className="mr-2" /> : null}
                Submit Requisition
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
