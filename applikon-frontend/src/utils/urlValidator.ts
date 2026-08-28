// URL validation against XSS delivered through javascript: and data: schemes
//
// Java analogy: sanitizer/validator (like Spring Security or OWASP)

// Checks whether a URL is safe to open in href or window.open()
//
// Rejects:
// - javascript: (can execute code)
// - data: (can be used for injection)
// - other dangerous schemes
//
// Accepts:
// - https:// (preferred)
// - http:// (acceptable)
//
// Uses the URL() constructor (like Java URI) to properly parse the scheme.
export function isSafeUrl(url: string | undefined | null): boolean {
  if (!url) return false

  try {
    // The URL() constructor throws on anything it cannot parse, which is the check itself
    // Throws if the URL is malformed
    const parsed = new URL(url)

    // Only http: and https: are safe to put behind a link the user can click
    // (URL.protocol includes the colon, e.g. "https:")
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    // Unparseable input is rejected rather than guessed at
    return false
  }
}
