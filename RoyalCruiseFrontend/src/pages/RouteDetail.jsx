// Ez a fájl az egyedi útvonal részletes oldalát, menetrendjét és kabinonkénti foglalhatóságát számolja és jeleníti meg.
import { useLocation, useNavigate, useParams } from "react-router-dom";
import classes from "./RouteDetail.module.css";
import { useEffect, useState } from "react";
import { getRouteById } from "../api/routesApi.js";
import { getAllCabins } from "../api/cruiseApp.js";
import { createBooking } from "../api/bookingApi.js";
import useAuth from "../auth/useAuth.jsx";
import { getShipNameForRoute } from "../utils/routeShipAssignment.js";
import formatPrice from "../utils/formatPrice.js";
import { formatStopDate, getNextRouteOccurrence, getRouteOccurrencesInWindow, getRouteOnboardPrograms } from "../utils/routeStopSchedule.js";
import { computeTodayInTransitBoardingConstraints } from "../utils/bookingConstraints.js";

// A RouteDetail oldal az útvonal azonosítója alapján adatot tölt, majd beszállási-kiszállási és ülőhely-ellenőrzési logikát alkalmaz.
export default function RouteDetail() {
  // 1) Útvonal-azonosítók és segédértékek előkészítése.
  const { state } = useLocation();
  const { id } = useParams();
  const navigate = useNavigate();
  
// Ez a segédfüggvény a mai dátumot ISO formátumban adja vissza a menetrendi összehasonlításokhoz.
  const getTodayIso = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  };

  // Ezek az állapotok a route és kabin adatok betöltésének, valamint a felhasználói választásoknak a forrásai.
  const [route, setRoute] = useState(state?.route ?? null);
  
  console.log("RouteDetail loaded, id:", id, "route:", route);
  
  const [loadingRoute, setLoadingRoute] = useState(!state?.route);
  const [cabinOptions, setCabinOptions] = useState([]);
  const [cabin, setCabin] = useState("");
  const [extras, setExtras] = useState([]);
  const [guestCount, setGuestCount] = useState(1);
  const [boardingStopIndex, setBoardingStopIndex] = useState(0);
  const [arrivalStopIndex, setArrivalStopIndex] = useState(0);

  const [selectedOccurrenceDate, setSelectedOccurrenceDate] = useState(
    state?.occurrenceReferenceDate || getTodayIso()
  );
  const { user, isAdmin } = useAuth();
  const shipName = route?.shipName || getShipNameForRoute(route);

  // 2) Adatbetöltési és menetrend-szinkronizálási effectek.

  // Ez az effekt route-id változáskor betölti az útvonalat, és kezeli a state-ből érkező előtöltött adat elsőbbségét.
  useEffect(() => {
    let active = true;

    if (state?.route) {
      console.log("Route from state:", state.route);
      setRoute(state.route);
      setLoadingRoute(false);
    }

    setLoadingRoute((previous) => (state?.route ? previous : true));
    getRouteById(id)
      .then((data) => {
        if (!active) return;
        console.log("Route from API:", data);
        setRoute(data);
      })
      .catch((err) => {
        if (!active) return;
        console.error("Error loading route:", err);
        if (!state?.route) {
          setRoute(null);
        }
      })
      .finally(() => {
        if (!active) return;
        setLoadingRoute(false);
      });

    return () => {
      active = false;
    };
  }, [id, state?.route]);

  // Ez az effekt egyszer betölti a kabinopciókat, amelyekből a felhasználó foglaláskor választ.
  useEffect(() => {
    getAllCabins()
      .then((data) => {
        console.log("Cabins loaded:", data);
        setCabinOptions(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Error loading cabins:", err);
        setCabinOptions([]);
      });
  }, []);

  // Ez az effekt a kiválasztott indulási előfordulás dátumát szinkronizálja a route aktuális menetrendjével.
  useEffect(() => {
    if (!route) {
      return;
    }

    const todayIso = getTodayIso();
    const nearestStartDate = getNextRouteOccurrence(route, todayIso).startDate || todayIso;

    if (state?.occurrenceReferenceDate && state.occurrenceReferenceDate >= todayIso) {
      setSelectedOccurrenceDate(state.occurrenceReferenceDate);
      return;
    }

    setSelectedOccurrenceDate(nearestStartDate);
  }, [id, route, state?.occurrenceReferenceDate]);

  // Ez az effekt minden indulási dátumváltásnál újraszámolja a beszállási és érkezési alapindexeket.
  useEffect(() => {
    if (!route) {
      return;
    }

    const todayIso = getTodayIso();
    const currentOccurrenceToday = getNextRouteOccurrence(route, todayIso);
    const selectedOccurrence = getNextRouteOccurrence(route, selectedOccurrenceDate || todayIso);

    const selectedStartDate = String(selectedOccurrence.startDate || "");
    const currentStartDate = String(currentOccurrenceToday.startDate || "");
    const isCurrentlyRunningSelection =
      Boolean(currentOccurrenceToday.isInTransit) &&
      Boolean(selectedStartDate) &&
      selectedStartDate === currentStartDate;

    const selectedSchedule = Array.isArray(selectedOccurrence.stopSchedule)
      ? selectedOccurrence.stopSchedule
      : [];
    const selectedPortStops = selectedSchedule.filter((stop) => stop && !stop.isSeaDay);

    if (selectedPortStops.length < 2) {
      setBoardingStopIndex(0);
      setArrivalStopIndex(0);
      return;
    }

    let defaultBoardingPortIndex = 0;

    if (isCurrentlyRunningSelection) {
      const nextPortIndex = selectedPortStops.findIndex(
        (stop) => String(stop.date || "") > todayIso
      );
      const cityStopsAfterNext = nextPortIndex >= 0
        ? selectedPortStops.length - nextPortIndex - 1
        : 0;

      if (nextPortIndex >= 0 && cityStopsAfterNext >= 1) {
        defaultBoardingPortIndex = nextPortIndex;
      }
    }

    const maxBoardingPortIndex = Math.max(selectedPortStops.length - 2, 0);
    const safeDefaultBoardingPortIndex = Math.min(defaultBoardingPortIndex, maxBoardingPortIndex);

    setBoardingStopIndex(safeDefaultBoardingPortIndex);
    setArrivalStopIndex(selectedPortStops.length - 1);
  }, [route, selectedOccurrenceDate]);

  // 3) Guard ágak: hibás vagy hiányzó route esetén korai visszatérés.

  if (loadingRoute) {
    return <h1>Betöltés...</h1>;
  }

  if (!route) {
    console.warn("Route is null");
    return <h1>Nem található az útvonal.</h1>;
  }

  // 4) Árképzéshez és foglaláshoz használt statikus extra szolgáltatáslista.
  const extraServices = [
    { id: 1, name: "Wellness csomag", price: 120 },
    { id: 2, name: "Italcsomag", price: 70 },
    { id: 3, name: "Koncert", price: 150 },
    { id: 4, name: "Csúszdapark", price: 200 },
    { id: 6, name: "Játékterem", price: 100 },
    { id: 5, name: "Gyermekfelügyelet", price: 80 }
  ];

  const todayIso = getTodayIso();

  const oneYearLater = new Date();
  oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
  const oneYearLaterIso = `${oneYearLater.getFullYear()}-${String(oneYearLater.getMonth() + 1).padStart(2, "0")}-${String(oneYearLater.getDate()).padStart(2, "0")}`;

  // 5) Menetrendi előfordulások és szakaszlogika számítása a kiválasztott indulás alapján.
  let statusOccurrenceToday, nearestOccurrenceStartDate, upcomingOccurrences, windowOccurrenceDates, occurrenceOptions, selectedOccurrenceValue, occurrenceReferenceDate, currentOccurrence, isNearestOccurrenceSelected;

  try {
    statusOccurrenceToday = getNextRouteOccurrence(route, todayIso);
    nearestOccurrenceStartDate = String(statusOccurrenceToday.startDate || "");
    upcomingOccurrences = getRouteOccurrencesInWindow(route, todayIso, oneYearLaterIso, 120);
    windowOccurrenceDates = Array.from(new Set(upcomingOccurrences.map((occurrence) => String(occurrence.startDate || "")).filter(Boolean)));
    occurrenceOptions = [
      nearestOccurrenceStartDate,
      ...windowOccurrenceDates.filter((dateValue) => dateValue !== nearestOccurrenceStartDate),
    ].filter(Boolean);
    selectedOccurrenceValue = occurrenceOptions.includes(selectedOccurrenceDate)
      ? selectedOccurrenceDate
      : (occurrenceOptions[0] || "");

    occurrenceReferenceDate = selectedOccurrenceValue || todayIso;
    currentOccurrence = getNextRouteOccurrence(route, occurrenceReferenceDate);
    isNearestOccurrenceSelected =
      String(currentOccurrence.startDate || "") === String(statusOccurrenceToday.startDate || "");
  } catch (err) {
    console.error("Error loading occurrence data:", err);
    return <h1>Hiba az indulás dátumainak betöltésekor: {err.message}</h1>;
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
// Ez a számítás meghatározza, hogy a mai nap a menetrend melyik megállójához tartozik.
  const currentStopIndexToday = (() => {
    const schedule = Array.isArray(statusOccurrenceToday.stopSchedule) ? statusOccurrenceToday.stopSchedule : [];

    const exactTodayIndex = schedule.findIndex((stop) => stop?.date === todayIso);
    if (exactTodayIndex >= 0) {
      return exactTodayIndex;
    }

    for (let index = schedule.length - 1; index >= 0; index -= 1) {
      const stop = schedule[index];
      if (!stop || stop.isSeaDay || !stop.date) {
        continue;
      }

      if (String(stop.date) <= todayIso) {
        return index;
      }
    }

    return -1;
  })();
// Ez az érték emberi olvasható formában adja vissza, hogy az út épp melyik városnál tart.
  const currentJourneyLocation = (() => {
    const schedule = Array.isArray(statusOccurrenceToday.stopSchedule) ? statusOccurrenceToday.stopSchedule : [];
    const currentStop = currentStopIndexToday >= 0 ? schedule[currentStopIndexToday] : null;

    if (currentStopIndexToday === -1 || currentStop?.isSeaDay) {
      return "a Tengeren";
    }

    const currentCity = currentStop?.city || "";
    if (!currentCity) {
      return "a Tengeren";
    }

    return withHungarianLocationSuffix(currentCity);
  })();
  // 6) Férőhely- és árkalkuláció a kiválasztott szakasz és kabin alapján.
  const fixedSchedule = currentOccurrence.stopSchedule;
  const scheduleStops = fixedSchedule.length
    ? fixedSchedule
    : (Array.isArray(route.stops) ? route.stops.filter(Boolean).map((city) => ({ city, date: "" })) : []);
  const portStops = scheduleStops
    .map((stop, index) => ({ ...stop, scheduleIndex: index }))
    .filter((stop) => !stop.isSeaDay);
  const maxBoardingIndex = Math.max(portStops.length - 2, 0);
  // Ha a kiválasztott indulás épp most fut, akkor a mai napra speciális foglalási szabályok érvényesek.
  const isTodayInTransitSelection = isNearestOccurrenceSelected && statusOccurrenceToday.isInTransit;
  // Ez a központi szabályszámítás adja vissza a mai-napi foglalhatóságot és az induló index-határokat.
  const todayBoardingConstraints = computeTodayInTransitBoardingConstraints({
    portStops,
    todayIso,
    maxBoardingIndex,
    isTodayInTransitSelection,
  });
  const {
    isBookingBlockedByTodayRule,
    minimumSelectableBoardingIndex: todayMinimumSelectableBoardingIndex,
    maximumSelectableBoardingIndex,
  } = todayBoardingConstraints;
// Ez a számított index tiltja a múltbeli vagy már elhagyott megállók kiválasztását beszállási pontként.
  const minimumSelectableBoardingIndex = (() => {
    if (isTodayInTransitSelection) {
      return todayMinimumSelectableBoardingIndex;
    }

    if (!isNearestOccurrenceSelected || !statusOccurrenceToday.isInTransit) {
      return 0;
    }

    const currentPortIndex = portStops.findIndex(
      (stop) => stop.scheduleIndex === currentStopIndexToday
    );

    if (currentPortIndex < 0) {
      return 0;
    }

    return Math.min(currentPortIndex, maxBoardingIndex);
  })();
  const hasSegmentSelection = portStops.length >= 2 && maxBoardingIndex >= minimumSelectableBoardingIndex;
  const safeBoardingIndex = hasSegmentSelection
    ? Math.min(Math.max(boardingStopIndex, minimumSelectableBoardingIndex), maximumSelectableBoardingIndex)
    : 0;
  const minimumArrivalIndex = portStops.length > 0 ? Math.min(safeBoardingIndex + 1, Math.max(portStops.length - 1, 0)) : 0;
  const safeArrivalIndex = portStops.length > 0 ? Math.min(
    Math.max(arrivalStopIndex, minimumArrivalIndex),
    Math.max(portStops.length - 1, 0)
  ) : 0;
  const selectedBoardingStop = portStops.length > 0 ? (portStops[safeBoardingIndex] || portStops[0] || null) : null;
  const selectedArrivalStop = portStops.length > 0 ? (portStops[safeArrivalIndex] || portStops[portStops.length - 1] || selectedBoardingStop) : null;
  const segmentStart = selectedBoardingStop?.scheduleIndex ?? 0;
  const segmentEnd = selectedArrivalStop?.scheduleIndex ?? segmentStart;
  const selectedSegmentStops = scheduleStops.slice(segmentStart, segmentEnd + 1);
  const onboardPrograms = Array.isArray(route.onboardPrograms) && route.onboardPrograms.length
    ? route.onboardPrograms
    : getRouteOnboardPrograms(route);
  const availableSeats = Math.max(Number(route.availableSeats) || 0, 0);
  const selectedDepartureDateIso = selectedBoardingStop?.date || currentOccurrence.startDate || route.date || todayIso;

  // A hajók név szerint ismert befogadóképességeihez igazítjuk a férőhelyek felső korlátját,
  // hogy a távoli dátumokra nagyobb, de még mindig reális szabad helyszámot mutassunk.
  const shipCapacityByName = {
    "RC Aurora": 2450,
    "RC Horizon": 1980,
    "RC Serenita": 2180,
  };
  const shipCapacity = shipCapacityByName[shipName] ?? availableSeats;
  const seatAvailabilityCeiling = Math.max(availableSeats, Math.round(shipCapacity * 0.24));

// Ez a segédfüggvény kiszámolja, hány nap van hátra egy adott cél-dátumig.
  const getDaysUntilDate = (targetIsoDate) => {
    const target = new Date(`${String(targetIsoDate || "")}T00:00:00Z`);
    const today = new Date(`${todayIso}T00:00:00Z`);

    if (Number.isNaN(target.getTime()) || Number.isNaN(today.getTime())) {
      return 0;
    }

    return Math.max(Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)), 0);
  };
  
  // Szegmentenkénti szabad helyek kalkulációja
  const totalLegs = Math.max(portStops.length - 1, 1);
  const selectedLegs = Math.max(safeArrivalIndex - safeBoardingIndex, 1);
  const segmentMultiplier = hasSegmentSelection ? selectedLegs / totalLegs : 1;
  const segmentSeatAvailabilityMultiplier = hasSegmentSelection
    ? selectedLegs / totalLegs
    : 1;
  const daysUntilDeparture = getDaysUntilDate(selectedDepartureDateIso);
  const dateDistanceRatio = Math.min(daysUntilDeparture / 365, 1);
  const dateProgress = Math.pow(dateDistanceRatio, 1.55);
  const futureSeatBoost = Math.round(shipCapacity * 0.24 * dateProgress);
  const seatAvailabilityMultiplier = segmentSeatAvailabilityMultiplier * (1 + dateProgress * 1.15);
  const segmentAvailableSeats = Math.min(
    seatAvailabilityCeiling,
    Math.max(Math.round(availableSeats * seatAvailabilityMultiplier + futureSeatBoost * segmentSeatAvailabilityMultiplier), 0)
  );
  
  const cabinAvailableSeats = route?.cabinAvailableSeats && typeof route.cabinAvailableSeats === "object"
    ? route.cabinAvailableSeats
    : {};
  const cabinSeatBias = {
    standard: 1.08,
    deluxe: 0.92,
    suite: 0.76,
  };
  const inTransitPremiumCabinSeatCap = 8;
  const getDeterministicSeatSeed = (seedText) => {
    let hash = 0;

    for (let index = 0; index < seedText.length; index += 1) {
      hash = (hash * 31 + seedText.charCodeAt(index)) % 2147483647;
    }

    return Math.abs(hash);
  };
