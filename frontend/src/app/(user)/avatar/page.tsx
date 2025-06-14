'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Cropper from 'react-easy-crop';
import getCroppedImg from '@/utils/cropImage';
import { useAuthGuard } from '@/hooks/useAuthGuard';

export default function AvatarPage() {
  const router = useRouter();
  const { user, tokenStatus, loading } = useAuthGuard();

  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [previousAvatar, setPreviousAvatar] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  const objectUrlRef = useRef<string | null>(null);

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
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [file]);

  const validateFile = (file: File) => {
    const maxSize = 15 * 1024 * 1024; // 15MB
    if (file.size > maxSize) {
      return 'File size must be less than 15MB';
    }
    if (!file.type.startsWith('image/')) {
      return 'Please upload an image file';
    }
    return '';
  };

  const validateUrl = (url: string) => {
    if (!url) return 'URL is required';
    const urlPattern = /^(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp))$/i;
    if (!urlPattern.test(url)) {
      return 'Please enter a valid image URL (e.g., https://example.com/image.jpg)';
    }
    return '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    if (selectedFile) {
      const fileError = validateFile(selectedFile);
      if (fileError) {
        setValidationErrors({ file: fileError });
        return;
      }
      setValidationErrors({ file: '' });
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    if (validationErrors.url) {
      setValidationErrors({ ...validationErrors, url: '' });
    }
    if (error) setError(null);
  };

  const onCropComplete = useCallback((_: any, croppedPixels: any) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const uploadCroppedAvatar = useCallback(async () => {
    if (!file || !croppedAreaPixels || !avatarPreview) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

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
        setSuccess('Avatar updated successfully!');
        setPreviousAvatar(data.avatar || avatarPreview);
        localStorage.setItem('avatarUrl', data.avatar || avatarPreview);
        setShowCropper(false);
        setFile(null);
        fetchAvatar();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.message || 'Failed to upload avatar.');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError('Network error. Please check your connection and try again.');
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
    setAvatarPreview(previousAvatar);
  }, [previousAvatar]);

  const handleUrlSubmit = useCallback(async () => {
    const urlError = validateUrl(url);
    if (urlError) {
      setValidationErrors({ url: urlError });
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(url);
      if (!res.ok || !res.headers.get('content-type')?.startsWith('image/')) {
        setError('Invalid image URL.');
        setIsLoading(false);
        return;
      }

      setAvatarPreview(url);
      setShowCropper(true);
      setFile(null);
      objectUrlRef.current = null;
      setValidationErrors({ url: '' });
    } catch (err) {
      console.error('URL fetch error:', err);
      setError('Failed to load image from URL.');
    } finally {
      setIsLoading(false);
    }
  }, [url]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-base-200 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg text-primary dark:text-indigo-400"></span>
          <p className="mt-4 text-base-content/70 dark:text-gray-100">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 dark:bg-gray-900">
      {/* Topbar */}
      <nav className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white dark:text-gray-100 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Link href="/dashboard">
                <span className="text-xl font-bold">Manager Dashboard</span>
              </Link>
            </div>
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="btn btn-ghost flex items-center gap-2">
                {isLoading ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="User Avatar"
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                    <span className="text-gray-600 dark:text-gray-100 font-bold">
                      {user.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="hidden sm:inline">{user.username || 'User'}</span>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </label>
              <ul
                tabIndex={0}
                className="dropdown-content menu p-2 shadow bg-base-100 dark:bg-gray-800 rounded-box w-52 mt-2 text-gray-800 dark:text-gray-100"
              >
                <li>
                  <Link href="/dashboard">Dashboard</Link>
                </li>
                <li>
                  <Link href="/change-password">Change Password</Link>
                </li>
             
                <li>
                  <button
                    onClick={async () => {
                      await fetch('http://localhost:3001/auth/logout', {
                        method: 'POST',
                        credentials: 'include',
                      });
                      router.push('/login');
                    }}
                    disabled={isLoading}
                  >
                    Logout
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-md mx-auto py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-primary dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-base-content dark:text-gray-100">Update Avatar</h1>
          <p className="text-base-content/70 dark:text-gray-300 mt-2">Customize your profile picture</p>
        </div>

        {/* Main Card */}
        <div className="card bg-base-100 dark:bg-gray-800 shadow-xl">
          <div className="card-body">
            {/* Alerts */}
            {tokenStatus === 'refreshed' && (
              <div className="alert alert-info mb-4">
                <svg className="w-5 h-5 text-info dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-gray-800 dark:text-gray-100">Session refreshed for security</span>
              </div>
            )}
            {success && (
              <div className="alert alert-success mb-4">
                <svg className="w-5 h-5 text-success dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-gray-800 dark:text-gray-100">{success}</span>
              </div>
            )}
            {error && (
              <div className="alert alert-error mb-4">
                <svg className="w-5 h-5 text-error dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-gray-800 dark:text-gray-100">{error}</span>
              </div>
            )}

            {/* Avatar Preview */}
            <div className="mb-6 text-center">
              {isLoading ? (
                <div className="flex justify-center items-center h-32">
                  <span className="loading loading-spinner loading-md text-primary dark:text-indigo-400"></span>
                </div>
              ) : avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar Preview"
                  className="w-32 h-32 rounded-full object-cover mx-auto border border-base-300 dark:border-gray-600"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-base-200 dark:bg-gray-700 flex items-center justify-center mx-auto border border-base-300 dark:border-gray-600">
                  <span className="text-4xl text-base-content/50 dark:text-gray-300">{user.username.charAt(0).toUpperCase()}</span>
                </div>
              )}
            </div>

            {/* Upload via File */}
            <div className="form-control mb-6">
              <label className="label">
                <span className="label-text font-medium text-gray-700 dark:text-gray-300">Upload Image File</span>
              </label>
              <input
                type="file"
                accept="image/*"
                className={`file-input file-input-bordered w-full ${
                  validationErrors.file ? 'file-input-error' : ''
                }`}
                onChange={handleFileChange}
                disabled={isLoading}
              />
              {validationErrors.file && (
                <label className="label">
                  <span className="label-text-alt text-error dark:text-red-400">{validationErrors.file}</span>
                </label>
              )}
              <p className="text-sm text-base-content/70 dark:text-gray-300 mt-1">Max 5MB, PNG/JPG/GIF/WebP</p>
            </div>

            {/* Upload via URL */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium text-gray-700 dark:text-gray-300">Or Enter Image URL</span>
              </label>
              <div className="join w-full">
                <input
                  type="url"
                  className={`input input-bordered w-full join-item ${
                    validationErrors.url ? 'input-error' : ''
                  }`}
                  value={url}
                  onChange={handleUrlChange}
                  placeholder="https://example.com/avatar.jpg"
                  disabled={isLoading}
                />
                <button
                  onClick={handleUrlSubmit}
                  className={`btn btn-primary join-item ${isLoading ? 'loading' : ''}`}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    'Load'
                  )}
                </button>
              </div>
              {validationErrors.url && (
                <label className="label">
                  <span className="label-text-alt text-error dark:text-red-400">{validationErrors.url}</span>
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="text-center mt-6">
          <button
            className="btn btn-ghost btn-sm text-gray-600 dark:text-gray-300"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Profile
          </button>
        </div>
      </div>

      {/* Cropping Modal */}
      <input type="checkbox" id="cropper-modal" className="modal-toggle" checked={showCropper} readOnly />
      <div className="modal" role="dialog">
        <div className="modal-box bg-base-100 dark:bg-gray-800">
          <h3 className="text-lg font-bold mb-4 text-center text-gray-900 dark:text-gray-100">Crop Your Avatar</h3>
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
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="range range-primary w-full mt-4"
            disabled={isLoading}
          />
          <div className="modal-action mt-4">
            <button
              onClick={handleCancelCrop}
              className="btn btn-outline"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={uploadCroppedAvatar}
              className={`btn btn-primary ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </button>
          </div>
        </div>
        <label className="modal-backdrop" onClick={handleCancelCrop}></label>
      </div>
    </div>
  );
}