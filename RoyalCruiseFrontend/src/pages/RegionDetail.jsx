// Ez a fájl egy régióhoz tartozó útvonalak listáját és azok aktuális útállapot-számítását jeleníti meg.
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getAllRoutes, getDestinations, getRouteGroups } from "../api/routesApi.js";
import classes from "./RegionDetail.module.css";
import routeClasses from "./Routes.module.css";
import formatPrice from "../utils/formatPrice.js";
import {
  formatStopDate,
  getFirstBookableRouteOccurrence,
  getRouteOnboardPrograms,
} from "../utils/routeStopSchedule.js";
import { getShipNameForRoute } from "../utils/routeShipAssignment.js";

// Ez a segédfüggvény meghatározza az adott régió útvonalainak legalacsonyabb árát.
function getMinPrice(routes) {
  if (!routes.length) return null;
  return routes.reduce((min, route) => Math.min(min, route.price ?? min), routes[0].price ?? 0);
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

// Ez a segédfüggvény megkeresi, hogy a mai nap melyik megállóhoz tartozik.
// Az aláhúzás az aktuális dátumra esik, függetlenül attól, hogy tengeri nap-e vagy város-e.
function getCurrentStopIndex(occurrence, todayIso) {
  const schedule = Array.isArray(occurrence?.stopSchedule) ? occurrence.stopSchedule : [];
  return schedule.findIndex((stop) => stop?.date === todayIso);
}

// Ez a segédfüggvény a városnévhez a megfelelő magyar toldalékot illeszti.
function withHungarianLocationSuffix(city) {
  const text = String(city ?? "").trim();
  if (!text) return "";

  const vowels = [...text.toLowerCase()].filter((char) => "aáeéiíoóöőuúüű".includes(char));
  const lastVowel = vowels[vowels.length - 1] || "a";
  const usesBackSuffix = "aáoóuú".includes(lastVowel);
  const suffix = usesBackSuffix ? "ban" : "ben";

  return `${text}-${suffix}`;
}

// Ez a segédfüggvény visszaadja a hajó aktuális útvonalpozícióját.
function getCurrentJourneyLocation(occurrence, currentStopIndex, todayIso) {
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

// A RegionDetail oldal a kiválasztott régió útjait tölti be, majd foglalhatóság és aktuális megálló szerint rendezi.
export default function RegionDetail() {
  // 1) Útvonalparaméter és oldalállapotok inicializálása.
  const { regionId } = useParams();
  const navigate = useNavigate();
  const regionName = decodeURIComponent(regionId ?? "");
  const [routes, setRoutes] = useState([]);
  const [types, setTypes] = useState([]);
  const [exists, setExists] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const now = new Date();
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  // 2) Régióhoz tartozó adatok betöltése.
  // Ez az effekt a kiválasztott régióhoz szükséges adatokat párhuzamosan betölti, majd beállítja az oldal állapotait.
  useEffect(() => {
    let active = true;
    if (!regionName) return;

    // Ez a belső betöltőfüggvény egyszerre kéri le az útvonalakat, útvonaltípusokat és a régiólistát.
    async function loadRegionData() {
      setLoading(true);
      setError("");
      try {
        const [routesData, routeGroupsData, destinationsData] = await Promise.all([
          getAllRoutes(),
          getRouteGroups(regionName),
          getDestinations(),
        ]);

        const destinationList = Array.isArray(destinationsData) ? destinationsData : [];
        const found = destinationList.includes(regionName);
        const nextRoutes = Array.isArray(routesData) ? routesData : [];
        const nextTypes = Array.isArray(routeGroupsData) ? routeGroupsData : [];

        if (active) {
          setExists(found);
          setRoutes(nextRoutes);
          setTypes(nextTypes);
        }
      } catch {
        if (active) {
          setError("Nem sikerült betölteni az útvonalakat.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadRegionData();

    return () => {
      active = false;
    };
  }, [regionName]);

  // 3) Származtatott régióadatok előállítása memoizált számításokkal.
  // Ez a memoizált lista minden régiós útvonalhoz a legközelebbi ténylegesen foglalható indulást rendeli.
  // Az útvonalak dátum szerint növekvő sorrendben vannak rendezve a kártyák konzisztens megjelenítéséhez.
  const regionRouteCards = useMemo(() => {
    return routes
      .filter((route) => route.destination === regionName)
      .map((route) => ({
        route,
        occurrence: getFirstBookableRouteOccurrence(route, todayIso, todayIso, 2),
      }))
      .filter((card) => Boolean(card.occurrence))
      .sort((a, b) => {
        const leftName = String(a.route?.name || a.route?.routeName || "").trim();
        const rightName = String(b.route?.name || b.route?.routeName || "").trim();
        const nameComparison = leftName.localeCompare(rightName, "hu", {
          numeric: true,
          sensitivity: "base",
        });

        if (nameComparison !== 0) {
          return nameComparison;
        }

        return String(a.occurrence.startDate).localeCompare(String(b.occurrence.startDate));
      });
  }, [routes, regionName, todayIso]);

  const regionRoutes = useMemo(() => regionRouteCards.map((card) => card.route), [regionRouteCards]);

  // Ez a memoizált érték a régióban elérhető útvonalak legkisebb árát adja vissza.
  const minPrice = useMemo(() => getMinPrice(regionRoutes), [regionRoutes]);

  // Ez a memoizált blokk kiválasztja a legközelebbi indulású útvonalat a régión belül.
  const nearestOccurrence = useMemo(() => {
    if (!regionRouteCards.length) return null;

    const upcoming = regionRouteCards
      .filter((item) => item.occurrence?.startDate && item.occurrence?.endDate)
      .sort((a, b) => String(a.occurrence.startDate).localeCompare(String(b.occurrence.startDate)));

    return upcoming[0] ?? null;
  }, [regionRouteCards]);

  // Ez a memoizált képlista a régió útvonalaiból származó, egyedi galériaképeket készíti elő.
  const galleryImages = useMemo(() => {
    const urls = regionRoutes.map((route) => route.image).filter(Boolean);
    return Array.from(new Set(urls)).slice(0, 3);
  }, [regionRoutes]);

  if (!exists) {
    return <h1>Nem található ilyen régió.</h1>;
  }

  if (loading) return <p className={classes.state}>Betöltés...</p>;
  if (error) return <p className={classes.stateError}>{error}</p>;

  // 4) Régióoldal kirajzolása: galéria, típusok, ár, legközelebbi út, induló városok.
  return (
    <section className={classes.routePage}>
      <h1>{regionName}</h1>
      <p className={classes.description}>
        Fedezd fel a {regionName} régió útvonalait és a hozzá tartozó hajóutakat.
      </p>

      {galleryImages.length ? (
        <div className={classes.gallery}>
          {galleryImages.map((src) => (
            <img key={src} src={src} alt={regionName} />
          ))}
        </div>
      ) : null}

      <h2>Régió típusok</h2>
      <div className={classes.regionTypesList}>
        {types.length ? (
          types.map((type, index) => (
            <span key={index} className={classes.regionType}>{type}</span>
          ))
        ) : (
          <span className={classes.regionType}>Nincs elérhető útvonal.</span>
        )}
      </div>

      <h2>Legolcsóbb ár</h2>
      <p className={classes.minPriceValue}>
        {minPrice != null ? (
          <>
            <span style={{ fontStyle: 'italic' }}>{formatPrice(minPrice).split(' HUF')[0]}</span> HUF
          </>
        ) : (
          "Nincs elérhető ár"
        )}
      </p>

      <p className={classes.nearestHeading}>Legközelebbi hajóút:</p>
      {nearestOccurrence ? (
        <>
          <p className={classes.nearestMeta}>
            <span>Indulás</span>
            <span>•</span>
            <span>{formatStopDate(nearestOccurrence.occurrence.startDate)}</span>
          </p>
          <p className={classes.nearestMeta}>
            <span>Érkezés</span>
            <span>•</span>
            <span>{formatStopDate(nearestOccurrence.occurrence.endDate)}</span>
          </p>
        </>
      ) : (
        <p className={classes.nearestMeta}>Nincs elérhető indulási adat.</p>
      )}

      <h2>Induló városok</h2>
      {regionRouteCards.length ? (
        <div className={routeClasses.grid}>
          {regionRouteCards.map((card) => {
            const route = card.route;
            const occurrence = card.occurrence;
            const currentStopIndex = getCurrentStopIndex(occurrence, todayIso);
            const currentJourneyLocation = getCurrentJourneyLocation(occurrence, currentStopIndex, todayIso);
            const isInTransitToday = Boolean(
              occurrence.startDate &&
              occurrence.endDate &&
              todayIso >= occurrence.startDate &&
              todayIso <= occurrence.endDate
            );
            const routeForDetail = {
              ...route,
              date: occurrence.startDate || route.date,
              stopSchedule: occurrence.stopSchedule,
            };
            const onboardPrograms = Array.isArray(route.onboardPrograms) && route.onboardPrograms.length
              ? route.onboardPrograms
              : getRouteOnboardPrograms(route);

            return (
              <div
                key={route.id}
                className={routeClasses.card}
                onClick={() =>
                  navigate(`/route/${route.id}`, {
                    state: {
                      route: routeForDetail,
                      occurrenceReferenceDate: occurrence.startDate || todayIso,
                    },
                  })
                }
              >
                <div className={routeClasses.cardLayout}>
                  <section className={routeClasses.leftColumn}>
                    <img src={route.image} alt={route.name} />
                    <h3>{route.name}</h3>
                    <p className={routeClasses.regionLabel}>{route.destination || regionName}</p>
                    <p className={routeClasses.routeStops}>{route.stops?.length ? route.stops.join(" → ") : route.name}</p>
                  </section>

                  <section className={routeClasses.middleColumn}>
                    <div className={routeClasses.stopScheduleBlock}>
                      <p className={routeClasses.stopScheduleTitle}>Legközelebbi indulás</p>
                        <p className={routeClasses.stopScheduleLead}>
                          {formatStopDate(occurrence.startDate)}
                      </p>
                      {isInTransitToday ? <p className={routeClasses.inTransitBadge}>Úton van a hajó</p> : null}
                      {isInTransitToday && currentStopIndex !== -1 ? (
                        <p className={routeClasses.currentStopLabel}>
                          Most <span className={routeClasses.currentStopLocation}>{currentJourneyLocation}</span> jár
                        </p>
                      ) : null}
                      <ul className={routeClasses.stopScheduleList}>
                        {occurrence.stopSchedule.map((stop, index) => (
                          <li
                            key={`${route.id}-${stop.city}-${stop.date}-${index}`}
                            className={[
                              stop.isSeaDay ? routeClasses.seaDayRow : "",
                              isInTransitToday && index === currentStopIndex ? routeClasses.currentStopRow : "",
                            ].filter(Boolean).join(" ")}
                          >
                            <span>{stop.city}</span>
                            <span>{formatStopDate(stop.date)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </section>

                  <section className={routeClasses.rightColumn}>
                    <div className={routeClasses.programBlock}>
                      <p className={routeClasses.programTitle}>Fedélzeti programok</p>
                      <ul className={routeClasses.programList}>
                        {onboardPrograms.slice(0, 3).map((program, programIndex) => (
                          <li key={`${route.id}-program-${programIndex}`}>{program}</li>
                        ))}
                      </ul>
                    </div>

                    <p className={routeClasses.shipInfo}>Hajó: {route.shipName || getShipNameForRoute(route)}</p>
                    <p className={routeClasses.shipInfo}>
                      A szabad helyek számához kattintson a kártyára
                    </p>
                    <span className={routeClasses.priceTag}>{formatPrice(route.price)}-tól</span>
                    <p className={routeClasses.priceNote}>(Az ár a teljes útra vonatkozik!)</p>
                  </section>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p>Ehhez a régióhoz jelenleg nincs elérhető útvonal.</p>
      )}
    </section>
  );
}
