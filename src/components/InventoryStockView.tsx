'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { 
  calculateMaterialBalances,
  getLocations,
  getLocationTypeLabel 
} from '@/lib/inventory-service';
import { MaterialBalance, InventoryFilter, LocationType } from '@/types/inventory';

export default function InventoryStockView() {
  const { user, loading: authLoading } = useAuth();
  const [balances, setBalances] = useState<MaterialBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<InventoryFilter>({
    showZeroQuantity: false
  });
  const [locations, setLocations] = useState<Array<{id: string, name: string, type: LocationType}>>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const [balanceData, locationData] = await Promise.all([
        calculateMaterialBalances(user.uid, filter),
        getLocations(user.uid)
      ]);
      
      setBalances(balanceData);
      setLocations(locationData.map(loc => ({ id: loc.id, name: loc.name, type: loc.type })));
    } catch (error) {
      console.error('Error fetching inventory data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, filter]);

  const handleFilterChange = (newFilter: Partial<InventoryFilter>) => {
    setFilter(prev => ({ ...prev, ...newFilter }));
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    handleFilterChange({ searchTerm: term || undefined });
  };

  const groupedBalances = balances.reduce((acc, balance) => {
    if (!acc[balance.materialName]) {
      acc[balance.materialName] = [];
    }
    acc[balance.materialName].push(balance);
    return acc;
  }, {} as Record<string, MaterialBalance[]>);

  const getTotalQuantity = (materialBalances: MaterialBalance[]) => {
    return materialBalances.reduce((sum, balance) => sum + balance.quantity, 0);
  };

  if (authLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6 text-center">
        <LoadingSpinner className="mx-auto mb-4" />
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto p-6 text-center">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">Inventory Stock View</h1>
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
          <p className="text-gray-600">Please sign in to view inventory stock levels.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Inventory Stock View</h1>
        <button
          onClick={fetchData}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Materials
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by material or location name..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Location Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Location
            </label>
            <select
              value={filter.locationIds?.[0] || ''}
              onChange={(e) => handleFilterChange({ 
                locationIds: e.target.value ? [e.target.value] : undefined 
              })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Locations</option>
              {locations.map(location => (
                <option key={location.id} value={location.id}>
                  {location.name} ({getLocationTypeLabel(location.type)})
                </option>
              ))}
            </select>
          </div>

          {/* Show Zero Quantity */}
          <div className="flex items-center">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filter.showZeroQuantity || false}
                onChange={(e) => handleFilterChange({ showZeroQuantity: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Show zero quantities</span>
            </label>
          </div>
        </div>
      </div>

      {/* Stock Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Total Materials</h3>
          <p className="text-3xl font-bold text-blue-600">{Object.keys(groupedBalances).length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Total Locations</h3>
          <p className="text-3xl font-bold text-green-600">{locations.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Stock Records</h3>
          <p className="text-3xl font-bold text-purple-600">{balances.length}</p>
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-semibold p-6 border-b">Material Stock by Location</h2>
        {loading ? (
          <div className="p-6 text-center">
            <LoadingSpinner className="mx-auto mb-4" />
            <p className="text-gray-600">Loading stock data...</p>
          </div>
        ) : Object.keys(groupedBalances).length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-500 mb-4">No stock data found.</p>
            <p className="text-sm text-gray-400">
              Add some inventory locations and record material movements to see stock levels here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Material
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location Breakdown
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Movement
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(groupedBalances).map(([materialName, materialBalances]) => (
                  <tr key={materialName}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {materialName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="font-semibold text-lg">
                        {getTotalQuantity(materialBalances)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="space-y-1">
                        {materialBalances.map((balance) => (
                          <div key={`${balance.materialId}-${balance.locationId}`} className="flex justify-between items-center">
                            <span className="text-sm">{balance.locationName}:</span>
                            <span className={`font-medium ${balance.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {balance.quantity}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {materialBalances.reduce((latest, balance) => {
                        if (!balance.lastMovementDate) return latest;
                        if (!latest || balance.lastMovementDate > latest) {
                          return balance.lastMovementDate;
                        }
                        return latest;
                      }, null as Date | null)?.toLocaleDateString() || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Location Summary */}
      {locations.length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow-md">
          <h2 className="text-xl font-semibold p-6 border-b">Location Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {locations.map(location => {
              const locationBalances = balances.filter(b => b.locationId === location.id);
              const totalItems = locationBalances.length;
              const totalQuantity = locationBalances.reduce((sum, b) => sum + b.quantity, 0);
              
              return (
                <div key={location.id} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800">{location.name}</h3>
                  <p className="text-sm text-gray-500 mb-2">
                    {getLocationTypeLabel(location.type)}
                  </p>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Materials:</span>
                      <span className="font-medium">{totalItems}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Qty:</span>
                      <span className="font-medium">{totalQuantity}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
