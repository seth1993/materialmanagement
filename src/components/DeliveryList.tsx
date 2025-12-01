'use client';

import { useState } from 'react';
import { Shipment } from '@/types/delivery';
import { DeliveryConfirmation } from '@/components/DeliveryConfirmation';
import { 
  getStatusColor, 
  getStatusLabel, 
  isDeliveryOverdue, 
  formatDeliveryDate 
} from '@/lib/delivery-utils';

interface DeliveryListProps {
  deliveries: Shipment[];
  onDeliveryConfirmed: () => void;
}

export function DeliveryList({ deliveries, onDeliveryConfirmed }: DeliveryListProps) {
  const [selectedDelivery, setSelectedDelivery] = useState<Shipment | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleConfirmDelivery = (delivery: Shipment) => {
    setSelectedDelivery(delivery);
    setShowConfirmation(true);
  };

  const handleConfirmationComplete = () => {
    setShowConfirmation(false);
    setSelectedDelivery(null);
    onDeliveryConfirmed();
  };

  const handleConfirmationCancel = () => {
    setShowConfirmation(false);
    setSelectedDelivery(null);
  };

  if (showConfirmation && selectedDelivery) {
    return (
      <DeliveryConfirmation
        shipment={selectedDelivery}
        onComplete={handleConfirmationComplete}
        onCancel={handleConfirmationCancel}
      />
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        Today's Deliveries ({deliveries.length})
      </h2>
      
      {deliveries.map((delivery) => (
        <DeliveryCard
          key={delivery.id}
          delivery={delivery}
          onConfirm={() => handleConfirmDelivery(delivery)}
        />
      ))}
    </div>
  );
}

interface DeliveryCardProps {
  delivery: Shipment;
  onConfirm: () => void;
}

function DeliveryCard({ delivery, onConfirm }: DeliveryCardProps) {
  const isOverdue = isDeliveryOverdue(delivery.expectedDeliveryDate);
  const canConfirm = delivery.status === 'out_for_delivery' || delivery.status === 'delivered';
  const isConfirmed = delivery.status === 'delivered_confirmed';

  return (
    <div className={`bg-white rounded-lg shadow-md border-l-4 ${
      isOverdue && !isConfirmed ? 'border-red-500' : 
      isConfirmed ? 'border-green-500' : 
      'border-blue-500'
    }`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {delivery.projectName}
            </h3>
            <p className="text-sm text-gray-600">
              Supplier: {delivery.supplier}
            </p>
            {delivery.trackingNumber && (
              <p className="text-sm text-gray-600">
                Tracking: {delivery.trackingNumber}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end space-y-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(delivery.status)}`}>
              {getStatusLabel(delivery.status)}
            </span>
            <span className="text-sm text-gray-600">
              {formatDeliveryDate(delivery.expectedDeliveryDate)}
            </span>
            {isOverdue && !isConfirmed && (
              <span className="text-xs text-red-600 font-medium">
                Overdue
              </span>
            )}
          </div>
        </div>

        {/* Materials List */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Expected Materials ({delivery.materials.length} items)
          </h4>
          <div className="bg-gray-50 rounded-md p-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {delivery.materials.slice(0, 6).map((material, index) => (
                <div key={material.id} className="text-sm">
                  <span className="font-medium">{material.name}</span>
                  <span className="text-gray-600 ml-2">
                    {material.quantity} {material.unit || 'units'}
                  </span>
                </div>
              ))}
              {delivery.materials.length > 6 && (
                <div className="text-sm text-gray-600">
                  +{delivery.materials.length - 6} more items
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Created: {delivery.createdAt.toLocaleDateString()}
          </div>
          <div className="space-x-3">
            <button
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              View Details
            </button>
            {canConfirm && !isConfirmed && (
              <button
                onClick={onConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Confirm Delivery
              </button>
            )}
            {isConfirmed && (
              <span className="px-4 py-2 text-sm font-medium text-green-700 bg-green-100 rounded-md">
                ✓ Confirmed
              </span>
            )}
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>Delivery Progress</span>
            <span>{getProgressPercentage(delivery.status)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                isConfirmed ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${getProgressPercentage(delivery.status)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function getProgressPercentage(status: string): number {
  const progressMap: Record<string, number> = {
    pending: 0,
    in_transit: 25,
    out_for_delivery: 75,
    delivered: 90,
    delivered_confirmed: 100,
    partially_delivered: 60,
    delayed: 50,
    cancelled: 0,
  };
  
  return progressMap[status] || 0;
}
