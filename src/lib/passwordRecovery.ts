const RESET_PASSWORD_PATH = '/reset-password';
const RECOVERY_REQUESTED_AT_KEY = 'zyre-password-recovery-requested-at';
const RECOVERY_SESSION_KEY = 'zyre-password-recovery-session-active';
const RECOVERY_REQUEST_MAX_AGE_MS = 30 * 60 * 1000;

const safeSessionStorage = {
  get(key: string) {
    try {
      return window.sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      window.sessionStorage.setItem(key, value);
    } catch {
      // Ignore storage failures; the reset link still contains the recovery token.
    }
  },
  remove(key: string) {
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      // Ignore storage failures.
    }
  },
};

export function getResetPasswordRedirectUrl() {
  return new URL(RESET_PASSWORD_PATH, window.location.origin).toString();
}

export function markPasswordRecoveryEmailRequested() {
  safeSessionStorage.set(RECOVERY_REQUESTED_AT_KEY, Date.now().toString());
}

export function markPasswordRecoverySessionActive() {
  safeSessionStorage.set(RECOVERY_SESSION_KEY, 'true');
}

export function hasPasswordRecoverySessionMarker() {
  return safeSessionStorage.get(RECOVERY_SESSION_KEY) === 'true';
}

export function clearPasswordRecoveryMarkers() {
  safeSessionStorage.remove(RECOVERY_REQUESTED_AT_KEY);
  safeSessionStorage.remove(RECOVERY_SESSION_KEY);
}

export function isResetPasswordRoute(pathname = window.location.pathname) {
  return pathname === RESET_PASSWORD_PATH;
}

function hasRecentRecoveryRequest() {
  const rawTimestamp = safeSessionStorage.get(RECOVERY_REQUESTED_AT_KEY);
  if (!rawTimestamp) return false;

  const requestedAt = Number(rawTimestamp);
  return Number.isFinite(requestedAt) && Date.now() - requestedAt < RECOVERY_REQUEST_MAX_AGE_MS;
}

export function locationHasPasswordRecoveryIntent(url = new URL(window.location.href)) {
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
  const type = url.searchParams.get('type') || hashParams.get('type');

  if (type === 'recovery') return true;
  if (hashParams.has('access_token') && hashParams.has('refresh_token')) return true;

  // Some providers strip the route and return only ?code=... to the app root.
  // Only treat that as password recovery in the same browser that requested it.
  return url.searchParams.has('code') && hasRecentRecoveryRequest();
}

export function buildResetPasswordUrlFromCurrentLocation() {
  const target = new URL(RESET_PASSWORD_PATH, window.location.origin);
  target.search = window.location.search;
  target.hash = window.location.hash;
  return target.toString();
}

export function redirectRecoveryIntentToResetPassword() {
  if (isResetPasswordRoute()) return;
  if (!locationHasPasswordRecoveryIntent()) return;

  window.location.replace(buildResetPasswordUrlFromCurrentLocation());
}
