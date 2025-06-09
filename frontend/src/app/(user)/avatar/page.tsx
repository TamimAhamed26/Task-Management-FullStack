'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Cropper from 'react-easy-crop';
import { Dialog } from '@headlessui/react';
import getCroppedImg from '@/utils/cropImage';
import { useAuthGuard } from '@/hooks/useAuthGuard'; 
export default function AvatarPage() {
    const { user, feedback, loading } = useAuthGuard();

  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [previousAvatar, setPreviousAvatar] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [showCropper, setShowCropper] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const router = useRouter();
  const objectUrlRef = useRef<string | null>(null); 

  // Fetch avatar from backend
  const fetchAvatar = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:3001/users/me', {
        credentials: 'include',
      });
      const data = await res.json();
if (res.ok && data.avatarUrl) {
  setAvatarPreview(data.avatarUrl);
  setPreviousAvatar(data.avatarUrl);


        localStorage.setItem('avatarUrl', data.avatarUrl); 
      } else {
        const storedAvatar = localStorage.getItem('avatarUrl');
        if (storedAvatar) {
          setAvatarPreview(storedAvatar);
          setPreviousAvatar(storedAvatar);
        }
      }
    } catch (err) {
      console.error('Failed to fetch avatar:', err);
      const storedAvatar = localStorage.getItem('avatarUrl');
      if (storedAvatar) {
        setAvatarPreview(storedAvatar);
        setPreviousAvatar(storedAvatar);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAvatar();
  }, [fetchAvatar]);

  useEffect(() => {
    if (file) {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
      const newObjectUrl = URL.createObjectURL(file);
      objectUrlRef.current = newObjectUrl;
      setAvatarPreview(newObjectUrl);
      setShowCropper(true);
    }
    // Cleanup on unmount or file change
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [file]);

  const onCropComplete = useCallback((_: any, croppedPixels: any) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const uploadCroppedAvatar = useCallback(async () => {
    if (!file || !croppedAreaPixels || !avatarPreview) return;

    setIsLoading(true);
    try {
      const croppedBlob = await getCroppedImg(avatarPreview, croppedAreaPixels);
      const formData = new FormData();
      formData.append('file', croppedBlob, 'cropped_avatar.jpg');

      const res = await fetch('http://localhost:3001/users/avatar', {
        method: 'PUT',
        credentials: 'include',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setMessage('Avatar updated successfully!');
        setPreviousAvatar(data.avatar || avatarPreview); 
        localStorage.setItem('avatarUrl', data.avatar || avatarPreview); 
        setShowCropper(false);
        setFile(null); 
        fetchAvatar(); 
      } else {
        setMessage(data.message || 'Failed to upload avatar.');
      }
    } catch (error) {
      console.error(error);
      setMessage('Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  }, [file, croppedAreaPixels, avatarPreview, fetchAvatar]);

  const handleCancelCrop = useCallback(() => {
    setShowCropper(false);
    setFile(null);
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setAvatarPreview(previousAvatar); // Revert to previous avatar
  }, [previousAvatar]);

const handleUrlSubmit = useCallback(async () => {
  if (!url) return;

  setIsLoading(true);
  try {
    // Validate image URL
    const res = await fetch(url);
    if (!res.ok || !res.headers.get('content-type')?.startsWith('image/')) {
      setMessage('Invalid image URL.');
      setIsLoading(false);
      return;
    }

    setAvatarPreview(url);
    setShowCropper(true);
    setFile(null); // Clear any file
    objectUrlRef.current = null;
  } catch (error) {
    console.error(error);
    setMessage('Failed to load image from URL.');
  } finally {
    setIsLoading(false);
  }

  
}, [url]);
if (loading || !user) {
  return (
    <div className="flex items-center justify-center h-screen">
      <span className="loading loading-spinner loading-lg"></span>
    </div>
  );}
  return (
    <div className="p-6 max-w-xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Update Avatar</h2>

      {message && <p className="text-center text-blue-600 mb-4">{message}</p>}

      {/* Avatar Preview */}
      {isLoading ? (
        <p className="text-center">Loading avatar...</p>
      ) : avatarPreview ? (
        <div className="mb-6 text-center">
          <img
            src={avatarPreview}
            alt="Avatar Preview"
            className="w-32 h-32 rounded-full object-cover mx-auto border"
          />
        </div>
      ) : (
        <p className="text-center mb-6">No avatar set</p>
      )}

      {/* Upload via File */}
      <div className="mb-6">
        <label className="block font-semibold mb-1">Upload Image File</label>
        <input
          type="file"
          accept="image/*"
          className="file-input file-input-bordered w-full"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          disabled={isLoading}
        />
      </div>

      {/* Upload via URL */}
      <div>
        <label className="block font-semibold mb-1">Or Enter Image URL</label>
        <input
          type="url"
          className="input input-bordered w-full"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/avatar.jpg"
          disabled={isLoading}
        />
        <button
          onClick={handleUrlSubmit}
          className="btn btn-accent mt-2"
          disabled={isLoading}
        >
          {isLoading ? 'Processing...' : 'Use URL'}
        </button>
      </div>

      <button
        onClick={() => router.push('/profile')}
        className="btn btn-secondary mt-6"
        disabled={isLoading}
      >
        Back to profile
      </button>

      {/* Cropping Dialog */}
      <Dialog
        open={showCropper}
        onClose={handleCancelCrop}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      >
        <div className="bg-white p-4 rounded shadow-lg max-w-md w-full">
          <h3 className="text-lg font-semibold mb-4 text-center">Crop your avatar</h3>
          <div className="relative w-full aspect-square">
            {avatarPreview && (
              <Cropper
                image={avatarPreview}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            )}
          </div>

          {/* Zoom Slider */}
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full mt-4"
            disabled={isLoading}
          />

          <div className="mt-4 flex justify-between">
            <button
              onClick={handleCancelCrop}
              className="btn btn-outline"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={uploadCroppedAvatar}
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}