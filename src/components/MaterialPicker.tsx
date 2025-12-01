'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Material } from '@/types';

interface MaterialPickerProps {
  projectId: string;
  onSelect: (material: Material, quantity: number, source: 'project_group' | 'master_catalog') => void;
  onClose: () => void;
}

export const MaterialPicker: React.FC<MaterialPickerProps> = ({ projectId, onSelect, onClose }) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [activeTab, setActiveTab] = useState<'project' | 'catalog'>('project');
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [quantity, setQuantity] = useState(1);

  const categories = ['Concrete', 'Steel', 'Lumber', 'Electrical', 'Plumbing', 'Tools', 'Safety', 'Other'];

  useEffect(() => {
    fetchMaterials();
  }, [activeTab, projectId]);

  const fetchMaterials = async () => {
    if (!db) return;

    setLoading(true);
    try {
      let q;
      if (activeTab === 'project') {
        // Fetch project-specific materials (this would need project material groups)
        // For now, we'll show all materials but mark them as project materials
        q = query(
          collection(db, 'materials'),
          where('isActive', '==', true),
          orderBy('name')
        );
      } else {
        // Fetch master catalog materials
        q = query(
          collection(db, 'materials'),
          where('isActive', '==', true),
          orderBy('name')
        );
      }
      
      const querySnapshot = await getDocs(q);
      const materialsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as Material[];

      setMaterials(materialsData);
    } catch (error) {
      console.error('Error fetching materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMaterials = materials.filter(material => {
    const matchesSearch = material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         material.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || material.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSelectMaterial = (material: Material) => {
    setSelectedMaterial(material);
  };

  const handleConfirmSelection = () => {
    if (selectedMaterial && quantity > 0) {
      onSelect(selectedMaterial, quantity, activeTab === 'project' ? 'project_group' : 'master_catalog');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Select Material</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('project')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'project'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Project Materials
            </button>
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'catalog'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Master Catalog
            </button>
          </nav>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-200 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search materials..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="sm:w-48">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col lg:flex-row h-96">
          {/* Materials List */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : filteredMaterials.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No materials found</p>
                <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredMaterials.map((material) => (
                  <div
                    key={material.id}
                    onClick={() => handleSelectMaterial(material)}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedMaterial?.id === material.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{material.name}</h4>
                        <p className="text-sm text-gray-600">{material.description}</p>
                        <div className="flex items-center mt-2 space-x-4">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {material.category}
                          </span>
                          <span className="text-sm text-gray-500">
                            Unit: {material.unit}
                          </span>
                          {material.unitPrice && (
                            <span className="text-sm text-gray-500">
                              ${material.unitPrice.toFixed(2)}/{material.unit}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selection Panel */}
          {selectedMaterial && (
            <div className="lg:w-80 border-l border-gray-200 p-4">
              <h4 className="font-medium text-gray-900 mb-4">Selected Material</h4>
              
              <div className="space-y-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h5 className="font-medium text-gray-900">{selectedMaterial.name}</h5>
                  <p className="text-sm text-gray-600 mt-1">{selectedMaterial.description}</p>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-gray-500">Category: {selectedMaterial.category}</p>
                    <p className="text-sm text-gray-500">Unit: {selectedMaterial.unit}</p>
                    {selectedMaterial.unitPrice && (
                      <p className="text-sm text-gray-500">
                        Price: ${selectedMaterial.unitPrice.toFixed(2)}/{selectedMaterial.unit}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity ({selectedMaterial.unit})
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {selectedMaterial.unitPrice && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-900">
                      Estimated Cost: ${(selectedMaterial.unitPrice * quantity).toFixed(2)}
                    </p>
                  </div>
                )}

                <button
                  onClick={handleConfirmSelection}
                  disabled={quantity <= 0}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add to Requisition
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
