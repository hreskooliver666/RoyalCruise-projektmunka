// Ez a fájl a foglalások létrehozásához, listázásához és lemondásához tartozó kliensoldali API-hívásokat kezeli.
import { apiRequest } from "./http.js";

export function createBooking(payload, token) {
  return apiRequest("/bookings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export function getMyBookings(token) {
  return apiRequest("/bookings/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function cancelMyBooking(id, token, cancellationData = {}) {
  const endpointCandidates = [
    { path: `/bookings/${id}`, method: "DELETE" },
    { path: `/bookings/${id}`, method: "PATCH" },
    { path: `/bookings/${id}`, method: "PUT" },
    { path: `/bookings/${id}/cancel`, method: "POST" },
    { path: `/bookings/${id}/cancel`, method: "PATCH" },
    { path: `/bookings/me/${id}`, method: "DELETE" },
    { path: `/bookings/cancel/${id}`, method: "POST" },
  ];

// Ez a segédfüggvény az adott HTTP metódushoz elkészíti a lemondási kérés opcióit.
  const requestOptionsFor = (method) => ({
    method,
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      cancellationReason: cancellationData.cancellationReason || "USER_REQUESTED",
      reason: cancellationData.cancellationReason || "USER_REQUESTED",
      refundPercentage: cancellationData.refundPercentage ?? 0,
      refundRate: cancellationData.refundPercentage ?? 0,
      cancellationDate: cancellationData.cancellationDate || new Date().toISOString().split("T")[0],
    }),
  });

// Ez a belső aszinkron függvény sorban kipróbálja a támogatott HTTP metódusokat, hogy a lemondás kompatibilis maradjon eltérő backend-beállítások mellett.
  const tryNext = async (index = 0) => {
    if (index >= endpointCandidates.length) {
      throw new Error("A foglalás lemondása nem sikerült.");
    }

    const candidate = endpointCandidates[index];

    try {
      return await apiRequest(candidate.path, requestOptionsFor(candidate.method));
    } catch (error) {
      const status = error?.status;
      if (status === 404 || status === 405 || status === 415 || status === 400) {
        return tryNext(index + 1);
      }

      throw error;
    }
  };

  return tryNext();
}
