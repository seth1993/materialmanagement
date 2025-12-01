'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { PurchaseOrder, CreatePurchaseOrderForm } from '@/types/delivery';
import { formatDeliveryDate } from '@/lib/delivery-utils';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import PurchaseOrderForm from './PurchaseOrderForm';

export default function PurchaseOrderList() {
  const { user, loading: authLoading } = useAuth();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch purchase orders from Firestore for the current user
  const fetchPurchaseOrders = async () => {
    if (!user || !db) {
      setPurchaseOrders([]);
      return;
    }

    try {
      setLoading(true);
      const q = query(
        collection(db, 'purchaseOrders'), 
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
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

  // Create new purchase order
  const createPurchaseOrder = async (formData: CreatePurchaseOrderForm) => {
    if (!user || !db) {
      alert('Firebase not configured. This is a demo version.');
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'purchaseOrders'), {
        ...formData,
        status: 'pending',
        createdAt: new Date(),
        createdBy: user.displayName || user.email || 'Unknown',
        userId: user.uid,
      });
      
      setShowForm(false);
      fetchPurchaseOrders();
    } catch (error) {
      console.error('Error creating purchase order:', error);
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchPurchaseOrders();
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
        <h1 className="text-3xl font-bold mb-8 text-gray-800">Purchase Orders</h1>
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-6">
            Please sign in to access purchase order management.
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

  if (showForm) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Create Purchase Order</h1>
        </div>
        <PurchaseOrderForm
          onSubmit={createPurchaseOrder}
          onCancel={() => setShowForm(false)}
          loading={submitting}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Purchase Orders</h1>
        <div className="text-sm text-gray-600">
          Welcome, {user.displayName || user.email}
        </div>
      </div>
      
      {/* Create PO Button */}
      <div className="mb-6">
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Create New Purchase Order
        </button>
      </div>

      {/* Purchase Orders List */}
      <div className="bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-semibold p-6 border-b">Purchase Orders</h2>
        
        {loading ? (
          <div className="p-6 text-center">
            <LoadingSpinner className="mx-auto mb-4" />
            <p className="text-gray-600">Loading purchase orders...</p>
          </div>
        ) : purchaseOrders.length === 0 ? (
          <p className="p-6 text-gray-500">No purchase orders found. Create your first purchase order to get started!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PO Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jobsite</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expected Delivery</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Line Items</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {purchaseOrders.map((po) => (
                  <tr key={po.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {po.poNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {po.supplierName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {po.jobsiteName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDeliveryDate(po.expectedDeliveryDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        po.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        po.status === 'partial' ? 'bg-blue-100 text-blue-800' :
                        po.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {po.status.charAt(0).toUpperCase() + po.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {po.lineItems.length} items
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {po.createdAt.toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Purchase Order Details Modal/Expandable Section */}
      {purchaseOrders.length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow-md">
          <h3 className="text-lg font-semibold p-6 border-b">Recent Purchase Order Details</h3>
          {purchaseOrders.slice(0, 1).map((po) => (
            <div key={po.id} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <h4 className="font-medium text-gray-900">PO: {po.poNumber}</h4>
                  <p className="text-sm text-gray-600">Supplier: {po.supplierName}</p>
                  <p className="text-sm text-gray-600">Jobsite: {po.jobsiteName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Expected: {formatDeliveryDate(po.expectedDeliveryDate)}</p>
                  <p className="text-sm text-gray-600">Created by: {po.createdBy}</p>
                  {po.notes && <p className="text-sm text-gray-600">Notes: {po.notes}</p>}
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <h5 className="font-medium text-gray-900 mb-2">Line Items</h5>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Material</th>
                      <th className="px-4 py-2 text-left">Expected Qty</th>
                      <th className="px-4 py-2 text-left">Unit Price</th>
                      <th className="px-4 py-2 text-left">Total</th>
                      <th className="px-4 py-2 text-left">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {po.lineItems.map((item, index) => (
                      <tr key={index} className="border-t border-gray-200">
                        <td className="px-4 py-2">{item.materialName}</td>
                        <td className="px-4 py-2">{item.expectedQuantity}</td>
                        <td className="px-4 py-2">
                          {item.unitPrice ? `$${item.unitPrice.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-2">
                          {item.unitPrice ? `$${(item.expectedQuantity * item.unitPrice).toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-2">{item.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
