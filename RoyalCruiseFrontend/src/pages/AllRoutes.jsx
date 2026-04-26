// Ez a fájl az összes elérhető útvonal listázását, szűrését és kártyás megjelenítését vezérli.
import { useEffect, useMemo, useState } from "react";
import { getAllRoutes, getDestinations, getRouteGroups, searchRoutesWithFallback } from "../api/routesApi.js";
import classes from "./Routes.module.css";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { getShipNameForRoute } from "../utils/routeShipAssignment.js";
import formatPrice from "../utils/formatPrice.js";
import { hasMinimumFutureCityStops } from "../utils/bookingConstraints.js";
import {
  formatStopDate,
  getFirstBookableRouteOccurrence,
  getRouteOnboardPrograms,
  getRouteOccurrencesInWindow,
} from "../utils/routeStopSchedule.js";

// Az AllRoutes oldal a keresési feltételek alapján betölti az útvonalakat, majd foglalhatóság szerint rendezetten jeleníti meg őket.
export default function AllRoutes() {
  // 1) Navigációs és kezdeti szűrési kontextus beolvasása (state + query).
  const navigate = useNavigate();
  const { state } = useLocation();
  // Ez a query paraméter olvasó támogatja az URL-ből érkező előszűréseket (például touchedCity).
  const [searchParams] = useSearchParams();
  const filteredRoutes = state?.routes ?? null;
  const initialFilters = useMemo(() => ({
    ...(searchParams.get("touchedCity") ? { touchedCity: searchParams.get("touchedCity") } : {}),
    ...(state?.filters ?? {}),
  }), [searchParams, state?.filters]);
  const hasInitialFilters = Object.keys(initialFilters).length > 0;
  const [baseRoutes, setBaseRoutes] = useState([]);
  const [allRoutes, setAllRoutes] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [routeOptions, setRouteOptions] = useState([]);
  const [departureCityOptions, setDepartureCityOptions] = useState([]);
  const [touchedCityOptions, setTouchedCityOptions] = useState([]);
  const [destination, setDestination] = useState(initialFilters.destination ?? "");
  const [routeName, setRouteName] = useState(initialFilters.routeName ?? "");
  const [departureCity, setDepartureCity] = useState(initialFilters.departureCity ?? "");
  const [touchedCity, setTouchedCity] = useState(initialFilters.touchedCity ?? "");
  const [startDate, setStartDate] = useState(initialFilters.startDate ?? "");
  const [endDate, setEndDate] = useState(initialFilters.endDate ?? "");
  const [shipType, setShipType] = useState(initialFilters.shipType ?? "");
  const [minPrice, setMinPrice] = useState(initialFilters.minPrice ?? 0);
  const [maxPrice, setMaxPrice] = useState(initialFilters.maxPrice ?? 0);
  const [priceBounds, setPriceBounds] = useState(null);
  const [loading, setLoading] = useState(false);
  const now = new Date();
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const [activeReferenceDate, setActiveReferenceDate] = useState(initialFilters.startDate || todayIso);
  const [appliedStartDate, setAppliedStartDate] = useState(initialFilters.startDate ?? "");
  const [appliedEndDate, setAppliedEndDate] = useState(initialFilters.endDate ?? "");
  const [appliedMinPrice, setAppliedMinPrice] = useState(
    Number.isFinite(Number(initialFilters.minPrice)) ? Number(initialFilters.minPrice) : null
  );
  const [appliedMaxPrice, setAppliedMaxPrice] = useState(
    Number.isFinite(Number(initialFilters.maxPrice)) ? Number(initialFilters.maxPrice) : null
  );
  const [appliedDestination, setAppliedDestination] = useState(initialFilters.destination ?? "");
  const [appliedRouteName, setAppliedRouteName] = useState(initialFilters.routeName ?? "");
  const [appliedDepartureCity, setAppliedDepartureCity] = useState(initialFilters.departureCity ?? "");
  const [appliedTouchedCity, setAppliedTouchedCity] = useState(initialFilters.touchedCity ?? "");
  const [appliedShipType, setAppliedShipType] = useState(initialFilters.shipType ?? "");
  const [sortOption, setSortOption] = useState("dateAsc");
  const [initialContextApplied, setInitialContextApplied] = useState(false);

  // 2) Szűrési segédfüggvények: paraméter-építés, dátumkezelés, útállapot meghatározás.

  // Ez a segédfüggvény a frontend szűrőállapotot backend keresési paraméterekké alakítja.
  // FONTOS: Az ár-szűrés szándékosan CLIENT-SIDE ONLY, mert a backend és frontend között eltérő ár-skálák
  // (HUF vs EUR) lehetnek, és ezt nem akarjuk a backend számára küldeni - ez zavart okozna.
  // A backend csak a logikai szűrőket kapja meg (célállomás, útvonal, városok, hajó-típus, dátumok),
  // az ár-szűrés pedig a kliens oldalon történik, miután az adatok megérkeztek.
  function buildBackendSearchParams(params) {
    return {
      destination: params.destination,
      routeName: params.routeName,
      departureCity: params.departureCity,
      touchedCity: params.touchedCity,
      startDate: params.startDate,
      endDate: params.endDate,
      shipType: params.shipType,
      // Price filtering is intentionally client-side only to avoid backend/client price scale mismatch.
      minPrice: undefined,
      maxPrice: undefined,
    };
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

  // Ez a segédfüggvény a route ármezőjét számmá alakítja rendezéshez.
  function parseRoutePrice(value) {
    const direct = Number(value);
    if (Number.isFinite(direct)) return direct;

    const normalized = String(value ?? "")
      .replace(/\s+/g, "")
      .replace(/,/g, ".")
      .replace(/[^0-9.-]/g, "");

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

// Ez a segédfüggvény Date objektumot ISO dátumszöveggé alakít.
  function toIsoDate(date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

// Ez a segédfüggvény a megadott dátumhoz hozzáad egy napokban megadott eltolást.
  function addDays(value, days) {
    const parsed = parseIsoDate(value);
    if (!parsed) return "";
    return toIsoDate(new Date(parsed.getTime() + days * 24 * 60 * 60 * 1000));
  }

// Ez a segédfüggvény megkeresi, hogy a mai nap melyik menetrendi megállóhoz tartozik.
  function getCurrentStopIndex(occurrence) {
    const schedule = Array.isArray(occurrence?.stopSchedule) ? occurrence.stopSchedule : [];
    return schedule.findIndex((stop) => stop?.date === todayIso);
  }

// Ez a segédfüggvény a városnévhez a megfelelő magyar helyhatározói toldalékot illeszti.
  function withHungarianLocationSuffix(city) {
    const text = String(city ?? "").trim();
    if (!text) return "";

    const vowels = [...text.toLowerCase()].filter((char) => "aáeéiíoóöőuúüű".includes(char));
    const lastVowel = vowels[vowels.length - 1] || "a";
    const usesBackSuffix = "aáoóuú".includes(lastVowel);
    const suffix = usesBackSuffix ? "ban" : "ben";

    return `${text}-${suffix}`;
  }

// Ez a segédfüggvény meghatározza, hogy az útvonal melyik pontján jár a hajó.
  function getCurrentJourneyLocation(occurrence, currentStopIndex) {
    const schedule = Array.isArray(occurrence?.stopSchedule) ? occurrence.stopSchedule : [];
    const todayStop = schedule.find((stop) => stop?.date === todayIso);
    const currentStop = currentStopIndex >= 0 ? schedule[currentStopIndex] : null;

    if (currentStopIndex === -1 || todayStop?.isSeaDay || currentStop?.isSeaDay) {
      return "a Tengeren";
    }

    const currentCity = currentStop?.city || "";
    if (!currentCity) {
      return "a Tengeren";
    }

    return withHungarianLocationSuffix(currentCity);
  }

// Ez a segédfüggvény visszaadja az adott útvonal indulási városát.
  function getRouteDeparture(route) {
    const fromStops = Array.isArray(route?.stops) ? route.stops.filter(Boolean)[0] : "";
    if (fromStops) return fromStops;

    const fromSchedule = Array.isArray(route?.stopSchedule)
      ? route.stopSchedule.find((stop) => stop && !stop.isSeaDay && stop.city)?.city
      : "";
    return fromSchedule || "";
  }

// Ez a segédfüggvény összegyűjti az útvonal által érintett városok listáját.
  function getRouteTouchedCities(route) {
    const directStops = Array.isArray(route?.stops) ? route.stops.filter(Boolean) : [];
    if (directStops.length) return directStops;

    return Array.isArray(route?.stopSchedule)
      ? route.stopSchedule.filter((stop) => stop && !stop.isSeaDay && stop.city).map((stop) => stop.city)
      : [];
  }

// Ez a segédfüggvény az útvonaladatokból képernyőn megjeleníthető kártyaobjektumokat készít.
  function buildRouteCards(routes) {
    const sourceRoutes = Array.isArray(routes) ? routes : [];

    // Ez a segédfüggvény az ár szöveges mezőjét megbízható számértékké alakítja. A backend / frontend között
    // lehetnek eltérések az ár-formátumban (pl. "1000", "1,000", "1.000,00", "1000.50"), így normalizálnunk kell őket.
    // Ha az érték nem konvertálható érvényes számra, NaN-t adunk vissza, amely azt jelenti, hogy az ár-szűrő nem érvényes.
    function parsePriceValue(value) {
      const direct = Number(value);
      if (Number.isFinite(direct)) return direct;

      const normalized = String(value ?? "")
        .replace(/\s+/g, "")
        .replace(/,/g, ".")
        .replace(/[^0-9.-]/g, "");

      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : NaN;
    }

    const hasAppliedPriceFilter = appliedMinPrice !== null || appliedMaxPrice !== null;

    // Elsõ szûrõ fázis: meza-alapú szûrõk alkalmazása (cél, útvonal név, indulási város, érintett város, hajó típus).
    // Ezek a szûrõk az aktuális felhasználói választásokon alapulnak. Ha bármely szûrõ aktív, akkor csak a
    // minden mezza. Érdekes: nem minden mez adott kötelezõ, így egy útvonal több szûrõtõl is
    // közös lehet, amíg az alkalmazott szint az összes szûkítéi le.
    const fieldFilteredRoutes = sourceRoutes.filter((route) => {
      if (appliedDestination && route?.destination !== appliedDestination) return false;

      if (appliedRouteName) {
        const routeGroup = route?.routeName || route?.name || "";
        if (routeGroup !== appliedRouteName) return false;
      }

      if (appliedDepartureCity && getRouteDeparture(route) !== appliedDepartureCity) return false;

      if (appliedTouchedCity) {
        const touchedCities = getRouteTouchedCities(route);
        if (!touchedCities.includes(appliedTouchedCity)) return false;
      }

      if (appliedShipType) {
        if ((route?.shipName || "") !== appliedShipType) return false;
      }

      return true;
    });

    // Második szûrõ fázis: ár-alapú szûrõ. A front-end az ár-szûrõt közvetlenül alkalmazza,
    // mert az ár-skálák (HUF vs EUR) között inkonzisztencia lehet a backend és frontend között.
    // Az ár-elemzés elhagyja a már megatározódott útvonalon (fieldFilteredRoutes) végigmegy.
    const priceFilteredRoutes = fieldFilteredRoutes.filter((route) => {
      const value = parsePriceValue(route?.price);
      if (!Number.isFinite(value)) return !hasAppliedPriceFilter;
      if (appliedMinPrice !== null && value < appliedMinPrice) return false;
      if (appliedMaxPrice !== null && value > appliedMaxPrice) return false;
      return true;
    });
    const shouldExpandByDateFilter = Boolean(appliedStartDate);

    // ÚTVONAL 1: Ha NEM van dátumszűrő (appliedStartDate üres), akkor az aktív referencia dátumt, vagy a mai napot
    // használjuk a legközelebbi foglalható járat kiválasztásához. Minden útvonalon csak a legközelebbi bookable
    // előfordulást jelenítjük meg, és növekvő dátum szerint rendezzük őket.
    if (!shouldExpandByDateFilter) {
      return priceFilteredRoutes
        .map((route) => ({
          route,
          occurrence: getFirstBookableRouteOccurrence(route, activeReferenceDate || todayIso, todayIso, 2),
        }))
        .filter(({ occurrence }) => Boolean(occurrence))
        .sort((a, b) => String(a.occurrence.startDate).localeCompare(String(b.occurrence.startDate)));
    }

    const fallbackReferenceDate = appliedStartDate || activeReferenceDate || todayIso;

    // ÚTVONAL 2: Ha VAN dátumszűrő (appliedStartDate) akkor a megadott dátum körül ±7 nappal keresünk járatokat.
    // Az "ablak" (window) egy rugalmas keresési intervallum, amely lehetővé teszi a felhasználónak, hogy az
    // általa választott dátumon közeli járatokat találjon. Ha a felhasználó végső megérkezési dátumot (appliedEndDate)
    // is megadott, akkor azt ugyanúgy ±7 nappal körülveszzük, és csak azokat a járatokat fogadjuk el, amelyeknek
    // az endDate ezen az ablakban esik. Ez az "double anchor" logika: indulás és érkezés is valahol az ablakban.
    const windowStart = addDays(appliedStartDate, -7);
    const windowEnd = addDays(appliedStartDate, 7);
    const arrivalAnchor = appliedEndDate || "";
    const arrivalWindowStart = arrivalAnchor ? addDays(arrivalAnchor, -7) : "";
    const arrivalWindowEnd = arrivalAnchor ? addDays(arrivalAnchor, 7) : "";

    const windowMatchedCards = priceFilteredRoutes
      .flatMap((route) => {
        // Megkeressük az útvonalon belül azokat az előfordulásokat, amelyek az indulási ablakba esnek.
        const occurrences = getRouteOccurrencesInWindow(route, windowStart, windowEnd);

        return occurrences
          // Az összes találat egyértelműen rendelkeznie kell legalább 2 jövőbeli várossal (tengeren kívül).
          .filter((occurrence) => hasMinimumFutureCityStops(occurrence, todayIso, 2))
          // Ha van érkezési dátum-szűrő, akkor csak az érkezési ablakba eső járatokat fogadjuk el.
          .filter((occurrence) => {
            if (!arrivalAnchor) return true;
            const arrivalDate = String(occurrence.endDate || "");
            if (!arrivalDate) return false;
            return arrivalDate >= arrivalWindowStart && arrivalDate <= arrivalWindowEnd;
          })
          .map((occurrence) => ({ route, occurrence }));
      })
      .sort((a, b) => String(a.occurrence.startDate).localeCompare(String(b.occurrence.startDate)));

    // Ha találunk olyan járatokat, amelyek az indulási ablakba esnek, akkor ezeket visszaadjuk.
    if (windowMatchedCards.length) {
      return windowMatchedCards;
    }

    // ÚTVONAL 3: Ha az indulási ablak keresés nem találta meg az igényre megfelelő járatokat, akkor visszatérünk
    // a legközelebb foglalható járat logikájához a fallback referencia dátummal. Ez az útvonalon csak az
    // első bookable (foglalható) előfordulást adja vissza, amely függetlenül a felhasználó által kiválasztott
    // indulási dátumtól. Ez a "laza" fallback lehetővé teszi a felhasználónak, hogy valamilyen járatot találjon
    // azért az útvonalon, még ha a pontos dátumra nincs is lehetőség.
    const fallbackDateCards = priceFilteredRoutes
      .map((route) => ({
        route,
        occurrence: getFirstBookableRouteOccurrence(route, fallbackReferenceDate, todayIso, 2),
      }))
      .filter(({ occurrence }) => Boolean(occurrence))
      .sort((a, b) => String(a.occurrence.startDate).localeCompare(String(b.occurrence.startDate)));

    // Ha sikerült fallback járatokat találni, akkor ezeket visszaadjuk.
    if (fallbackDateCards.length) {
      return fallbackDateCards;
    }

    // Utolsó esély: ha még mindig nincs megfelelő járat, akkor még egyszer meghívjuk az összes útvonalon
    // a getFirstBookableRouteOccurrence függvényt a fallback referencia dátummal. Ez a "duplikáció" szándékos
    // és redundáns: ez a kód csak akkor fut le, ha semmilyen más szűrő nem talált járatokat, és az előző
    // fallbackDateCards már feltételezi ezt. De a kód biztosítja, hogy ha egyáltalán nincs járat, akkor legalább
    // az összes útvonal összes lehetséges járatát megvizsgálva még egy utolsó próbálkozást teszünk.
    return priceFilteredRoutes
      .map((route) => ({
        route,
        occurrence: getFirstBookableRouteOccurrence(route, fallbackReferenceDate, todayIso, 2),
      }))
      .filter(({ occurrence }) => Boolean(occurrence))
      .sort((a, b) => String(a.occurrence.startDate).localeCompare(String(b.occurrence.startDate)));
  }

  // Ez a segédfüggvény eldönti, hogy egy út megfelel-e az aktív mezőszűrőknek hajótípus nélkül.
  function matchesActiveFiltersWithoutShip(route) {
    if (destination && route?.destination !== destination) return false;

    if (routeName) {
      const routeGroup = route?.routeName || route?.name || "";
      if (routeGroup !== routeName) return false;
    }

    if (departureCity && getRouteDeparture(route) !== departureCity) return false;

    if (touchedCity) {
      const touchedCities = getRouteTouchedCities(route);
      if (!touchedCities.includes(touchedCity)) return false;
    }

    return true;
  }

  // Ez a memoizált lista mindig az aktuális szűrőkhöz tartozó összes elérhető hajótípus-opciót adja.
  // FONTOS MEGJEGYZÉS: Ez a lista nem az összes lehetséges hajó-típus, hanem csak azok, amelyek a
  // jelenleg aktív mezőszűrőknek (célállomás, útvonal-név, indulási város, érintett város) megfelelnek.
  // Ez dinamikus és rugalmas: ha pl. "Karib" célt választ, akkor csak azok a hajó-típusok jelennek meg,
  // amelyek a Karib-útvonalakon érhető. Ez biztosítja, hogy az összes szűrő-kombináció érvényes és
  // nem vezetünk felhasználót olyan hajó-típusokra, amelyeknek nincs érvényes útvonala az aktuális szűrő-szinten.
  const shipOptions = useMemo(() => {
    const source = baseRoutes.filter((route) => matchesActiveFiltersWithoutShip(route));
    const relevantRoutes = source.length ? source : baseRoutes;
    const names = [...new Set(relevantRoutes.map((route) => route?.shipName || getShipNameForRoute(route)).filter(Boolean))];
    return names.map((name) => ({ value: name, label: name }));
  }, [baseRoutes, destination, routeName, departureCity, touchedCity]);

  // 3) Szűrt route-kártyák előállítása memoizáltan.
  // Ez a memoizált számítás a szűrt útvonalakból UI-kártya modelleket készít a táblázatos megjelenítéshez.
  // FOLYAMAT: Az allRoutes lista bemenet, amely az aktuálisan szűrt útvonalak teljes listája (mezőszűrők + árszűrő után).
  // A buildRouteCards függvény 3 különböző forgatókönyvet kezel az indul/kez/vég dátum-szűrők alapján:
  //   - Ha NEM van dátum-szűrő: az aktív referencia-dátum vagy a mai nap (todayIso) alapján a legközelebbi bookable járatot keresi
  //   - Ha VAN dátum-szűrő: az indul/kez-dátum körül ±7 napot keresi, és ha a felhasználó vég-dátumot is adott, azt is szűri
  //   - Ha a dátum-ablak keresés semmit nem talál: fallback a legközelebbi bookable járatra (függetlenül az indul/kez-dátumtól)
  // Az eredmény egy olyan kártyák listája, amely route+occurrence párokból áll, és már rendezve van az indul/kez-dátum szerint.
  const routeCards = useMemo(() => buildRouteCards(allRoutes), [
    allRoutes,
    appliedStartDate,
    appliedEndDate,
    appliedMinPrice,
    appliedMaxPrice,
    activeReferenceDate,
    todayIso,
  ]);
  const sortedRouteCards = useMemo(() => {
    const cards = [...routeCards];

    cards.sort((left, right) => {
      if (sortOption === "priceAsc") {
        return parseRoutePrice(left.route?.price) - parseRoutePrice(right.route?.price);
      }

      if (sortOption === "priceDesc") {
        return parseRoutePrice(right.route?.price) - parseRoutePrice(left.route?.price);
      }

      if (sortOption === "dateDesc") {
        return String(right.occurrence?.startDate || "").localeCompare(String(left.occurrence?.startDate || ""));
      }

      if (sortOption === "nameAsc") {
        return String(left.route?.name || "").localeCompare(String(right.route?.name || ""), "hu");
      }

      if (sortOption === "nameDesc") {
        return String(right.route?.name || "").localeCompare(String(left.route?.name || ""), "hu");
      }

      return String(left.occurrence?.startDate || "").localeCompare(String(right.occurrence?.startDate || ""));
    });

    return cards;
  }, [routeCards, sortOption]);
  const showOccurrenceLabel = Boolean(appliedStartDate);
  const minArrivalDate = startDate ? addDays(startDate, 1) : todayIso;

  // 4) Betöltési és opciófrissítési mellékhatások.
  // Ez a betöltőfüggvény egyszerre frissíti az alap route-katalógust és a jelenleg látható listát.
  async function loadAllRoutes() {
    const data = await getAllRoutes();
    const routes = Array.isArray(data) ? data : [];
    setBaseRoutes(routes);
    setAllRoutes(routes);
    return routes;
  }

  // Ez az effekt a komponens indulásakor betölti az összes útvonalat alapállapotként.
  useEffect(() => {
    loadAllRoutes().catch(() => {
      setBaseRoutes([]);
      setAllRoutes([]);
    });
  }, []);

  // Ez az effekt az érkező keresési kontextust alkalmazza (state/query), és ennek megfelelő induló listát állít be.
  useEffect(() => {
    if (initialContextApplied) {
      return;
    }

    if (filteredRoutes) {
      setAllRoutes(Array.isArray(filteredRoutes) ? filteredRoutes : []);
      setActiveReferenceDate(initialFilters.startDate || todayIso);
      setAppliedStartDate(initialFilters.startDate ?? "");
      setAppliedEndDate(initialFilters.endDate ?? "");
      setAppliedMinPrice(Number.isFinite(Number(initialFilters.minPrice)) ? Number(initialFilters.minPrice) : null);
      setAppliedMaxPrice(Number.isFinite(Number(initialFilters.maxPrice)) ? Number(initialFilters.maxPrice) : null);
      setAppliedDestination(initialFilters.destination ?? "");
      setAppliedRouteName(initialFilters.routeName ?? "");
      setAppliedDepartureCity(initialFilters.departureCity ?? "");
      setAppliedTouchedCity(initialFilters.touchedCity ?? "");
      setAppliedShipType(initialFilters.shipType ?? "");
      setInitialContextApplied(true);
      return;
    }

    if (!hasInitialFilters) {
      setInitialContextApplied(true);
      return;
    }

    let active = true;

    searchRoutesWithFallback(buildBackendSearchParams(initialFilters))
      .then((routes) => {
        if (!active) return;
        setAllRoutes(Array.isArray(routes) ? routes : []);
        setAppliedStartDate(initialFilters.startDate ?? "");
        setAppliedEndDate(initialFilters.endDate ?? "");
        setAppliedMinPrice(Number.isFinite(Number(initialFilters.minPrice)) ? Number(initialFilters.minPrice) : null);
        setAppliedMaxPrice(Number.isFinite(Number(initialFilters.maxPrice)) ? Number(initialFilters.maxPrice) : null);
        setAppliedDestination(initialFilters.destination ?? "");
        setAppliedRouteName(initialFilters.routeName ?? "");
        setAppliedDepartureCity(initialFilters.departureCity ?? "");
        setAppliedTouchedCity(initialFilters.touchedCity ?? "");
        setAppliedShipType(initialFilters.shipType ?? "");
        setInitialContextApplied(true);
      })
      .catch(() => {
        if (!active) return;
        setAllRoutes([]);
        setInitialContextApplied(true);
      });

    return () => {
      active = false;
    };
  }, [filteredRoutes, hasInitialFilters, initialFilters]);

  // Ez az effekt előkészíti az árhatár csúszkát és a célállomás-opciókat a backend adatok alapján.
  useEffect(() => {
    getAllRoutes()
      .then((data) => {
        const prices = Array.isArray(data)
          ? data.map((route) => Number(route.price)).filter((value) => Number.isFinite(value))
          : [];

        if (!prices.length) {
          setPriceBounds(null);
          setMinPrice(0);
          setMaxPrice(0);
          return;
        }

        const nextMin = Math.floor(Math.min(...prices));
        const nextMax = Math.ceil(Math.max(...prices));
        setPriceBounds({ min: nextMin, max: nextMax });

        if (!Object.keys(initialFilters).length) {
          setMinPrice(nextMin);
          setMaxPrice(nextMax);
          return;
        }

        setMinPrice(initialFilters.minPrice ?? nextMin);
        setMaxPrice(initialFilters.maxPrice ?? nextMax);
      })
      .catch(() => {
        setPriceBounds(null);
        if (!Object.keys(initialFilters).length) {
          setMinPrice(0);
          setMaxPrice(0);
        }
      });

    getDestinations()
      .then((data) => setDestinations(Array.isArray(data) ? data : []))
      .catch(() => setDestinations([]));
  }, [initialFilters]);

  // Ez az effekt célállomás-választáskor betölti az ahhoz tartozó route-csoport opciókat.
  useEffect(() => {
    if (!destination) {
      setRouteOptions([]);
      return;
    }

    getRouteGroups(destination)
      .then((groups) => setRouteOptions(Array.isArray(groups) ? groups : []))
      .catch(() => setRouteOptions([]));
  }, [destination]);

  // Ez az effekt dinamikusan frissíti az induló város szűrő opcióit a kiválasztott feltételek szerint.
  useEffect(() => {
    if (!baseRoutes.length) return;

    const options = baseRoutes
      .filter((item) => {
        if (destination && item.destination !== destination) return false;
        if (routeName && item.routeName !== routeName && item.name !== routeName) return false;
        return true;
      })
      .map((item) => item.stops?.[0])
      .filter(Boolean);

    const uniqueOptions = [...new Set(options)];
    if (initialFilters.departureCity && !uniqueOptions.includes(initialFilters.departureCity)) {
      uniqueOptions.unshift(initialFilters.departureCity);
    }

    setDepartureCityOptions(uniqueOptions);

    if (departureCity && !uniqueOptions.includes(departureCity)) {
      setDepartureCity("");
    }
  }, [baseRoutes, destination, routeName, departureCity, initialFilters]);

  // Ez az effekt dinamikusan frissíti az érintett város szűrő opcióit a kiválasztott feltételek szerint.
  useEffect(() => {
    if (!baseRoutes.length) return;

    const options = baseRoutes
      .filter((item) => {
        if (destination && item.destination !== destination) return false;
        if (routeName && item.routeName !== routeName && item.name !== routeName) return false;
        return true;
      })
      .flatMap((item) => (Array.isArray(item.stops) ? item.stops : []))
      .filter(Boolean);

    const uniqueOptions = [...new Set(options)];
    if (initialFilters.touchedCity && !uniqueOptions.includes(initialFilters.touchedCity)) {
      uniqueOptions.unshift(initialFilters.touchedCity);
    }

    setTouchedCityOptions(uniqueOptions);

    if (touchedCity && !uniqueOptions.includes(touchedCity)) {
      setTouchedCity("");
    }
  }, [baseRoutes, destination, routeName, touchedCity, initialFilters]);

  // Ez az effekt azt biztosítja, hogy ha az előzően kiválasztott hajó-típus már nem érhető el az új szűrő-szinten,
  // akkor automatikusan törlődik a kiválasztás. Ez megoldja azt a problémát, amikor a felhasználó
  // "Karib" célt választ, de az előbb "Serenita" hajót választott (ami csak Atlanti-útvonalakon van),
  // így az eddigi szelekció már érvénytelen. Az effekt minden alkalommal futtatódik, amikor a shipOptions
  // lista megváltozik (azaz az alkalmazható hajó-típusok listája), és automatikusan szinkronizálja a
  // kiválasztott hajó-típust az aktuálisan érvényes opcióinkkal.
  useEffect(() => {
    if (!shipType) return;
    const exists = shipOptions.some((option) => option.value === shipType);
    if (!exists) {
      setShipType("");
    }
  }, [shipOptions, shipType]);

  // 5) Felhasználói műveletek: keresés és szűrők visszaállítása.
  // Ez a keresési kezelő elküldi az aktuális szűrőket, majd az eredménylistát és az alkalmazott feltételeket szinkronizálja.
  async function handleSearch(event) {
    event.preventDefault();
    setLoading(true);

    try {
      const normalizedStartDate = startDate && startDate < todayIso ? todayIso : startDate;
      const minimumArrivalForStart = normalizedStartDate ? addDays(normalizedStartDate, 1) : todayIso;
      const normalizedEndDate = endDate && endDate < minimumArrivalForStart ? minimumArrivalForStart : endDate;

      if (normalizedStartDate !== startDate) {
        setStartDate(normalizedStartDate);
      }

      if (normalizedEndDate !== endDate) {
        setEndDate(normalizedEndDate);
      }

      const backendRoutes = await searchRoutesWithFallback(buildBackendSearchParams({
        destination,
        routeName,
        departureCity,
        touchedCity,
        startDate: normalizedStartDate,
        endDate: normalizedEndDate,
        shipType: shipType || undefined,
      }));

      const nextRoutes = Array.isArray(backendRoutes) ? backendRoutes : [];
      setAllRoutes(nextRoutes);
      setAppliedStartDate(normalizedStartDate || "");
      setAppliedEndDate(normalizedEndDate || "");
      setAppliedMinPrice(priceBounds ? Number(minPrice) : null);
      setAppliedMaxPrice(priceBounds ? Number(maxPrice) : null);
      setAppliedDestination(destination || "");
      setAppliedRouteName(routeName || "");
      setAppliedDepartureCity(departureCity || "");
      setAppliedTouchedCity(touchedCity || "");
      setAppliedShipType(shipType || "");
      setActiveReferenceDate(normalizedStartDate || todayIso);
    } catch {
      setAllRoutes([]);
    } finally {
      setLoading(false);
    }
  }

  // Ez a visszaállító kezelő törli az összes szűrőt, és visszarakja az alap route-listát.
  async function handleResetFilters() {
    setLoading(true);

    try {
      setDestination("");
      setRouteName("");
      setDepartureCity("");
      setTouchedCity("");
      setStartDate("");
      setEndDate("");
      setShipType("");

      if (priceBounds) {
        setMinPrice(priceBounds.min);
        setMaxPrice(priceBounds.max);
      }

      setAllRoutes(baseRoutes.length ? baseRoutes : allRoutes);
      setAppliedStartDate("");
      setAppliedEndDate("");
      setAppliedMinPrice(null);
      setAppliedMaxPrice(null);
      setAppliedDestination("");
      setAppliedRouteName("");
      setAppliedDepartureCity("");
      setAppliedTouchedCity("");
      setAppliedShipType("");
      setActiveReferenceDate(todayIso);
    } catch {
      setAllRoutes([]);
    } finally {
      setLoading(false);
    }
  }

  // 6) Szűrőpanel és route-kártyák megjelenítése.
  return (
    <section className={classes.wrapper}>
      <h1>Összes hajóút</h1>
      <p className={classes.intro}>
        Válassz egy hajóutat a részletek megtekintéséhez, vagy szűrd a listát lentebb.
      </p>

      <form className={classes.filterPanel} onSubmit={handleSearch}>
        <div className={classes.centerRow}>
          <div className={classes.field}>
            <label>Utazási cél</label>
            <select
              value={destination}
              onChange={(e) => {
                setDestination(e.target.value);
                setRouteName("");
                setDepartureCity("");
                setTouchedCity("");
              }}
            >
              <option value="">Mindegy</option>
              {destinations.map((dest) => (
                <option key={dest} value={dest}>
                  {dest}
                </option>
              ))}
            </select>
          </div>

          <div className={classes.field}>
            <label>Útvonal</label>
            <select
              value={routeName}
              onChange={(e) => {
                setRouteName(e.target.value);
                setDepartureCity("");
                setTouchedCity("");
              }}
              disabled={!destination}
            >
              <option value="">Mindegy</option>
              {routeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className={classes.field}>
            <label>Kiinduló város</label>
            <select value={departureCity} onChange={(e) => setDepartureCity(e.target.value)}>
              <option value="">Mindegy</option>
              {departureCityOptions.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>

          <div className={classes.field}>
            <label>Érintett város</label>
            <select value={touchedCity} onChange={(e) => setTouchedCity(e.target.value)}>
              <option value="">Mindegy</option>
              {touchedCityOptions.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>

          <div className={classes.field}>
            <label>Hajótípus</label>
            <select value={shipType} onChange={(e) => setShipType(e.target.value)}>
              <option value="">Mindegy</option>
              {shipOptions.map((ship) => (
                <option key={ship.value} value={ship.value}>
                  {ship.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={classes.dateRow}>
          <div className={classes.field}>
            <label htmlFor="routes-start">Indulás dátuma</label>
            <input
              id="routes-start"
              type="date"
              value={startDate}
              min={todayIso}
              onChange={(e) => {
                const nextStartDate = e.target.value;
                setStartDate(nextStartDate);

                if (endDate && endDate < addDays(nextStartDate, 1)) {
                  setEndDate(addDays(nextStartDate, 1));
                }
              }}
            />
          </div>

          <div className={classes.field}>
            <label htmlFor="routes-end">Érkezés dátuma</label>
            <input
              id="routes-end"
              type="date"
              value={endDate}
              min={minArrivalDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className={classes.priceSection}>
          <div className={classes.priceHeader}>
            <label>Árszűrés</label>
            <span>{priceBounds ? `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}` : "Nincs elérhető árkategória"}</span>
          </div>

          <div className={classes.priceControls}>
            <div className={classes.rangeField}>
              <span>Minimum ár</span>
              <input
                type="range"
                min={priceBounds?.min ?? 0}
                max={priceBounds?.max ?? 0}
                value={minPrice}
                disabled={!priceBounds}
                onChange={(e) => setMinPrice(Math.min(Number(e.target.value), maxPrice))}
                className={classes.rangeInput}
              />
              <strong>{formatPrice(minPrice)}</strong>
            </div>

            <div className={classes.rangeField}>
              <span>Maximum ár</span>
              <input
                type="range"
                min={priceBounds?.min ?? 0}
                max={priceBounds?.max ?? 0}
                value={maxPrice}
                disabled={!priceBounds}
                onChange={(e) => setMaxPrice(Math.max(Number(e.target.value), minPrice))}
                className={classes.rangeInput}
              />
              <strong>{formatPrice(maxPrice)}</strong>
            </div>
          </div>
        </div>

        <button className={classes.filterButton} type="submit" disabled={loading}>
          {loading ? "Szűrés..." : "Szűrés alkalmazása"}
        </button>

        <button className={classes.resetButton} type="button" onClick={handleResetFilters} disabled={loading}>
          Szűrések törlése
        </button>
      </form>

      <section className={classes.sortPanel}>
        <div className={classes.field}>
          <label htmlFor="routes-sort">Rendezés</label>
          <select
            id="routes-sort"
            value={sortOption}
            onChange={(event) => setSortOption(event.target.value)}
          >
            <option value="priceAsc">Ár: növekvő ↑</option>
            <option value="priceDesc">Ár: csökkenő ↓</option>
            <option value="dateAsc">Dátum: növekvő ↑</option>
            <option value="dateDesc">Dátum: csökkenő ↓</option>
            <option value="nameAsc">Név: növekvő ↑</option>
            <option value="nameDesc">Név: csökkenő ↓</option>
          </select>
        </div>
      </section>

      {sortedRouteCards.length === 0 ? (
        <p className={classes.emptyState}>Nincs megjeleníthető hajóút a szűrések alapján!</p>
      ) : (
        <div className={classes.grid}>
          {sortedRouteCards.map((card, index) => {
            const fullRoute = card.route;
            const occurrence = card.occurrence;
            const currentStopIndex = getCurrentStopIndex(occurrence);
            const currentJourneyLocation = getCurrentJourneyLocation(occurrence, currentStopIndex);
            const isInTransitToday = Boolean(
              occurrence.startDate &&
              occurrence.endDate &&
              todayIso >= occurrence.startDate &&
              todayIso <= occurrence.endDate
            );
            const cardKey = `${fullRoute.id}-${occurrence.startDate || "n-a"}-${index}`;
            const routeForDetail = {
              ...fullRoute,
              date: occurrence.startDate || fullRoute.date,
              stopSchedule: occurrence.stopSchedule,
            };
            const onboardPrograms = Array.isArray(fullRoute.onboardPrograms) && fullRoute.onboardPrograms.length
              ? fullRoute.onboardPrograms
              : getRouteOnboardPrograms(fullRoute);

            return (
              <div
                key={cardKey}
                className={classes.card}
                onClick={() =>
                  navigate(`/route/${fullRoute.id}`, {
                    state: {
                      route: routeForDetail,
                      occurrenceReferenceDate: occurrence.startDate || activeReferenceDate || todayIso,
                    },
                  })
                }
              >
                <div className={classes.cardLayout}>
                  <section className={classes.leftColumn}>
                    <img src={fullRoute.image} alt={fullRoute.name} />
                    <h3>{fullRoute.name}</h3>
                    <p className={classes.regionLabel}>{fullRoute.destination}</p>
                    {showOccurrenceLabel ? (
                      <p className={classes.occurrenceLabel}>Indulás: {formatStopDate(occurrence.startDate)}</p>
                    ) : null}
                    <p className={classes.routeStops}>{fullRoute.stops?.length ? fullRoute.stops.join(" → ") : fullRoute.name}</p>
                  </section>

                  <section className={classes.middleColumn}>
                    <div className={classes.stopScheduleBlock}>
                      <p className={classes.stopScheduleTitle}>Legközelebbi indulás</p>
                      <p className={classes.stopScheduleLead}>
                        {formatStopDate(occurrence.startDate)}
                      </p>
                      {isInTransitToday ? <p className={classes.inTransitBadge}>Úton van a hajó</p> : null}
                      {isInTransitToday && currentStopIndex !== -1 ? (
                        <p className={classes.currentStopLabel}>
                          Most <span className={classes.currentStopLocation}>{currentJourneyLocation}</span> jár
                        </p>
                      ) : null}
                      <ul className={classes.stopScheduleList}>
                        {occurrence.stopSchedule.map((stop, index) => (
                          <li
                            key={`${fullRoute.id}-${stop.city}-${stop.date}-${index}`}
                            className={[
                              stop.isSeaDay ? classes.seaDayRow : "",
                              isInTransitToday && index === currentStopIndex ? classes.currentStopRow : "",
                            ].filter(Boolean).join(" ")}
                          >
                            <span>{stop.city}</span>
                            <span>{formatStopDate(stop.date)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </section>

                  <section className={classes.rightColumn}>
                    <div className={classes.programBlock}>
                      <p className={classes.programTitle}>Fedélzeti programok</p>
                      <ul className={classes.programList}>
                        {onboardPrograms.slice(0, 3).map((program, programIndex) => (
                          <li key={`${fullRoute.id}-program-${programIndex}`}>{program}</li>
                        ))}
                      </ul>
                    </div>

                    <p className={classes.shipInfo}>Hajó: {fullRoute.shipName || getShipNameForRoute(fullRoute)}</p>
                    <p className={classes.shipInfo}>
                      A szabad helyek számához kattintson a kártyára
                    </p>
                    <span className={classes.priceTag}>{formatPrice(fullRoute.price)}-tól</span>
                    <p className={classes.priceNote}>(Az ár a teljes útra vonatkozik!)</p>
                  </section>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </section>
  );
}
