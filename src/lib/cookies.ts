/**
 * Client-side cookie writer. Kept in a plain module (not a component closure)
 * so it stays clear of the react-hooks immutability rule, and so the cookie
 * attributes live in one place.
 */
export function setBrowserCookie(
  name: string,
  value: string,
  maxAgeSeconds = 60 * 60 * 24 * 365,
) {
  document.cookie = `${name}=${value}; path=/; max-age=${maxAgeSeconds}; samesite=lax`;
}
