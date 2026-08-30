/**
 * Resolves the WebSocket endpoint used for the VNC connection.
 *
 * The build-time `--endpoint` value is a small spec (not necessarily a full URL).
 * The page scheme always decides ws vs wss (http -> ws, https -> wss); only the
 * host, port and path are taken from the spec.
 *
 *   (unset)              same as "0:0:0:0" (origin host, origin port, path "/")
 *   0:0:0:0 | 0.0.0.0    origin host + origin port          -> same as "/"
 *   0:0:0:0:4444/vnc     origin host, port 4444, path /vnc
 *   0.0.0.0/123          origin host + origin port, path /123
 *   /vnc                 absolute path on the origin        -> ws(s)://<host>:<port>/vnc
 *   vnc                  path relative to the current page directory
 *   ws(s)://host/x       full URL, used as-is (host "0.0.0.0" / port "0" -> origin)
 *   http(s)://host/x     full URL, scheme mapped to ws(s)
 *
 * A missing port is filled from the page: its explicit port, else 80 for ws and
 * 443 for wss. The `?path=` query parameter overrides the resolved path at runtime.
 */

const RAW_SPEC = (typeof __VNC_ENDPOINT__ === 'string' ? __VNC_ENDPOINT__ : '').trim();
const DEFAULT_SPEC = '0:0:0:0';
const ZERO_HOST = /^(?:0\.0\.0\.0|0:0:0:0)(?::(\d+))?(\/.*)?$/;

export interface ResolvedEndpoint {
  url: string;
  /** true when a non-empty `--endpoint` was baked in at build time. */
  fromBuild: boolean;
}

function wsScheme(location: Location): 'ws:' | 'wss:' {
  return location.protocol === 'https:' || location.protocol === 'wss:' ? 'wss:' : 'ws:';
}

function originPort(location: Location, secure: boolean): string {
  return location.port || (secure ? '443' : '80');
}

/** Current page path treated as a directory (trailing slash guaranteed). */
function pageDir(location: Location): string {
  const path = location.pathname || '/';
  return path.endsWith('/') ? path : `${path}/`;
}

function normalizePath(path: string): string {
  const collapsed = path.replace(/\/{2,}/g, '/');
  return collapsed.startsWith('/') ? collapsed : `/${collapsed}`;
}

export function buildUrl(spec: string, location: Location): string {
  const scheme = wsScheme(location);
  const secure = scheme === 'wss:';

  // Full URL form.
  if (/^(?:wss?|https?):\/\//i.test(spec)) {
    const url = new URL(spec);
    if (url.protocol === 'http:') url.protocol = 'ws:';
    else if (url.protocol === 'https:') url.protocol = 'wss:';
    if (url.hostname === '0.0.0.0') url.hostname = location.hostname;
    if (url.port === '0') url.port = '';
    return url.toString();
  }

  let port = '';
  let path: string;

  const zero = ZERO_HOST.exec(spec);
  if (zero) {
    port = zero[1] ?? '';
    path = zero[2] ?? '/';
  } else if (spec.startsWith('/')) {
    path = spec;
  } else {
    path = pageDir(location) + spec;
  }

  const override = new URLSearchParams(location.search).get('path');
  if (override != null) {
    path = override;
  }

  const host = location.hostname;
  const finalPort = port || originPort(location, secure);
  return `${scheme}//${host}:${finalPort}${normalizePath(path)}`;
}

export function resolveEndpoint(location: Location = window.location): ResolvedEndpoint {
  const fromBuild = RAW_SPEC.length > 0;
  return {
    url: buildUrl(fromBuild ? RAW_SPEC : DEFAULT_SPEC, location),
    fromBuild,
  };
}
