import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  ExtendedMaterial, 
  AnalyticsFilters, 
  AnalyticsData, 
  KPIData,
  SpendByVendorData,
  MaterialsByCategoryData,
  DeliveryPerformanceData
} from '@/types/analytics';

export class AnalyticsService {
  
  /**
   * Fetch all materials data for analytics (org-wide)
   */
  static async fetchAllMaterials(filters?: AnalyticsFilters): Promise<ExtendedMaterial[]> {
    if (!db) {
      console.warn('Firebase not configured. Returning sample data.');
      return this.getSampleMaterials();
    }

    try {
      let q = query(collection(db, 'materials'));
      
      // Apply date range filter if provided
      if (filters?.dateRange) {
        q = query(q, 
          where('createdAt', '>=', Timestamp.fromDate(filters.dateRange.start)),
          where('createdAt', '<=', Timestamp.fromDate(filters.dateRange.end))
        );
      }

      const querySnapshot = await getDocs(q);
      let materials = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        deliveryDate: doc.data().deliveryDate?.toDate(),
        expectedDeliveryDate: doc.data().expectedDeliveryDate?.toDate(),
      })) as ExtendedMaterial[];

      // Apply additional filters
      if (filters) {
        materials = this.applyFilters(materials, filters);
      }

      return materials;
    } catch (error) {
      console.error('Error fetching materials for analytics:', error);
      return this.getSampleMaterials();
    }
  }

  /**
   * Apply client-side filters to materials data
   */
  private static applyFilters(materials: ExtendedMaterial[], filters: AnalyticsFilters): ExtendedMaterial[] {
    return materials.filter(material => {
      if (filters.trade && material.trade !== filters.trade) return false;
      if (filters.vendor && material.vendor !== filters.vendor) return false;
      if (filters.project && material.project !== filters.project) return false;
      if (filters.status && material.status !== filters.status) return false;
      return true;
    });
  }

  /**
   * Calculate KPI data from materials
   */
  static calculateKPIs(materials: ExtendedMaterial[]): KPIData {
    const totalSpend = materials.reduce((sum, m) => sum + (m.totalValue || m.cost || 0), 0);
    const totalMaterials = materials.length;
    
    // Calculate average lead time
    const materialsWithLeadTime = materials.filter(m => m.leadTime);
    const averageLeadTime = materialsWithLeadTime.length > 0 
      ? materialsWithLeadTime.reduce((sum, m) => sum + (m.leadTime || 0), 0) / materialsWithLeadTime.length
      : 0;

    // Calculate on-time delivery percentage
    const deliveredMaterials = materials.filter(m => m.deliveryDate && m.expectedDeliveryDate);
    const onTimeMaterials = deliveredMaterials.filter(m => 
      m.deliveryDate && m.expectedDeliveryDate && m.deliveryDate <= m.expectedDeliveryDate
    );
    const onTimeDeliveryPercentage = deliveredMaterials.length > 0 
      ? (onTimeMaterials.length / deliveredMaterials.length) * 100 
      : 0;

    // Find top vendor by spend
    const vendorSpend = this.calculateSpendByVendor(materials);
    const topVendorBySpend = vendorSpend.length > 0 
      ? { vendor: vendorSpend[0].vendor, amount: vendorSpend[0].amount }
      : { vendor: 'N/A', amount: 0 };

    // Find top material by spend
    const materialSpend = materials.map(m => ({
      material: m.name,
      amount: m.totalValue || m.cost || 0
    })).sort((a, b) => b.amount - a.amount);
    
    const topMaterialBySpend = materialSpend.length > 0
      ? { material: materialSpend[0].material, amount: materialSpend[0].amount }
      : { material: 'N/A', amount: 0 };

    return {
      totalSpend,
      totalMaterials,
      averageLeadTime,
      onTimeDeliveryPercentage,
      topVendorBySpend,
      topMaterialBySpend
    };
  }

  /**
   * Calculate spend by vendor
   */
  static calculateSpendByVendor(materials: ExtendedMaterial[]): SpendByVendorData[] {
    const vendorMap = new Map<string, number>();
    let totalSpend = 0;

    materials.forEach(material => {
      const vendor = material.vendor || 'Unknown';
      const spend = material.totalValue || material.cost || 0;
      vendorMap.set(vendor, (vendorMap.get(vendor) || 0) + spend);
      totalSpend += spend;
    });

    return Array.from(vendorMap.entries())
      .map(([vendor, amount]) => ({
        vendor,
        amount,
        percentage: totalSpend > 0 ? (amount / totalSpend) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  /**
   * Calculate materials by category
   */
  static calculateMaterialsByCategory(materials: ExtendedMaterial[]): MaterialsByCategoryData[] {
    const categoryMap = new Map<string, { count: number; value: number }>();

    materials.forEach(material => {
      const category = material.category || 'Uncategorized';
      const value = material.totalValue || material.cost || 0;
      const existing = categoryMap.get(category) || { count: 0, value: 0 };
      categoryMap.set(category, {
        count: existing.count + 1,
        value: existing.value + value
      });
    });

    return Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        count: data.count,
        value: data.value
      }))
      .sort((a, b) => b.value - a.value);
  }

  /**
   * Calculate delivery performance by month
   */
  static calculateDeliveryPerformance(materials: ExtendedMaterial[]): DeliveryPerformanceData[] {
    const monthMap = new Map<string, { onTime: number; delayed: number; total: number }>();

    materials
      .filter(m => m.deliveryDate && m.expectedDeliveryDate)
      .forEach(material => {
        const month = material.deliveryDate!.toISOString().substring(0, 7); // YYYY-MM
        const isOnTime = material.deliveryDate! <= material.expectedDeliveryDate!;
        
        const existing = monthMap.get(month) || { onTime: 0, delayed: 0, total: 0 };
        monthMap.set(month, {
          onTime: existing.onTime + (isOnTime ? 1 : 0),
          delayed: existing.delayed + (isOnTime ? 0 : 1),
          total: existing.total + 1
        });
      });

    return Array.from(monthMap.entries())
      .map(([month, data]) => ({
        month,
        onTime: data.onTime,
        delayed: data.delayed,
        total: data.total,
        onTimePercentage: data.total > 0 ? (data.onTime / data.total) * 100 : 0
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * Get comprehensive analytics data
   */
  static async getAnalyticsData(filters?: AnalyticsFilters): Promise<AnalyticsData> {
    const materials = await this.fetchAllMaterials(filters);
    
    return {
      kpis: this.calculateKPIs(materials),
      spendByVendor: this.calculateSpendByVendor(materials),
      materialsByCategory: this.calculateMaterialsByCategory(materials),
      deliveryPerformance: this.calculateDeliveryPerformance(materials),
      topMaterialsBySpend: materials
        .map(m => ({
          name: m.name,
          vendor: m.vendor || 'Unknown',
          totalSpend: m.totalValue || m.cost || 0,
          quantity: m.quantity
        }))
        .sort((a, b) => b.totalSpend - a.totalSpend)
        .slice(0, 10)
    };
  }

  /**
   * Get unique values for filter options
   */
  static async getFilterOptions(): Promise<{
    trades: string[];
    vendors: string[];
    projects: string[];
  }> {
    const materials = await this.fetchAllMaterials();
    
    return {
      trades: [...new Set(materials.map(m => m.trade).filter(Boolean))],
      vendors: [...new Set(materials.map(m => m.vendor).filter(Boolean))],
      projects: [...new Set(materials.map(m => m.project).filter(Boolean))]
    };
  }

  /**
   * Generate sample data for demo purposes
   */
  private static getSampleMaterials(): ExtendedMaterial[] {
    const vendors = ['ABC Supply', 'BuildCorp', 'MaterialsPlus', 'ProSupply', 'TradeMart'];
    const categories = ['Lumber', 'Steel', 'Concrete', 'Electrical', 'Plumbing'];
    const trades = ['Carpentry', 'Electrical', 'Plumbing', 'HVAC', 'General'];
    const projects = ['Project Alpha', 'Project Beta', 'Project Gamma', 'Project Delta'];
    const statuses = ['delivered', 'in-transit', 'ordered', 'delayed'] as const;

    return Array.from({ length: 50 }, (_, i) => {
      const createdAt = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000);
      const expectedDeliveryDate = new Date(createdAt.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000);
      const deliveryDate = Math.random() > 0.3 ? new Date(expectedDeliveryDate.getTime() + (Math.random() - 0.7) * 7 * 24 * 60 * 60 * 1000) : undefined;
      const unitPrice = Math.random() * 1000 + 10;
      const quantity = Math.floor(Math.random() * 100) + 1;

      return {
        id: `sample-${i}`,
        name: `Material ${i + 1}`,
        quantity,
        category: categories[Math.floor(Math.random() * categories.length)],
        createdAt,
        userId: `user-${Math.floor(Math.random() * 5)}`,
        vendor: vendors[Math.floor(Math.random() * vendors.length)],
        cost: unitPrice * quantity,
        leadTime: Math.floor(Math.random() * 30) + 1,
        deliveryDate,
        expectedDeliveryDate,
        project: projects[Math.floor(Math.random() * projects.length)],
        trade: trades[Math.floor(Math.random() * trades.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        unitPrice,
        totalValue: unitPrice * quantity
      };
    });
  }
}
