import 'axios';

declare module 'axios' {
  interface AxiosRequestConfig {
    /**
     * Send the request without an Authorization header and never refresh-and-
     * replay it. Set for credential-bearing public calls such as login.
     */
    skipAuth?: boolean;
    /**
     * Set on a request that was replayed after a token refresh, so a request is
     * replayed at most once and a persistent 401 cannot loop.
     */
    hasRetried?: boolean;
  }
}
