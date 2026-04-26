// Ez a fájl a hitelesítési API-műveleteket kezeli: regisztráció, bejelentkezés, profillekérés és kijelentkezés.
import { apiRequest } from "./http.js";

export function registerUser(payload) {
  return apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
    // Regisztracios hibanak nem szabad automatikus refresh ciklust inditania.
    skipAuthRefresh: true,
  });
}

export function loginUser(email, password) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    // Hibás login esetén ne próbáljunk tokenfrissítést, mert még nincs biztosan érvényes session.
    skipAuthRefresh: true,
  });
}

export function getCurrentUser(token) {
  return apiRequest("/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function logoutUser(token) {
  return apiRequest("/auth/logout", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    // Logout folyamatban nincs ertelme refresh-retry agnak.
    skipAuthRefresh: true,
  });
}

export function refreshAuthToken(token) {
  return apiRequest("/auth/refresh", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    // Refresh hivas kozben tiltjuk az ujabb refresh probat, hogy ne alakuljon ki veletlen rekurzio.
    skipAuthRefresh: true,
    // A refresh endpointhez mindig explicit tokennel megyunk, automatikus header-beszuras nelkul.
    skipAuthInjection: true,
  });
}
