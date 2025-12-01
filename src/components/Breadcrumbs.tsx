'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface BreadcrumbsProps {
  projectId: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ projectId }) => {
  const pathname = usePathname();
  
  // Parse the current path to determine breadcrumb items
  const pathSegments = pathname.split('/').filter(Boolean);
  
  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: `Project ${projectId}`, href: `/projects/${projectId}` },
  ];

  // Add material groups breadcrumb if we're in that section
  if (pathSegments.includes('material-groups')) {
    breadcrumbItems.push({
      label: 'Material Groups',
      href: `/projects/${projectId}/material-groups`
    });
    
    // Add specific group breadcrumb if we're viewing a specific group
    const groupIndex = pathSegments.indexOf('material-groups') + 1;
    if (pathSegments[groupIndex] && pathSegments[groupIndex] !== 'material-groups') {
      const groupId = pathSegments[groupIndex];
      breadcrumbItems.push({
        label: `Group ${groupId.substring(0, 8)}...`,
        href: `/projects/${projectId}/material-groups/${groupId}`
      });
    }
  }

  return (
    <nav className="flex mb-6" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        {breadcrumbItems.map((item, index) => (
          <li key={item.href} className="inline-flex items-center">
            {index > 0 && (
              <svg
                className="w-6 h-6 text-gray-400"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            {index === breadcrumbItems.length - 1 ? (
              <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="ml-1 text-sm font-medium text-gray-700 hover:text-blue-600 md:ml-2"
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};
