import { ExtendedMaterial, ExportData, AnalyticsFilters, KPIData } from '@/types/analytics';

export class CSVExportService {
  
  /**
   * Convert materials data to CSV format
   */
  static materialsToCSV(materials: ExtendedMaterial[]): string {
    const headers = [
      'ID',
      'Name',
      'Quantity',
      'Category',
      'Vendor',
      'Unit Price',
      'Total Value',
      'Cost',
      'Lead Time (Days)',
      'Project',
      'Trade',
      'Status',
      'Created Date',
      'Expected Delivery',
      'Actual Delivery',
      'On Time',
      'User ID'
    ];

    const rows = materials.map(material => [
      material.id,
      material.name,
      material.quantity.toString(),
      material.category || '',
      material.vendor || '',
      material.unitPrice?.toFixed(2) || '',
      material.totalValue?.toFixed(2) || '',
      material.cost?.toFixed(2) || '',
      material.leadTime?.toString() || '',
      material.project || '',
      material.trade || '',
      material.status,
      material.createdAt.toISOString().split('T')[0],
      material.expectedDeliveryDate?.toISOString().split('T')[0] || '',
      material.deliveryDate?.toISOString().split('T')[0] || '',
      this.isOnTime(material) ? 'Yes' : 'No',
      material.userId
    ]);

    return this.arrayToCSV([headers, ...rows]);
  }

  /**
   * Create comprehensive export data with summary
   */
  static createExportData(
    materials: ExtendedMaterial[], 
    kpis: KPIData, 
    filters?: AnalyticsFilters
  ): ExportData {
    return {
      materials,
      summary: kpis,
      exportDate: new Date(),
      filters: filters || {
        dateRange: {
          start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          end: new Date()
        }
      }
    };
  }

  /**
   * Generate summary CSV with KPIs
   */
  static summaryToCSV(kpis: KPIData, filters?: AnalyticsFilters): string {
    const summaryData = [
      ['Metric', 'Value'],
      ['Total Spend', `$${kpis.totalSpend.toFixed(2)}`],
      ['Total Materials', kpis.totalMaterials.toString()],
      ['Average Lead Time (Days)', kpis.averageLeadTime.toFixed(1)],
      ['On-Time Delivery %', `${kpis.onTimeDeliveryPercentage.toFixed(1)}%`],
      ['Top Vendor by Spend', kpis.topVendorBySpend.vendor],
      ['Top Vendor Spend Amount', `$${kpis.topVendorBySpend.amount.toFixed(2)}`],
      ['Top Material by Spend', kpis.topMaterialBySpend.material],
      ['Top Material Spend Amount', `$${kpis.topMaterialBySpend.amount.toFixed(2)}`],
      [''],
      ['Export Information', ''],
      ['Export Date', new Date().toISOString().split('T')[0]],
      ['Date Range Start', filters?.dateRange.start.toISOString().split('T')[0] || 'N/A'],
      ['Date Range End', filters?.dateRange.end.toISOString().split('T')[0] || 'N/A'],
      ['Trade Filter', filters?.trade || 'All'],
      ['Vendor Filter', filters?.vendor || 'All'],
      ['Project Filter', filters?.project || 'All'],
      ['Status Filter', filters?.status || 'All']
    ];

    return this.arrayToCSV(summaryData);
  }

  /**
   * Download CSV file
   */
  static downloadCSV(csvContent: string, filename: string): void {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Export materials data as CSV
   */
  static exportMaterials(materials: ExtendedMaterial[], filename?: string): void {
    const csv = this.materialsToCSV(materials);
    const defaultFilename = `materials-export-${new Date().toISOString().split('T')[0]}.csv`;
    this.downloadCSV(csv, filename || defaultFilename);
  }

  /**
   * Export summary data as CSV
   */
  static exportSummary(kpis: KPIData, filters?: AnalyticsFilters, filename?: string): void {
    const csv = this.summaryToCSV(kpis, filters);
    const defaultFilename = `materials-summary-${new Date().toISOString().split('T')[0]}.csv`;
    this.downloadCSV(csv, filename || defaultFilename);
  }

  /**
   * Export complete analytics package (materials + summary)
   */
  static exportComplete(
    materials: ExtendedMaterial[], 
    kpis: KPIData, 
    filters?: AnalyticsFilters
  ): void {
    // Export materials
    this.exportMaterials(materials, `materials-data-${new Date().toISOString().split('T')[0]}.csv`);
    
    // Export summary
    setTimeout(() => {
      this.exportSummary(kpis, filters, `materials-summary-${new Date().toISOString().split('T')[0]}.csv`);
    }, 500); // Small delay to prevent browser blocking multiple downloads
  }

  /**
   * Helper: Convert 2D array to CSV string
   */
  private static arrayToCSV(data: string[][]): string {
    return data
      .map(row => 
        row.map(cell => {
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        }).join(',')
      )
      .join('\n');
  }

  /**
   * Helper: Check if material was delivered on time
   */
  private static isOnTime(material: ExtendedMaterial): boolean {
    if (!material.deliveryDate || !material.expectedDeliveryDate) {
      return false;
    }
    return material.deliveryDate <= material.expectedDeliveryDate;
  }

  /**
   * Generate filename with current date and filters
   */
  static generateFilename(prefix: string, filters?: AnalyticsFilters): string {
    const date = new Date().toISOString().split('T')[0];
    let suffix = '';
    
    if (filters) {
      const filterParts = [];
      if (filters.trade) filterParts.push(`trade-${filters.trade}`);
      if (filters.vendor) filterParts.push(`vendor-${filters.vendor.replace(/\s+/g, '-')}`);
      if (filters.project) filterParts.push(`project-${filters.project.replace(/\s+/g, '-')}`);
      if (filters.status) filterParts.push(`status-${filters.status}`);
      
      if (filterParts.length > 0) {
        suffix = `-${filterParts.join('-')}`;
      }
    }
    
    return `${prefix}-${date}${suffix}.csv`;
  }
}
