// Ez a fájl az admin felülethez szükséges felhasználó- és foglaláskezelő API-hívásokat gyűjti össze.
import { apiRequest } from "./http.js";

export function getAdminUsers(token) {
  return apiRequest("/admin/users", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function getAdminBookings(token) {
  return apiRequest("/admin/bookings", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function deleteAdminUser(id, token) {
  return apiRequest(`/admin/users/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function deleteAdminBooking(id, token) {
  return apiRequest(`/admin/bookings/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
