// Ez a fájl az útvonal megállóinak időzítését számolja ki, és előállítja a megjeleníthető menetrendi előfordulásokat.
import { hasMinimumFutureCityStops } from "./bookingConstraints.js";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const GENERAL_PROGRAMS = [
  "Napfelkelte jóga a fedélzeten",
  "Chef's Table kóstolóest",
  "Élő jazz koncert a lounge-ban",
  "Tengerészeti előadás és Q&A",
  "Koktél workshop",
  "Moziest a csillagok alatt",
  "Salsa táncoktatás",
  "Borkóstoló mesterkurzus",
  "Spa relax csomag",
  "Pilates panorámaórák",
  "Kézműves csokoládé workshop",
  "Fotós túra tippek és trükkök",
];

const FAMILY_PROGRAMS = [
  "Gyermek kalózkaland klub",
  "Családi quiz est",
  "VR játékterem bajnokság",
  "Mini diszkó és gyerekműsor",
];

const WELLNESS_PROGRAMS = [
  "Naplemente meditáció",
  "Detox juice bar workshop",
  "Szauna rituálé bemutató",
  "Wellness állapotfelmérés",
];

const PROGRAM_TIME_SLOTS = [
  "08:00",
  "10:30",
  "13:00",
  "15:30",
  "18:00",
  "20:30",
];

// Ez a segédfüggvény a seedeléshez szükséges alap szöveget állítja össze az útvonal adataiból.
function toSeedText(route) {
  return [route?.id, route?.name, route?.destination, route?.routeName]
    .filter(Boolean)
    .join("|");
}

// Ez a segédfüggvény számszerű seed értéket képez a seed szövegből.
function getSeedValue(text) {
  return String(text)
    .split("")
    .reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0);
}

// Ez a segédfüggvény determinisztikus indexválasztó függvényt készít a seed alapján.
function createSeededPicker(seedText) {
  let seed = getSeedValue(seedText) || 1;

  return function pickIndex(limit) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return limit > 0 ? seed % limit : 0;
  };
}

// Ez a segédfüggvény meghatározza két megálló között a naplépés mértékét.
function getDayStep(route, city, index) {
  const seed = getSeedValue(`${toSeedText(route)}|${city}|${index}`);
  return (seed % 3) + 1;
}

// Ez a segédfüggvény kiszámolja az útvonal fordulónapjainak számát.
function getTurnaroundDays(route) {
  const seed = getSeedValue(`${toSeedText(route)}|turnaround`);
  return (seed % 4) + 2;
}

// Ez a segédfüggvény ISO dátumszöveget Date objektummá alakít.
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

// Ez a segédfüggvény Date objektumot ISO dátumszöveggé alakít.
function toIsoDate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Ez a segédfüggvény megjelenítésre alkalmas dátumszöveget készít.
function toDisplayDate(value) {
  const date = parseIsoDate(value);
  if (!date) return value;

  return new Intl.DateTimeFormat("hu-HU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

// Ez a segédfüggvény visszaadja a mai dátumot ISO formátumban.
function getTodayIsoDate() {
  return new Date().toISOString().split("T")[0];
}

// Ez a segédfüggvény UTC logikával napokat ad hozzá a megadott dátumhoz.
function addUtcDays(date, days) {
  return new Date(date.getTime() + days * DAY_IN_MS);
}

// Ez a segédfüggvény meghatározza az útvonal alap dátumát.
function getBaseRouteDate(route) {
  const fromRouteDate = parseIsoDate(route?.date);
  if (fromRouteDate) {
    return fromRouteDate;
  }

  const firstStopDate = Array.isArray(route?.stopSchedule)
    ? route.stopSchedule.find((item) => item?.date)?.date
    : "";
  const fromStopSchedule = parseIsoDate(firstStopDate);
  if (fromStopSchedule) {
    return fromStopSchedule;
  }

  return null;
}

// Ez a segédfüggvény elkészíti egy útvonal-forduló részletes menetrendi objektumát.
function buildOccurrence(route, startDateIso, referenceDateIso) {
  const stopSchedule = buildRouteStopSchedule(route, startDateIso);
  const startDate = stopSchedule[0]?.date || startDateIso;
  const endDate = stopSchedule[stopSchedule.length - 1]?.date || startDateIso;
  const today = parseIsoDate(referenceDateIso);
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);

  const isInTransit = Boolean(today && start && end && today >= start && today <= end);

  return {
    startDate,
    endDate,
    stopSchedule,
    isInTransit,
  };
}

// Ez a segédfüggvény kiszámolja az útvonal teljes ciklusidejét napokban.
function getRouteCycleDays(route, startDateIso) {
  const occurrence = buildOccurrence(route, startDateIso, startDateIso);
  const start = parseIsoDate(occurrence.startDate);
  const end = parseIsoDate(occurrence.endDate);
  const travelDays = start && end ? Math.max(Math.round((end.getTime() - start.getTime()) / DAY_IN_MS), 0) : 0;
  return Math.min(Math.max(travelDays + getTurnaroundDays(route), 1), 12);
}

// Ez a segédfüggvény rögzített dátumú forduló objektumot készít.
function buildFixedOccurrence(route, referenceDate = getTodayIsoDate()) {
  const stopSchedule = getRouteStopSchedule(route);
  const startDate = stopSchedule[0]?.date || route?.date || "";
  const endDate = stopSchedule[stopSchedule.length - 1]?.date || startDate;
  const today = parseIsoDate(referenceDate);
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);

  return {
    startDate,
    endDate,
    stopSchedule,
    isInTransit: Boolean(today && start && end && today >= start && today <= end),
    isCompleted: Boolean(today && end && today > end),
    isUpcoming: Boolean(today && start && today < start),
  };
}

