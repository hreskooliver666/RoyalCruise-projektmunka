// Ez a fájl az útvonalak lekérdezését, szűrését és árnormalizálását végző kliensoldali API-logikát tartalmazza.
import { apiRequest } from "./http.js";
import { attachShipToRoute, attachShipsToRoutes } from "../utils/routeShipAssignment.js";
import { EUR_TO_HUF_RATE } from "../utils/formatPrice.js";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const TARGET_MAX_ROUTE_PRICE_HUF = 1_500_000;
const TARGET_MAX_ROUTE_PRICE_EUR = TARGET_MAX_ROUTE_PRICE_HUF / EUR_TO_HUF_RATE;

let cachedPriceBounds = null;

// Ez az ellenőrzés eldönti, hogy az út áradata számként használható-e.
// Ez a segédfüggvény ellenőrzi, hogy az út áradata érvényes szám-e.
function hasFinitePrice(route) {
  return Number.isFinite(Number(route?.price));
}

// Ez a segédfüggvény ellenőrzi és beolvassa az ISO dátumformátumot.
// Ez a segédfüggvény ISO formátumú dátumszöveget Date objektummá alakít.
function parseIsoDate(value) {
  const match = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  return new Date(Date.UTC(year, month - 1, day));
}

// Ez a függvény visszaalakítja a dátumot ISO szöveggé.
// Ez a segédfüggvény a dátumobjektumot ISO formátumú szöveggé alakítja.
function toIsoDate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Ez a segéd a megadott dátumhoz napokat ad hozzá.
// Ez a segédfüggvény a megadott dátumhoz napokat ad hozzá.
function addDays(value, days) {
  const date = parseIsoDate(value);
  if (!date) return "";

  return toIsoDate(new Date(date.getTime() + days * DAY_IN_MS));
}

// Ez a segédfüggvény kiszámolja az utazás hosszát napokban.
// Ez a segédfüggvény kiszámolja két dátum között az utazás hosszát napokban.
function getTripDurationDays(startDate, endDate) {
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);

  if (!start || !end) return undefined;

  const diffDays = Math.round((end.getTime() - start.getTime()) / DAY_IN_MS);
  return Number.isFinite(diffDays) && diffDays >= 0 ? diffDays : undefined;
}

// Ez a függvény kibővíti a keresést, ha a dátumtartomány túl szűk lenne.
// Ez a segédfüggvény rugalmas dátumtartományt állít be, ha a pontos keresés túl szűk.
function buildFlexibleDateParams(params) {
  if (!params.startDate || !params.endDate) {
    return params;
  }

  const tripDurationDays = getTripDurationDays(params.startDate, params.endDate);

  return {
    ...params,
    requestedStartDate: params.startDate,
    requestedEndDate: params.endDate,
    startDate: undefined,
    endDate: undefined,
    startDateWindowFrom: addDays(params.startDate, -7),
    startDateWindowTo: addDays(params.startDate, 7),
    endDateWindowFrom: addDays(params.endDate, -7),
    endDateWindowTo: addDays(params.endDate, 7),
    tripDurationDays,
  };
}

// Ez a függvény meghatározza az út indulási városát a megadott adatokból.
// Ez a segédfüggvény visszaadja az útvonal indulási városát a rendelkezésre álló adatokból.
function getRouteDepartureCity(route) {
  const fromStops = Array.isArray(route?.stops) ? route.stops.filter(Boolean)[0] : "";
  if (fromStops) return fromStops;

  const fromSchedule = Array.isArray(route?.stopSchedule)
    ? route.stopSchedule.find((stop) => stop && !stop.isSeaDay && stop.city)?.city
    : "";
  return fromSchedule || "";
}

// Ez a függvény összegyűjti az út során érintett városokat.
// Ez a segédfüggvény összegyűjti az útvonal összes érintett városát.
function getRouteTouchedCities(route) {
  const directStops = Array.isArray(route?.stops) ? route.stops.filter(Boolean) : [];
  if (directStops.length) return directStops;

  return Array.isArray(route?.stopSchedule)
    ? route.stopSchedule.filter((stop) => stop && !stop.isSeaDay && stop.city).map((stop) => stop.city)
    : [];
}

// Ez a függvény a szűrőfeltételek alapján eldönti, hogy az út megfelel-e a keresésnek.
// Ez a segédfüggvény ellenőrzi, hogy az út megfelel-e az összes kiválasztott mezőszűrőnek.
function matchesRouteFieldFilters(route, params) {
  if (params.destination && route?.destination !== params.destination) return false;

  if (params.routeName) {
    const routeGroup = route?.routeName || route?.name || "";
    if (routeGroup !== params.routeName) return false;
  }

  if (params.departureCity && getRouteDepartureCity(route) !== params.departureCity) return false;

  if (params.touchedCity) {
    const touchedCities = getRouteTouchedCities(route);
    if (!touchedCities.includes(params.touchedCity)) return false;
  }

  if (params.shipType && (route?.shipName || "") !== params.shipType) return false;

  return true;
}

// Ez a függvény kiszámolja az elérhető árak tartományát a normalizáláshoz.
// Ez a segédfüggvény meghatározza az útlistában a minimum és maximum árhatárt.
function getPriceBounds(routes) {
  const prices = (Array.isArray(routes) ? routes : [])
    .map((route) => Number(route?.price))
    .filter((value) => Number.isFinite(value));

  if (!prices.length) {
    return null;
  }

  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
  };
}

