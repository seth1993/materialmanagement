'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { RequisitionService } from '@/lib/requisition-service';
import { RequisitionForm } from '@/components/requisitions/RequisitionForm';
import { Requisition, RequisitionStatus } from '@/types/requisition';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function RequisitionsPage() {
  const { user, loading: authLoading } = useAuth();
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const fetchRequisitions = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const userRequisitions = await RequisitionService.getUserRequisitions(user.uid);
      setRequisitions(userRequisitions);
    } catch (error) {
      console.error('Error fetching requisitions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRequisitions();
    }
  }, [user]);

  const handleFormSuccess = () => {
    setShowForm(false);
    fetchRequisitions();
  };

  const handleApprove = async (requisition: Requisition) => {
    if (!user) return;
    
    try {
      await RequisitionService.approveRequisition(
        requisition.id,
        user.uid,
        requisition.userId,
        requisition.title,
        user.displayName || user.email || 'Unknown'
      );
      fetchRequisitions();
    } catch (error) {
      console.error('Error approving requisition:', error);
      alert('Failed to approve requisition');
    }
  };

  const getStatusColor = (status: RequisitionStatus) => {
    switch (status) {
      case RequisitionStatus.DRAFT:
        return 'bg-gray-100 text-gray-800';
      case RequisitionStatus.SUBMITTED:
        return 'bg-blue-100 text-blue-800';
      case RequisitionStatus.APPROVED:
        return 'bg-green-100 text-green-800';
      case RequisitionStatus.REJECTED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
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
        <h1 className="text-3xl font-bold mb-8 text-gray-800">Requisitions</h1>
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-6">
            Please sign in to access requisitions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Requisitions</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600"
        >
          {showForm ? 'Cancel' : 'New Requisition'}
        </button>
      </div>

      {showForm && (
        <div className="mb-8">
          <RequisitionForm onSuccess={handleFormSuccess} />
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Your Requisitions</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="md" />
          </div>
        ) : requisitions.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No requisitions found. Create your first requisition to get started!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requisitions.map((requisition) => (
                  <tr key={requisition.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {requisition.title}
                        </div>
                        <div className="text-sm text-gray-500">
                          {requisition.description}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(requisition.status)}`}>
                        {requisition.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(requisition.priority)}`}>
                        {requisition.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {requisition.items.length} item{requisition.items.length !== 1 ? 's' : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {requisition.createdAt.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {requisition.status === RequisitionStatus.SUBMITTED && (
                        <button
                          onClick={() => handleApprove(requisition)}
                          className="text-green-600 hover:text-green-900 mr-4"
                        >
                          Approve
                        </button>
                      )}
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
