// Ez a fájl a hitelesítési állapot forrását biztosító provider komponenst tartalmazza.
import { useState, useEffect, useRef, useCallback } from "react";
import AuthContext from "./AuthContext.jsx";
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshAuthToken,
  registerUser,
} from "../api/authApi.js";
import { configureAuthHttp } from "../api/http.js";

const AUTH_TOKEN_KEY = "royal_auth_token";
const REFRESH_LEAD_TIME_MS = 60 * 1000;
const REFRESH_RETRY_DELAY_MS = 30 * 1000;

function inferCityFromAddress(addressValue) {
  if (typeof addressValue !== "string") return "";
  const raw = addressValue.trim();
  if (!raw) return "";

  const prefix = raw.split(",")[0]?.trim() || "";
  if (!prefix) return "";
  if (/\d/.test(prefix)) return "";
  return prefix;
}

function resolveCityFromData(data) {
  if (!data || typeof data !== "object") return "";

  const addressObj = data.address && typeof data.address === "object" ? data.address : null;
  return data.city
    || data.userCity
    || data.profileCity
    || data.cityName
    || data.varos
    || data["város"]
    || data.telepules
    || data["település"]
    || data.town
    || data.municipality
    || data.addressCity
    || addressObj?.city
    || addressObj?.cityName
    || addressObj?.varos
    || addressObj?.["város"]
    || addressObj?.telepules
    || addressObj?.["település"]
    || addressObj?.town
    || inferCityFromAddress(data.address)
    || inferCityFromAddress(data.streetAddress)
    || "";
}

