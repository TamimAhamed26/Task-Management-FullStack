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
    <div className="min-h-screen bg-base-200 dark:bg-gray-900 font-sans">
      {/* Topbar */}
      <nav className="bg-gradient-to-r from-indigo-700 to-purple-700 text-white dark:text-gray-100 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Link href="/dashboard" className="flex items-center space-x-2">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m0 0l7 7m-7-7v10a1 1 0 01-1 1h-3"></path>
                </svg>
                <span className="text-xl font-extrabold tracking-wide">Manager Dashboard</span>
              </Link>
            </div>
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="btn btn-ghost flex items-center gap-2 px-3 py-2 rounded-full hover:bg-white hover:bg-opacity-20 transition-all duration-200">
                {isLoading ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="User Avatar"
                    className="w-10 h-10 rounded-full object-cover border-2 border-white"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center border-2 border-white">
                    <span className="text-gray-600 dark:text-gray-100 font-bold text-lg">
                      {user.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="hidden sm:inline font-medium text-lg">{user.username || 'User'}</span>
                <svg
                  className="w-5 h-5 ml-1"
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
                className="dropdown-content menu p-2 shadow-lg bg-base-100 dark:bg-gray-800 rounded-box w-52 mt-3 text-gray-800 dark:text-gray-100 transform origin-top-right scale-95 opacity-0 transition-all duration-200 ease-out [--tab-focus:0] data-[dropdown-open]:scale-100 data-[dropdown-open]:opacity-100"
              >
                <li>
                  <Link href="/dashboard" className="flex items-center px-4 py-2 hover:bg-base-200 dark:hover:bg-gray-700 rounded-md transition-colors duration-200">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m0 0l7 7m-7-7v10a1 1 0 01-1 1h-3"></path></svg>
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/change-password" className="flex items-center px-4 py-2 hover:bg-base-200 dark:hover:bg-gray-700 rounded-md transition-colors duration-200">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2v5a2 2 0 01-2 2h-5a2 2 0 01-2-2v-5a2 2 0 012-2h5z"></path></svg>
                    Change Password
                  </Link>
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
                    className="flex items-center w-full text-left px-4 py-2 hover:bg-base-200 dark:hover:bg-gray-700 rounded-md transition-colors duration-200"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                    Logout
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-md mx-auto py-12 px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-primary/10 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-10 h-10 text-primary dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold text-base-content dark:text-gray-100 mb-2">Update Avatar</h1>
          <p className="text-base-content/70 dark:text-gray-300 text-lg">Personalize your profile picture with ease</p>
        </div>

        {/* Main Card */}
        <div className="card bg-base-100 dark:bg-gray-800 shadow-2xl rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="card-body p-8">
            {/* Alerts */}
            {tokenStatus === 'refreshed' && (
              <div role="alert" className="alert alert-info mb-4 rounded-lg flex items-center p-3 text-sm animate-fade-in-down">
                <svg className="w-5 h-5 text-info dark:text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-gray-800 dark:text-gray-100">Session refreshed for security</span>
              </div>
            )}
            {success && (
              <div role="alert" className="alert alert-success mb-4 rounded-lg flex items-center p-3 text-sm animate-fade-in-down">
                <svg className="w-5 h-5 text-success dark:text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-gray-800 dark:text-gray-100">{success}</span>
              </div>
            )}
            {error && (
              <div role="alert" className="alert alert-error mb-4 rounded-lg flex items-center p-3 text-sm animate-fade-in-down">
                <svg className="w-5 h-5 text-error dark:text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-gray-800 dark:text-gray-100">{error}</span>
              </div>
            )}

            {/* Avatar Preview */}
            <div className="mb-8 text-center">
              {isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <span className="loading loading-spinner loading-lg text-primary dark:text-indigo-400"></span>
                </div>
              ) : avatarPreview ? (
                <div className="relative w-40 h-40 mx-auto rounded-full overflow-hidden shadow-xl border-4 border-indigo-500 dark:border-indigo-400">
                  <img
                    src={avatarPreview}
                    alt="Avatar Preview"
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                </div>
              ) : (
                <div className="w-40 h-40 rounded-full bg-base-200 dark:bg-gray-700 flex items-center justify-center mx-auto border-4 border-base-300 dark:border-gray-600 shadow-lg">
                  <span className="text-6xl text-base-content/50 dark:text-gray-300 font-extrabold">{user.username.charAt(0).toUpperCase()}</span>
                </div>
              )}
            </div>

            {/* Upload via File */}
            <div className="form-control mb-6">
              <label className="label">
                <span className="label-text font-semibold text-gray-700 dark:text-gray-300 mb-2">Upload Image File</span>
              </label>
              <input
                type="file"
                accept="image/*"
                className={`file-input file-input-bordered file-input-primary w-full transition-all duration-200 ${
                  validationErrors.file ? 'file-input-error' : ''
                }`}
                onChange={handleFileChange}
                disabled={isLoading}
              />
              {validationErrors.file && (
                <label className="label">
                  <span className="label-text-alt text-error dark:text-red-400 text-sm mt-1">{validationErrors.file}</span>
                </label>
              )}
              <p className="text-sm text-base-content/70 dark:text-gray-400 mt-2">Max 15MB. Supported formats: PNG, JPG, GIF, WebP.</p>
            </div>

            {/* Upload via URL */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold text-gray-700 dark:text-gray-300 mb-2">Or Enter Image URL</span>
              </label>
              <div className="join w-full rounded-lg shadow-sm">
                <input
                  type="url"
                  className={`input input-bordered input-primary w-full join-item rounded-l-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200 ${
                    validationErrors.url ? 'input-error' : ''
                  }`}
                  value={url}
                  onChange={handleUrlChange}
                  placeholder="https://example.com/avatar.jpg"
                  disabled={isLoading}
                />
                <button
                  onClick={handleUrlSubmit}
                  className={`btn btn-primary join-item rounded-r-lg px-6 ${isLoading ? 'btn-disabled' : ''} transition-all duration-200`}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    'Load Image'
                  )}
                </button>
              </div>
              {validationErrors.url && (
                <label className="label">
                  <span className="label-text-alt text-error dark:text-red-400 text-sm mt-1">{validationErrors.url}</span>
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="text-center mt-8">
          <button
            className="btn btn-ghost btn-sm text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-200 group"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            <svg className="w-5 h-5 mr-1 group-hover:-translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Profile
          </button>
        </div>
      </div>

      {/* Cropping Modal */}
      <input type="checkbox" id="cropper-modal" className="modal-toggle" checked={showCropper} readOnly />
      <div className="modal" role="dialog">
        <div className="modal-box bg-base-100 dark:bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
          <h3 className="text-2xl font-bold mb-5 text-center text-gray-900 dark:text-gray-100">Crop Your Avatar</h3>
          <div className="relative w-full h-80 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
            {avatarPreview && (
              <Cropper
                image={avatarPreview}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                classes={{ containerClassName: 'cropper-container', mediaClassName: 'cropper-media' }}
              />
            )}
          </div>
          <label className="label mt-4">
            <span className="label-text text-gray-700 dark:text-gray-300">Zoom</span>
          </label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05} // Smaller step for finer control
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="range range-primary w-full mt-2"
            disabled={isLoading}
          />
          <div className="modal-action flex justify-end gap-3 mt-6">
            <button
              onClick={handleCancelCrop}
              className="btn btn-outline btn-ghost text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={uploadCroppedAvatar}
              className={`btn btn-primary px-6 ${isLoading ? 'btn-disabled' : ''} transition-all duration-200`}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="loading loading-spinner loading-sm mr-2"></span>
                  Saving...
                </>
              ) : (
                'Save Avatar'
              )}
            </button>
          </div>
        </div>
        <label className="modal-backdrop" onClick={handleCancelCrop}></label>
      </div>
    </div>
  );
}