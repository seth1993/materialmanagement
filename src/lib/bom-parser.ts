import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { 
  BOMRow, 
  BOMValidationError, 
  REQUIRED_BOM_COLUMNS, 
  OPTIONAL_BOM_COLUMNS,
  BOMColumn 
} from '@/types/project';
import { readFileAsArrayBuffer, readFileAsText, validateFile } from './file-utils';

export interface ParsedBOMData {
  rows: BOMRow[];
  errors: BOMValidationError[];
  totalRows: number;
  validRows: number;
  headers: string[];
}

export interface BOMParseOptions {
  skipEmptyRows?: boolean;
  trimWhitespace?: boolean;
  validateRequired?: boolean;
}

const DEFAULT_OPTIONS: BOMParseOptions = {
  skipEmptyRows: true,
  trimWhitespace: true,
  validateRequired: true,
};

// Column mapping for flexible header names
const COLUMN_MAPPINGS: Record<string, BOMColumn> = {
  // Group name variations
  'group': 'groupName',
  'group name': 'groupName',
  'groupname': 'groupName',
  'material group': 'groupName',
  'materialgroup': 'groupName',
  'category': 'groupName',
  
  // Material SKU variations
  'sku': 'materialSku',
  'material sku': 'materialSku',
  'materialsku': 'materialSku',
  'part number': 'materialSku',
  'partnumber': 'materialSku',
  'part no': 'materialSku',
  'partno': 'materialSku',
  'item code': 'materialSku',
  'itemcode': 'materialSku',
  'code': 'materialSku',
  
  // Material name variations
  'name': 'materialName',
  'material name': 'materialName',
  'materialname': 'materialName',
  'item name': 'materialName',
  'itemname': 'materialName',
  'part name': 'materialName',
  'partname': 'materialName',
  'title': 'materialName',
  
  // Description variations
  'description': 'description',
  'desc': 'description',
  'details': 'description',
  'notes': 'description',
  'comment': 'description',
  'comments': 'description',
  
  // Quantity variations
  'quantity': 'quantity',
  'qty': 'quantity',
  'amount': 'quantity',
  'count': 'quantity',
  'number': 'quantity',
  'num': 'quantity',
  
  // Unit variations
  'unit': 'unit',
  'units': 'unit',
  'uom': 'unit',
  'unit of measure': 'unit',
  'unitofmeasure': 'unit',
  'measurement': 'unit',
  
  // Category variations (optional)
  'type': 'category',
  'material type': 'category',
  'materialtype': 'category',
  'item type': 'category',
  'itemtype': 'category',
  'classification': 'category',
};

const normalizeHeader = (header: string): string => {
  return header.toLowerCase().trim().replace(/[_\s]+/g, ' ');
};

const mapHeaders = (headers: string[]): Record<number, BOMColumn> => {
  const mapping: Record<number, BOMColumn> = {};
  
  headers.forEach((header, index) => {
    const normalizedHeader = normalizeHeader(header);
    const mappedColumn = COLUMN_MAPPINGS[normalizedHeader];
    if (mappedColumn) {
      mapping[index] = mappedColumn;
    }
  });
  
  return mapping;
};

const validateBOMRow = (row: Partial<BOMRow>, rowNumber: number): BOMValidationError[] => {
  const errors: BOMValidationError[] = [];
  
  // Check required fields
  REQUIRED_BOM_COLUMNS.forEach(column => {
    const value = row[column];
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      errors.push({
        rowNumber,
        field: column,
        message: `${column} is required`,
        value,
      });
    }
  });
  
  // Validate quantity is a positive number
  if (row.quantity !== undefined) {
    const qty = Number(row.quantity);
    if (isNaN(qty) || qty <= 0) {
      errors.push({
        rowNumber,
        field: 'quantity',
        message: 'Quantity must be a positive number',
        value: row.quantity,
      });
    }
  }
  
  // Validate SKU format (basic validation)
  if (row.materialSku && typeof row.materialSku === 'string') {
    const sku = row.materialSku.trim();
    if (sku.length < 1 || sku.length > 50) {
      errors.push({
        rowNumber,
        field: 'materialSku',
        message: 'SKU must be between 1 and 50 characters',
        value: sku,
      });
    }
  }
  
  // Validate name length
  if (row.materialName && typeof row.materialName === 'string') {
    const name = row.materialName.trim();
    if (name.length < 1 || name.length > 200) {
      errors.push({
        rowNumber,
        field: 'materialName',
        message: 'Material name must be between 1 and 200 characters',
        value: name,
      });
    }
  }
  
  // Validate group name length
  if (row.groupName && typeof row.groupName === 'string') {
    const groupName = row.groupName.trim();
    if (groupName.length < 1 || groupName.length > 100) {
      errors.push({
        rowNumber,
        field: 'groupName',
        message: 'Group name must be between 1 and 100 characters',
        value: groupName,
      });
    }
  }
  
  return errors;
};

