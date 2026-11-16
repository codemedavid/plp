/**
 * Server-side ImageKit upload (private key, Basic auth). Never import this
 * from browser code — it is only used by api/upload.ts.
 */
import type { ImageKitUploadParams } from './handler.js';

export const IMAGEKIT_UPLOAD_URL = 'https://upload.imagekit.io/api/v1/files/upload';

/**
 * Every option that could replace or alter an existing file is pinned here:
 * unique names + overwriteFile=false means an upload can only ever create a
 * new file, never replace a live product image.
 */
export function buildImageKitUploadForm({ bytes, mime, folder, fileName }: ImageKitUploadParams): FormData {
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: mime }), fileName);
  form.append('fileName', fileName);
  form.append('folder', folder);
  form.append('useUniqueFileName', 'true');
  form.append('overwriteFile', 'false');
  form.append('overwriteAITags', 'false');
  form.append('overwriteTags', 'false');
  form.append('overwriteCustomMetadata', 'false');
  form.append('isPrivateFile', 'false');
  return form;
}

export interface ImageKitServerConfig {
  privateKey: string;
  fetchImpl?: typeof fetch;
}

function readMessage(json: unknown): string {
  if (json && typeof json === 'object' && 'message' in json && typeof json.message === 'string') {
    return json.message;
  }
  return 'unknown error';
}

export async function uploadToImageKit(
  { privateKey, fetchImpl = fetch }: ImageKitServerConfig,
  params: ImageKitUploadParams,
): Promise<{ url: string }> {
  const response = await fetchImpl(IMAGEKIT_UPLOAD_URL, {
    method: 'POST',
    headers: { Authorization: `Basic ${btoa(`${privateKey}:`)}` },
    body: buildImageKitUploadForm(params),
  });

  let json: unknown = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  if (!response.ok) {
    throw new Error(`ImageKit ${response.status}: ${readMessage(json)}`);
  }

  const url = json && typeof json === 'object' && 'url' in json ? json.url : undefined;
  if (typeof url !== 'string' || !url.startsWith('https://')) {
    throw new Error('ImageKit responded with no URL');
  }
  return { url };
}
