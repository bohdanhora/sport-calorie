const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

const UNAUTHORISED = 401;
const NO_CONTENT = 204;

export class ApiError extends Error {
  readonly status: number;
  readonly messages: string[];

  constructor(status: number, messages: string[]) {
    super(messages[0] ?? 'Request failed');
    this.name = 'ApiError';
    this.status = status;
    this.messages = messages;
  }
}

let accessToken: string | null = null;
let refreshRequest: Promise<string | null> | null = null;
let onSessionLost: (() => void) | null = null;

export const setAccessToken = (token: string | null): void => {
  accessToken = token;
};

export const getAccessToken = (): string | null => accessToken;

export const setSessionLostHandler = (handler: (() => void) | null): void => {
  onSessionLost = handler;
};

const parseErrorMessages = (payload: unknown): string[] => {
  if (typeof payload === 'object' && payload !== null && 'message' in payload) {
    const { message } = payload as { message: unknown };

    if (Array.isArray(message)) {
      return message.filter((item): item is string => typeof item === 'string');
    }

    if (typeof message === 'string') {
      return [message];
    }
  }

  return ['Something went wrong'];
};

const readBody = async <T>(response: Response): Promise<T> => {
  if (response.status === NO_CONTENT) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

const buildHeaders = (body: unknown): HeadersInit => {
  const headers: Record<string, string> = {};

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
};

const refreshSession = async (): Promise<string | null> => {
  refreshRequest ??= (async () => {
    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        return null;
      }

      const session = (await response.json()) as { accessToken: string };

      accessToken = session.accessToken;
      return session.accessToken;
    } catch {
      return null;
    } finally {
      refreshRequest = null;
    }
  })();

  return refreshRequest;
};

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  skipAuthRetry?: boolean;
}

const buildUrl = (path: string, query?: RequestOptions['query']): string => {
  if (!query) {
    return `${API_URL}${path}`;
  }

  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  });

  const search = params.toString();

  return search ? `${API_URL}${path}?${search}` : `${API_URL}${path}`;
};

export const apiRequest = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const { method = 'GET', body, query, skipAuthRetry = false } = options;

  const send = (): Promise<Response> =>
    fetch(buildUrl(path, query), {
      method,
      credentials: 'include',
      headers: buildHeaders(body),
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  let response = await send();

  if (response.status === UNAUTHORISED && !skipAuthRetry) {
    const refreshed = await refreshSession();

    if (refreshed) {
      response = await send();
    } else {
      onSessionLost?.();
    }
  }

  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);

    throw new ApiError(response.status, parseErrorMessages(payload));
  }

  return readBody<T>(response);
};

export const refreshAccessToken = refreshSession;
