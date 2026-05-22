function resolveApiRoot() {
  try {
    if (typeof window !== "undefined" && window.location?.hostname) {
      return `http://${window.location.hostname}:4000/api`;
    }
  } catch (error) {
    // Ignore runtime hostname resolution issues and fall back below.
  }

  return "http://localhost:4000/api";
}

export const API_ROOT = resolveApiRoot().replace(/\/+$/, "");

export function getAssetUrl(assetPath) {
  if (!assetPath) {
    return "";
  }

  if (assetPath.startsWith("http://") || assetPath.startsWith("https://")) {
    return assetPath;
  }

  const origin = API_ROOT.replace(/\/api$/, "");
  return `${origin}${assetPath}`;
}

export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_ROOT}${path}`, {
    method: options.method || "GET",
    headers,
    body:
      options.body instanceof FormData
        ? options.body
        : options.body
          ? JSON.stringify(options.body)
          : undefined,
  });

  let payload = null;

  try {
    payload = await response.json();
  } catch (error) {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.message || "Request failed.");
  }

  return payload;
}
