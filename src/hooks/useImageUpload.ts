import { useState } from 'react';

const IMAGEKIT_PUBLIC_KEY = import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY as string | undefined;
const IMAGEKIT_UPLOAD_URL = 'https://upload.imagekit.io/api/v1/files/upload';
const AUTH_ENDPOINT = '/api/imagekit-auth';

export const useImageUpload = (folder: string = 'menu-images') => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadImage = async (file: File): Promise<string> => {
    try {
      setUploading(true);
      setUploadProgress(0);

      if (!IMAGEKIT_PUBLIC_KEY) {
        throw new Error('VITE_IMAGEKIT_PUBLIC_KEY is not set. Add it to your environment variables.');
      }

      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      const validExtensions = [
        'jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff', 'tif',
        'svg', 'heic', 'heif', 'ico', 'avif', 'jfif'
      ];
      const hasValidExtension = fileExtension && validExtensions.includes(fileExtension);
      const hasValidMimeType = !file.type || file.type.startsWith('image/');

      if (!hasValidExtension && !hasValidMimeType) {
        throw new Error(`Please upload a valid image file. File type: ${file.type || 'unknown'}, Extension: ${fileExtension || 'none'}`);
      }

      if (file.size < 100) {
        throw new Error('The selected file appears to be invalid or empty.');
      }

      const maxSize = 25 * 1024 * 1024; // ImageKit free plan image limit
      if (file.size > maxSize) {
        throw new Error(`Image size must be less than 25MB. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      }

      // 1. Get auth params from our serverless endpoint
      const authRes = await fetch(AUTH_ENDPOINT, { method: 'GET' });
      if (!authRes.ok) {
        throw new Error(`Failed to get upload auth: ${authRes.status} ${authRes.statusText}`);
      }
      const { token, expire, signature } = await authRes.json();

      // 2. Build the upload form
      const safeBase = (file.name.split('.').slice(0, -1).join('.') || 'image')
        .replace(/[^a-zA-Z0-9._-]/g, '_');
      const ext = fileExtension || 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}-${safeBase}.${ext}`;

      const form = new FormData();
      form.append('file', file);
      form.append('fileName', fileName);
      form.append('publicKey', IMAGEKIT_PUBLIC_KEY);
      form.append('signature', signature);
      form.append('expire', String(expire));
      form.append('token', token);
      form.append('folder', `/${folder}`);
      form.append('useUniqueFileName', 'true');

      // 3. Upload with XHR for progress
      const url: string = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', IMAGEKIT_UPLOAD_URL);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              if (data?.url) resolve(data.url);
              else reject(new Error('Upload succeeded but no URL returned.'));
            } catch (e) {
              reject(new Error('Could not parse ImageKit response.'));
            }
          } else {
            let msg = `Upload failed: ${xhr.status} ${xhr.statusText}`;
            try {
              const data = JSON.parse(xhr.responseText);
              if (data?.message) msg = `ImageKit: ${data.message}`;
            } catch {}
            reject(new Error(msg));
          }
        };

        xhr.onerror = () => reject(new Error('Network error during upload.'));
        xhr.ontimeout = () => reject(new Error('Upload timed out.'));
        xhr.timeout = 60000;

        xhr.send(form);
      });

      setUploadProgress(100);
      return url;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  // ImageKit deletion requires the fileId + private key, so it must run server-side.
  // Left as a no-op here; add a /api/imagekit-delete endpoint if you need it.
  const deleteImage = async (_imageUrl: string): Promise<void> => {
    console.warn('deleteImage: ImageKit deletion must be done server-side via fileId. No-op for now.');
  };

  return {
    uploadImage,
    deleteImage,
    uploading,
    uploadProgress
  };
};
