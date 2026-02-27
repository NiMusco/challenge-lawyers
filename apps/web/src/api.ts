type ApiErrorPayload = { ok?: boolean; error?: string; [k: string]: unknown };

function isApiErrorPayload(x: unknown): x is ApiErrorPayload {
  return typeof x === 'object' && x !== null;
}

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export class ApiError extends Error {
  status: number;
  statusText: string;
  url?: string;
  bodyText?: string;
  data?: unknown;

  constructor(input: { message: string; status: number; statusText: string; url?: string; bodyText?: string; data?: unknown }) {
    super(input.message);
    this.name = 'ApiError';
    this.status = input.status;
    this.statusText = input.statusText;
    this.url = input.url;
    this.bodyText = input.bodyText;
    this.data = input.data;
  }
}

export function getApiErrorString(err: ApiError): string | undefined {
  const payload = err.data;
  const payloadError = isApiErrorPayload(payload) ? payload.error : undefined;
  if (typeof payloadError === 'string' && payloadError.trim()) return payloadError;
  return undefined;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    ...init
  });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => '');
    const data = bodyText ? tryParseJson(bodyText) : undefined;
    const message = `${res.status} ${res.statusText}`;
    throw new ApiError({ message, status: res.status, statusText: res.statusText, url: res.url, bodyText, data });
  }

  return (await res.json()) as T;
}

