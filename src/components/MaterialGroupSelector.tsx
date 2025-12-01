'use client';

import { useState } from 'react';
import { Material } from '@/types/rfq';

interface MaterialGroup {
  category: string;
  materials: Material[];
  selected: boolean;
}

interface MaterialGroupSelectorProps {
  materialGroups: MaterialGroup[];
  selectedGroups: string[];
  onGroupSelection: (category: string, selected: boolean) => void;
}

export default function MaterialGroupSelector({
  materialGroups,
  selectedGroups,
  onGroupSelection,
}: MaterialGroupSelectorProps) {
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  const toggleGroupExpansion = (category: string) => {
    setExpandedGroups(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleGroupToggle = (category: string) => {
    const isSelected = selectedGroups.includes(category);
    onGroupSelection(category, !isSelected);
  };

  const getTotalQuantity = (materials: Material[]) => {
    return materials.reduce((total, material) => total + material.quantity, 0);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-800">Material Groups</h2>
      
      {materialGroups.map((group) => {
        const isSelected = selectedGroups.includes(group.category);
        const isExpanded = expandedGroups.includes(group.category);
        const totalQuantity = getTotalQuantity(group.materials);

        return (
          <div
            key={group.category}
            className={`border rounded-lg overflow-hidden transition-all duration-200 ${
              isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
            }`}
          >
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleGroupToggle(group.category)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {group.category}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {group.materials.length} item{group.materials.length !== 1 ? 's' : ''} • 
                      Total quantity: {totalQuantity}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => toggleGroupExpansion(group.category)}
                  className="text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  <svg
                    className={`h-5 w-5 transform transition-transform duration-200 ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              </div>

              {isExpanded && (
                <div className="mt-4 border-t pt-4">
                  <div className="space-y-2">
                    {group.materials.map((material) => (
                      <div
                        key={material.id}
                        className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded"
                      >
                        <div>
                          <span className="font-medium text-gray-900">
                            {material.name}
                          </span>
                          {material.description && (
                            <p className="text-sm text-gray-600 mt-1">
                              {material.description}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">
                            Qty: {material.quantity}
                            {material.unit && ` ${material.unit}`}
                          </div>
                          <div className="text-xs text-gray-500">
                            Added {material.createdAt.toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {materialGroups.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No material groups available
        </div>
      )}
    </div>
  );
}
