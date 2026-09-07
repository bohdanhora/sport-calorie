import type { AuthResponse } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

const UNAUTHORISED = 401;
const NO_CONTENT = 204;

/**
 * The session survives a reload on the `sc_refresh` cookie the API sets. Safari
 * refuses that cookie when the API is on an unrelated domain to the app, which
 * is why the phone landed back on the sign-in screen after every reload while
 * the desktop stayed signed in. The API therefore also returns the refresh
 * token, and this copy is sent in the body when the cookie never arrives.
 */
const REFRESH_TOKEN_STORAGE_KEY = 'sc.refresh-token';

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
let refreshToken: string | null = null;
let restoreRequest: Promise<AuthResponse | null> | null = null;
let onSessionLost: (() => void) | null = null;

const readStoredRefreshToken = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  } catch {
    // Private browsing can refuse storage outright; the cookie still covers it.
    return null;
  }
};

const storeRefreshToken = (token: string | null): void => {
  refreshToken = token;

  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (token) {
      window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    }
  } catch {
    // Nothing to do: the request still carries whatever the cookie holds.
  }
};

export const setAccessToken = (token: string | null): void => {
  accessToken = token;
};

export const getAccessToken = (): string | null => accessToken;

/** Remembers a session the API just handed out, so a reload can restore it. */
export const rememberSession = (session: AuthResponse): void => {
  accessToken = session.accessToken;
  storeRefreshToken(session.refreshToken);
};

export const forgetSession = (): void => {
  accessToken = null;
  storeRefreshToken(null);
};

export const getRefreshToken = (): string | null => refreshToken ?? readStoredRefreshToken();

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

/**
 * One in-flight call at a time. A page load restores the session and any query
 * that raced it can answer 401, and two refreshes rotating the same token used
 * to leave the loser holding a dead one.
 */
const restoreSession = async (): Promise<AuthResponse | null> => {
  restoreRequest ??= (async () => {
    try {
      const stored = getRefreshToken();

      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stored === null ? {} : { refreshToken: stored }),
      });

      if (!response.ok) {
        // Anything else - the network, a sleeping API - leaves the token alone,
        // so a flaky connection does not sign the user out.
        if (response.status === UNAUTHORISED) {
          storeRefreshToken(null);
        }

        return null;
      }

      const session = (await response.json()) as AuthResponse;

      rememberSession(session);
      return session;
    } catch {
      return null;
    } finally {
      restoreRequest = null;
    }
  })();

  return restoreRequest;
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
    const refreshed = await restoreSession();

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

export const restoreStoredSession = restoreSession;
