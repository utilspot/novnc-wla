/**
 * Injected by webpack's DefinePlugin at build time.
 */

/**
 * Build-time VNC endpoint override.
 * - Empty string -> derive the endpoint from the page origin at runtime.
 * - Non-empty     -> connect only to this endpoint.
 */
declare const __VNC_ENDPOINT__: string;

/**
 * Base URL the app is served under, with a trailing slash (default `/`).
 * Used as the default path prefix when deriving the WebSocket endpoint.
 */
declare const __BASE_URL__: string;

/** `homepage` field from package.json (empty string if unset). */
declare const __HOMEPAGE__: string;
