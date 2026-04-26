// Ez a fájl a kabinok listázásához és egyedi lekéréséhez szükséges alap API-végpont hívásait tartalmazza.
import { apiRequest } from "./http.js";

export function getAllCabins() {
  return apiRequest("/cabins");
}

export function getCabin(id) {
  return apiRequest(`/cabins/${id}`);
}
