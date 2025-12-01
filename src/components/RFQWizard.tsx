'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import VendorSelector from '@/components/VendorSelector';
import { Material, Vendor, CreateRFQRequest, RFQLineItem } from '@/types/rfq';
import { RFQService } from '@/lib/rfq-utils';

interface RFQWizardProps {
  initialMaterialIds: string[];
  initialCategories: string[];
  userId: string;
}

enum WizardStep {
  MATERIALS = 'materials',
  VENDORS = 'vendors',
  DETAILS = 'details',
  REVIEW = 'review',
}

interface RFQFormData {
  title: string;
  description: string;
  deliveryDate: string;
  jobsite: string;
  jobsiteAddress: string;
  dueDate: string;
}

export default function RFQWizard({
  initialMaterialIds,
  initialCategories,
  userId,
}: RFQWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>(WizardStep.MATERIALS);
  const [loading, setLoading] = useState(false);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>(initialMaterialIds);
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<RFQFormData>({
    title: '',
    description: '',
    deliveryDate: '',
    jobsite: '',
    jobsiteAddress: '',
    dueDate: '',
  });

  // Fetch materials based on initial selection
  useEffect(() => {
    const fetchMaterials = async () => {
      if (!db || initialMaterialIds.length === 0) return;

      setLoading(true);
      try {
        const q = query(collection(db, 'materials'), where('userId', '==', userId));
        const querySnapshot = await getDocs(q);
        const allMaterials = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        })) as Material[];

        // Filter to only include initially selected materials
        const selectedMaterials = allMaterials.filter(material => 
          initialMaterialIds.includes(material.id)
        );

        setMaterials(selectedMaterials);

        // Generate default title from categories
        if (initialCategories.length > 0) {
          setFormData(prev => ({
            ...prev,
            title: `RFQ for ${initialCategories.join(', ')}`,
          }));
        }
      } catch (error) {
        console.error('Error fetching materials:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMaterials();
  }, [initialMaterialIds, initialCategories, userId]);

  const handleStepChange = (step: WizardStep) => {
    setCurrentStep(step);
  };

  const handleMaterialSelection = (materialIds: string[]) => {
    setSelectedMaterialIds(materialIds);
  };

  const handleVendorSelection = (vendorIds: string[]) => {
    setSelectedVendorIds(vendorIds);
  };

  const handleFormDataChange = (field: keyof RFQFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCreateRFQ = async () => {
    if (!formData.title || selectedMaterialIds.length === 0 || selectedVendorIds.length === 0) {
      alert('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      const request: CreateRFQRequest = {
        title: formData.title,
        description: formData.description || undefined,
        materialIds: selectedMaterialIds,
        vendorIds: selectedVendorIds,
        deliveryDate: formData.deliveryDate ? new Date(formData.deliveryDate) : undefined,
        jobsite: formData.jobsite || undefined,
        jobsiteAddress: formData.jobsiteAddress || undefined,
        dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
      };

      const rfqId = await RFQService.createRFQ(request, userId);
      
      // Redirect to RFQ management page
      window.location.href = `/rfq?created=${rfqId}`;
    } catch (error) {
      console.error('Error creating RFQ:', error);
      alert('Failed to create RFQ. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStepNumber = (step: WizardStep): number => {
    const steps = [WizardStep.MATERIALS, WizardStep.VENDORS, WizardStep.DETAILS, WizardStep.REVIEW];
    return steps.indexOf(step) + 1;
  };

  const isStepComplete = (step: WizardStep): boolean => {
    switch (step) {
      case WizardStep.MATERIALS:
        return selectedMaterialIds.length > 0;
      case WizardStep.VENDORS:
        return selectedVendorIds.length > 0;
      case WizardStep.DETAILS:
        return formData.title.trim() !== '';
      case WizardStep.REVIEW:
        return true;
      default:
        return false;
    }
  };

  const canProceedToNext = (): boolean => {
    return isStepComplete(currentStep);
  };

  const getNextStep = (): WizardStep | null => {
    switch (currentStep) {
      case WizardStep.MATERIALS:
        return WizardStep.VENDORS;
      case WizardStep.VENDORS:
        return WizardStep.DETAILS;
      case WizardStep.DETAILS:
        return WizardStep.REVIEW;
      default:
        return null;
    }
  };

  const getPreviousStep = (): WizardStep | null => {
    switch (currentStep) {
      case WizardStep.VENDORS:
        return WizardStep.MATERIALS;
      case WizardStep.DETAILS:
        return WizardStep.VENDORS;
      case WizardStep.REVIEW:
        return WizardStep.DETAILS;
      default:
        return null;
    }
  };

  if (loading && materials.length === 0) {
    return (
      <div className="text-center py-12">
        <LoadingSpinner className="mx-auto mb-4" />
        <p className="text-gray-600">Loading materials...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Step indicator */}
      <div className="px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          {[WizardStep.MATERIALS, WizardStep.VENDORS, WizardStep.DETAILS, WizardStep.REVIEW].map((step, index) => (
            <div key={step} className="flex items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  currentStep === step
                    ? 'bg-blue-600 text-white'
                    : isStepComplete(step)
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}
              >
                {isStepComplete(step) && currentStep !== step ? '✓' : getStepNumber(step)}
              </div>
              <span className={`ml-2 text-sm font-medium ${
                currentStep === step ? 'text-blue-600' : 'text-gray-500'
              }`}>
                {step.charAt(0).toUpperCase() + step.slice(1)}
              </span>
              {index < 3 && (
                <div className={`w-8 h-0.5 mx-4 ${
                  isStepComplete(step) ? 'bg-green-600' : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="p-6">
        {currentStep === WizardStep.MATERIALS && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Selected Materials</h2>
            <p className="text-gray-600 mb-6">
              Review the materials selected for this RFQ. You can modify the selection if needed.
            </p>
            <div className="space-y-3">
              {materials.map((material) => (
                <div
                  key={material.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <h3 className="font-medium">{material.name}</h3>
                    <p className="text-sm text-gray-600">
                      Category: {material.category} • Quantity: {material.quantity}
                      {material.unit && ` ${material.unit}`}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedMaterialIds.includes(material.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedMaterialIds(prev => [...prev, material.id]);
                      } else {
                        setSelectedMaterialIds(prev => prev.filter(id => id !== material.id));
                      }
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {currentStep === WizardStep.VENDORS && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Select Vendors</h2>
            <p className="text-gray-600 mb-6">
              Choose which vendors should receive this RFQ.
            </p>
            <VendorSelector
              userId={userId}
              selectedVendorIds={selectedVendorIds}
              onVendorSelection={handleVendorSelection}
            />
          </div>
        )}

        {currentStep === WizardStep.DETAILS && (
          <div>
            <h2 className="text-xl font-semibold mb-4">RFQ Details</h2>
            <p className="text-gray-600 mb-6">
              Provide additional details for your RFQ.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  RFQ Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleFormDataChange('title', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter RFQ title"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleFormDataChange('description', e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Additional details or requirements"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Date
                  </label>
                  <input
                    type="date"
                    value={formData.deliveryDate}
                    onChange={(e) => handleFormDataChange('deliveryDate', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Response Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => handleFormDataChange('dueDate', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jobsite
                </label>
                <input
                  type="text"
                  value={formData.jobsite}
                  onChange={(e) => handleFormDataChange('jobsite', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Project or jobsite name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jobsite Address
                </label>
                <input
                  type="text"
                  value={formData.jobsiteAddress}
                  onChange={(e) => handleFormDataChange('jobsiteAddress', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Delivery address"
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === WizardStep.REVIEW && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Review RFQ</h2>
            <p className="text-gray-600 mb-6">
              Review your RFQ details before creating.
            </p>
            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">RFQ Information</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p><strong>Title:</strong> {formData.title}</p>
                  {formData.description && <p><strong>Description:</strong> {formData.description}</p>}
                  {formData.deliveryDate && <p><strong>Delivery Date:</strong> {new Date(formData.deliveryDate).toLocaleDateString()}</p>}
                  {formData.dueDate && <p><strong>Response Due:</strong> {new Date(formData.dueDate).toLocaleDateString()}</p>}
                  {formData.jobsite && <p><strong>Jobsite:</strong> {formData.jobsite}</p>}
                  {formData.jobsiteAddress && <p><strong>Address:</strong> {formData.jobsiteAddress}</p>}
                </div>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Materials ({selectedMaterialIds.length})</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  {materials.filter(m => selectedMaterialIds.includes(m.id)).map(material => (
                    <p key={material.id}>• {material.name} (Qty: {material.quantity})</p>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Vendors ({selectedVendorIds.length})</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p>{selectedVendorIds.length} vendor{selectedVendorIds.length !== 1 ? 's' : ''} selected</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="px-6 py-4 border-t flex justify-between">
        <button
          onClick={() => {
            const prevStep = getPreviousStep();
            if (prevStep) {
              setCurrentStep(prevStep);
            } else {
              window.location.href = '/sourcing';
            }
          }}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 focus:outline-none"
        >
          {getPreviousStep() ? 'Previous' : 'Back to Sourcing'}
        </button>

        <div className="space-x-3">
          {currentStep === WizardStep.REVIEW ? (
            <button
              onClick={handleCreateRFQ}
              disabled={loading}
              className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              {loading ? 'Creating...' : 'Create RFQ'}
            </button>
          ) : (
            <button
              onClick={() => {
                const nextStep = getNextStep();
                if (nextStep) {
                  setCurrentStep(nextStep);
                }
              }}
              disabled={!canProceedToNext()}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
