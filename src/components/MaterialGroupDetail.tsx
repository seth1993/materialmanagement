'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { MaterialLineForm } from '@/components/MaterialLineForm';
import {
  getMaterialGroupWithLines,
  updateMaterialGroup,
  deleteMaterialLine,
  subscribeMaterialLines
} from '@/lib/materialGroupsService';
import {
  MaterialGroupWithLines,
  MaterialLine,
  ProjectMaterialGroupFormData,
  TRADE_OPTIONS,
  PHASE_OPTIONS
} from '@/types/materialGroups';

interface MaterialGroupDetailProps {
  projectId: string;
  groupId: string;
}

export const MaterialGroupDetail: React.FC<MaterialGroupDetailProps> = ({ 
  projectId, 
  groupId 
}) => {
  const { user, loading: authLoading } = useAuth();
  const [materialGroup, setMaterialGroup] = useState<MaterialGroupWithLines | null>(null);
  const [materialLines, setMaterialLines] = useState<MaterialLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showAddLine, setShowAddLine] = useState(false);
  const [editingLine, setEditingLine] = useState<MaterialLine | null>(null);
  const [formData, setFormData] = useState<ProjectMaterialGroupFormData>({
    name: '',
    description: '',
    trade: '',
    phase: '',
  });

  // Load material group data
  useEffect(() => {
    const loadMaterialGroup = async () => {
      if (!user) return;

      try {
        const group = await getMaterialGroupWithLines(groupId);
        if (group) {
          setMaterialGroup(group);
          setMaterialLines(group.lines);
          setFormData({
            name: group.name,
            description: group.description,
            trade: group.trade,
            phase: group.phase,
          });
        }
      } catch (error) {
        console.error('Error loading material group:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMaterialGroup();
  }, [groupId, user]);

  // Subscribe to material lines updates
  useEffect(() => {
    if (!materialGroup) return;

    const unsubscribe = subscribeMaterialLines(groupId, (lines) => {
      setMaterialLines(lines);
    });

    return () => unsubscribe();
  }, [groupId, materialGroup]);

  // Save material group changes
  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialGroup) return;

    setSaving(true);
    try {
      await updateMaterialGroup(groupId, formData);
      setMaterialGroup({ ...materialGroup, ...formData });
      setEditMode(false);
    } catch (error) {
      console.error('Error updating material group:', error);
      alert('Failed to update material group. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Delete material line
  const handleDeleteLine = async (lineId: string, materialReference: string) => {
    if (!confirm(`Are you sure you want to delete the line for "${materialReference}"?`)) {
      return;
    }

    try {
      await deleteMaterialLine(lineId);
    } catch (error) {
      console.error('Error deleting material line:', error);
      alert('Failed to delete material line. Please try again.');
    }
  };

  // Show loading state while checking authentication
  if (authLoading || loading) {
    return (
      <div className="text-center py-8">
        <LoadingSpinner className="mx-auto mb-4" />
        <p className="text-gray-600">Loading material group...</p>
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

  // Show error if material group not found
  if (!materialGroup) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-md text-center">
        <h2 className="text-xl font-semibold mb-4">Material Group Not Found</h2>
        <p className="text-gray-600 mb-6">
          The requested material group could not be found.
        </p>
        <Link
          href={`/projects/${projectId}/material-groups`}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          Back to Material Groups
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{materialGroup.name}</h1>
          <div className="mt-2 flex items-center space-x-4">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {materialGroup.trade}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              {materialGroup.phase}
            </span>
          </div>
          {materialGroup.description && (
            <p className="mt-2 text-gray-600">{materialGroup.description}</p>
          )}
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setEditMode(!editMode)}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            {editMode ? 'Cancel Edit' : 'Edit Group'}
          </button>
          <Link
            href={`/projects/${projectId}/material-groups`}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Back to Groups
          </Link>
        </div>
      </div>

      {/* Edit Group Form */}
      {editMode && (
        <form onSubmit={handleSaveGroup} className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Edit Material Group</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Group Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trade *
              </label>
              <select
                value={formData.trade}
                onChange={(e) => setFormData({ ...formData, trade: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
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
                value={formData.phase}
                onChange={(e) => setFormData({ ...formData, phase: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
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
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
          </div>
          <div className="mt-4 flex space-x-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => setEditMode(false)}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Material Lines Section */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Material Lines</h2>
          <button
            onClick={() => setShowAddLine(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Add Material Line
          </button>
        </div>

        {/* Add/Edit Material Line Form */}
        {(showAddLine || editingLine) && (
          <div className="p-6 border-b border-gray-200">
            <MaterialLineForm
              materialGroupId={groupId}
              editingLine={editingLine}
              onSave={() => {
                setShowAddLine(false);
                setEditingLine(null);
              }}
              onCancel={() => {
                setShowAddLine(false);
                setEditingLine(null);
              }}
            />
          </div>
        )}

        {/* Material Lines List */}
        {materialLines.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">
              No material lines found. Add some materials to get started!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Material Reference
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {materialLines.map((line) => (
                  <tr key={line.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {line.materialReference}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {line.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {line.unit}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {line.notes || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => setEditingLine(line)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteLine(line.id, line.materialReference)}
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
