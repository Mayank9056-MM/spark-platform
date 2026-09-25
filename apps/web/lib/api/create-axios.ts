import axios, { type AxiosInstance } from 'axios';

import { env } from '@/config/env';

const API_BASE_PATH = '/api/v1';

export const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * Creates an axios instance with the transport defaults every SPARK API call
 * shares. Interceptors are NOT attached here: the main client adds auth and
 * refresh handling, while the token-refresh call must use a bare instance so a
 * failing refresh can never trigger another refresh.
 */
export function createAxiosInstance(): AxiosInstance {
  return axios.create({
    baseURL: `${env.NEXT_PUBLIC_API_URL}${API_BASE_PATH}`,
    timeout: DEFAULT_TIMEOUT_MS,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },

    // Required for the browser to store and send the httpOnly refresh-token
    // cookie on cross-origin requests. Paired with cors({ credentials: true }).
    withCredentials: true,

    // axios would otherwise copy an XSRF-TOKEN cookie into an X-XSRF-TOKEN
    // header. The API's CORS allow-list does not include that header, and it
    // relies on SameSite=Strict cookies rather than double-submit tokens.
    withXSRFToken: false,

    // Report timeouts as ETIMEDOUT so they can be told apart from other aborts.
    transitional: { clarifyTimeoutError: true },
  });
}
