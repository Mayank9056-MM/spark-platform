import { DEFAULT_POST_LOGIN_PATH, LOGIN_PATH } from '../constants';

// Any syntactically valid origin works; it only exists so relative URLs can be
// parsed and then compared against it to detect attempts to leave the site.
const PARSE_ORIGIN = 'http://redirect.invalid';

/**
 * Resolves the post-login destination from an untrusted `next` query value.
 *
 * Only same-site relative paths are honoured. Everything else — absolute URLs,
 * protocol-relative `//host`, backslash tricks, `javascript:` payloads, or a
 * loop back to the login page — falls back to the default, so the login form
 * can never be turned into an open redirect.
 */
export function resolveSafeRedirect(candidate: string | string[] | undefined): string {
  const value = Array.isArray(candidate) ? candidate[0] : candidate;

  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\')
  ) {
    return DEFAULT_POST_LOGIN_PATH;
  }

  let url: URL;
  try {
    url = new URL(value, PARSE_ORIGIN);
  } catch {
    return DEFAULT_POST_LOGIN_PATH;
  }

  // The URL parser strips tabs/newlines, so "/\t/evil.com" only reveals itself
  // as "//evil.com" after parsing — the origin check catches it.
  const isCrossOrigin = url.origin !== PARSE_ORIGIN;
  const isLoginLoop = url.pathname === LOGIN_PATH || url.pathname.startsWith(`${LOGIN_PATH}/`);

  if (isCrossOrigin || isLoginLoop) {
    return DEFAULT_POST_LOGIN_PATH;
  }

  return `${url.pathname}${url.search}${url.hash}`;
}
