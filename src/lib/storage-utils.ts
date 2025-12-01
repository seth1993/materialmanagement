import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject,
  uploadBytesResumable,
  UploadTaskSnapshot 
} from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { DeliveryPhoto } from '@/types/delivery';

export interface UploadProgress {
  progress: number;
  bytesTransferred: number;
  totalBytes: number;
}

export interface UploadResult {
  url: string;
  fileName: string;
  path: string;
}

// Compress image before upload
export function compressImage(file: File, maxWidth: number = 1920, quality: number = 0.8): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      
      // Draw and compress
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        },
        'image/jpeg',
        quality
      );
    };
    
    img.src = URL.createObjectURL(file);
  });
}

// Upload single photo with progress tracking
export function uploadDeliveryPhoto(
  file: File,
  deliveryId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  return new Promise(async (resolve, reject) => {
    if (!storage) {
      reject(new Error('Firebase Storage not configured'));
      return;
    }
    
    try {
      // Compress image before upload
      const compressedFile = await compressImage(file);
      
      // Generate unique filename
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const path = `deliveries/${deliveryId}/photos/${fileName}`;
      
      const storageRef = ref(storage, path);
      const uploadTask = uploadBytesResumable(storageRef, compressedFile);
      
      uploadTask.on(
        'state_changed',
        (snapshot: UploadTaskSnapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress?.({
            progress,
            bytesTransferred: snapshot.bytesTransferred,
            totalBytes: snapshot.totalBytes,
          });
        },
        (error) => {
          reject(error);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({
              url: downloadURL,
              fileName,
              path,
            });
          } catch (error) {
            reject(error);
          }
        }
      );
    } catch (error) {
      reject(error);
    }
  });
}

// Upload multiple photos
export async function uploadMultiplePhotos(
  files: File[],
  deliveryId: string,
  onProgress?: (fileIndex: number, progress: UploadProgress) => void
): Promise<UploadResult[]> {
  const uploadPromises = files.map((file, index) => 
    uploadDeliveryPhoto(
      file, 
      deliveryId, 
      (progress) => onProgress?.(index, progress)
    )
  );
  
  return Promise.all(uploadPromises);
}

// Delete photo from storage
export async function deleteDeliveryPhoto(path: string): Promise<void> {
  if (!storage) throw new Error('Firebase Storage not configured');
  
  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
}

// Convert upload results to DeliveryPhoto objects
export function createDeliveryPhotos(uploadResults: UploadResult[], descriptions?: string[]): DeliveryPhoto[] {
  return uploadResults.map((result, index) => ({
    id: crypto.randomUUID(),
    url: result.url,
    fileName: result.fileName,
    uploadedAt: new Date(),
    description: descriptions?.[index] || '',
  }));
}

// Validate file type and size
export function validatePhotoFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Only JPEG, PNG, and WebP images are allowed',
    };
  }
  
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size must be less than 10MB',
    };
  }
  
  return { valid: true };
}

// Batch validate multiple files
export function validatePhotoFiles(files: File[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  files.forEach((file, index) => {
    const validation = validatePhotoFile(file);
    if (!validation.valid) {
      errors.push(`File ${index + 1}: ${validation.error}`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// Get file preview URL
export function getFilePreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

// Cleanup preview URLs
export function cleanupPreviewUrls(urls: string[]): void {
  urls.forEach(url => URL.revokeObjectURL(url));
}

// Generate thumbnail from image file
export function generateThumbnail(file: File, size: number = 150): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = size;
      canvas.height = size;
      
      // Calculate crop dimensions for square thumbnail
      const minDimension = Math.min(img.width, img.height);
      const x = (img.width - minDimension) / 2;
      const y = (img.height - minDimension) / 2;
      
      ctx?.drawImage(
        img,
        x, y, minDimension, minDimension,
        0, 0, size, size
      );
      
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
