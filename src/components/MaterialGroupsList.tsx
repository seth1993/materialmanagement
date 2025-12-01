'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  createMaterialGroup,
  getMaterialGroups,
  deleteMaterialGroup,
  subscribeMaterialGroups
} from '@/lib/materialGroupsService';
import {
  ProjectMaterialGroup,
  ProjectMaterialGroupFormData,
  TRADE_OPTIONS,
  PHASE_OPTIONS
} from '@/types/materialGroups';

interface MaterialGroupsListProps {
  projectId: string;
}

export const MaterialGroupsList: React.FC<MaterialGroupsListProps> = ({ projectId }) => {
  const { user, loading: authLoading } = useAuth();
  const [materialGroups, setMaterialGroups] = useState<ProjectMaterialGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTrade, setFilterTrade] = useState('');
  const [filterPhase, setFilterPhase] = useState('');
  const [newGroup, setNewGroup] = useState<ProjectMaterialGroupFormData>({
    name: '',
    description: '',
    trade: '',
    phase: '',
  });

  // Fetch material groups
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeMaterialGroups(
      projectId,
      user.uid,
      (groups) => {
        setMaterialGroups(groups);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [projectId, user]);

  // Filter material groups
  const filteredGroups = materialGroups.filter(group => {
    const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         group.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTrade = !filterTrade || group.trade === filterTrade;
    const matchesPhase = !filterPhase || group.phase === filterPhase;
    
    return matchesSearch && matchesTrade && matchesPhase;
  });

  // Add new material group
  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newGroup.name || !newGroup.trade || !newGroup.phase) return;

    setLoading(true);
    try {
      await createMaterialGroup(projectId, user.uid, newGroup);
      setNewGroup({ name: '', description: '', trade: '', phase: '' });
      setShowForm(false);
    } catch (error) {
      console.error('Error adding material group:', error);
      alert('Failed to add material group. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Delete material group
  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!confirm(`Are you sure you want to delete "${groupName}"? This will also delete all associated material lines.`)) {
      return;
    }

    try {
      await deleteMaterialGroup(groupId);
    } catch (error) {
      console.error('Error deleting material group:', error);
      alert('Failed to delete material group. Please try again.');
    }
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="text-center py-8">
        <LoadingSpinner className="mx-auto mb-4" />
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-md text-center">
        <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
        <p className="text-gray-600 mb-6">
          Please sign in to access material groups.
        </p>
        <Link
          href="/auth/login"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Material Groups</h2>
          <p className="text-gray-600">Organize materials by trade and project phase</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {showForm ? 'Cancel' : 'Add Group'}
        </button>
      </div>

      {/* Add Group Form */}
      {showForm && (
        <form onSubmit={handleAddGroup} className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Add New Material Group</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Group Name *
              </label>
              <input
                type="text"
                value={newGroup.name}
                onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Kitchen Electrical"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trade *
              </label>
              <select
                value={newGroup.trade}
                onChange={(e) => setNewGroup({ ...newGroup, trade: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Trade</option>
                {TRADE_OPTIONS.map(trade => (
                  <option key={trade} value={trade}>{trade}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phase *
              </label>
              <select
                value={newGroup.phase}
                onChange={(e) => setNewGroup({ ...newGroup, phase: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Phase</option>
                {PHASE_OPTIONS.map(phase => (
                  <option key={phase} value={phase}>{phase}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={newGroup.description}
                onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Optional description of this material group"
              />
            </div>
          </div>
          <div className="mt-4 flex space-x-3">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding...' : 'Add Group'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search groups..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Trade
            </label>
            <select
              value={filterTrade}
              onChange={(e) => setFilterTrade(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Trades</option>
              {TRADE_OPTIONS.map(trade => (
                <option key={trade} value={trade}>{trade}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Phase
            </label>
            <select
              value={filterPhase}
              onChange={(e) => setFilterPhase(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Phases</option>
              {PHASE_OPTIONS.map(phase => (
                <option key={phase} value={phase}>{phase}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Material Groups List */}
      <div className="bg-white rounded-lg shadow-md">
        {loading && materialGroups.length === 0 ? (
          <div className="p-8 text-center">
            <LoadingSpinner className="mx-auto mb-4" />
            <p className="text-gray-600">Loading material groups...</p>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">
              {materialGroups.length === 0 
                ? 'No material groups found. Create your first group to get started!'
                : 'No groups match your search criteria.'
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phase
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
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
                {filteredGroups.map((group) => (
                  <tr key={group.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/projects/${projectId}/material-groups/${group.id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {group.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {group.trade}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {group.phase}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {group.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {group.createdAt.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <Link
                        href={`/projects/${projectId}/material-groups/${group.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => handleDeleteGroup(group.id, group.name)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
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
};
