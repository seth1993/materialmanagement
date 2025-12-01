'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ShipmentService } from '@/lib/shipment-service';
import { ShipmentForm, ShipmentIssueForm } from '@/components/shipments/ShipmentForm';
import { Shipment, ShipmentStatus } from '@/types/shipment';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function ShipmentsPage() {
  const { user, loading: authLoading } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [showIssueForm, setShowIssueForm] = useState(false);

  const fetchShipments = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const userShipments = await ShipmentService.getUserShipments(user.uid);
      setShipments(userShipments);
    } catch (error) {
      console.error('Error fetching shipments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchShipments();
    }
  }, [user]);

  const handleFormSuccess = () => {
    setShowForm(false);
    fetchShipments();
  };

  const handleIssueFormSuccess = () => {
    setShowIssueForm(false);
    setSelectedShipment(null);
    fetchShipments();
  };

  const handleReportIssue = (shipment: Shipment) => {
    setSelectedShipment(shipment);
    setShowIssueForm(true);
  };

  const getStatusColor = (status: ShipmentStatus) => {
    switch (status) {
      case ShipmentStatus.PENDING:
        return 'bg-gray-100 text-gray-800';
      case ShipmentStatus.IN_TRANSIT:
        return 'bg-blue-100 text-blue-800';
      case ShipmentStatus.DELIVERED:
        return 'bg-green-100 text-green-800';
      case ShipmentStatus.DELAYED:
        return 'bg-yellow-100 text-yellow-800';
      case ShipmentStatus.LOST:
      case ShipmentStatus.DAMAGED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6 text-center">
        <LoadingSpinner className="mx-auto mb-4" />
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto p-6 text-center">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">Shipments</h1>
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-6">
            Please sign in to access shipments.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Shipments</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600"
        >
          {showForm ? 'Cancel' : 'New Shipment'}
        </button>
      </div>

      {showForm && (
        <div className="mb-8">
          <ShipmentForm onSuccess={handleFormSuccess} />
        </div>
      )}

      {showIssueForm && selectedShipment && (
        <div className="mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Report Issue for {selectedShipment.trackingNumber}</h2>
              <button
                onClick={() => {
                  setShowIssueForm(false);
                  setSelectedShipment(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <ShipmentIssueForm
              shipmentId={selectedShipment.id}
              trackingNumber={selectedShipment.trackingNumber}
              onSuccess={handleIssueFormSuccess}
            />
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Your Shipments</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="md" />
          </div>
        ) : shipments.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No shipments found. Create your first shipment to get started!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tracking Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Carrier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Route
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Delivery
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Issues
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {shipments.map((shipment) => (
                  <tr key={shipment.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {shipment.trackingNumber}
                      </div>
                      <div className="text-sm text-gray-500">
                        {shipment.items.length} item{shipment.items.length !== 1 ? 's' : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(shipment.status)}`}>
                        {shipment.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {shipment.carrier}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>{shipment.origin}</div>
                      <div className="text-xs text-gray-400">↓</div>
                      <div>{shipment.destination}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>Est: {shipment.estimatedDelivery.toLocaleDateString()}</div>
                      {shipment.actualDelivery && (
                        <div className="text-green-600">
                          Actual: {shipment.actualDelivery.toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {shipment.issues.length > 0 ? (
                        <span className="text-red-600 font-medium">
                          {shipment.issues.length} issue{shipment.issues.length !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-green-600">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleReportIssue(shipment)}
                        className="text-red-600 hover:text-red-900 mr-4"
                      >
                        Report Issue
                      </button>
                      <button className="text-blue-600 hover:text-blue-900">
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
