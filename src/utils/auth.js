const STORAGE_KEY = "ntwoods_auth";

export function decodeJwt(token) {
  if (!token || typeof token !== "string") {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload.padEnd(payload.length + (4 - (payload.length % 4 || 4)) % 4, "=");
    const decoded = atob(padded);
    return JSON.parse(decoded);
  } catch (error) {
    return null;
  }
}

export function storeAuth({ idToken, email, name }) {
  if (!idToken || !email) {
    return;
  }

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ idToken, email, name })
  );
}

export function getStoredAuth() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed?.idToken && parsed?.email) {
      return parsed;
    }
  } catch (error) {
    return null;
  }

  return null;
}

export function clearStoredAuth() {
  localStorage.removeItem(STORAGE_KEY);
}
