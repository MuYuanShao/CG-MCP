export type ApiState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  empty: boolean;
};

export type ApiResult<T> = {
  data: T;
  traceId?: string;
};

type ApiEnvelope<T> = {
  code?: string;
  message?: string;
  data?: T;
};

export class ApiError extends Error {
  status: number;
  traceId?: string;

  constructor(message: string, status: number, traceId?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.traceId = traceId;
  }
}

declare global {
  interface Window {
    __APP_CONFIG__?: {
      VITE_API_BASE_URL?: string;
      VITE_API_KEY?: string;
    };
  }
}

function getApiBaseUrl() {
  const runtimeBaseUrl = typeof window !== 'undefined'
    ? window.__APP_CONFIG__?.VITE_API_BASE_URL
    : undefined;
  return (runtimeBaseUrl ?? import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
}

function buildApiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}

function getApiKey() {
  const runtimeApiKey = typeof window !== 'undefined'
    ? window.__APP_CONFIG__?.VITE_API_KEY
    : undefined;
  return runtimeApiKey ?? import.meta.env.VITE_API_KEY ?? '';
}

function getAuthToken() {
  return typeof window === 'undefined' ? '' : window.localStorage.getItem('spd_auth_token') ?? '';
}

export async function requestJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<ApiResult<T>> {
  const response = await fetch(buildApiUrl(path), {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(getApiKey() ? { 'x-api-key': getApiKey() } : {}),
      ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}),
      ...init.headers,
    },
  });

  const traceId = response.headers.get('x-trace-id') ?? undefined;

  if (!response.ok) {
    let message = '请求失败，请稍后重试';
    try {
      const body = await response.json();
      message = body.message ?? message;
    } catch {
      message = response.statusText || message;
    }
    throw new ApiError(message, response.status, traceId);
  }

  if (response.status === 204) {
    return {
      data: null as T,
      traceId,
    };
  }

  const body = (await response.json()) as ApiEnvelope<T> | T;
  const data = typeof body === 'object' && body !== null && 'data' in body
    ? (body as ApiEnvelope<T>).data as T
    : body as T;

  return { data, traceId };
}

export async function requestFormData<T>(
  path: string,
  init: RequestInit = {},
): Promise<ApiResult<T>> {
  const response = await fetch(buildApiUrl(path), {
    credentials: 'include',
    ...init,
    headers: {
      ...(getApiKey() ? { 'x-api-key': getApiKey() } : {}),
      ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}),
      ...init.headers,
    },
  });

  const traceId = response.headers.get('x-trace-id') ?? undefined;

  if (!response.ok) {
    let message = '请求失败，请稍后重试';
    try {
      const body = await response.json();
      message = body.message ?? message;
    } catch {
      message = response.statusText || message;
    }
    throw new ApiError(message, response.status, traceId);
  }

  if (response.status === 204) {
    return {
      data: null as T,
      traceId,
    };
  }

  const body = (await response.json()) as ApiEnvelope<T> | T;
  const data = typeof body === 'object' && body !== null && 'data' in body
    ? (body as ApiEnvelope<T>).data as T
    : body as T;

  return { data, traceId };
}

export const initialApiState = <T>(): ApiState<T> => ({
  data: null,
  loading: false,
  error: null,
  empty: false,
});
