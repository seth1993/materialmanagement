// Purchase Order number generation service

import { 
  collection, 
  doc, 
  getDoc, 
  updateDoc, 
  setDoc,
  runTransaction
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  PONumberConfig, 
  ProcurementConfig 
} from '@/types/procurement';
import { 
  COLLECTIONS, 
  DEFAULT_PROCUREMENT_CONFIG,
  procurementConfigConverter
} from '@/lib/firestore-collections';

// Get or create procurement configuration for a user
export const getProcurementConfig = async (userId: string): Promise<ProcurementConfig> => {
  if (!db) return DEFAULT_PROCUREMENT_CONFIG;
  
  const configDocRef = doc(db, COLLECTIONS.PROCUREMENT_CONFIG, userId);
  const configSnap = await getDoc(configDocRef.withConverter(procurementConfigConverter));
  
  if (configSnap.exists()) {
    return configSnap.data();
  } else {
    // Create default config for new user
    const defaultConfig = { ...DEFAULT_PROCUREMENT_CONFIG };
    await setDoc(configDocRef.withConverter(procurementConfigConverter), defaultConfig);
    return defaultConfig;
  }
};

// Update procurement configuration
export const updateProcurementConfig = async (
  userId: string,
  updates: Partial<ProcurementConfig>
): Promise<void> => {
  if (!db) throw new Error('Firebase not configured');
  
  const configDocRef = doc(db, COLLECTIONS.PROCUREMENT_CONFIG, userId);
  await updateDoc(configDocRef, updates);
};

// Generate the next PO number using the configured format
export const generatePONumber = async (userId: string): Promise<string> => {
  if (!db) throw new Error('Firebase not configured');
  
  return runTransaction(db, async (transaction) => {
    const configDocRef = doc(db, COLLECTIONS.PROCUREMENT_CONFIG, userId);
    const configSnap = await transaction.get(configDocRef);
    
    let config: ProcurementConfig;
    
    if (configSnap.exists()) {
      config = configSnap.data() as ProcurementConfig;
    } else {
      // Create default config if it doesn't exist
      config = { ...DEFAULT_PROCUREMENT_CONFIG };
      transaction.set(configDocRef, config);
    }
    
    const poNumberConfig = config.poNumberFormat;
    const currentDate = new Date();
    
    // Build the PO number components
    let poNumber = poNumberConfig.prefix;
    
    // Add separator after prefix if needed
    if (poNumberConfig.prefix && poNumberConfig.separator) {
      poNumber += poNumberConfig.separator;
    }
    
    // Add year if configured
    if (poNumberConfig.includeYear) {
      poNumber += currentDate.getFullYear().toString();
      if (poNumberConfig.includeMonth || poNumberConfig.numberLength > 0) {
        poNumber += poNumberConfig.separator;
      }
    }
    
    // Add month if configured
    if (poNumberConfig.includeMonth) {
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      poNumber += month;
      if (poNumberConfig.numberLength > 0) {
        poNumber += poNumberConfig.separator;
      }
    }
    
    // Add the sequential number
    const sequentialNumber = String(poNumberConfig.currentCounter).padStart(
      poNumberConfig.numberLength, 
      '0'
    );
    poNumber += sequentialNumber;
    
    // Add suffix if configured
    if (poNumberConfig.suffix) {
      if (poNumberConfig.separator) {
        poNumber += poNumberConfig.separator;
      }
      poNumber += poNumberConfig.suffix;
    }
    
    // Increment the counter for next time
    const updatedConfig = {
      ...config,
      poNumberFormat: {
        ...poNumberConfig,
        currentCounter: poNumberConfig.currentCounter + 1
      }
    };
    
    transaction.update(configDocRef, updatedConfig);
    
    return poNumber;
  });
};

// Validate PO number format configuration
export const validatePONumberConfig = (config: PONumberConfig): string[] => {
  const errors: string[] = [];
  
  if (!config.prefix || config.prefix.trim().length === 0) {
    errors.push('Prefix is required');
  }
  
  if (config.numberLength < 1 || config.numberLength > 10) {
    errors.push('Number length must be between 1 and 10');
  }
  
  if (config.currentCounter < 1) {
    errors.push('Current counter must be at least 1');
  }
  
  if (config.separator && config.separator.length > 3) {
    errors.push('Separator must be 3 characters or less');
  }
  
  if (config.suffix && config.suffix.length > 10) {
    errors.push('Suffix must be 10 characters or less');
  }
  
  return errors;
};

// Preview what the next PO number will look like
export const previewNextPONumber = (config: PONumberConfig): string => {
  const currentDate = new Date();
  
  let poNumber = config.prefix;
  
  if (config.prefix && config.separator) {
    poNumber += config.separator;
  }
  
  if (config.includeYear) {
    poNumber += currentDate.getFullYear().toString();
    if (config.includeMonth || config.numberLength > 0) {
      poNumber += config.separator;
    }
  }
  
  if (config.includeMonth) {
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    poNumber += month;
    if (config.numberLength > 0) {
      poNumber += config.separator;
    }
  }
  
  const sequentialNumber = String(config.currentCounter).padStart(
    config.numberLength, 
    '0'
  );
  poNumber += sequentialNumber;
  
  if (config.suffix) {
    if (config.separator) {
      poNumber += config.separator;
    }
    poNumber += config.suffix;
  }
  
  return poNumber;
};

// Reset PO number counter (useful for new year/month)
export const resetPONumberCounter = async (
  userId: string,
  newCounter: number = 1
): Promise<void> => {
  if (!db) throw new Error('Firebase not configured');
  
  const config = await getProcurementConfig(userId);
  const updatedConfig = {
    ...config,
    poNumberFormat: {
      ...config.poNumberFormat,
      currentCounter: newCounter
    }
  };
  
  await updateProcurementConfig(userId, updatedConfig);
};

// Get common PO number format templates
export const getPONumberTemplates = (): { name: string; config: PONumberConfig }[] => {
  return [
    {
      name: 'Simple Sequential (PO-000001)',
      config: {
        prefix: 'PO',
        numberLength: 6,
        includeYear: false,
        includeMonth: false,
        separator: '-',
        currentCounter: 1
      }
    },
    {
      name: 'Year-Based (PO-2024-0001)',
      config: {
        prefix: 'PO',
        numberLength: 4,
        includeYear: true,
        includeMonth: false,
        separator: '-',
        currentCounter: 1
      }
    },
    {
      name: 'Year-Month (PO-2024-12-001)',
      config: {
        prefix: 'PO',
        numberLength: 3,
        includeYear: true,
        includeMonth: true,
        separator: '-',
        currentCounter: 1
      }
    },
    {
      name: 'Company Format (ACME-PO-240001)',
      config: {
        prefix: 'ACME-PO',
        numberLength: 6,
        includeYear: true,
        includeMonth: false,
        separator: '-',
        currentCounter: 1
      }
    },
    {
      name: 'Minimal (P000001)',
      config: {
        prefix: 'P',
        numberLength: 6,
        includeYear: false,
        includeMonth: false,
        separator: '',
        currentCounter: 1
      }
    }
  ];
};
