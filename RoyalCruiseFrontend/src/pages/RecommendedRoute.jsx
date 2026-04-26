// Ez a fájl a felhasználó számára ajánlott útvonal részleteit és választást segítő összegzéseit tartalmazza.
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getAllRoutes, getRouteGroups } from "../api/routesApi.js";
import classes from "./RecommendedRoute.module.css";
import { getShipNameForRoute } from "../utils/routeShipAssignment.js";
import formatPrice from "../utils/formatPrice.js";
import { formatStopDate, getRouteStopSchedule } from "../utils/routeStopSchedule.js";

// Ez a segédfüggvény összegyűjti a route lista egyedi indulási dátumait.
function getUniqueDates(routes) {
  const unique = new Set(routes.map((route) => route.date).filter(Boolean));
  return Array.from(unique);
}

// Ez a segédfüggvény meghatározza a route lista legalacsonyabb árát.
function getMinPrice(routes) {
  if (!routes.length) return null;
  return routes.reduce((min, route) => Math.min(min, route.price ?? min), routes[0].price ?? 0);
}

const REGION_MAP = {
  mediterran: "Barcelona",
  adria: "Velence",
  fjordok: "Koppenhága",
};

// A RecommendedRoute oldal a kiválasztott ajánlott út fő adatait, dátumait és ártartományát emeli ki.
export default function RecommendedRoute() {
  // 1) Útvonalparaméterből származtatott régióazonosítás és alapállapotok.
  const { routeId } = useParams();
  const navigate = useNavigate();
  const regionName = REGION_MAP[routeId] || "";
  const [routes, setRoutes] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 2) Régióhoz tartozó útvonal- és csoportadatok betöltése.
  // Ez az effekt a kiválasztott ajánlási régióhoz betölti az útvonal- és csoportadatokat.
  useEffect(() => {
    let active = true;
    if (!regionName) return;

    // Ez a belső függvény párhuzamosan kéri le az ajánlott régióhoz szükséges backend adatokat.
    async function loadRegionData() {
      setLoading(true);
      setError("");
      try {
        const [routesData, routeGroupsData] = await Promise.all([
          getAllRoutes(),
          getRouteGroups(regionName),
        ]);

        const nextRoutes = Array.isArray(routesData) ? routesData : [];
        const nextTypes = Array.isArray(routeGroupsData) ? routeGroupsData : [];

        if (active) {
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

  // 3) Származtatott lista- és összesítő értékek memoizálása.
  // Ez a memoizált lista csak a kiválasztott régióhoz tartozó route elemeket tartja meg.
  const regionRoutes = useMemo(() => {
    return routes.filter((route) => route.destination === regionName);
  }, [routes, regionName]);

  // Ez a memoizált érték a régió legalacsonyabb elérhető árát számolja ki.
  const minPrice = useMemo(() => getMinPrice(regionRoutes), [regionRoutes]);
  // Ez a memoizált lista egyedi indulási dátumokat ad vissza az ajánlott útvonalakból.
  const departures = useMemo(() => getUniqueDates(regionRoutes), [regionRoutes]);

  // Ez a memoizált képlista az ajánlott régió route képeiből készít rövid galériát.
  const galleryImages = useMemo(() => {
    const urls = regionRoutes.map((route) => route.image).filter(Boolean);
    return Array.from(new Set(urls)).slice(0, 3);
  }, [regionRoutes]);

  if (!regionName) {
    return <h1>Nem található ilyen útvonal.</h1>;
  }

  if (loading) return <p className={classes.state}>Betöltés...</p>;
  if (error) return <p className={classes.stateError}>{error}</p>;

  const titles = {
    mediterran: "Mediterrán körút",
    adria: "Adriai kaland",
    fjordok: "Skandináv fjordok",
  };

  const descriptions = {
    mediterran:
      "A Mediterrán körút Európa legszebb tengerparti városait köti össze. Fedezd fel Barcelona modernista csodáit, Marseille mediterrán hangulatát és Róma történelmi kincseit.",
    adria:
      "Az Adriai kaland útvonal Velence romantikus utcáitól Dubrovnik óvárosáig vezet, majd Korfu zöld szigetével zárul.",
    fjordok:
      "A Skandináv fjordok útvonal Európa egyik leglátványosabb tengeri útja. Koppenhága, Oslo és Bergen fjordjai felejthetetlen élményt nyújtanak.",
  };

  // 4) Ajánlott útvonal-oldal kirajzolása a régió részleteivel és route-kártyákkal.
  return (
    <section className={classes.routePage}>
      <h1>{titles[routeId] || regionName}</h1>
      <p className={classes.description}>
        {descriptions[routeId] || `Fedezd fel a ${regionName} régió útvonalait és a hozzá tartozó hajóutakat.`}
      </p>

      {galleryImages.length ? (
        <div className={classes.gallery}>
          {galleryImages.map((src) => (
            <img key={src} src={src} alt={regionName} />
          ))}
        </div>
      ) : null}

      <h2>Régió típusok</h2>
      <p>{types.length ? types.join(" • ") : "Nincs elérhető útvonal."}</p>

      <h2>Legolcsóbb ár</h2>
      <p>{minPrice != null ? formatPrice(minPrice) : "Nincs elérhető ár"}</p>

      <h2>Indulási időpontok</h2>
      {departures.length ? (
        <ul className={classes.departureList}>
          {departures.map((date) => (
            <li key={date}>{date}</li>
          ))}
        </ul>
      ) : (
        <p>Nincs elérhető indulási dátum.</p>
      )}

      <h2>Induló városok</h2>
      {regionRoutes.length ? (
        <div className={classes.routeGrid}>
          {regionRoutes.map((route) => (
            <article
              key={route.id}
              className={classes.routeCard}
              onClick={() =>
                navigate(`/route/${route.id}`, {
                  state: { route },
                })
              }
            >
              <img src={route.image} alt={route.name} />
              <div className={classes.routeCardBody}>
                <h3>{route.stops?.[0] ? `Indulás: ${route.stops[0]}` : route.name}</h3>
                <p className={classes.routeType}>{route.routeName}</p>
                <p className={classes.routeShip}>Hajó: {route.shipName || getShipNameForRoute(route)}</p>
                <p>{route.stops?.length ? route.stops.join(" → ") : route.name}</p>
                <div className={classes.stopScheduleBlock}>
                  <p className={classes.stopScheduleTitle}>Állomások dátummal</p>
                  <ul className={classes.stopScheduleList}>
                    {getRouteStopSchedule(route).map((stop, index) => (
                      <li key={`${route.id}-${stop.city}-${stop.date}-${index}`}>
                        <span>{stop.city}</span>
                        <span>{formatStopDate(stop.date)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={classes.routeMeta}>
                  <span>{route.date}</span>
                  <span>{formatPrice(route.price)}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p>Ehhez a régióhoz jelenleg nincs elérhető útvonal.</p>
      )}
    </section>
  );
}
