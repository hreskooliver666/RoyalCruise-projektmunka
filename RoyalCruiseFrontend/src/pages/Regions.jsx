// Ez a fájl a régiók áttekintő oldalát tartalmazza, ahol a felhasználó célterület szerint szűrhet útvonalakat.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllRoutes, getDestinations, getRouteGroups } from "../api/routesApi.js";
import classes from "./Regions.module.css";
import formatPrice from "../utils/formatPrice.js";
import routeClasses from "./Routes.module.css";

// Ez a segédfüggvény meghatározza az adott régió útvonalainak legkisebb árát.
function getMinPrice(routes) {
  if (!routes.length) return null;
  return routes.reduce((min, route) => Math.min(min, route.price ?? min), routes[0].price ?? 0);
}

// Ez a segédfüggvény a régió útvonalaihoz tartozó legmagasabb árat adja vissza.
function getMaxPrice(routes) {
  if (!routes.length) return null;
  return routes.reduce((max, route) => Math.max(max, route.price ?? max), routes[0].price ?? 0);
}

// Ez a segédfüggvény kiszámolja a régió átlagárát a meglévő útvonalak alapján.
function getAveragePrice(routes) {
  const prices = routes
    .map((route) => Number(route?.price))
    .filter((value) => Number.isFinite(value));

  if (!prices.length) return null;
  return Math.round(prices.reduce((sum, value) => sum + value, 0) / prices.length);
}

// Ez a segédfüggvény megszámolja az egyedi induló városokat.
function getDepartureCityCount(routes) {
  const departures = new Set(
    routes
      .map((route) => (Array.isArray(route?.stops) ? route.stops[0] : ""))
      .filter(Boolean)
  );

  return departures.size;
}

// Ez a segédfüggvény megszámolja az egyedi érintett városokat.
function getTouchedCityCount(routes) {
  const touchedCities = new Set(
    routes.flatMap((route) => (Array.isArray(route?.stops) ? route.stops : [])).filter(Boolean)
  );

  return touchedCities.size;
}

// Ez a segédfüggvény megszámolja, hány különböző hajó szolgálja ki a régió útvonalait.
function getShipCount(routes) {
  const shipNames = new Set(routes.map((route) => route?.shipName).filter(Boolean));
  return shipNames.size;
}

// A Regions oldal régiókártyákat jelenít meg, és a kiválasztott régió részletes útvonalnézetére navigál.
export default function Regions() {
  // 1) Navigáció és régiólista állapotainak inicializálása.
  const navigate = useNavigate();
  // Ez az állapot a régiókártyákhoz összerakott, megjeleníthető régióösszesítő adatokat tárolja.
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 2) Régió-összesítő adatok betöltése és kártyamodellek előállítása.
  // Ez az effekt betölti a régiókhoz szükséges célállomás-, útvonal- és csoportadatokat, majd kártyastruktúrába rendezi őket.
  useEffect(() => {
    let active = true;

    // Ez a belső függvény egy tranzakcióban futtatja a régióadatok lekérését és a nézetmodell felépítését.
    async function loadRegions() {
      setLoading(true);
      setError("");
      try {
        const [destinationsData, routesData] = await Promise.all([
          getDestinations(),
          getAllRoutes(),
        ]);

        const destinations = Array.isArray(destinationsData) ? destinationsData : [];
        const routes = Array.isArray(routesData) ? routesData : [];

        const groupPromises = destinations.map((destination) =>
          getRouteGroups(destination).catch(() => [])
        );
        const groups = await Promise.all(groupPromises);

        const nextRegions = destinations.map((destination, index) => {
          const types = Array.isArray(groups[index]) ? groups[index] : [];
          const regionRoutes = routes.filter((route) => route.destination === destination);
          return {
            id: destination,
            name: destination,
            types,
            count: regionRoutes.length,
            departureCityCount: getDepartureCityCount(regionRoutes),
            touchedCityCount: getTouchedCityCount(regionRoutes),
            shipCount: getShipCount(regionRoutes),
            minPrice: getMinPrice(regionRoutes),
            maxPrice: getMaxPrice(regionRoutes),
            averagePrice: getAveragePrice(regionRoutes),
            image: regionRoutes[0]?.image || "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80",
          };
        });

        if (active) {
          setRegions(nextRegions);
        }
      } catch {
        if (active) {
          setError("Nem sikerült betölteni a régiókat.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadRegions();

    return () => {
      active = false;
    };
  }, []);

  if (loading) return <p className={classes.state}>Betöltés...</p>;
  if (error) return <p className={classes.stateError}>{error}</p>;

  // 3) Régiókártyák megjelenítése és részletes régióoldalra navigáló kattintások kezelése.
  return (
    <section className={classes.wrapper}>
      <div className={classes.header}>
        <h1>Régiók</h1>
        <p>Válassz régiót, és fedezd fel az adott területhez tartozó útvonalakat.</p>
      </div>

      <div className={routeClasses.grid}>
        {regions.map((region) => (
          <article
            key={region.id}
            className={routeClasses.card}
            onClick={() => navigate(`/regions/${encodeURIComponent(region.name)}`)}
          >
            <div className={routeClasses.cardLayout}>
              <section className={routeClasses.leftColumn}>
                <img
                  src={region.image}
                  alt={region.name}
                />
                <h3>{region.name}</h3>
                <p className={routeClasses.regionLabel}>{region.name}</p>
                <div className={classes.routeTypesList}>
                  {region.types.length ? (
                    region.types.map((type, index) => (
                      <span key={index} className={classes.routeType}>{type}</span>
                    ))
                  ) : (
                    <span className={classes.routeType}>Nincs elérhető útvonal.</span>
                  )}
                </div>
              </section>

              <section className={routeClasses.middleColumn}>
                <div className={routeClasses.stopScheduleBlock}>
                  <p className={routeClasses.stopScheduleTitle}>Régió összesítő</p>
                  <p className={routeClasses.stopScheduleLead}>Elérhető adatok</p>
                  <ul className={routeClasses.stopScheduleList}>
                    <li>
                      <span>Elérhető útvonalak</span>
                      <span>{region.count}</span>
                    </li>
                    <li>
                      <span>Induló városok</span>
                      <span>{region.departureCityCount}</span>
                    </li>
                    <li>
                      <span>Érintett városok</span>
                      <span>{region.touchedCityCount}</span>
                    </li>
                    <li>
                      <span>Kiszolgáló hajók</span>
                      <span>{region.shipCount}</span>
                    </li>
                    <li>
                      <span>Útvonaltípusok</span>
                      <span>{region.types.length}</span>
                    </li>
                  </ul>
                </div>
              </section>

              <section className={routeClasses.rightColumn}>
                <div>
                  <p className={routeClasses.routeStops}>
                    Legolcsóbb ár a régióban:
                  </p>
                  <span className={`${routeClasses.priceTag} ${classes.regionPriceTag}`}>
                    {region.minPrice != null ? `${formatPrice(region.minPrice)}-tól` : "Nincs ár"}
                  </span>
                  <p className={classes.secondaryPriceRow}>
                    Átlagár: <span>{region.averagePrice != null ? formatPrice(region.averagePrice) : "Nincs adat"}</span>
                  </p>
                  <p className={classes.secondaryPriceRow}>
                    Legmagasabb ár: <span>{region.maxPrice != null ? formatPrice(region.maxPrice) : "Nincs adat"}</span>
                  </p>
                  <p className={routeClasses.priceNote}>(Az ár a teljes útra vonatkozik!)</p>
                </div>
              </section>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