export function formatStopDate(value) {
  return toDisplayDate(value);
}

export function getRouteOnboardPrograms(route, count = 4) {
  const sourcePool = [...GENERAL_PROGRAMS, ...FAMILY_PROGRAMS, ...WELLNESS_PROGRAMS];
  const uniquePool = Array.from(new Set(sourcePool));
  const shipSeed = String(route?.shipName || "RC Aurora");
  const picker = createSeededPicker(`${shipSeed}|programs`);
  const timePicker = createSeededPicker(`${toSeedText(route)}|program-times`);
  const availableTimes = [...PROGRAM_TIME_SLOTS];
  const selectedProgramNames = [];
  const selected = [];

  while (selectedProgramNames.length < Math.min(count, uniquePool.length)) {
    const idx = picker(uniquePool.length);
    const programName = uniquePool.splice(idx, 1)[0];
    selectedProgramNames.push(programName);
  }

  selectedProgramNames.forEach((programName) => {
    const timeIndex = availableTimes.length ? timePicker(availableTimes.length) : 0;
    const selectedTime = availableTimes.length ? availableTimes.splice(timeIndex, 1)[0] : "12:00";
    selected.push(`${selectedTime} - ${programName}`);
  });

  return selected.sort();
}

export function getNextRouteOccurrence(route, referenceDate = getTodayIsoDate()) {
  const baseDate = getBaseRouteDate(route);
  if (!baseDate) {
    return buildFixedOccurrence(route, referenceDate);
  }

  const today = parseIsoDate(referenceDate);
  const cycleDays = getRouteCycleDays(route, toIsoDate(baseDate));
  let candidate = baseDate;

  if (!today) {
    return buildOccurrence(route, toIsoDate(candidate), referenceDate);
  }

  const diffDays = Math.floor((today.getTime() - baseDate.getTime()) / DAY_IN_MS);
  const cyclesToReference = Math.floor(diffDays / cycleDays);
  candidate = addUtcDays(baseDate, cyclesToReference * cycleDays);

  while (candidate > today) {
    candidate = addUtcDays(candidate, -cycleDays);
  }

  while (addUtcDays(candidate, cycleDays) <= today) {
    candidate = addUtcDays(candidate, cycleDays);
  }

  let occurrence = buildOccurrence(route, toIsoDate(candidate), referenceDate);

  while (occurrence.endDate && parseIsoDate(occurrence.endDate) < today) {
    candidate = addUtcDays(candidate, cycleDays);
    occurrence = buildOccurrence(route, toIsoDate(candidate), referenceDate);
  }

  return occurrence;
}

export function getRouteOccurrencesInWindow(route, windowStartIso, windowEndIso, maxCount = 60) {
  const windowStart = parseIsoDate(windowStartIso);
  const windowEnd = parseIsoDate(windowEndIso);
  const baseDate = getBaseRouteDate(route);

  if (!windowStart || !windowEnd || !baseDate || windowEnd < windowStart) {
    return [];
  }

  const cycleDays = getRouteCycleDays(route, toIsoDate(baseDate));
  const diffDays = Math.floor((windowStart.getTime() - baseDate.getTime()) / DAY_IN_MS);
  const cyclesToStart = Math.floor(diffDays / cycleDays);
  let candidate = addUtcDays(baseDate, cyclesToStart * cycleDays);

  while (candidate > windowStart) {
    candidate = addUtcDays(candidate, -cycleDays);
  }

  while (addUtcDays(candidate, cycleDays) <= windowStart) {
    candidate = addUtcDays(candidate, cycleDays);
  }

  const occurrences = [];

  while (candidate <= windowEnd && occurrences.length < maxCount) {
    const occurrence = buildOccurrence(route, toIsoDate(candidate), windowStartIso);
    const occurrenceStart = parseIsoDate(occurrence.startDate);

    if (occurrenceStart && occurrenceStart >= windowStart && occurrenceStart <= windowEnd) {
      occurrences.push(occurrence);
    }

    candidate = addUtcDays(candidate, cycleDays);
  }

  return occurrences;
}

