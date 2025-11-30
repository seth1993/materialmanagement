'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Material {
  id: string;
  name: string;
  quantity: number;
  category: string;
  createdAt: Date;
}

export default function MaterialList() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [newMaterial, setNewMaterial] = useState({
    name: '',
    quantity: 0,
    category: '',
  });
  const [loading, setLoading] = useState(false);

  // Fetch materials from Firestore
  const fetchMaterials = async () => {
    if (!db) {
      console.warn('Firebase not configured. Using demo data.');
      setMaterials([
        {
          id: 'demo-1',
          name: 'Steel Beams',
          quantity: 50,
          category: 'Construction',
          createdAt: new Date(),
        },
        {
          id: 'demo-2',
          name: 'Concrete Mix',
          quantity: 100,
          category: 'Construction',
          createdAt: new Date(),
        },
      ]);
      return;
    }

    try {
      const querySnapshot = await getDocs(collection(db, 'materials'));
      const materialsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Material[];
      setMaterials(materialsData);
    } catch (error) {
      console.error('Error fetching materials:', error);
    }
  };

  // Add new material to Firestore
  const addMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMaterial.name || !newMaterial.category) return;

    if (!db) {
      alert('Firebase not configured. This is a demo version.');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'materials'), {
        ...newMaterial,
        createdAt: new Date(),
      });
      setNewMaterial({ name: '', quantity: 0, category: '' });
      fetchMaterials();
    } catch (error) {
      console.error('Error adding material:', error);
    } finally {
      setLoading(false);
    }
  };

  // Delete material from Firestore
  const deleteMaterial = async (id: string) => {
    if (!db) {
      alert('Firebase not configured. This is a demo version.');
      return;
    }

    try {
      await deleteDoc(doc(db, 'materials', id));
      fetchMaterials();
    } catch (error) {
      console.error('Error deleting material:', error);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Material Management</h1>
      
      {/* Add Material Form */}
      <form onSubmit={addMaterial} className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Add New Material</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Material Name"
            value={newMaterial.name}
            onChange={(e) => setNewMaterial({ ...newMaterial, name: e.target.value })}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="number"
            placeholder="Quantity"
            value={newMaterial.quantity}
            onChange={(e) => setNewMaterial({ ...newMaterial, quantity: parseInt(e.target.value) || 0 })}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
          />
          <input
            type="text"
            placeholder="Category"
            value={newMaterial.category}
            onChange={(e) => setNewMaterial({ ...newMaterial, category: e.target.value })}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Adding...' : 'Add Material'}
        </button>
      </form>

      {/* Materials List */}
      <div className="bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-semibold p-6 border-b">Materials Inventory</h2>
        {materials.length === 0 ? (
          <p className="p-6 text-gray-500">No materials found. Add some materials to get started!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {materials.map((material) => (
                  <tr key={material.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {material.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {material.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {material.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {material.createdAt.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => deleteMaterial(material.id)}
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
}
