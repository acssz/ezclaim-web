import { ClaimPatchRequest, ClaimRequest, ClaimResponse, PhotoCreateRequest, PhotoResponse, PhotoUploadRequest, PresignDownloadResponse, PresignUploadResponse, TagResponse } from './types';

export class HttpError extends Error {
  status: number;
  bodyText: string;
  constructor(status: number, statusText: string, bodyText: string) {
    super(`HTTP ${status} ${statusText}: ${bodyText || 'Request failed'}`);
    this.status = status;
    this.bodyText = bodyText;
  }
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const hasBody = typeof init?.body !== 'undefined' && init?.body !== null;
  const headers: Record<string, string> = {};
  // Only set Content-Type when sending a JSON body (avoid triggering CORS preflight on GET)
  if (hasBody && !(init?.body instanceof FormData)) {
    // If caller didn't specify Content-Type, default to JSON
    const lower = Object.fromEntries(Object.entries(init?.headers || {}).map(([k,v]) => [k.toLowerCase(), String(v)]));
    if (!('content-type' in lower)) headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...headers,
      ...(init?.headers || {}),
    },
    cache: 'no-store',
    mode: 'cors',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new HttpError(res.status, res.statusText, text);
  }
  // Handle 204 No Content
  if (res.status === 204) return undefined as unknown as T;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json') || ct.includes('*/*')) {
    return (await res.json()) as T;
  }
  // fallback
  return (await res.text()) as unknown as T;
}

export const Api = {
  // Tags
  async listTags(): Promise<TagResponse[]> {
    return http('/api/tags');
  },

  // Photos
  async presignUpload(req: PhotoUploadRequest): Promise<PresignUploadResponse> {
    return http('/api/photos/presign-upload', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  async uploadToPresignedUrl(
    url: string,
    file: File,
    headers?: Record<string, string | string[]>
  ): Promise<void> {
    // Normalize provided headers and drop forbidden ones for browsers
    const forbidden = new Set([
      'host',
      'content-length',
      'connection',
      'transfer-encoding',
      'accept-encoding',
      'origin', // the browser adds this automatically
    ]);
    const normalized: Record<string, string> = {};
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        const key = k.toLowerCase();
        if (forbidden.has(key)) continue;
        const value = Array.isArray(v) ? v.join(', ') : v;
        normalized[k] = value;
      }
    }

    // Keep Content-Type consistent with what was presigned (we passed file.type to presign)
    if (!Object.keys(normalized).some((h) => h.toLowerCase() === 'content-type')) {
      normalized['Content-Type'] = file.type || 'application/octet-stream';
    }

    const res = await fetch(url, {
      method: 'PUT',
      body: file,
      headers: normalized,
      mode: 'cors',
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Upload failed: ${res.status} ${res.statusText} ${text}`);
    }
  },

  async createPhotoRecord(req: PhotoCreateRequest): Promise<PhotoResponse> {
    return http('/api/photos', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  async getPhotoDownloadUrl(id: string, expiresInSeconds?: number): Promise<PresignDownloadResponse> {
    const qs = expiresInSeconds ? `?expiresInSeconds=${expiresInSeconds}` : '';
    return http(`/api/photos/${encodeURIComponent(id)}/download-url${qs}`);
  },

  // Claims
  async createClaim(req: ClaimRequest): Promise<ClaimResponse> {
    return http('/api/claims', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  async getClaim(id: string, password?: string): Promise<ClaimResponse> {
    const qs = password ? `?password=${encodeURIComponent(password)}` : '';
    return http(`/api/claims/${encodeURIComponent(id)}${qs}`);
  },

  async patchClaim(id: string, body: ClaimPatchRequest): Promise<ClaimResponse> {
    return http(`/api/claims/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },
};
