'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ShipmentIssue } from '@/types/delivery';
import { getUserShipmentIssues, resolveShipmentIssue } from '@/lib/delivery-service';
import { formatDeliveryDate } from '@/lib/delivery-utils';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function ShipmentIssueList() {
  const { user, loading: authLoading } = useAuth();
  const [issues, setIssues] = useState<ShipmentIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolvingIssue, setResolvingIssue] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState<string>('');
  const [selectedIssue, setSelectedIssue] = useState<ShipmentIssue | null>(null);

  // Fetch shipment issues
  const fetchIssues = async () => {
    if (!user) {
      setIssues([]);
      return;
    }

    try {
      setLoading(true);
      const userIssues = await getUserShipmentIssues(user.uid);
      setIssues(userIssues.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
    } catch (error) {
      console.error('Error fetching shipment issues:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle issue resolution
  const handleResolveIssue = async (issueId: string) => {
    if (!user || !resolutionNotes.trim()) {
      return;
    }

    try {
      setResolvingIssue(issueId);
      await resolveShipmentIssue(
        issueId,
        resolutionNotes,
        user.displayName || user.email || 'Unknown'
      );
      
      // Update local state
      setIssues(issues.map(issue => 
        issue.id === issueId 
          ? { 
              ...issue, 
              status: 'resolved', 
              resolvedAt: new Date(),
              resolvedBy: user.displayName || user.email || 'Unknown',
              resolutionNotes 
            }
          : issue
      ));
      
      setSelectedIssue(null);
      setResolutionNotes('');
    } catch (error) {
      console.error('Error resolving issue:', error);
      alert('Failed to resolve issue. Please try again.');
    } finally {
      setResolvingIssue(null);
    }
  };

  const getIssueTypeColor = (issueType: string) => {
    switch (issueType) {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-red-100 text-red-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  useEffect(() => {
    if (user) {
      fetchIssues();
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
        <h1 className="text-3xl font-bold mb-8 text-gray-800">Shipment Issues</h1>
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-6">
            Please sign in to view shipment issues.
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
        <h1 className="text-3xl font-bold text-gray-800">Shipment Issues</h1>
        <div className="text-sm text-gray-600">
          Welcome, {user.displayName || user.email}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-900">Total Issues</h3>
          <p className="text-2xl font-bold text-gray-600">{issues.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-900">Open Issues</h3>
          <p className="text-2xl font-bold text-red-600">{issues.filter(i => i.status === 'open').length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-900">Resolved Issues</h3>
          <p className="text-2xl font-bold text-green-600">{issues.filter(i => i.status === 'resolved').length}</p>
        </div>
      </div>

      {/* Issues List */}
      <div className="bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-semibold p-6 border-b">Shipment Issues</h2>
        
        {loading ? (
          <div className="p-6 text-center">
            <LoadingSpinner className="mx-auto mb-4" />
            <p className="text-gray-600">Loading shipment issues...</p>
          </div>
        ) : issues.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-500 mb-4">No shipment issues found.</p>
            <p className="text-sm text-gray-400">Issues will appear here when deliveries have discrepancies.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {issues.map((issue) => (
              <div key={issue.id} className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-medium text-gray-900">{issue.materialName}</h3>
                    <p className="text-sm text-gray-600">PO: {issue.purchaseOrderId}</p>
                    <p className="text-sm text-gray-600">Created: {formatDeliveryDate(issue.createdAt)}</p>
                  </div>
                  <div className="flex space-x-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getIssueTypeColor(issue.issueType)}`}>
                      {issue.issueType.charAt(0).toUpperCase() + issue.issueType.slice(1)}
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(issue.status)}`}>
                      {issue.status.charAt(0).toUpperCase() + issue.status.slice(1)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Expected Quantity</p>
                    <p className="text-lg text-gray-900">{issue.expectedQuantity}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Actual Quantity</p>
                    <p className="text-lg text-gray-900">{issue.actualQuantity}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Difference</p>
                    <p className={`text-lg font-medium ${
                      issue.quantityDifference > 0 ? 'text-blue-600' : 
                      issue.quantityDifference < 0 ? 'text-yellow-600' : 'text-gray-900'
                    }`}>
                      {issue.quantityDifference > 0 ? '+' : ''}{issue.quantityDifference}
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-1">Description</p>
                  <p className="text-sm text-gray-600">{issue.description}</p>
                </div>

                {issue.status === 'resolved' && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
                    <p className="text-sm font-medium text-green-800">Resolved</p>
                    <p className="text-sm text-green-700">
                      Resolved by {issue.resolvedBy} on {issue.resolvedAt ? formatDeliveryDate(issue.resolvedAt) : 'Unknown'}
                    </p>
                    {issue.resolutionNotes && (
                      <p className="text-sm text-green-700 mt-1">Notes: {issue.resolutionNotes}</p>
                    )}
                  </div>
                )}

                {issue.status === 'open' && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => setSelectedIssue(issue)}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Resolve Issue
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolution Modal */}
      {selectedIssue && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Resolve Issue: {selectedIssue.materialName}
              </h3>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Issue: {selectedIssue.description}</p>
                <p className="text-sm text-gray-600">
                  Difference: {selectedIssue.quantityDifference > 0 ? '+' : ''}{selectedIssue.quantityDifference} units
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resolution Notes *
                </label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="Describe how this issue was resolved..."
                  required
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setSelectedIssue(null);
                    setResolutionNotes('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={resolvingIssue === selectedIssue.id}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleResolveIssue(selectedIssue.id)}
                  disabled={!resolutionNotes.trim() || resolvingIssue === selectedIssue.id}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {resolvingIssue === selectedIssue.id && <LoadingSpinner size="sm" className="mr-2" />}
                  {resolvingIssue === selectedIssue.id ? 'Resolving...' : 'Resolve Issue'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
