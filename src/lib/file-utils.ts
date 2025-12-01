export const SUPPORTED_FILE_TYPES = {
  CSV: 'text/csv',
  EXCEL: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  EXCEL_LEGACY: 'application/vnd.ms-excel',
} as const;

export const SUPPORTED_EXTENSIONS = ['.csv', '.xlsx', '.xls'] as const;

export type SupportedFileType = typeof SUPPORTED_FILE_TYPES[keyof typeof SUPPORTED_FILE_TYPES];
export type SupportedExtension = typeof SUPPORTED_EXTENSIONS[number];

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  fileType?: 'csv' | 'excel';
}

export const validateFile = (file: File): FileValidationResult => {
  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'File size must be less than 10MB',
    };
  }

  // Check file type
  const fileName = file.name.toLowerCase();
  const fileType = file.type;

  if (fileName.endsWith('.csv') || fileType === SUPPORTED_FILE_TYPES.CSV) {
    return {
      isValid: true,
      fileType: 'csv',
    };
  }

  if (
    fileName.endsWith('.xlsx') || 
    fileName.endsWith('.xls') ||
    fileType === SUPPORTED_FILE_TYPES.EXCEL ||
    fileType === SUPPORTED_FILE_TYPES.EXCEL_LEGACY
  ) {
    return {
      isValid: true,
      fileType: 'excel',
    };
  }

  return {
    isValid: false,
    error: 'File must be a CSV (.csv) or Excel (.xlsx, .xls) file',
  };
};

export const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result instanceof ArrayBuffer) {
        resolve(e.target.result);
      } else {
        reject(new Error('Failed to read file as ArrayBuffer'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
};

export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === 'string') {
        resolve(e.target.result);
      } else {
        reject(new Error('Failed to read file as text'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getFileExtension = (filename: string): string => {
  return filename.slice(filename.lastIndexOf('.')).toLowerCase();
};
