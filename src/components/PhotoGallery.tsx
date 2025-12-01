'use client';

import { useState } from 'react';

interface PhotoGalleryProps {
  photos: string[];
  onDeletePhoto?: (photoUrl: string) => void;
  canDelete?: boolean;
}

export function PhotoGallery({ photos, onDeletePhoto, canDelete = false }: PhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const handleImageError = (photoUrl: string) => {
    setImageErrors(prev => new Set([...prev, photoUrl]));
  };

  const handleDeletePhoto = (photoUrl: string) => {
    if (onDeletePhoto && canDelete) {
      onDeletePhoto(photoUrl);
    }
  };

  if (photos.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        📷 No photos uploaded
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Photo Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((photo, index) => (
          <div key={index} className="relative group">
            {imageErrors.has(photo) ? (
              <div className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-gray-500 text-sm">Failed to load</span>
              </div>
            ) : (
              <img
                src={photo}
                alt={`Exception photo ${index + 1}`}
                className="aspect-square object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setSelectedPhoto(photo)}
                onError={() => handleImageError(photo)}
              />
            )}
            
            {canDelete && !imageErrors.has(photo) && (
              <button
                onClick={() => handleDeletePhoto(photo)}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                title="Delete photo"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Modal for full-size view */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <img
              src={selectedPhoto}
              alt="Full size view"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 bg-white bg-opacity-20 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-30 transition-colors"
            >
              ✕
            </button>
            
            {canDelete && (
              <button
                onClick={() => {
                  handleDeletePhoto(selectedPhoto);
                  setSelectedPhoto(null);
                }}
                className="absolute top-4 left-4 bg-red-500 bg-opacity-80 text-white rounded px-3 py-1 hover:bg-opacity-100 transition-colors"
              >
                Delete Photo
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