// Ez a segédfüggvény a kiválasztott szakaszhoz tartozó kabin férőhelyeit olvassa ki a route adatszerkezetből.
  const getCabinSeatCount = (cabinOption) => {
    const key = String(cabinOption?.id || "").toLowerCase();
    const value = Number(cabinAvailableSeats[key]);
    const baseValue = Number.isFinite(value) ? value : availableSeats;
    const bias = cabinSeatBias[key] ?? 1;
    const adjustedValue = key === "standard"
      ? Math.ceil(baseValue * seatAvailabilityMultiplier * bias)
      : key === "deluxe"
        ? Math.floor(baseValue * seatAvailabilityMultiplier * bias)
        : Math.floor(baseValue * seatAvailabilityMultiplier * bias);

    const boundedSeatCount = Math.max(
      Math.min(adjustedValue + Math.round(futureSeatBoost * bias), seatAvailabilityCeiling),
      0
    );

    // Az épp úton lévő járatoknál a prémium kabinok (Deluxe/Suite) mindig 9 alatti készletet mutatnak.
    if (isTodayInTransitSelection && (key === "deluxe" || key === "suite")) {
      if (boundedSeatCount <= 0) {
        return 0;
      }

      const seatSeed = `${route.id || ""}-${occurrenceReferenceDate}-${safeBoardingIndex}-${safeArrivalIndex}-${key}`;
      const deterministicSeatValue = (getDeterministicSeatSeed(seatSeed) % inTransitPremiumCabinSeatCap) + 1;

      return Math.min(boundedSeatCount, deterministicSeatValue);
    }

    return boundedSeatCount;
  };
  const seatBreakdownItems = cabinOptions.length
    ? cabinOptions.map((option) => ({
      id: option.id,
      name: option.name,
      seatCount: getCabinSeatCount(option),
    }))
    : Object.entries(cabinAvailableSeats).map(([id, value]) => ({
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1),
      seatCount: getCabinSeatCount({ id, availableSeats: value }),
    }));
  const selectedCabin = cabinOptions.find((option) => option.id === cabin) ?? null;
  const isSegmentSoldOut = segmentAvailableSeats <= 0;
  const selectedCabinAvailability = selectedCabin ? getCabinSeatCount(selectedCabin) : 0;
  const maxBookableGuests = Math.max(
    0,
    Math.min(10, selectedCabin ? selectedCabinAvailability : segmentAvailableSeats)
  );
  const effectiveGuestCount = maxBookableGuests > 0
    ? Math.min(Math.max(guestCount, 1), maxBookableGuests)
    : 1;

  // Árkalkuláció
  const basePrice = Math.round(Number(route.price || 0) * segmentMultiplier);
  const cabinPrice = selectedCabin ? selectedCabin.pricePerNight : 0;
  const extrasPrice = extras
    .map((id) => extraServices.find((e) => e.id === id)?.price || 0)
    .reduce((a, b) => a + b, 0);
  const displayedDepartureDate = selectedBoardingStop?.date || route.date;
  const displayedArrivalDate = selectedArrivalStop?.date || route.date;
  const guestPriceMultiplier = 1 + Math.max(effectiveGuestCount - 1, 0) * 0.12;

  const totalPrice = Math.round((basePrice + cabinPrice + extrasPrice) * guestPriceMultiplier);