// Ez a segédfüggvény visszaadja a legközelebbi olyan indulást, ahol a mai nap után még legalább 2 városi megálló marad.
export function getFirstBookableRouteOccurrence(route, referenceDate = getTodayIsoDate(), todayIso = getTodayIsoDate(), minFutureCityStops = 2) {
  const windowStart = String(referenceDate || todayIso);
  const anchorDate = parseIsoDate(windowStart) || parseIsoDate(todayIso);
  const todayDate = parseIsoDate(todayIso);

  // Eloszor a mai naphoz kepest aktualis fordulot vizsgaljuk: ha epp fut es meg foglalhato,
  // akkor ezt kell megjeleniteni, nem egy kesobbi indulast.
  const currentOrNextFromToday = getNextRouteOccurrence(route, todayIso);
  const currentStart = parseIsoDate(currentOrNextFromToday?.startDate);
  const currentEnd = parseIsoDate(currentOrNextFromToday?.endDate);
  const isCurrentlyInTransit = Boolean(todayDate && currentStart && currentEnd && todayDate >= currentStart && todayDate <= currentEnd);

  if (isCurrentlyInTransit && hasMinimumFutureCityStops(currentOrNextFromToday, todayIso, minFutureCityStops)) {
    return currentOrNextFromToday;
  }

  if (!anchorDate) {
    const fallback = getNextRouteOccurrence(route, windowStart);
    return hasMinimumFutureCityStops(fallback, todayIso, minFutureCityStops) ? fallback : null;
  }

  // Ket eves horizont elegendo, hogy az ismetlodo korutak kovetkezo foglalhato forduloja biztosan meglegyen.
  const windowEndIso = toIsoDate(addUtcDays(anchorDate, 730));
  const occurrences = getRouteOccurrencesInWindow(route, windowStart, windowEndIso, 500);
  const firstBookable = occurrences.find((occurrence) => {
    const hasFutureStops = hasMinimumFutureCityStops(occurrence, todayIso, minFutureCityStops);
    const endsInFuture = String(occurrence?.endDate || "") > todayIso;
    return hasFutureStops && endsInFuture;
  });

  if (firstBookable) {
    return firstBookable;
  }

  const fallback = getNextRouteOccurrence(route, windowStart);
  return hasMinimumFutureCityStops(fallback, todayIso, minFutureCityStops) ? fallback : null;
}

export function buildRouteStopSchedule(route, startDateOverride = "") {
  const stops = Array.isArray(route?.stops) ? route.stops.filter(Boolean) : [];
  if (!stops.length) return [];

  const baseDate = parseIsoDate(startDateOverride || route?.date);
  if (!baseDate) {
    return stops.map((city) => ({ city, date: "", isSeaDay: false }));
  }

  let currentDate = baseDate;
  const result = [];

  stops.forEach((city, index) => {
    if (index === 0) {
      result.push({ city, date: toIsoDate(currentDate), isSeaDay: false });
      return;
    }

    const dayStep = getDayStep(route, city, index);

    for (let dayOffset = 1; dayOffset < dayStep; dayOffset += 1) {
      const seaDate = new Date(currentDate.getTime() + dayOffset * DAY_IN_MS);
      result.push({ city: "Tengeri nap", date: toIsoDate(seaDate), isSeaDay: true });
    }

    currentDate = new Date(currentDate.getTime() + dayStep * DAY_IN_MS);
    result.push({ city, date: toIsoDate(currentDate), isSeaDay: false });
  });

  return result;
}

export function getRouteStopSchedule(route, startDateOverride = "") {
  if (!startDateOverride && Array.isArray(route?.stopSchedule) && route.stopSchedule.length) {
    return route.stopSchedule
      .filter((item) => item && item.city)
      .map((item) => ({ ...item, isSeaDay: Boolean(item.isSeaDay) }));
  }

  return buildRouteStopSchedule(route, startDateOverride);
}
