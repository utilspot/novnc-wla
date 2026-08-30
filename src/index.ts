import RFB from '@novnc/novnc';

import { resolveEndpoint } from './endpoint';

type Status = 'connecting' | 'connected' | 'disconnected';

function requireElement<T extends Element>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) {
    throw new Error(`Missing required element: ${selector}`);
  }
  return el;
}

const screen = requireElement<HTMLDivElement>('#screen');
const statusBar = requireElement<HTMLElement>('#status');
const homeLink = requireElement<HTMLAnchorElement>('#home');
const githubLink = requireElement<HTMLAnchorElement>('#gh-link');

// The Home button always points at the site root. It is pointless when the app
// is already served from "/", so only reveal it under a non-root base URL.
const baseUrl = (typeof __BASE_URL__ === 'string' && __BASE_URL__) || '/';
homeLink.hidden = baseUrl === '/';

// Footer GitHub link comes from package.json "homepage" (baked in at build time).
const homepage = (typeof __HOMEPAGE__ === 'string' && __HOMEPAGE__) || '';
if (homepage) {
  githubLink.href = homepage;
} else {
  githubLink.replaceWith(document.createTextNode(githubLink.textContent ?? 'GitHub'));
}

const query = new URLSearchParams(window.location.search);
const endpoint = resolveEndpoint();

let rfb: RFB | null = null;

function setStatus(state: Status, detail: string): void {
  statusBar.dataset.state = state;
  statusBar.textContent = detail;
}

function connect(): void {
  setStatus('connecting', 'Connecting…');

  const password = query.get('password') ?? undefined;
  const username = query.get('username') ?? undefined;

  rfb = new RFB(screen, endpoint.url, {
    shared: true,
    credentials: password || username ? { username, password } : undefined,
  });

  // Scale the remote framebuffer to fit the container instead of clipping.
  rfb.scaleViewport = true;
  rfb.resizeSession = false;
  rfb.background = '#000';

  rfb.addEventListener('connect', () => {
    setStatus('connected', 'Connected');
  });

  rfb.addEventListener('disconnect', (event) => {
    const clean = (event as CustomEvent<{ clean: boolean }>).detail?.clean;
    setStatus('disconnected', clean ? 'Disconnected' : 'Connection lost');
    rfb = null;
  });

  rfb.addEventListener('credentialsrequired', () => {
    const promptedPassword = window.prompt('VNC password required') ?? '';
    rfb?.sendCredentials({ username, password: promptedPassword });
  });

  rfb.addEventListener('securityfailure', (event) => {
    const reason = (event as CustomEvent<{ reason?: string }>).detail?.reason;
    setStatus('disconnected', `Security failure${reason ? `: ${reason}` : ''}`);
  });
}

window.addEventListener('beforeunload', () => {
  rfb?.disconnect();
});

console.info(
  `[novnc-wla] endpoint ${endpoint.url} ` +
    `(${endpoint.fromBuild ? 'build-time override' : 'derived from page origin'})`,
);

connect();
