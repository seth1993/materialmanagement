import { writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  BOMRow, 
  BOMImportResult, 
  Material,
  MaterialGroup 
} from '@/types/project';
import { 
  findOrCreateMaterialGroup, 
  createMaterial, 
  getMaterialsBySku, 
  updateMaterial 
} from './project-operations';

export interface BOMImportOptions {
  updateExisting?: boolean;
  skipDuplicates?: boolean;
  batchSize?: number;
}

const DEFAULT_IMPORT_OPTIONS: BOMImportOptions = {
  updateExisting: true,
  skipDuplicates: false,
  batchSize: 500, // Firestore batch limit
};

export const importBOMData = async (
  projectId: string,
  bomRows: BOMRow[],
  options: BOMImportOptions = DEFAULT_IMPORT_OPTIONS
): Promise<BOMImportResult> => {
  if (!db) {
    throw new Error('Firebase not configured');
  }

  const result: BOMImportResult = {
    success: false,
    totalRows: bomRows.length,
    successfulRows: 0,
    skippedRows: 0,
    errors: [],
    createdGroups: 0,
    createdMaterials: 0,
    updatedMaterials: 0,
  };

  if (bomRows.length === 0) {
    result.success = true;
    return result;
  }

  try {
    // Group rows by material group name for efficient processing
    const groupedRows = bomRows.reduce((acc, row) => {
      const groupName = row.groupName;
      if (!acc[groupName]) {
        acc[groupName] = [];
      }
      acc[groupName].push(row);
      return acc;
    }, {} as Record<string, BOMRow[]>);

    const createdGroups = new Set<string>();
    const processedMaterials = new Set<string>();

    // Process each group
    for (const [groupName, rows] of Object.entries(groupedRows)) {
      try {
        // Find or create material group
        const groupId = await findOrCreateMaterialGroup(projectId, groupName);
        
        if (!createdGroups.has(groupName)) {
          createdGroups.add(groupName);
          result.createdGroups++;
        }

        // Process materials in this group
        for (const row of rows) {
          try {
            const materialKey = `${projectId}-${row.materialSku}`;
            
            // Skip if we've already processed this material in this import
            if (processedMaterials.has(materialKey)) {
              result.skippedRows++;
              result.errors.push({
                rowNumber: row.rowNumber,
                errors: ['Duplicate SKU in import file'],
                data: row,
              });
              continue;
            }

            processedMaterials.add(materialKey);

            // Check if material already exists
            const existingMaterials = await getMaterialsBySku(projectId, row.materialSku);
            
            if (existingMaterials.length > 0) {
              if (options.skipDuplicates) {
                result.skippedRows++;
                result.errors.push({
                  rowNumber: row.rowNumber,
                  errors: ['Material with this SKU already exists'],
                  data: row,
                });
                continue;
              } else if (options.updateExisting) {
                // Update existing material
                const existingMaterial = existingMaterials[0];
                await updateMaterial(existingMaterial.id, {
                  materialGroupId: groupId,
                  name: row.materialName,
                  description: row.description || '',
                  quantity: row.quantity,
                  unit: row.unit,
                  category: row.category || '',
                });
                result.updatedMaterials++;
                result.successfulRows++;
              } else {
                result.skippedRows++;
                result.errors.push({
                  rowNumber: row.rowNumber,
                  errors: ['Material with this SKU already exists and update is disabled'],
                  data: row,
                });
                continue;
              }
            } else {
              // Create new material
              const materialData: Omit<Material, 'id' | 'createdAt' | 'updatedAt'> = {
                projectId,
                materialGroupId: groupId,
                sku: row.materialSku,
                name: row.materialName,
                description: row.description || '',
                quantity: row.quantity,
                unit: row.unit,
                category: row.category || '',
              };

              await createMaterial(materialData);
              result.createdMaterials++;
              result.successfulRows++;
            }
          } catch (error) {
            console.error(`Error processing material ${row.materialSku}:`, error);
            result.errors.push({
              rowNumber: row.rowNumber,
              errors: [error instanceof Error ? error.message : 'Unknown error'],
              data: row,
            });
          }
        }
      } catch (error) {
        console.error(`Error processing group ${groupName}:`, error);
        // Add errors for all rows in this group
        rows.forEach(row => {
          result.errors.push({
            rowNumber: row.rowNumber,
            errors: [error instanceof Error ? error.message : 'Unknown error'],
            data: row,
          });
        });
      }
    }

    result.skippedRows = result.totalRows - result.successfulRows;
    result.success = result.errors.length === 0 || result.successfulRows > 0;

  } catch (error) {
    console.error('BOM import failed:', error);
    result.errors.push({
      rowNumber: 0,
      errors: [error instanceof Error ? error.message : 'Import failed'],
      data: {},
    });
  }

  return result;
};