const processRawData = (
  rawData: string[][],
  options: BOMParseOptions = DEFAULT_OPTIONS
): ParsedBOMData => {
  if (rawData.length === 0) {
    return {
      rows: [],
      errors: [],
      totalRows: 0,
      validRows: 0,
      headers: [],
    };
  }
  
  const headers = rawData[0];
  const headerMapping = mapHeaders(headers);
  const dataRows = rawData.slice(1);
  
  const rows: BOMRow[] = [];
  const errors: BOMValidationError[] = [];
  
  // Check if we have the required column mappings
  const requiredMappings = REQUIRED_BOM_COLUMNS.filter(col => 
    Object.values(headerMapping).includes(col)
  );
  
  if (requiredMappings.length < REQUIRED_BOM_COLUMNS.length) {
    const missingColumns = REQUIRED_BOM_COLUMNS.filter(col => 
      !Object.values(headerMapping).includes(col)
    );
    
    errors.push({
      rowNumber: 0,
      field: 'headers',
      message: `Missing required columns: ${missingColumns.join(', ')}. Available headers: ${headers.join(', ')}`,
      value: headers,
    });
    
    return {
      rows: [],
      errors,
      totalRows: dataRows.length,
      validRows: 0,
      headers,
    };
  }
  
  dataRows.forEach((dataRow, index) => {
    const rowNumber = index + 2; // +2 because we skip header and arrays are 0-indexed
    
    // Skip empty rows if option is set
    if (options.skipEmptyRows && dataRow.every(cell => !cell || cell.trim() === '')) {
      return;
    }
    
    // Build BOM row from data
    const bomRow: Partial<BOMRow> = {
      rowNumber,
    };
    
    // Map data to BOM columns
    Object.entries(headerMapping).forEach(([colIndex, bomColumn]) => {
      let value = dataRow[parseInt(colIndex)] || '';
      
      if (options.trimWhitespace && typeof value === 'string') {
        value = value.trim();
      }
      
      // Type conversion for specific fields
      if (bomColumn === 'quantity') {
        const numValue = Number(value);
        bomRow[bomColumn] = isNaN(numValue) ? 0 : numValue;
      } else {
        bomRow[bomColumn] = value;
      }
    });
    
    // Validate the row
    const rowErrors = options.validateRequired ? validateBOMRow(bomRow, rowNumber) : [];
    
    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
    } else {
      // Only add valid rows
      rows.push(bomRow as BOMRow);
    }
  });
  
  return {
    rows,
    errors,
    totalRows: dataRows.length,
    validRows: rows.length,
    headers,
  };
};

export const parseCSVFile = async (
  file: File,
  options: BOMParseOptions = DEFAULT_OPTIONS
): Promise<ParsedBOMData> => {
  const validation = validateFile(file);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid file');
  }
  
  if (validation.fileType !== 'csv') {
    throw new Error('File must be a CSV file');
  }
  
  const csvText = await readFileAsText(file);
  
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      complete: (results) => {
        try {
          const parsedData = processRawData(results.data as string[][], options);
          resolve(parsedData);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(new Error(`CSV parsing error: ${error.message}`));
      },
      skipEmptyLines: options.skipEmptyRows,
    });
  });
};

export const parseExcelFile = async (
  file: File,
  options: BOMParseOptions = DEFAULT_OPTIONS
): Promise<ParsedBOMData> => {
  const validation = validateFile(file);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid file');
  }
  
  if (validation.fileType !== 'excel') {
    throw new Error('File must be an Excel file');
  }
  
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  
  // Use the first worksheet
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('Excel file contains no worksheets');
  }
  
  const worksheet = workbook.Sheets[firstSheetName];
  const rawData = XLSX.utils.sheet_to_json(worksheet, { 
    header: 1,
    defval: '',
    blankrows: !options.skipEmptyRows,
  }) as string[][];
  
  return processRawData(rawData, options);
};

export const parseBOMFile = async (
  file: File,
  options: BOMParseOptions = DEFAULT_OPTIONS
): Promise<ParsedBOMData> => {
  const validation = validateFile(file);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid file');
  }
  
  if (validation.fileType === 'csv') {
    return parseCSVFile(file, options);
  } else if (validation.fileType === 'excel') {
    return parseExcelFile(file, options);
  } else {
    throw new Error('Unsupported file type');
  }
};

export const generateBOMTemplate = (): string => {
  const headers = [
    'Group Name',
    'Material SKU',
    'Material Name',
    'Description',
    'Quantity',
    'Unit',
    'Category'
  ];
  
  const sampleRows = [
    ['Structural', 'STL-001', '2x4 Lumber', 'Pressure treated lumber', '10', 'pieces', 'Wood'],
    ['Structural', 'STL-002', 'Concrete Mix', '80lb concrete mix bag', '5', 'bags', 'Concrete'],
    ['Hardware', 'HW-001', 'Wood Screws', '3 inch wood screws', '100', 'pieces', 'Fasteners'],
    ['Hardware', 'HW-002', 'Bolts', '1/2 inch hex bolts', '20', 'pieces', 'Fasteners'],
  ];
  
  const csvContent = [headers, ...sampleRows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');
  
  return csvContent;
};
