let initialized = false;
let scriptInjected = false;

function ensureGisScript() {
  if (scriptInjected) return;
  const existing = document.querySelector('script[src^="https://accounts.google.com/gsi/client"]');
  if (existing) {
    scriptInjected = true;
    return;
  }
  const s = document.createElement('script');
  s.src = 'https://accounts.google.com/gsi/client';
  s.async = true;
  s.defer = true;
  document.head.appendChild(s);
  scriptInjected = true;
}

async function waitForGis(timeoutMs = 8000) {
  const start = Date.now();
  ensureGisScript();
  while (Date.now() - start < timeoutMs) {
    if (window.google?.accounts?.id) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return !!window.google?.accounts?.id;
}

export async function initGoogle(onCredential) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    console.error('VITE_GOOGLE_CLIENT_ID is not set');
    return false;
  }
  const gisReady = await waitForGis();
  if (!gisReady) {
    console.warn('Google Identity Services script not loaded within timeout');
    return false;
  }
  if (initialized) return true;
  try {
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (credentialResponse) => {
        try {
          await onCredential?.(credentialResponse.credential);
        } catch (e) {
          console.error('Credential callback error:', e);
        }
      },
      ux_mode: 'popup',
      auto_select: false,
      cancel_on_tap_outside: true,
    });
    initialized = true;
    return true;
  } catch (e) {
    console.error('GIS initialize failed:', e);
    return false;
  }
}

export function promptGoogle() {
  if (!initialized) return false;
  try {
    window.google.accounts.id.prompt();
    return true;
  } catch (e) {
    console.error('Prompt failed:', e);
    return false;
  }
}

export async function startSignin(onCredential) {
  const ok = await initGoogle(onCredential);
  if (!ok) {
    throw new Error('Google sign-in is not ready. Ensure the GIS script is loaded and VITE_GOOGLE_CLIENT_ID is set.');
  }
  const prompted = promptGoogle();
  if (!prompted) {
    throw new Error('Failed to open Google sign-in prompt. Please try again.');
  }
}