export const validateBOMImport = async (
  projectId: string,
  bomRows: BOMRow[]
): Promise<{
  isValid: boolean;
  errors: Array<{
    rowNumber: number;
    errors: string[];
    data: Partial<BOMRow>;
  }>;
  duplicateSkus: string[];
  existingSkus: string[];
}> => {
  const errors: Array<{
    rowNumber: number;
    errors: string[];
    data: Partial<BOMRow>;
  }> = [];
  
  const duplicateSkus: string[] = [];
  const existingSkus: string[] = [];
  const seenSkus = new Set<string>();

  // Check for duplicate SKUs within the import
  for (const row of bomRows) {
    if (seenSkus.has(row.materialSku)) {
      duplicateSkus.push(row.materialSku);
      errors.push({
        rowNumber: row.rowNumber,
        errors: ['Duplicate SKU in import file'],
        data: row,
      });
    } else {
      seenSkus.add(row.materialSku);
    }
  }

  // Check for existing SKUs in the database
  try {
    const uniqueSkus = Array.from(seenSkus);
    for (const sku of uniqueSkus) {
      const existingMaterials = await getMaterialsBySku(projectId, sku);
      if (existingMaterials.length > 0) {
        existingSkus.push(sku);
      }
    }
  } catch (error) {
    console.error('Error checking existing SKUs:', error);
    errors.push({
      rowNumber: 0,
      errors: ['Failed to validate existing materials'],
      data: {},
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    duplicateSkus,
    existingSkus,
  };
};

export const previewBOMImport = async (
  projectId: string,
  bomRows: BOMRow[]
): Promise<{
  groupsToCreate: string[];
  materialsToCreate: number;
  materialsToUpdate: number;
  validation: Awaited<ReturnType<typeof validateBOMImport>>;
}> => {
  const validation = await validateBOMImport(projectId, bomRows);
  
  // Get unique group names
  const uniqueGroups = Array.from(new Set(bomRows.map(row => row.groupName)));
  
  // Count materials to create vs update
  let materialsToCreate = 0;
  let materialsToUpdate = 0;
  
  for (const row of bomRows) {
    if (validation.existingSkus.includes(row.materialSku)) {
      materialsToUpdate++;
    } else {
      materialsToCreate++;
    }
  }

  return {
    groupsToCreate: uniqueGroups,
    materialsToCreate,
    materialsToUpdate,
    validation,
  };
};

export const createBOMImportSummary = (result: BOMImportResult): string => {
  const lines: string[] = [];
  
  lines.push(`BOM Import ${result.success ? 'Completed' : 'Failed'}`);
  lines.push(`Total rows processed: ${result.totalRows}`);
  lines.push(`Successful rows: ${result.successfulRows}`);
  lines.push(`Skipped rows: ${result.skippedRows}`);
  lines.push(`Created groups: ${result.createdGroups}`);
  lines.push(`Created materials: ${result.createdMaterials}`);
  lines.push(`Updated materials: ${result.updatedMaterials}`);
  
  if (result.errors.length > 0) {
    lines.push(`\nErrors (${result.errors.length}):`);
    result.errors.forEach(error => {
      lines.push(`Row ${error.rowNumber}: ${error.errors.join(', ')}`);
    });
  }
  
  return lines.join('\n');
};