// Ez a függvény átskálázza az árat a kívánt tartományhoz.
// Ez a segédfüggvény az út árát a célzott árskálához igazítja.
function scaleRoutePrice(value, bounds) {
  if (!Number.isFinite(value) || !bounds) {
    return value;
  }

  const { min, max } = bounds;
  const targetMax = Math.max(TARGET_MAX_ROUTE_PRICE_EUR, min);

  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min || targetMax === max) {
    return value;
  }

  const ratio = (value - min) / (max - min);
  return Math.round(min + ratio * (targetMax - min));
}

// Ez a függvény az összes út árát egységes skálára hozza.
// Ez a segédfüggvény minden út árát egységes skálára normalizálja.
function normalizeRoutePrices(routes, bounds) {
  if (!Array.isArray(routes) || !routes.length || !bounds) {
    return Array.isArray(routes) ? routes : [];
  }

  return routes.map((route) => {
    if (!hasFinitePrice(route)) {
      return route;
    }

    return {
      ...route,
      price: scaleRoutePrice(Number(route.price), bounds),
    };
  });
}

// Ez a függvény az árskála értékeit csak egyszer tölti be és cache-eli.
async function getOrLoadPriceBounds() {
  if (cachedPriceBounds) {
    return cachedPriceBounds;
  }

  const routes = await apiRequest("/routes");
  cachedPriceBounds = getPriceBounds(routes);
  return cachedPriceBounds;
}

// Ez a függvény a teljes útlistát kéri le és hozzáadja a hajóbesorolást.
export function getAllRoutes() {
  return apiRequest("/routes").then((routes) => {
    cachedPriceBounds = getPriceBounds(routes);
    return attachShipsToRoutes(normalizeRoutePrices(routes, cachedPriceBounds));
  });
}

// Ez a függvény egyetlen út részleteit tölti be az azonosító alapján.
export function getRouteById(id) {
  return Promise.all([apiRequest(`/routes/${id}`), getOrLoadPriceBounds()]).then(([route, bounds]) => {
    const [normalizedRoute] = normalizeRoutePrices([route], bounds);
    return attachShipToRoute(normalizedRoute);
  });
}

// Ez a függvény a keresési paramétereket lekérdezéses formára alakítja.
export function searchRoutes(params) {
  const search = new URLSearchParams();

// Ez a segédfüggvény eldönti, hogy egy keresési paraméter értéke ténylegesen meg van-e adva.
  const hasValue = (value) => value !== undefined && value !== null && value !== "";

  if (hasValue(params.destination)) search.set("destination", params.destination);
  if (hasValue(params.routeName)) search.set("routeName", params.routeName);
  if (hasValue(params.departureCity)) search.set("departureCity", params.departureCity);
  if (hasValue(params.touchedCity)) search.set("touchedCity", params.touchedCity);
  if (hasValue(params.startDate)) search.set("startDate", params.startDate);
  if (hasValue(params.endDate)) search.set("endDate", params.endDate);
  if (hasValue(params.requestedStartDate)) search.set("requestedStartDate", params.requestedStartDate);
  if (hasValue(params.requestedEndDate)) search.set("requestedEndDate", params.requestedEndDate);
  if (hasValue(params.startDateWindowFrom)) search.set("startDateWindowFrom", params.startDateWindowFrom);
  if (hasValue(params.startDateWindowTo)) search.set("startDateWindowTo", params.startDateWindowTo);
  if (hasValue(params.endDateWindowFrom)) search.set("endDateWindowFrom", params.endDateWindowFrom);
  if (hasValue(params.endDateWindowTo)) search.set("endDateWindowTo", params.endDateWindowTo);
  if (hasValue(params.tripDurationDays)) search.set("tripDurationDays", params.tripDurationDays);
  if (hasValue(params.guests)) search.set("guests", params.guests);
  if (hasValue(params.minPrice)) search.set("minPrice", params.minPrice);
  if (hasValue(params.maxPrice)) search.set("maxPrice", params.maxPrice);
  if (hasValue(params.shipType)) search.set("shipType", params.shipType);

  return Promise.all([
    apiRequest(`/routes/search?${search.toString()}`),
    getOrLoadPriceBounds(),
  ]).then(([routes, bounds]) => attachShipsToRoutes(normalizeRoutePrices(routes, bounds)));
}

// Ez a függvény hibabiztos keresést végez, és szükség esetén lazább tartalmat ad vissza.
export async function searchRoutesWithFallback(params) {
  async function safeSearch(searchParams) {
    try {
      const routes = await searchRoutes(searchParams);
      return Array.isArray(routes) ? routes : [];
    } catch {
      return [];
    }
  }

  const exactRoutes = await safeSearch(params);
  if (exactRoutes.length > 0) {
    return exactRoutes;
  }

  const hasDateRange = Boolean(params.startDate && params.endDate);

  if (hasDateRange) {
    const flexibleRoutes = await safeSearch(buildFlexibleDateParams(params));

    if (Array.isArray(flexibleRoutes) && flexibleRoutes.length > 0) {
      return flexibleRoutes;
    }
  }

  const fallbackRoutes = await getAllRoutes();
  return fallbackRoutes.filter((route) => matchesRouteFieldFilters(route, params));
}

// Ez a függvény az elérhető úti célokat kéri le a felugró szűrőkhöz.
export function getDestinations() {
  return apiRequest("/routes/destinations");
}

// Ez a függvény az adott úti célhoz tartozó útcsoportokat tölti le.
export function getRouteGroups(destination) {
  const query = new URLSearchParams({ destination });
  return apiRequest(`/routes/route-groups?${query.toString()}`);
}