// Ez a segédfüggvény a kiválasztott extra szolgáltatás be- vagy kikapcsolását kezeli.
  function toggleExtra(id) {
    setExtras((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  // Ez a foglalási kezelő ellenőrzi a jogosultságot és a kapacitást, majd létrehozza a foglalást a backendben.
  async function handleBooking() {
    if (isAdmin) {
      alert("Admin felhasználóval nem lehet foglalást létrehozni.");
      return;
    }

    if (!cabin) {
      alert("Kérlek válassz kabintípust!");
      return;
    }

    if (isSegmentSoldOut) {
      alert("Erre az indulásra már nincs szabad hely.");
      return;
    }

    if (selectedCabinAvailability <= 0) {
      alert("A kiválasztott kabintípusra már nincs szabad hely.");
      return;
    }

    if (effectiveGuestCount < 1 || effectiveGuestCount > maxBookableGuests) {
      alert("A megadott főszám nem foglalható erre a kabinra.");
      return;
    }

    if (isBookingBlockedByTodayRule) {
      alert("A mai napra már nem foglalható ez az útvonal: a mai nap után nincs még legalább 2 városi megálló.");
      return;
    }

    if (hasSegmentSelection && safeArrivalIndex <= safeBoardingIndex) {
      alert("Kérlek válassz érvényes induló és érkező várost.");
      return;
    }

    if (!user?.token) {
      alert("A foglaláshoz jelentkezz be.");
      return;
    }

    try {
      const savedBooking = await createBooking(
        {
          routeId: route.id,
          routeName: route.name,
          destination: route.destination,
          routeDepartureFrom: selectedBoardingStop?.city || route.stops?.[0] || "",
          routeArrivalTo: selectedArrivalStop?.city || route.stops?.[route.stops.length - 1] || "",
          routeDate: displayedDepartureDate,
          routeArrivalDate: displayedArrivalDate,
          segmentStops: selectedSegmentStops,
          shipName,
          cabin: selectedCabin?.name ?? cabin,
          guests: effectiveGuestCount,
          basePrice,
          cabinPrice,
          extrasPrice,
          totalPrice,
          boardingStopIndex: segmentStart,
          arrivalStopIndex: segmentEnd,
          extras: extraServices
            .filter((e) => extras.includes(e.id))
            .map((e) => ({ name: e.name, price: e.price })),
        },
        user.token
      );

      navigate("/booking-summary", {
        state: {
          route,
          selectedSegmentStops,
          selectedDepartureCity: selectedBoardingStop?.city || "",
          selectedArrivalCity: selectedArrivalStop?.city || "",
          selectedDepartureDate: displayedDepartureDate,
          selectedArrivalDate: displayedArrivalDate,
          occurrenceReferenceDate,
          cabin: selectedCabin?.name ?? cabin,
          guests: effectiveGuestCount,
          cabinPrice,
          extras: extraServices.filter((e) => extras.includes(e.id)),
          extrasPrice,
          totalPrice,
          guestPriceMultiplier,
          bookingId: savedBooking.id,
        }
      });
    } catch (err) {
      alert(err.message || "Nem sikerült menteni a foglalást.");
    }
  }
  // 7) Részletes útoldal megjelenítése (menetrend, kabinok, árak, foglalás).
  return (
    <section className={classes.wrapper}>
      <section className={classes.header}>
        <button type="button" className={classes.backButton} onClick={() => navigate("/routes") }>
          Vissza az útvonalakhoz
        </button>

        <h1>{route.stops?.[0] ? `Indulás: ${route.stops[0]}` : route.name}</h1>

        <p className={classes.metaHighlight}>
          <span>{route.destination}</span>{" "}•{" "}
          <span>{route.routeName}</span>
        </p>

        <p className={classes.stops}>
          {Array.isArray(route.stops) ? route.stops.join(" → ") : ""}
        </p>

        <img src={route.image} alt={route.name} className={classes.image} />

        {/* Ez a lebegő foglalási vezérlősáv a kiválasztott indulási dátumot, induló/érkező várost és utasszámot tartja mindig elérhetően, hogy görgetés közben is azonnal módosítható legyen a foglalás alapbeállítása. */}
        <section className={classes.stickyBookingBar}>
          <div className={classes.stickyBookingGrid}>
            <label className={classes.stickyField}>
              Indulási dátum
              <select
                value={selectedOccurrenceValue}
                onChange={(event) => setSelectedOccurrenceDate(event.target.value)}
                disabled={!occurrenceOptions.length}
              >
                {!occurrenceOptions.length ? (
                  <option value="">Nincs elérhető indulási dátum</option>
                ) : null}
                {occurrenceOptions.map((dateValue) => (
                  <option key={`sticky-occurrence-${dateValue}`} value={dateValue}>
                    {formatStopDate(dateValue)}
                  </option>
                ))}
              </select>
            </label>

            <label className={classes.stickyField}>
              Induló város
              <select
                value={safeBoardingIndex}
                onChange={(event) => {
                  const nextBoarding = Number(event.target.value);
                  setBoardingStopIndex(nextBoarding);
                  setArrivalStopIndex((current) =>
                    current > nextBoarding ? current : Math.min(nextBoarding + 1, Math.max(portStops.length - 1, 0))
                  );
                }}
                disabled={!hasSegmentSelection}
              >
                {portStops.map((stop, index) => {
                  if (index >= portStops.length - 1) return null;
                  if (index < minimumSelectableBoardingIndex) return null;
                  if (index > maximumSelectableBoardingIndex) return null;
                  return (
                    <option key={`sticky-boarding-${stop.city}-${index}`} value={index}>
                      {stop.city}
                    </option>
                  );
                })}
              </select>
            </label>

            <label className={classes.stickyField}>
              Érkező város
              <select
                value={safeArrivalIndex}
                onChange={(event) => setArrivalStopIndex(Number(event.target.value))}
                disabled={!hasSegmentSelection}
              >
                {portStops.map((stop, index) => {
                  if (index <= safeBoardingIndex) return null;
                  return (
                    <option key={`sticky-arrival-${stop.city}-${index}`} value={index}>
                      {stop.city}
                    </option>
                  );
                })}
              </select>
            </label>

            <label className={classes.stickyField}>
              Utasok száma
              <select
                value={maxBookableGuests > 0 ? effectiveGuestCount : 0}
                onChange={(event) => setGuestCount(Number(event.target.value))}
                disabled={maxBookableGuests <= 0}
              >
                {maxBookableGuests <= 0 ? (
                  <option value={0}>Nincs foglalható hely</option>
                ) : (
                  Array.from({ length: maxBookableGuests }, (_, index) => index + 1).map((count) => (
                    <option key={`sticky-guests-${count}`} value={count}>
                      {count} fő
                    </option>
                  ))
                )}
              </select>
            </label>
          </div>

          <p className={classes.stickySummary}>
            <span>{selectedBoardingStop?.city || "-"}</span>
            <span>→</span>
            <span>{selectedArrivalStop?.city || "-"}</span>
            <span>•</span>
            <span>{maxBookableGuests > 0 ? `${effectiveGuestCount} fő` : "Nincs hely"}</span>
            <span>•</span>
            <span>{displayedDepartureDate ? formatStopDate(displayedDepartureDate) : "Nincs indulási dátum"}</span>
            <span>→</span>
            <span>{displayedArrivalDate ? formatStopDate(displayedArrivalDate) : "Nincs érkezési dátum"}</span>
          </p>

          <p className={classes.stickyTotalPrice}>
            Aktuális végösszeg: <strong>{formatPrice(totalPrice)}</strong>
          </p>
        </section>

        <p className={classes.departureHeading}>Legközelebbi hajóút:</p>

        <p className={classes.meta}>
          <span>Indulás</span>•
          <span>{formatStopDate(statusOccurrenceToday.startDate || route.date)}</span>
        </p>

        <p className={classes.meta}>
          <span>Érkezés</span>•
          <span>{formatStopDate(statusOccurrenceToday.endDate || route.date)}</span>
        </p>

        <p className={classes.meta}>
          <span>Hajó</span>•
          <span>{shipName}</span>
        </p>

        {statusOccurrenceToday.isInTransit ? (
          <p className={classes.inTransitBadge}>Úton van a hajó</p>
        ) : null}

        <div className={classes.stopScheduleBlock}>
          <p className={classes.stopScheduleTitle}>Állomások dátummal</p>
          {isNearestOccurrenceSelected && statusOccurrenceToday.isInTransit && currentJourneyLocation ? (
            <p className={classes.currentStopLabel}>
              Most <span className={classes.currentStopLocation}>{currentJourneyLocation}</span> jár
            </p>
          ) : null}
          <ul className={classes.stopScheduleList}>
            {scheduleStops.map((stop, index) => (
              // A teljes, kiválasztott induláshoz tartozó menetrend jelenik meg, hogy a /routes nézettel konzisztens legyen.
              <li
                key={`${route.id}-${stop.city}-${stop.date}-${index}`}
                className={[
                  stop.isSeaDay ? classes.seaDayRow : "",
                  isNearestOccurrenceSelected && index === currentStopIndexToday ? classes.currentStopRow : "",
                ].filter(Boolean).join(" ")}
              >
                <span>{stop.city}</span>
                <span>{formatStopDate(stop.date)}</span>
              </li>
            ))}
          </ul>
        </div>

        {isBookingBlockedByTodayRule ? (
          <p className={classes.soldOutNote}>
            A mai napra már nem foglalható: a mai nap után nincs még legalább 2 városi megálló.
          </p>
        ) : null}

        <div className={classes.programBlock}>
          <p className={classes.programTitle}>Fedélzeti programok</p>
          <ul className={classes.programList}>
            {onboardPrograms.map((program, programIndex) => (
              <li key={`${route.id}-program-${programIndex}`}>{program}</li>
            ))}
          </ul>
        </div>

        <p className={classes.price}>
          A teljes út alap ára: <strong>{formatPrice(route.price)}</strong>
        </p>

        <div className={classes.seatsBlock}>
          <p className={classes.seats}>
            Szabad helyek a választott szegmensben: <strong>{segmentAvailableSeats}</strong>
          </p>
          {isSegmentSoldOut ? <p className={classes.soldOutNote}>Erre az indulásra már nincs foglalható hely.</p> : null}
          <ul className={classes.seatBreakdown}>
            {seatBreakdownItems.map((item) => (
              <li key={`cabin-seat-${item.id}`} className={item.seatCount <= 0 ? classes.seatBreakdownSoldOut : ""}>
                <span>{item.name}</span>
                <span className={classes.seatCountText}>
                  <span className={classes.seatCountNumber}>{item.seatCount}</span> hely
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <h2>Kabin kiválasztása</h2>
      <div className={classes.cabinOptions}>
        {cabinOptions.map((option) => {
          const availableSeatsForCabin = getCabinSeatCount(option);
          const requestedGuests = Math.max(Number(guestCount) || 1, 1);
          const isCabinDisabled = availableSeatsForCabin < requestedGuests;

          return (
            <div
              key={option.id}
              className={`${classes.cabinCard} ${
                cabin === option.id ? classes.selected : ""
              } ${isCabinDisabled ? classes.cabinSoldOut : ""}`}
              onClick={() => {
                if (isCabinDisabled) {
                  return;
                }
                setCabin(option.id);
              }}
              title={isCabinDisabled ? "Nincs ennyi szabad hely" : ""}
            >
              <h3>{option.name}</h3>
              <p className={classes.cabinAvailability}>
                {availableSeatsForCabin > 0
                  ? `${availableSeatsForCabin} szabad hely`
                  : "Nincs szabad hely"}
              </p>
              <p>
                +{formatPrice(option.pricePerNight)} felár
              </p>
            </div>
          );
        })}
      </div>

      <h2>Extra szolgáltatások</h2>
      <div className={classes.extraOptions}>
        {extraServices.map((ex) => (
          <div
            key={ex.id}
            className={`${classes.extraCard} ${
              extras.includes(ex.id) ? classes.extraSelected : ""
            }`}
            onClick={() => toggleExtra(ex.id)}
          >
            <h3>{ex.name}</h3>
            <p>{formatPrice(ex.price)}</p>
          </div>
        ))}
      </div>

      <h2>Végösszeg</h2>
      <p className={classes.total}><strong>{formatPrice(totalPrice)}</strong></p>

      {isAdmin ? (
        <p className={classes.soldOutNote}>Admin felhasználóval nem hozható létre foglalás.</p>
      ) : null}

      <button className={classes.bookBtn} onClick={handleBooking} disabled={isSegmentSoldOut || isAdmin || isBookingBlockedByTodayRule}>
        {isAdmin ? "Admin nem foglalhat" : isBookingBlockedByTodayRule ? "Mai napra nem foglalható" : isSegmentSoldOut ? "Nincs szabad hely" : "Foglalás véglegesítése"}
      </button>
    </section>
  );
}
