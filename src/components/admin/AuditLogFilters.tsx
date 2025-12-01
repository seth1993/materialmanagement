'use client';

import { useState } from 'react';
import { EntityType, AuditAction, AuditLogFilter } from '@/types/audit';

interface AuditLogFiltersProps {
  onFiltersChange: (filters: AuditLogFilter) => void;
  loading?: boolean;
}

export function AuditLogFilters({ onFiltersChange, loading = false }: AuditLogFiltersProps) {
  const [filters, setFilters] = useState<AuditLogFilter>({
    limit: 50,
  });

  const handleFilterChange = (key: keyof AuditLogFilter, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleDateChange = (key: 'startDate' | 'endDate', value: string) => {
    const date = value ? new Date(value) : undefined;
    handleFilterChange(key, date);
  };

  const clearFilters = () => {
    const clearedFilters: AuditLogFilter = { limit: 50 };
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const formatDateForInput = (date?: Date) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Filter Audit Logs</h3>
        <button
          onClick={clearFilters}
          disabled={loading}
          className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
        >
          Clear Filters
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Date Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={formatDateForInput(filters.startDate)}
            onChange={(e) => handleDateChange('startDate', e.target.value)}
            disabled={loading}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date
          </label>
          <input
            type="date"
            value={formatDateForInput(filters.endDate)}
            onChange={(e) => handleDateChange('endDate', e.target.value)}
            disabled={loading}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>

        {/* Entity Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Entity Type
          </label>
          <select
            value={filters.entityType || ''}
            onChange={(e) => handleFilterChange('entityType', e.target.value || undefined)}
            disabled={loading}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="">All Types</option>
            {Object.values(EntityType).map((type) => (
              <option key={type} value={type}>
                {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        {/* Action */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Action
          </label>
          <select
            value={filters.action || ''}
            onChange={(e) => handleFilterChange('action', e.target.value || undefined)}
            disabled={loading}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="">All Actions</option>
            {Object.values(AuditAction).map((action) => (
              <option key={action} value={action}>
                {action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        {/* User ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            User ID
          </label>
          <input
            type="text"
            placeholder="Filter by user ID"
            value={filters.userId || ''}
            onChange={(e) => handleFilterChange('userId', e.target.value || undefined)}
            disabled={loading}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>

        {/* Entity ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Entity ID
          </label>
          <input
            type="text"
            placeholder="Filter by entity ID"
            value={filters.entityId || ''}
            onChange={(e) => handleFilterChange('entityId', e.target.value || undefined)}
            disabled={loading}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>

        {/* Limit */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Results Limit
          </label>
          <select
            value={filters.limit || 50}
            onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
            disabled={loading}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
        </div>
      </div>
    </div>
  );
}
