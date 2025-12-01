import { useState, useEffect } from 'react';
import { Material } from '@/types/domain';
import { materialService } from '@/services/MaterialService';
import { useAuth } from '@/hooks/useAuth';

export interface UseMaterialsOptions {
  organizationId?: string;
  category?: string;
  activeOnly?: boolean;
  autoFetch?: boolean;
}

export interface UseMaterialsReturn {
  materials: Material[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createMaterial: (data: Omit<Material, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>) => Promise<string>;
  updateMaterial: (id: string, data: Partial<Omit<Material, 'id' | 'createdAt' | 'createdBy'>>) => Promise<void>;
  deleteMaterial: (id: string) => Promise<void>;
  searchMaterials: (searchTerm: string) => Promise<Material[]>;
  getCategories: () => Promise<string[]>;
  getUnits: () => Promise<string[]>;
}

export function useMaterials(options: UseMaterialsOptions = {}): UseMaterialsReturn {
  const { user } = useAuth();
  const {
    organizationId,
    category,
    activeOnly = true,
    autoFetch = true
  } = options;

  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMaterials = async () => {
    if (!user) {
      setMaterials([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let result: Material[];

      if (category) {
        result = await materialService.getByCategory(category, organizationId || user.organizationId);
      } else if (activeOnly) {
        result = await materialService.getActiveByOrganizationId(organizationId || user.organizationId);
      } else {
        result = await materialService.getByOrganizationId(organizationId || user.organizationId);
      }

      setMaterials(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch materials';
      setError(errorMessage);
      console.error('Error fetching materials:', err);
    } finally {
      setLoading(false);
    }
  };

  const createMaterial = async (data: Omit<Material, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>): Promise<string> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const materialData = {
        ...data,
        organizationId: data.organizationId || user.organizationId
      };

      const id = await materialService.create(materialData, user.uid);
      await fetchMaterials(); // Refresh the list
      return id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create material';
      setError(errorMessage);
      throw err;
    }
  };

  const updateMaterial = async (id: string, data: Partial<Omit<Material, 'id' | 'createdAt' | 'createdBy'>>): Promise<void> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      await materialService.update(id, data, user.uid);
      await fetchMaterials(); // Refresh the list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update material';
      setError(errorMessage);
      throw err;
    }
  };

  const deleteMaterial = async (id: string): Promise<void> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      await materialService.softDelete(id, user.uid);
      await fetchMaterials(); // Refresh the list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete material';
      setError(errorMessage);
      throw err;
    }
  };

  const searchMaterials = async (searchTerm: string): Promise<Material[]> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      return await materialService.search(searchTerm, organizationId || user.organizationId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search materials';
      setError(errorMessage);
      throw err;
    }
  };

  const getCategories = async (): Promise<string[]> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      return await materialService.getCategories(organizationId || user.organizationId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get categories';
      setError(errorMessage);
      throw err;
    }
  };

  const getUnits = async (): Promise<string[]> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      return await materialService.getUnits(organizationId || user.organizationId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get units';
      setError(errorMessage);
      throw err;
    }
  };

  useEffect(() => {
    if (autoFetch && user) {
      fetchMaterials();
    }
  }, [user, organizationId, category, activeOnly, autoFetch]);

  return {
    materials,
    loading,
    error,
    refetch: fetchMaterials,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    searchMaterials,
    getCategories,
    getUnits
  };
}
