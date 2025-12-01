'use client';

import { useState } from 'react';
import { POLineItem, DeliveryLineItemStatus } from '@/types/delivery';
import { validateDeliveryLineItem } from '@/lib/delivery-utils';

interface DeliveryLineItemProps {
  lineItem: POLineItem;
  onStatusChange: (lineItemId: string, status: DeliveryLineItemStatus, actualQuantity: number, notes?: string, damageDescription?: string) => void;
  disabled?: boolean;
}

export default function DeliveryLineItem({ lineItem, onStatusChange, disabled = false }: DeliveryLineItemProps) {
  const [status, setStatus] = useState<DeliveryLineItemStatus>('ok');
  const [actualQuantity, setActualQuantity] = useState<number>(lineItem.expectedQuantity);
  const [notes, setNotes] = useState<string>('');
  const [damageDescription, setDamageDescription] = useState<string>('');
  const [errors, setErrors] = useState<string[]>([]);

  const handleStatusChange = (newStatus: DeliveryLineItemStatus) => {
    setStatus(newStatus);
    
    // Auto-adjust quantity based on status
    if (newStatus === 'ok') {
      setActualQuantity(lineItem.expectedQuantity);
      setDamageDescription('');
    } else if (newStatus === 'damaged') {
      // For damaged items, assume full quantity received but damaged
      setActualQuantity(lineItem.expectedQuantity);
    }
    
    // Clear errors when status changes
    setErrors([]);
    
    // Notify parent component
    updateParent(newStatus, actualQuantity, notes, damageDescription);
  };

  const handleQuantityChange = (newQuantity: number) => {
    setActualQuantity(newQuantity);
    
    // Auto-adjust status based on quantity
    let newStatus = status;
    if (newQuantity === lineItem.expectedQuantity && status !== 'damaged') {
      newStatus = 'ok';
    } else if (newQuantity < lineItem.expectedQuantity && status === 'ok') {
      newStatus = 'short';
    } else if (newQuantity > lineItem.expectedQuantity && status === 'ok') {
      newStatus = 'over';
    }
    
    if (newStatus !== status) {
      setStatus(newStatus);
    }
    
    updateParent(newStatus, newQuantity, notes, damageDescription);
  };

  const handleNotesChange = (newNotes: string) => {
    setNotes(newNotes);
    updateParent(status, actualQuantity, newNotes, damageDescription);
  };

  const handleDamageDescriptionChange = (newDescription: string) => {
    setDamageDescription(newDescription);
    updateParent(status, actualQuantity, notes, newDescription);
  };

  const updateParent = (currentStatus: DeliveryLineItemStatus, currentQuantity: number, currentNotes: string, currentDamageDescription: string) => {
    // Validate the line item
    const deliveryLineItem = {
      id: lineItem.id,
      poLineItemId: lineItem.id,
      materialId: lineItem.materialId,
      materialName: lineItem.materialName,
      expectedQuantity: lineItem.expectedQuantity,
      actualQuantity: currentQuantity,
      status: currentStatus,
      notes: currentNotes,
      damageDescription: currentDamageDescription
    };

    const validationErrors = validateDeliveryLineItem(deliveryLineItem);
    setErrors(validationErrors);

    // Only notify parent if validation passes
    if (validationErrors.length === 0) {
      onStatusChange(lineItem.id, currentStatus, currentQuantity, currentNotes, currentDamageDescription);
    }
  };

  const getStatusColor = (itemStatus: DeliveryLineItemStatus) => {
    switch (itemStatus) {
      case 'ok':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'short':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'over':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'damaged':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${errors.length > 0 ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`}>
      {/* Material Info Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="font-medium text-gray-900">{lineItem.materialName}</h4>
          <p className="text-sm text-gray-600">Expected: {lineItem.expectedQuantity} units</p>
          {lineItem.unitPrice && (
            <p className="text-sm text-gray-600">Unit Price: ${lineItem.unitPrice.toFixed(2)}</p>
          )}
          {lineItem.notes && (
            <p className="text-sm text-gray-600">PO Notes: {lineItem.notes}</p>
          )}
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(status)}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </div>
      </div>

      {/* Status Selection */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        {(['ok', 'short', 'over', 'damaged'] as DeliveryLineItemStatus[]).map((statusOption) => (
          <button
            key={statusOption}
            type="button"
            onClick={() => handleStatusChange(statusOption)}
            disabled={disabled}
            className={`px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
              status === statusOption
                ? getStatusColor(statusOption)
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {statusOption.charAt(0).toUpperCase() + statusOption.slice(1)}
          </button>
        ))}
      </div>

      {/* Actual Quantity Input */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Actual Quantity Received
          </label>
          <input
            type="number"
            value={actualQuantity}
            onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 0)}
            disabled={disabled}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            min="0"
          />
        </div>
        
        {status !== 'ok' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Difference
            </label>
            <div className={`px-3 py-2 rounded-md text-sm font-medium ${
              actualQuantity - lineItem.expectedQuantity > 0 
                ? 'bg-blue-50 text-blue-700' 
                : actualQuantity - lineItem.expectedQuantity < 0
                ? 'bg-yellow-50 text-yellow-700'
                : 'bg-gray-50 text-gray-700'
            }`}>
              {actualQuantity - lineItem.expectedQuantity > 0 ? '+' : ''}{actualQuantity - lineItem.expectedQuantity} units
            </div>
          </div>
        )}
      </div>

      {/* Damage Description (only for damaged items) */}
      {status === 'damaged' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Damage Description *
          </label>
          <textarea
            value={damageDescription}
            onChange={(e) => handleDamageDescriptionChange(e.target.value)}
            disabled={disabled}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            rows={3}
            placeholder="Describe the damage in detail..."
            required
          />
        </div>
      )}

      {/* Notes */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Delivery Notes
        </label>
        <input
          type="text"
          value={notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          disabled={disabled}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          placeholder="Additional notes about this delivery..."
        />
      </div>

      {/* Validation Errors */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <h5 className="text-sm font-medium text-red-800 mb-1">Please fix the following issues:</h5>
          <ul className="list-disc list-inside text-sm text-red-700">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
