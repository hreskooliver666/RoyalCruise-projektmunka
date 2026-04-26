// Ez a fájl központi HTTP segédfüggvényeket ad az egységes kérésküldéshez és válaszfeldolgozáshoz.
const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080/api";

// Ezeket a handlereket az AuthProvider regisztralja, hogy az API kliens 401 esetben tudjon tokenfrissitest kerni.
let authTokenProvider = null;
let refreshTokenHandler = null;

// Az auth API regressziók elkerüléséhez itt egy központi konfigurációs ponton kötjük be az auth callbackeket.
export function configureAuthHttp({ getToken = null, refreshToken = null } = {}) {
  authTokenProvider = typeof getToken === "function" ? getToken : null;
  refreshTokenHandler = typeof refreshToken === "function" ? refreshToken : null;
}

function buildRequestHeaders(optionsHeaders = {}, skipAuthInjection = false) {
  const headers = {
    "Content-Type": "application/json",
    ...optionsHeaders,
  };

  if (!skipAuthInjection && !headers.Authorization && authTokenProvider) {
    const token = authTokenProvider();
    if (typeof token === "string" && token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  return headers;
}

async function resolveErrorMessage(response) {
  let message = "Szerver hiba történt.";
  try {
    const payload = await response.json();
    message = payload.message ?? message;
  } catch {
    message = response.statusText || message;
  }
  return message;
}

export async function apiRequest(path, options = {}) {
  const {
    // Ha true, 401 esetben nem inditunk refresh ciklust (pl. /auth/login vagy /auth/refresh hivasoknal).
    skipAuthRefresh = false,
    // Ha true, a kliens nem illeszt be automatikusan Bearer tokent a kerelemhez.
    skipAuthInjection = false,
    ...fetchOptions
  } = options;

  const requestUrl = `${API_BASE_URL}${path}`;
  const baseHeaders = buildRequestHeaders(fetchOptions.headers ?? {}, skipAuthInjection);

  let response = await fetch(requestUrl, {
    ...fetchOptions,
    headers: baseHeaders,
  });

  // 401 eseten egyszeri refresh + retry fut, hogy lejart tokennel is transzparensen helyrealljon a session.
  if (
    response.status === 401
    && !skipAuthRefresh
    && refreshTokenHandler
  ) {
    try {
      const refreshedUser = await refreshTokenHandler();
      const refreshedToken = refreshedUser?.token || authTokenProvider?.();

      if (typeof refreshedToken === "string" && refreshedToken) {
        const retryHeaders = {
          ...baseHeaders,
          Authorization: `Bearer ${refreshedToken}`,
        };

        response = await fetch(requestUrl, {
          ...fetchOptions,
          headers: retryHeaders,
        });
      }
    } catch {
      // Ha a refresh sem sikerult, az eredeti (vagy az ujraprobalt) valasz feldolgozasa megy tovabb.
    }
  }

  if (!response.ok) {
    const message = await resolveErrorMessage(response);
    const error = new Error(message);
    error.status = response.status;
    error.responseStatusText = response.statusText;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export { API_BASE_URL };
