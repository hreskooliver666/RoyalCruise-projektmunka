// Ez a fájl kulcsszó-alapú szabályokkal rendeli hozzá a megfelelő hajónevet az útvonalakhoz.
import { getRouteOnboardPrograms, getRouteStopSchedule } from "./routeStopSchedule.js";

const SHIPS = {
  AURORA: "RC Aurora",
  HORIZON: "RC Horizon",
  SERENITA: "RC Serenita",
};

// Ez a segédfüggvény normalizálja a szöveget a stabil kulcsszavas összehasonlításhoz.
function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// Ez a segédfüggvény összefűzi az útvonal releváns szöveges mezőit elemzéshez.
function collectRouteText(route) {
  if (!route || typeof route !== "object") return "";

  const parts = [
    route.name,
    route.destination,
    route.routeName,
    ...(Array.isArray(route.stops) ? route.stops : []),
  ];

  return normalizeText(parts.join(" "));
}

const HORIZON_KEYWORDS = [
  "koppenhaga",
  "oslo",
  "bergen",
  "stavanger",
  "fjord",
  "balti",
  "eszaki",
  "scandin",
  "stockholm",
  "helsinki",
];

const SERENITA_KEYWORDS = [
  "velence",
  "dubrovnik",
  "santorini",
  "mykonos",
  "korfu",
  "athen",
  "adria",
  "görög",
  "gorog",
  "greece",
];

const AURORA_KEYWORDS = [
  "barcelona",
  "marseille",
  "roma",
  "napoly",
  "mallorca",
  "mediterran",
  "foldkozi",
  "földközi",
  "sicilia",
  "szicilia",
  "capri",
];

// Ez a segédfüggvény ellenőrzi, hogy a normalizált szöveg tartalmazza-e a kulcsszót.
function hasKeyword(text, keywords) {
  return keywords.some((keyword) => text.includes(normalizeText(keyword)));
}

export function getShipNameForRoute(route) {
  const text = collectRouteText(route);

  if (hasKeyword(text, HORIZON_KEYWORDS)) return SHIPS.HORIZON;
  if (hasKeyword(text, SERENITA_KEYWORDS)) return SHIPS.SERENITA;
  if (hasKeyword(text, AURORA_KEYWORDS)) return SHIPS.AURORA;

  return SHIPS.AURORA;
}

export function attachShipToRoute(route) {
  if (!route || typeof route !== "object") return route;

  const resolvedShipName = route.shipName || getShipNameForRoute(route);

  return {
    ...route,
    shipName: resolvedShipName,
    stopSchedule: getRouteStopSchedule(route),
    onboardPrograms: Array.isArray(route.onboardPrograms) && route.onboardPrograms.length
      ? route.onboardPrograms
      : getRouteOnboardPrograms({ ...route, shipName: resolvedShipName }),
  };
}

export function attachShipsToRoutes(routes) {
  if (!Array.isArray(routes)) return [];
  return routes.map((route) => attachShipToRoute(route));
}
