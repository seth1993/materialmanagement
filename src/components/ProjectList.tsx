'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ProjectFilters } from '@/components/ProjectFilters';
import { Project, ProjectFilters as ProjectFiltersType, ProjectsResponse } from '@/types/project';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

const getStatusColor = (status: Project['status']) => {
  switch (status) {
    case 'planning':
      return 'bg-blue-100 text-blue-800';
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'completed':
      return 'bg-gray-100 text-gray-800';
    case 'on-hold':
      return 'bg-yellow-100 text-yellow-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default function ProjectList() {
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ProjectFiltersType>({});
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
  });

  // Fetch projects from API
  const fetchProjects = async () => {
    if (!user) {
      setProjects([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams({
        userId: user.uid,
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      // Add filters to query params
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== null) {
          queryParams.append(key, value.toString());
        }
      });

      const response = await fetch(`/api/projects?${queryParams}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }

      const data: ProjectsResponse = await response.json();
      
      // Convert date strings back to Date objects
      const projectsWithDates = data.projects.map(project => ({
        ...project,
        startDate: new Date(project.startDate),
        endDate: project.endDate ? new Date(project.endDate) : undefined,
        createdAt: new Date(project.createdAt),
        updatedAt: new Date(project.updatedAt),
      }));

      setProjects(projectsWithDates);
      setPagination(prev => ({
        ...prev,
        total: data.total,
      }));
    } catch (error) {
      console.error('Error fetching projects:', error);
      setError('Failed to load projects. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle filter changes
  const handleFiltersChange = (newFilters: ProjectFiltersType) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page when filters change
  };

  // Clear all filters
  const handleClearFilters = () => {
    setFilters({});
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  // Fetch projects when user, filters, or pagination changes
  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user, filters, pagination.page]);

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <LoadingSpinner className="mx-auto mb-4" />
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  // Show sign-in prompt if not authenticated
  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Sign In Required</h2>
        <p className="text-gray-600 mb-6">
          Please sign in to view and manage your projects.
        </p>
        <Link
          href="/auth/login"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Filters */}
      <ProjectFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onClearFilters={handleClearFilters}
      />

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <LoadingSpinner className="mx-auto mb-4" />
          <p className="text-gray-600">Loading projects...</p>
        </div>
      )}

      {/* Projects Grid */}
      {!loading && (
        <>
          {projects.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
              <p className="text-gray-600 mb-6">
                {Object.keys(filters).length > 0 
                  ? 'Try adjusting your filters or create a new project.'
                  : 'Get started by creating your first project.'
                }
              </p>
              <button
                onClick={() => {/* TODO: Add create project functionality */}}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Create Project
              </button>
            </div>
          ) : (
            <>
              {/* Projects Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="block bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow duration-200"
                  >
                    <div className="p-6">
                      {/* Project Header */}
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {project.name}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                          {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                        </span>
                      </div>

                      {/* Project Description */}
                      {project.description && (
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                          {project.description}
                        </p>
                      )}

                      {/* Project Details */}
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center">
                          <span className="font-medium">Budget:</span>
                          <span className="ml-2">{formatCurrency(project.budget)}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="font-medium">Location:</span>
                          <span className="ml-2 truncate">{project.location}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="font-medium">Start Date:</span>
                          <span className="ml-2">{formatDate(project.startDate)}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="font-medium">Category:</span>
                          <span className="ml-2 capitalize">{project.category}</span>
                        </div>
                      </div>

                      {/* Material Groups */}
                      {project.materialGroups.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs text-gray-500 mb-1">Material Groups:</p>
                          <div className="flex flex-wrap gap-1">
                            {project.materialGroups.slice(0, 3).map((group, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700"
                              >
                                {group}
                              </span>
                            ))}
                            {project.materialGroups.length > 3 && (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                                +{project.materialGroups.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {pagination.total > pagination.limit && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total} projects
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-2 text-sm font-medium text-gray-700">
                      Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)}
                    </span>
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
                      className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