// Az AuthProvider komponens kezeli a tokenalapú bejelentkezési állapotot, a profilbetöltést és az auth műveletek átadását.
export default function AuthProvider({ children }) {
  // 1) Auth állapotok és jogosultsági jelzők inicializálása.
  // Ez az állapot tárolja a bejelentkezett felhasználó teljes profil- és jogosultsági adatait.
  const [user, setUser] = useState(null);
  // Ez az állapot jelzi, hogy az induló token-ellenőrzés és profilbetöltés még folyamatban van-e.
  const [authLoading, setAuthLoading] = useState(true);
  // Ez az időzítő kezeli az ütemezett tokenfrissítést a lejárat előtti időpontra.
  const refreshTimerRef = useRef(null);
  // Ez a referencia biztosítja, hogy egyszerre csak egy refresh kérés fusson.
  const refreshInFlightRef = useRef(null);
  // Ez a referencia az aktuális refresh függvényre mutat, így az időzítő mindig a legfrissebb logikát hívja.
  const refreshSessionRef = useRef(null);

  const isAdmin = user?.role === "ADMIN";

  // A JWT payload exp mezőjéből ezredmásodperces lejárati időt olvasunk ki.
  function getTokenExpiryTimeMs(token) {
    if (typeof token !== "string" || !token.includes(".")) return null;

    try {
      const payload = token.split(".")[1];
      const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
      const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
      const decoded = JSON.parse(atob(padded));
      if (!decoded?.exp || typeof decoded.exp !== "number") return null;
      return decoded.exp * 1000;
    } catch {
      return null;
    }
  }

  // Egységesen alakítjuk felhasználó objektummá a backend auth válaszát, hogy login/me/refresh ugyanazt az állapotot frissítse.
  function mapAuthResponseToUser(data, fallbackToken = "") {
    const resolvedToken = data?.token || fallbackToken;
    return {
      email: data?.email,
      token: resolvedToken,
      username: data?.username,
      role: data?.role,
      address: data?.address,
      city: resolveCityFromData(data),
      country: data?.country,
      postalCode: data?.postalCode,
      phone: data?.phone,
      gender: data?.gender,
      createdAt: data?.createdAt,
    };
  }

  // Ütemezett frissítés előtt mindig töröljük az előző időzítőt, hogy ne induljanak párhuzamos refresh ciklusok.
  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  // A következő refresh időpontját a JWT lejárata alapján számoljuk (lejárat előtt 60 másodperccel).
  const scheduleTokenRefresh = useCallback((token, delayOverrideMs = null) => {
    clearRefreshTimer();

    if (typeof token !== "string" || !token) return;

    const expiryMs = getTokenExpiryTimeMs(token);
    const now = Date.now();
    let nextDelayMs = 0;

    if (typeof delayOverrideMs === "number") {
      nextDelayMs = Math.max(1000, delayOverrideMs);
    } else if (!expiryMs) {
      // Ha nem tudjuk olvasni az exp mezőt, konzervatívan későbbre ütemezünk egy próbát.
      nextDelayMs = 10 * 60 * 1000;
    } else {
      nextDelayMs = Math.max(1000, expiryMs - now - REFRESH_LEAD_TIME_MS);
    }

    refreshTimerRef.current = setTimeout(async () => {
      try {
        if (refreshSessionRef.current) {
          await refreshSessionRef.current(token);
        }
      } catch {
        // A tényleges hibaágat a refreshSession kezeli (401-nél kiléptetés, hálózati hibánál retry).
      }
    }, nextDelayMs);
  }, [clearRefreshTimer]);

  // Ezzel a művelettel friss access tokent kérünk, és atomikusan frissítjük a user állapotot + localStorage-t.
  const refreshSession = useCallback(async (tokenOverride = null) => {
    const activeToken = tokenOverride || localStorage.getItem(AUTH_TOKEN_KEY) || "";
    if (!activeToken) {
      throw new Error("Nincs elérhető token frissítéshez.");
    }

    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current;
    }

    refreshInFlightRef.current = refreshAuthToken(activeToken)
      .then((data) => {
        const nextUser = mapAuthResponseToUser(data, activeToken);
        setUser(nextUser);
        localStorage.setItem(AUTH_TOKEN_KEY, nextUser.token);
        scheduleTokenRefresh(nextUser.token);
        return nextUser;
      })
      .catch((error) => {
        if (error?.status === 401 || error?.status === 403) {
          // Jogosultsági hiba esetén a token már nem menthető, biztonságosan kijelentkeztetünk.
          setUser(null);
          localStorage.removeItem(AUTH_TOKEN_KEY);
          clearRefreshTimer();
        } else {
          // Átmeneti hálózati hiba esetén nem léptetünk ki azonnal, hanem rövid késleltetéssel újrapróbálkozunk.
          scheduleTokenRefresh(activeToken, REFRESH_RETRY_DELAY_MS);
        }
        throw error;
      })
      .finally(() => {
        refreshInFlightRef.current = null;
      });

    return refreshInFlightRef.current;
  }, [clearRefreshTimer, scheduleTokenRefresh]);

  // Az időzítő callbackek innen érik el a legfrissebb refresh implementációt.
  useEffect(() => {
    refreshSessionRef.current = refreshSession;
  }, [refreshSession]);

  // Az API kliens itt kapja meg a jelenlegi token olvasot es a refresh callbacket,
  // igy barmely 401-es API hivas kepes egyszer automatikusan ujraprobalni friss tokennel.
  useEffect(() => {
    configureAuthHttp({
      getToken: () => localStorage.getItem(AUTH_TOKEN_KEY) || "",
      refreshToken: async () => refreshSession(),
    });

    return () => {
      // Unmountkor toroljuk a callbackeket, hogy ne maradjon stale referencia mas auth context utan.
      configureAuthHttp();
    };
  }, [refreshSession]);

  // 2) Munkamenet-helyreállítás induláskor tárolt tokenből.
  // Ez az effekt induláskor helyreállítja a munkamenetet a tárolt token alapján, majd lekéri a jelenlegi felhasználót.
  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);

    if (!token) {
      setAuthLoading(false);
      return;
    }

    getCurrentUser(token)
      .then((data) => {
        const nextUser = mapAuthResponseToUser(data, token);
        setUser(nextUser);
        localStorage.setItem(AUTH_TOKEN_KEY, nextUser.token);
        scheduleTokenRefresh(nextUser.token);
      })
      .catch(() => {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        setUser(null);
        clearRefreshTimer();
      })
      .finally(() => {
        setAuthLoading(false);
      });
  }, [clearRefreshTimer, scheduleTokenRefresh]);

  // Komponens unmount esetén biztosan takarítjuk az időzítőt.
  useEffect(() => {
    return () => {
      clearRefreshTimer();
    };
  }, [clearRefreshTimer]);

  // Fókuszba visszatéréskor gyors ellenőrzés: ha közel a lejárat, azonnal frissítünk, hogy a következő API kérés már új tokennel menjen.
  useEffect(() => {
    async function handleWindowFocus() {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) return;

      const expiryMs = getTokenExpiryTimeMs(token);
      if (!expiryMs) return;

      const shouldRefreshNow = (expiryMs - Date.now()) <= REFRESH_LEAD_TIME_MS;
      if (shouldRefreshNow) {
        try {
          await refreshSession(token);
        } catch {
          // A refreshSession a hiba jellegétől függően már intézi a szükséges állapotkezelést.
        }
      }
    }

    window.addEventListener("focus", handleWindowFocus);
    return () => {
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [refreshSession]);

  // 3) Hitelesítési műveletek: login, register, logout.
  // Ez a művelet hitelesíti a felhasználót, menti a tokent, és frissíti a globális auth állapotot.
  async function login(email, password) {
    const data = await loginUser(email, password);
    const nextUser = mapAuthResponseToUser(data);
    setUser(nextUser);
    localStorage.setItem(AUTH_TOKEN_KEY, nextUser.token);
    scheduleTokenRefresh(nextUser.token);
    return nextUser;
  }

  // Ez a művelet regisztrálja az új felhasználót, de nem lépteti be automatikusan.
  async function register(payload) {
    const normalizedCity = payload?.city || payload?.town || payload?.municipality || payload?.addressCity || "";
    const rawAddress = typeof payload?.address === "string" ? payload.address.trim() : "";
    const shouldPrefixAddressWithCity = Boolean(
      normalizedCity
      && rawAddress
      && !rawAddress.toLowerCase().startsWith(String(normalizedCity).trim().toLowerCase())
    );
    const normalizedAddress = shouldPrefixAddressWithCity ? `${normalizedCity}, ${rawAddress}` : rawAddress;

    const registrationPayload = {
      ...payload,
      address: normalizedAddress,
      city: normalizedCity,
      userCity: normalizedCity,
      profileCity: normalizedCity,
      cityName: normalizedCity,
      varos: normalizedCity,
      "város": normalizedCity,
      telepules: normalizedCity,
      "település": normalizedCity,
      town: normalizedCity,
      municipality: normalizedCity,
      addressCity: normalizedCity,
      location: normalizedCity ? { city: normalizedCity } : undefined,
      profile: normalizedCity ? { city: normalizedCity } : undefined,
      streetAddress: rawAddress,
      addressLine: rawAddress,
    };

    const data = await registerUser(registrationPayload);
    return {
      email: data.email,
      username: data.username,
      role: data.role,
      address: data.address,
      city: resolveCityFromData(data) || normalizedCity,
      country: data.country,
      postalCode: data.postalCode,
      phone: data.phone,
      gender: data.gender,
      createdAt: data.createdAt,
    };
  }

  // Ez a művelet kijelentkezteti a felhasználót a backendből, majd törli a helyi auth állapotot és tokent.
  async function logout() {
    if (user?.token) {
      try {
        await logoutUser(user.token);
      } catch (err) {
        console.warn("Logout error:", err.message);
      }
    }
    clearRefreshTimer();
    setUser(null);
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }

  // 4) AuthContext szolgáltatása a teljes komponensfának.
  return (
    <AuthContext.Provider value={{ user, isAdmin, authLoading, login, logout, register, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}
