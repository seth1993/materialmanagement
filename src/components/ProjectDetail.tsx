'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Project } from '@/types/project';

interface ProjectDetailProps {
  projectId: string;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
};

const getStatusColor = (status: Project['status']) => {
  switch (status) {
    case 'planning':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'active':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'completed':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'on-hold':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'cancelled':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getStatusIcon = (status: Project['status']) => {
  switch (status) {
    case 'planning':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      );
    case 'active':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    case 'completed':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'on-hold':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'cancelled':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    default:
      return null;
  }
};

export default function ProjectDetail({ projectId }: ProjectDetailProps) {
  const { user, loading: authLoading } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch project details from API
  const fetchProject = async () => {
    if (!user) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}?userId=${user.uid}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Project not found');
        } else if (response.status === 403) {
          throw new Error('You do not have permission to view this project');
        } else {
          throw new Error('Failed to fetch project');
        }
      }

      const projectData: Project = await response.json();
      
      // Convert date strings back to Date objects
      const projectWithDates = {
        ...projectData,
        startDate: new Date(projectData.startDate),
        endDate: projectData.endDate ? new Date(projectData.endDate) : undefined,
        createdAt: new Date(projectData.createdAt),
        updatedAt: new Date(projectData.updatedAt),
      };

      setProject(projectWithDates);
    } catch (error) {
      console.error('Error fetching project:', error);
      setError(error instanceof Error ? error.message : 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  // Fetch project when user or projectId changes
  useEffect(() => {
    if (user && projectId) {
      fetchProject();
    }
  }, [user, projectId]);

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
          Please sign in to view project details.
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

  // Show loading state while fetching project
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <LoadingSpinner className="mx-auto mb-4" />
        <p className="text-gray-600">Loading project details...</p>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
        <Link
          href="/projects"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          ← Back to Projects
        </Link>
      </div>
    );
  }

  // Show project not found state
  if (!project) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Project Not Found</h2>
        <p className="text-gray-600 mb-6">
          The project you're looking for doesn't exist or you don't have permission to view it.
        </p>
        <Link
          href="/projects"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          ← Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/projects"
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 mb-4"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Projects
        </Link>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
            {project.description && (
              <p className="mt-2 text-lg text-gray-600">{project.description}</p>
            )}
          </div>
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(project.status)}`}>
            {getStatusIcon(project.status)}
            <span className="ml-2">{project.status.charAt(0).toUpperCase() + project.status.slice(1)}</span>
          </div>
        </div>
      </div>

      {/* Project Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Key Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Project Information</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Budget</dt>
                <dd className="mt-1 text-lg font-semibold text-gray-900">{formatCurrency(project.budget)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Category</dt>
                <dd className="mt-1 text-lg text-gray-900 capitalize">{project.category}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Location</dt>
                <dd className="mt-1 text-lg text-gray-900">{project.location}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${getStatusColor(project.status)}`}>
                    {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          {/* Timeline */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Timeline</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Start Date</dt>
                <dd className="mt-1 text-lg text-gray-900">{formatDate(project.startDate)}</dd>
              </div>
              {project.endDate && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">End Date</dt>
                  <dd className="mt-1 text-lg text-gray-900">{formatDate(project.endDate)}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-600">{formatDate(project.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                <dd className="mt-1 text-sm text-gray-600">{formatDate(project.updatedAt)}</dd>
              </div>
            </dl>
          </div>

          {/* Material Groups */}
          {project.materialGroups.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Active Material Groups</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {project.materialGroups.map((group, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center"
                  >
                    <div className="text-sm font-medium text-gray-900">{group}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => {/* TODO: Add edit functionality */}}
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Project
              </button>
              <button
                onClick={() => {/* TODO: Add duplicate functionality */}}
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Duplicate Project
              </button>
            </div>
          </div>

          {/* Project Stats */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Project Stats</h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Material Groups</dt>
                <dd className="text-sm font-medium text-gray-900">{project.materialGroups.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Days Since Created</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {Math.floor((new Date().getTime() - project.createdAt.getTime()) / (1000 * 60 * 60 * 24))}
                </dd>
              </div>
              {project.endDate && (
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Duration</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {Math.floor((project.endDate.getTime() - project.startDate.getTime()) / (1000 * 60 * 60 * 24))} days
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
