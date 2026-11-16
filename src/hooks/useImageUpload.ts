import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { UPLOAD_RULES, type UploadPurpose } from '../lib/upload/policy';
import { prepareImageForUpload } from '../lib/upload/prepareImage';
import { sendUpload } from '../lib/upload/uploadClient';

const PROGRESS_RESET_DELAY_MS = 1000;

async function getAccessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Please sign in again to upload images.');
  return token;
}

/**
 * Uploads an image through our server (/api/upload), which chooses the
 * ImageKit folder and options for the given purpose and enforces auth:
 * payment proofs are public, avatars need a signed-in user, everything else
 * needs an admin.
 */
export const useImageUpload = (purpose: UploadPurpose) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadImage = async (file: File): Promise<string> => {
    setUploading(true);
    setUploadProgress(0);
    try {
      const accessToken = UPLOAD_RULES[purpose].access === 'public' ? null : await getAccessToken();
      const body = await prepareImageForUpload(file);
      const url = await sendUpload({ body, purpose, accessToken, onProgress: setUploadProgress });
      setUploadProgress(100);
      return url;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), PROGRESS_RESET_DELAY_MS);
    }
  };

  return { uploadImage, uploading, uploadProgress };
};
