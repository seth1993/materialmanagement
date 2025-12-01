'use client';

import React, { useState, useRef, useCallback } from 'react';
import { 
  validatePhotoFiles, 
  getFilePreviewUrl, 
  cleanupPreviewUrls,
  generateThumbnail 
} from '@/lib/storage-utils';

interface PhotoUploadProps {
  photos: File[];
  onPhotosChange: (photos: File[]) => void;
  maxPhotos?: number;
  disabled?: boolean;
}

interface PhotoPreview {
  file: File;
  preview: string;
  thumbnail?: string;
}

export function PhotoUpload({ 
  photos, 
  onPhotosChange, 
  maxPhotos = 10,
  disabled = false 
}: PhotoUploadProps) {
  const [previews, setPreviews] = useState<PhotoPreview[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update previews when photos change
  const updatePreviews = useCallback(async (files: File[]) => {
    // Cleanup old previews
    previews.forEach(preview => {
      URL.revokeObjectURL(preview.preview);
      if (preview.thumbnail) {
        URL.revokeObjectURL(preview.thumbnail);
      }
    });

    // Create new previews
    const newPreviews: PhotoPreview[] = [];
    for (const file of files) {
      try {
        const preview = getFilePreviewUrl(file);
        const thumbnail = await generateThumbnail(file);
        newPreviews.push({ file, preview, thumbnail });
      } catch (error) {
        console.error('Error generating preview:', error);
        const preview = getFilePreviewUrl(file);
        newPreviews.push({ file, preview });
      }
    }
    
    setPreviews(newPreviews);
  }, [previews]);

  // Handle file selection
  const handleFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validation = validatePhotoFiles(fileArray);
    
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors([]);
    
    // Check max photos limit
    const totalPhotos = photos.length + fileArray.length;
    if (totalPhotos > maxPhotos) {
      setErrors([`Maximum ${maxPhotos} photos allowed. You're trying to add ${fileArray.length} more to ${photos.length} existing photos.`]);
      return;
    }

    const newPhotos = [...photos, ...fileArray];
    onPhotosChange(newPhotos);
    updatePreviews(newPhotos);
  }, [photos, onPhotosChange, maxPhotos, updatePreviews]);

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  // Handle drag and drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  // Remove photo
  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(newPhotos);
    updatePreviews(newPhotos);
  };

  // Open file dialog
  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      previews.forEach(preview => {
        URL.revokeObjectURL(preview.preview);
        if (preview.thumbnail) {
          URL.revokeObjectURL(preview.thumbnail);
        }
      });
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
          dragActive 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={disabled ? undefined : openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
        />
        
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="mt-4">
            <p className="text-sm text-gray-600">
              <span className="font-medium text-blue-600 hover:text-blue-500">
                Click to upload
              </span>{' '}
              or drag and drop
            </p>
            <p className="text-xs text-gray-500">
              PNG, JPG, WebP up to 10MB each
            </p>
            <p className="text-xs text-gray-500">
              {photos.length}/{maxPhotos} photos
            </p>
          </div>
        </div>
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Upload errors:
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo Previews */}
      {previews.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">
            Selected Photos ({previews.length})
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {previews.map((preview, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={preview.thumbnail || preview.preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Remove Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removePhoto(index);
                  }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={disabled}
                >
                  ×
                </button>
                
                {/* File Info */}
                <div className="mt-1 text-xs text-gray-500 truncate">
                  {preview.file.name}
                </div>
                <div className="text-xs text-gray-400">
                  {(preview.file.size / 1024 / 1024).toFixed(1)} MB
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Camera Capture Button (Mobile) */}
      {typeof navigator !== 'undefined' && navigator.mediaDevices && (
        <button
          type="button"
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.capture = 'environment';
            input.onchange = (e) => {
              const target = e.target as HTMLInputElement;
              if (target.files && target.files.length > 0) {
                handleFiles(target.files);
              }
            };
            input.click();
          }}
          disabled={disabled}
          className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          📷 Take Photo with Camera
        </button>
      )}
    </div>
  );
}
