import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const getSession = vi.fn();
vi.mock('../lib/supabase', () => ({
  supabase: { auth: { getSession: () => getSession() } },
}));

const prepareImageForUpload = vi.fn();
vi.mock('../lib/upload/prepareImage', () => ({
  prepareImageForUpload: (file: File) => prepareImageForUpload(file),
}));

const sendUpload = vi.fn();
vi.mock('../lib/upload/uploadClient', () => ({
  sendUpload: (args: unknown) => sendUpload(args),
}));

import { useImageUpload } from '../hooks/useImageUpload';

const file = new File([new Uint8Array(5000)], 'proof.jpg', { type: 'image/jpeg' });
const prepared = new Blob([new Uint8Array(4000)], { type: 'image/jpeg' });

beforeEach(() => {
  vi.clearAllMocks();
  prepareImageForUpload.mockResolvedValue(prepared);
  sendUpload.mockResolvedValue('https://ik.imagekit.io/x.jpg');
  getSession.mockResolvedValue({ data: { session: { access_token: 'jwt-123' } }, error: null });
});

describe('useImageUpload', () => {
  it('uploads a guest payment proof without asking for a session', async () => {
    const { result } = renderHook(() => useImageUpload('payment-proof'));
    let url = '';
    await act(async () => {
      url = await result.current.uploadImage(file);
    });
    expect(url).toBe('https://ik.imagekit.io/x.jpg');
    expect(getSession).not.toHaveBeenCalled();
    expect(prepareImageForUpload).toHaveBeenCalledWith(file);
    expect(sendUpload).toHaveBeenCalledWith(
      expect.objectContaining({ body: prepared, purpose: 'payment-proof', accessToken: null }),
    );
    expect(result.current.uploading).toBe(false);
  });

  it('sends the Supabase access token for admin purposes', async () => {
    const { result } = renderHook(() => useImageUpload('product'));
    await act(async () => {
      await result.current.uploadImage(file);
    });
    expect(sendUpload).toHaveBeenCalledWith(expect.objectContaining({ purpose: 'product', accessToken: 'jwt-123' }));
  });

  it('fails fast with a clear message when an admin purpose has no session', async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: null });
    const { result } = renderHook(() => useImageUpload('logo'));
    await act(async () => {
      await expect(result.current.uploadImage(file)).rejects.toThrow(/sign in/i);
    });
    expect(sendUpload).not.toHaveBeenCalled();
    expect(result.current.uploading).toBe(false);
  });

  it('sends the token for avatars too', async () => {
    const { result } = renderHook(() => useImageUpload('avatar'));
    await act(async () => {
      await result.current.uploadImage(file);
    });
    expect(sendUpload).toHaveBeenCalledWith(expect.objectContaining({ purpose: 'avatar', accessToken: 'jwt-123' }));
  });

  it('propagates preparation errors and resets the uploading flag', async () => {
    prepareImageForUpload.mockRejectedValue(new Error('Please upload a JPG, PNG, WebP or GIF image.'));
    const { result } = renderHook(() => useImageUpload('payment-proof'));
    await act(async () => {
      await expect(result.current.uploadImage(file)).rejects.toThrow(/JPG/);
    });
    expect(sendUpload).not.toHaveBeenCalled();
    expect(result.current.uploading).toBe(false);
  });
});
