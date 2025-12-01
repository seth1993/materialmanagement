'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { PurchaseOrder, DeliveryConfirmationForm, DeliveryLineItemStatus } from '@/types/delivery';
import { formatDeliveryDate } from '@/lib/delivery-utils';
import { processDeliveryConfirmation } from '@/lib/delivery-service';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import DeliveryLineItem from './DeliveryLineItem';

export default function DeliveryConfirmation() {
  const { user, loading: authLoading } = useAuth();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [deliveryForm, setDeliveryForm] = useState<DeliveryConfirmationForm>({
    purchaseOrderId: '',
    deliveryDate: new Date(),
    receivedBy: '',
    lineItems: [],
    notes: ''
  });

  const [lineItemStatuses, setLineItemStatuses] = useState<Map<string, {
    status: DeliveryLineItemStatus;
    actualQuantity: number;
    notes?: string;
    damageDescription?: string;
  }>>(new Map());

  const [errors, setErrors] = useState<string[]>([]);

  // Fetch pending purchase orders
  const fetchPendingPurchaseOrders = async () => {
    if (!user || !db) {
      setPurchaseOrders([]);
      return;
    }

    try {
      setLoading(true);
      const q = query(
        collection(db, 'purchaseOrders'), 
        where('userId', '==', user.uid),
        where('status', 'in', ['pending', 'partial']),
        orderBy('expectedDeliveryDate', 'asc')
      );
      const querySnapshot = await getDocs(q);
      const poData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        expectedDeliveryDate: doc.data().expectedDeliveryDate?.toDate() || new Date(),
      })) as PurchaseOrder[];
      setPurchaseOrders(poData);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle PO selection
  const handlePOSelection = (poId: string) => {
    const po = purchaseOrders.find(p => p.id === poId);
    if (po) {
      setSelectedPO(po);
      setDeliveryForm({
        purchaseOrderId: po.id,
        deliveryDate: new Date(),
        receivedBy: user?.displayName || user?.email || '',
        lineItems: [],
        notes: ''
      });
      
      // Initialize line item statuses
      const initialStatuses = new Map();
      po.lineItems.forEach(item => {
        initialStatuses.set(item.id, {
          status: 'ok' as DeliveryLineItemStatus,
          actualQuantity: item.expectedQuantity,
          notes: '',
          damageDescription: ''
        });
      });
      setLineItemStatuses(initialStatuses);
      setErrors([]);
    }
  };

  // Handle line item status change
  const handleLineItemStatusChange = (
    lineItemId: string, 
    status: DeliveryLineItemStatus, 
    actualQuantity: number, 
    notes?: string, 
    damageDescription?: string
  ) => {
    const newStatuses = new Map(lineItemStatuses);
    newStatuses.set(lineItemId, {
      status,
      actualQuantity,
      notes,
      damageDescription
    });
    setLineItemStatuses(newStatuses);
    
    // Update delivery form line items
    const updatedLineItems = Array.from(newStatuses.entries()).map(([poLineItemId, itemData]) => ({
      poLineItemId,
      status: itemData.status,
      actualQuantity: itemData.actualQuantity,
      notes: itemData.notes,
      damageDescription: itemData.damageDescription
    }));
    
    setDeliveryForm({
      ...deliveryForm,
      lineItems: updatedLineItems
    });
  };

  // Validate delivery form
  const validateDeliveryForm = (): string[] => {
    const formErrors: string[] = [];
    
    if (!deliveryForm.purchaseOrderId) {
      formErrors.push('Please select a purchase order');
    }
    
    if (!deliveryForm.receivedBy.trim()) {
      formErrors.push('Please enter who received the delivery');
    }
    
    if (deliveryForm.lineItems.length === 0) {
      formErrors.push('Please confirm all line items');
    }
    
    // Check if all line items have been processed
    if (selectedPO && deliveryForm.lineItems.length !== selectedPO.lineItems.length) {
      formErrors.push('Please confirm all line items before submitting');
    }
    
    // Validate damaged items have descriptions
    const damagedItems = deliveryForm.lineItems.filter(item => item.status === 'damaged');
    const damagedWithoutDescription = damagedItems.filter(item => !item.damageDescription?.trim());
    if (damagedWithoutDescription.length > 0) {
      formErrors.push('Please provide damage descriptions for all damaged items');
    }
    
    return formErrors;
  };

  // Submit delivery confirmation
  const handleSubmitDelivery = async () => {
    const formErrors = validateDeliveryForm();
    if (formErrors.length > 0) {
      setErrors(formErrors);
      return;
    }

    if (!db) {
      alert('Firebase not configured. This is a demo version.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await processDeliveryConfirmation(deliveryForm, user.uid);
      
      // Show success message with details
      const successMessage = `Delivery confirmation submitted successfully!\n\n` +
        `Delivery ID: ${result.deliveryId}\n` +
        `Issues Created: ${result.issuesCreated}\n` +
        `Inventory Updated: ${result.inventoryUpdated} materials`;
      
      alert(successMessage);
      
      // Reset form
      setSelectedPO(null);
      setLineItemStatuses(new Map());
      setDeliveryForm({
        purchaseOrderId: '',
        deliveryDate: new Date(),
        receivedBy: user?.displayName || user?.email || '',
        lineItems: [],
        notes: ''
      });
      setErrors([]);
      
      // Refresh PO list
      fetchPendingPurchaseOrders();
    } catch (error) {
      console.error('Error submitting delivery:', error);
      setErrors(['Failed to submit delivery confirmation. Please try again.']);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchPendingPurchaseOrders();
    }
  }, [user]);

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6 text-center">
        <LoadingSpinner className="mx-auto mb-4" />
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="max-w-6xl mx-auto p-6 text-center">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">Delivery Confirmation</h1>
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-6">
            Please sign in to access delivery confirmation.
          </p>
          <div className="space-x-4">
            <a
              href="/auth/login"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sign In
            </a>
            <a
              href="/auth/signup"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sign Up
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Delivery Confirmation</h1>
        <div className="text-sm text-gray-600">
          Welcome, {user.displayName || user.email}
        </div>
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <h3 className="text-sm font-medium text-red-800 mb-2">Please fix the following issues:</h3>
          <ul className="list-disc list-inside text-sm text-red-700">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {!selectedPO ? (
        /* PO Selection */
        <div className="bg-white rounded-lg shadow-md">
          <h2 className="text-xl font-semibold p-6 border-b">Select Purchase Order for Delivery</h2>
          
          {loading ? (
            <div className="p-6 text-center">
              <LoadingSpinner className="mx-auto mb-4" />
              <p className="text-gray-600">Loading purchase orders...</p>
            </div>
          ) : purchaseOrders.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-gray-500 mb-4">No pending purchase orders found.</p>
              <a
                href="/purchase-orders"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Create Purchase Order
              </a>
            </div>
          ) : (
            <div className="p-6">
              <div className="grid gap-4">
                {purchaseOrders.map((po) => (
                  <div
                    key={po.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
                    onClick={() => handlePOSelection(po.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">{po.poNumber}</h3>
                        <p className="text-sm text-gray-600">Supplier: {po.supplierName}</p>
                        <p className="text-sm text-gray-600">Jobsite: {po.jobsiteName}</p>
                        <p className="text-sm text-gray-600">Expected: {formatDeliveryDate(po.expectedDeliveryDate)}</p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          po.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {po.status.charAt(0).toUpperCase() + po.status.slice(1)}
                        </span>
                        <p className="text-sm text-gray-600 mt-1">{po.lineItems.length} items</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Delivery Confirmation Form */
        <div className="space-y-6">
          {/* Selected PO Info */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-semibold">Confirming Delivery for PO: {selectedPO.poNumber}</h2>
                <p className="text-gray-600">Supplier: {selectedPO.supplierName}</p>
                <p className="text-gray-600">Jobsite: {selectedPO.jobsiteName}</p>
                <p className="text-gray-600">Expected: {formatDeliveryDate(selectedPO.expectedDeliveryDate)}</p>
              </div>
              <button
                onClick={() => setSelectedPO(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ← Back to PO Selection
              </button>
            </div>

            {/* Delivery Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Date *
                </label>
                <input
                  type="date"
                  value={deliveryForm.deliveryDate.toISOString().split('T')[0]}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, deliveryDate: new Date(e.target.value) })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Received By *
                </label>
                <input
                  type="text"
                  value={deliveryForm.receivedBy}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, receivedBy: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Your name"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Notes
                </label>
                <input
                  type="text"
                  value={deliveryForm.notes}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="General delivery notes..."
                />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white rounded-lg shadow-md">
            <h3 className="text-lg font-semibold p-6 border-b">Confirm Line Items</h3>
            <div className="p-6 space-y-6">
              {selectedPO.lineItems.map((lineItem) => (
                <DeliveryLineItem
                  key={lineItem.id}
                  lineItem={lineItem}
                  onStatusChange={handleLineItemStatusChange}
                  disabled={submitting}
                />
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              onClick={() => setSelectedPO(null)}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitDelivery}
              disabled={submitting || deliveryForm.lineItems.length !== selectedPO.lineItems.length}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {submitting && <LoadingSpinner size="sm" className="mr-2" />}
              {submitting ? 'Submitting...' : 'Confirm Delivery'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
