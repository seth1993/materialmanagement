'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PhotoUpload } from '@/components/PhotoUpload';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { 
  Shipment, 
  MaterialReceivedForm, 
  MaterialCondition,
  DeliveryConfirmationForm 
} from '@/types/delivery';
import { 
  createDelivery,
  createShipmentEvent 
} from '@/lib/delivery-utils';
import { 
  uploadMultiplePhotos, 
  createDeliveryPhotos,
  UploadProgress 
} from '@/lib/storage-utils';

interface DeliveryConfirmationProps {
  shipment: Shipment;
  onComplete: () => void;
  onCancel: () => void;
}

export function DeliveryConfirmation({ 
  shipment, 
  onComplete, 
  onCancel 
}: DeliveryConfirmationProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<number, UploadProgress>>({});
  
  const [formData, setFormData] = useState<DeliveryConfirmationForm>({
    onSiteLocation: '',
    notes: '',
    materialsReceived: shipment.materials.map(material => ({
      materialId: material.id,
      actualQuantity: material.quantity,
      condition: 'good' as MaterialCondition,
      notes: '',
    })),
    photos: [],
  });

  const handleMaterialChange = (index: number, field: keyof MaterialReceivedForm, value: any) => {
    const updatedMaterials = [...formData.materialsReceived];
    updatedMaterials[index] = {
      ...updatedMaterials[index],
      [field]: value,
    };
    setFormData({
      ...formData,
      materialsReceived: updatedMaterials,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to confirm deliveries');
      return;
    }

    if (!formData.onSiteLocation.trim()) {
      setError('Please specify the on-site location');
      return;
    }

    if (formData.photos.length === 0) {
      setError('Please upload at least one photo of the delivery');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Generate temporary delivery ID for photo uploads
      const tempDeliveryId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Upload photos first
      const uploadResults = await uploadMultiplePhotos(
        formData.photos,
        tempDeliveryId,
        (fileIndex, progress) => {
          setUploadProgress(prev => ({
            ...prev,
            [fileIndex]: progress,
          }));
        }
      );

      // Create delivery photos
      const deliveryPhotos = createDeliveryPhotos(uploadResults);

      // Create delivery record
      const deliveryId = await createDelivery({
        shipmentId: shipment.id,
        actualDeliveryDate: new Date(),
        receivedBy: user.uid,
        receivedByName: user.displayName || user.email || 'Unknown User',
        onSiteLocation: formData.onSiteLocation.trim(),
        notes: formData.notes.trim(),
        photos: deliveryPhotos,
        materialsReceived: formData.materialsReceived.map(material => {
          const originalMaterial = shipment.materials.find(m => m.id === material.materialId);
          return {
            materialId: material.materialId,
            materialName: originalMaterial?.name || 'Unknown Material',
            expectedQuantity: originalMaterial?.quantity || 0,
            actualQuantity: material.actualQuantity,
            condition: material.condition,
            notes: material.notes,
          };
        }),
        status: 'confirmed',
      });

      // Create additional event for photos uploaded
      if (deliveryPhotos.length > 0) {
        await createShipmentEvent({
          shipmentId: shipment.id,
          deliveryId,
          eventType: 'photos_uploaded',
          userId: user.uid,
          userName: user.displayName || user.email || 'Unknown User',
          description: `${deliveryPhotos.length} photos uploaded for delivery confirmation`,
          metadata: {
            photoCount: deliveryPhotos.length,
            location: formData.onSiteLocation,
          },
        });
      }

      onComplete();
    } catch (err) {
      console.error('Error confirming delivery:', err);
      setError('Failed to confirm delivery. Please try again.');
    } finally {
      setLoading(false);
      setUploadProgress({});
    }
  };

  const getConditionColor = (condition: MaterialCondition): string => {
    const colors: Record<MaterialCondition, string> = {
      good: 'bg-green-100 text-green-800',
      damaged: 'bg-red-100 text-red-800',
      missing: 'bg-gray-100 text-gray-800',
      partial: 'bg-yellow-100 text-yellow-800',
    };
    return colors[condition];
  };

  const getConditionLabel = (condition: MaterialCondition): string => {
    const labels: Record<MaterialCondition, string> = {
      good: 'Good Condition',
      damaged: 'Damaged',
      missing: 'Missing',
      partial: 'Partial Delivery',
    };
    return labels[condition];
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Confirm Delivery
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {shipment.projectName} - {shipment.supplier}
              </p>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* On-Site Location */}
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
              On-Site Location *
            </label>
            <input
              type="text"
              id="location"
              value={formData.onSiteLocation}
              onChange={(e) => setFormData({ ...formData, onSiteLocation: e.target.value })}
              placeholder="e.g., Building A - Loading Dock, Warehouse Section 3"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={loading}
            />
          </div>

          {/* Materials Received */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Materials Received
            </h3>
            <div className="space-y-4">
              {formData.materialsReceived.map((material, index) => {
                const originalMaterial = shipment.materials.find(m => m.id === material.materialId);
                return (
                  <div key={material.materialId} className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* Material Info */}
                      <div className="md:col-span-1">
                        <h4 className="font-medium text-gray-900">
                          {originalMaterial?.name}
                        </h4>
                        <p className="text-sm text-gray-600">
                          Expected: {originalMaterial?.quantity} {originalMaterial?.unit || 'units'}
                        </p>
                      </div>

                      {/* Actual Quantity */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Actual Quantity
                        </label>
                        <input
                          type="number"
                          value={material.actualQuantity}
                          onChange={(e) => handleMaterialChange(index, 'actualQuantity', parseInt(e.target.value) || 0)}
                          min="0"
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={loading}
                        />
                      </div>

                      {/* Condition */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Condition
                        </label>
                        <select
                          value={material.condition}
                          onChange={(e) => handleMaterialChange(index, 'condition', e.target.value as MaterialCondition)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={loading}
                        >
                          <option value="good">Good Condition</option>
                          <option value="damaged">Damaged</option>
                          <option value="missing">Missing</option>
                          <option value="partial">Partial Delivery</option>
                        </select>
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Notes
                        </label>
                        <input
                          type="text"
                          value={material.notes}
                          onChange={(e) => handleMaterialChange(index, 'notes', e.target.value)}
                          placeholder="Optional notes"
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={loading}
                        />
                      </div>
                    </div>

                    {/* Condition Badge */}
                    <div className="mt-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getConditionColor(material.condition)}`}>
                        {getConditionLabel(material.condition)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Photo Upload */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Delivery Photos *
            </h3>
            <PhotoUpload
              photos={formData.photos}
              onPhotosChange={(photos) => setFormData({ ...formData, photos })}
              maxPhotos={10}
              disabled={loading}
            />
            
            {/* Upload Progress */}
            {Object.keys(uploadProgress).length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Upload Progress</h4>
                {Object.entries(uploadProgress).map(([fileIndex, progress]) => (
                  <div key={fileIndex} className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600 w-16">
                      Photo {parseInt(fileIndex) + 1}
                    </span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress.progress}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-12">
                      {Math.round(progress.progress)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* General Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes
            </label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Any additional notes about the delivery..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading && <LoadingSpinner size="sm" />}
              <span>{loading ? 'Confirming...' : 'Confirm Delivery'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
