'use client';

import { useState, useEffect } from 'react';
import { DocumentSnapshot } from 'firebase/firestore';
import { AuditLog, AuditLogFilter, AuditLogQuery } from '@/types/audit';
import { queryAuditLogs } from '@/lib/audit';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { AuditLogFilters } from './AuditLogFilters';

export function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | undefined>();
  const [filters, setFilters] = useState<AuditLogFilter>({ limit: 50 });
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const loadLogs = async (newFilters?: AuditLogFilter, isLoadMore = false) => {
    setLoading(true);
    try {
      const queryParams: AuditLogQuery = {
        filters: newFilters || filters,
        orderBy: 'timestamp',
        orderDirection: 'desc',
      };

      const result = await queryAuditLogs(
        queryParams,
        isLoadMore ? lastDoc : undefined
      );

      if (isLoadMore) {
        setLogs(prev => [...prev, ...result.logs]);
      } else {
        setLogs(result.logs);
      }

      setHasMore(result.hasMore);
      setLastDoc(result.lastDoc);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleFiltersChange = (newFilters: AuditLogFilter) => {
    setFilters(newFilters);
    setLastDoc(undefined);
    loadLogs(newFilters, false);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadLogs(filters, true);
    }
  };

  const toggleLogDetails = (logId: string) => {
    setExpandedLog(expandedLog === logId ? null : logId);
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(timestamp);
  };

  const formatEntityType = (entityType: string) => {
    return entityType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatAction = (action: string) => {
    return action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'text-green-600 bg-green-100';
      case 'update':
        return 'text-blue-600 bg-blue-100';
      case 'delete':
        return 'text-red-600 bg-red-100';
      case 'status_change':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const renderDetails = (log: AuditLog) => {
    const { details } = log;
    
    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-md">
        <h4 className="font-medium text-gray-800 mb-2">Details</h4>
        
        {details.reason && (
          <div className="mb-2">
            <span className="font-medium text-gray-600">Reason: </span>
            <span className="text-gray-800">{details.reason}</span>
          </div>
        )}

        {details.fromStatus && details.toStatus && (
          <div className="mb-2">
            <span className="font-medium text-gray-600">Status Change: </span>
            <span className="text-gray-800">
              {details.fromStatus} → {details.toStatus}
            </span>
          </div>
        )}

        {details.changedFields && details.changedFields.length > 0 && (
          <div className="mb-2">
            <span className="font-medium text-gray-600">Changed Fields: </span>
            <span className="text-gray-800">{details.changedFields.join(', ')}</span>
          </div>
        )}

        {details.previousState && (
          <div className="mb-2">
            <span className="font-medium text-gray-600">Previous State: </span>
            <pre className="text-xs text-gray-700 bg-white p-2 rounded border mt-1 overflow-x-auto">
              {JSON.stringify(details.previousState, null, 2)}
            </pre>
          </div>
        )}

        {details.newState && (
          <div className="mb-2">
            <span className="font-medium text-gray-600">New State: </span>
            <pre className="text-xs text-gray-700 bg-white p-2 rounded border mt-1 overflow-x-auto">
              {JSON.stringify(details.newState, null, 2)}
            </pre>
          </div>
        )}

        {details.metadata && Object.keys(details.metadata).length > 0 && (
          <div className="mb-2">
            <span className="font-medium text-gray-600">Metadata: </span>
            <pre className="text-xs text-gray-700 bg-white p-2 rounded border mt-1 overflow-x-auto">
              {JSON.stringify(details.metadata, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Audit Log Viewer</h1>
        <p className="text-gray-600">
          View and filter system audit logs for all critical actions.
        </p>
      </div>

      <AuditLogFilters onFiltersChange={handleFiltersChange} loading={loading} />

      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">
            Audit Logs ({logs.length} entries)
          </h2>
        </div>

        {loading && logs.length === 0 ? (
          <div className="p-8 text-center">
            <LoadingSpinner className="mx-auto mb-4" />
            <p className="text-gray-600">Loading audit logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No audit logs found matching your criteria.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {logs.map((log) => (
              <div key={log.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getActionColor(log.action)}`}
                      >
                        {formatAction(log.action)}
                      </span>
                      <span className="text-sm font-medium text-gray-800">
                        {formatEntityType(log.entityType)}
                      </span>
                      <span className="text-sm text-gray-500">
                        ID: {log.entityId}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-600">User: </span>
                        <span className="text-gray-800">
                          {log.userName || log.userEmail}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Timestamp: </span>
                        <span className="text-gray-800">
                          {formatTimestamp(log.timestamp)}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">User ID: </span>
                        <span className="text-gray-800 font-mono text-xs">
                          {log.userId}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleLogDetails(log.id!)}
                    className="ml-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    {expandedLog === log.id ? 'Hide Details' : 'Show Details'}
                  </button>
                </div>

                {expandedLog === log.id && renderDetails(log)}
              </div>
            ))}
          </div>
        )}

        {hasMore && (
          <div className="p-6 border-t border-gray-200 text-center">
            <button
              onClick={handleLoadMore}
              disabled={loading}
              className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" className="inline mr-2" />
                  Loading...
                </>
              ) : (
                'Load More'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
