import type { UploadPurpose } from './policy.js';

export const UPLOAD_ENDPOINT = '/api/upload';
const UPLOAD_TIMEOUT_MS = 90_000;

export interface SendUploadArgs {
  body: Blob;
  purpose: UploadPurpose;
  /** Supabase access token; required by the server for non-public purposes. */
  accessToken: string | null;
  onProgress?: (percent: number) => void;
  createXhr?: () => XMLHttpRequest;
}

function errorFor(status: number, responseText: string): string {
  if (status === 429) return 'Too many uploads. Please wait a few minutes and try again.';
  try {
    const data: unknown = JSON.parse(responseText);
    if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
      return data.error;
    }
  } catch {
    // non-JSON error body
  }
  if (status === 413) return 'This image is too large to upload.';
  return `Upload failed (${status}). Please try again.`;
}

/** POSTs the raw image bytes to our server, which uploads to ImageKit. Resolves the public URL. */
export function sendUpload({
  body,
  purpose,
  accessToken,
  onProgress,
  createXhr = () => new XMLHttpRequest(),
}: SendUploadArgs): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = createXhr();
    xhr.open('POST', `${UPLOAD_ENDPOINT}?purpose=${encodeURIComponent(purpose)}`);
    xhr.setRequestHeader('Content-Type', body.type || 'application/octet-stream');
    if (accessToken) xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    xhr.timeout = UPLOAD_TIMEOUT_MS;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(errorFor(xhr.status, xhr.responseText)));
        return;
      }
      try {
        const data: unknown = JSON.parse(xhr.responseText);
        const url = data && typeof data === 'object' && 'url' in data ? data.url : undefined;
        if (typeof url === 'string' && url) resolve(url);
        else reject(new Error('Upload succeeded but no URL was returned.'));
      } catch {
        reject(new Error('Could not read the upload response.'));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload. Please check your connection.'));
    xhr.ontimeout = () => reject(new Error('Upload timed out. Please try again.'));

    xhr.send(body);
  });
}
