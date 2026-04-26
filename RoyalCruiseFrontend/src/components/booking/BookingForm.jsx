// Ez a fájl a foglalási űrlap mezőit, utasadat-kezelését és beküldési folyamatát valósítja meg.
import { useEffect, useState } from "react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import classes from "./BookingForm.module.css";
import { getAllRoutes, getDestinations, getRouteGroups, searchRoutesWithFallback } from "../../api/routesApi.js";
import formatPrice from "../../utils/formatPrice.js";
import { getShipNameForRoute } from "../../utils/routeShipAssignment.js";

// A BookingForm komponens a kiválasztott út adatai alapján összegyűjti a foglaláshoz szükséges adatokat és elküldi a kérést.
export default function BookingForm() {
  // 1) Navigáció és szűrőállapotok inicializálása.
  // Ez a navigációs segéd a keresési eredményeket átadva a találati oldalra irányít.
  const navigate = useNavigate();

  // Ezek az állapotok a dátumtartomány szerinti szűrés bemeneteit tárolják.
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Ezek az állapotok a felhasználó által választott útvonal-szűrési mezőket és opciólistákat kezelik.
  const [destination, setDestination] = useState("");
  const [routeName, setRouteName] = useState("");
  const [departureCity, setDepartureCity] = useState("");
  const [touchedCity, setTouchedCity] = useState("");
  const [destinations, setDestinations] = useState([]);
  const [routeOptions, setRouteOptions] = useState([]);
  const [departureCityOptions, setDepartureCityOptions] = useState([]);
  const [touchedCityOptions, setTouchedCityOptions] = useState([]);
  const [routesCatalog, setRoutesCatalog] = useState([]);
  // Ezek az állapotok az ár- és hajótípus szerinti szűrés aktuális értékeit tárolják.
  const [priceBounds, setPriceBounds] = useState(null);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);
  const [shipType, setShipType] = useState("");

  // Ez az állapot jelzi, hogy a keresés elküldése folyamatban van-e.
  const [loading, setLoading] = useState(false);
  const todayIso = new Date().toISOString().split("T")[0];
  const minArrivalDate = startDate ? addDays(startDate, 1) : todayIso;

  // Ez a segédfüggvény egy ISO dátumhoz naptári napokat ad hozzá, a dátummezők minimumának számításához.
  function addDays(isoDate, days) {
    const parsed = new Date(`${isoDate}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) return "";
    parsed.setUTCDate(parsed.getUTCDate() + days);
    return parsed.toISOString().split("T")[0];
  }

  // 2) Kezdeti adatbetöltés és dinamikus opciófrissítő effectek.
  // Ez az effekt induláskor betölti az árhatár-számításhoz szükséges útvonaladatokat és a célállomás-listát.
  useEffect(() => {
    getAllRoutes()
      .then((data) => {
        const prices = Array.isArray(data)
          ? data
              .map((routeItem) => Number(routeItem.price))
              .filter((value) => Number.isFinite(value))
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
        setMinPrice(nextMin);
        setMaxPrice(nextMax);
        setRoutesCatalog(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setPriceBounds(null);
        setMinPrice(0);
        setMaxPrice(0);
        setRoutesCatalog([]);
      });

    getDestinations()
      .then((data) => setDestinations(data))
      .catch(() => setDestinations([]));
  }, []);

  // Ez az effekt célállomás-váltáskor lekéri az adott régióhoz tartozó útvonalcsoportokat.
  useEffect(() => {
    if (!destination) {
      setRouteOptions([]);
      return;
    }

    getRouteGroups(destination)
      .then((groups) => setRouteOptions(groups))
      .catch(() => setRouteOptions([]));
  }, [destination]);

  // Ez az effekt a kiválasztott szűrők alapján előállítja az induló városok választható listáját.
  useEffect(() => {
    const options = routesCatalog
      .filter((item) => {
        if (destination && item.destination !== destination) return false;
        if (routeName && item.routeName !== routeName && item.name !== routeName) return false;
        return true;
      })
      .map((item) => item.stops?.[0])
      .filter(Boolean);

    const uniqueOptions = [...new Set(options)];
    setDepartureCityOptions(uniqueOptions);

    if (departureCity && !uniqueOptions.includes(departureCity)) {
      setDepartureCity("");
    }
  }, [routesCatalog, destination, routeName, departureCity]);

  // Ez az effekt a kiválasztott szűrők alapján előállítja az érintett városok választható listáját.
  useEffect(() => {
    const options = routesCatalog
      .filter((item) => {
        if (destination && item.destination !== destination) return false;
        if (routeName && item.routeName !== routeName && item.name !== routeName) return false;
        return true;
      })
      .flatMap((item) => (Array.isArray(item.stops) ? item.stops : []))
      .filter(Boolean);

    const uniqueOptions = [...new Set(options)];
    setTouchedCityOptions(uniqueOptions);

    if (touchedCity && !uniqueOptions.includes(touchedCity)) {
      setTouchedCity("");
    }
  }, [routesCatalog, destination, routeName, touchedCity]);

  // Ez a segédfüggvény eldönti, hogy egy út megfelel-e az aktív mezőszűrőknek hajótípus nélkül.
  function matchesActiveFiltersWithoutShip(route) {
    if (destination && route?.destination !== destination) return false;

    if (routeName) {
      const routeGroup = route?.routeName || route?.name || "";
      if (routeGroup !== routeName) return false;
    }

    if (departureCity) {
      const departure = Array.isArray(route?.stops) ? route.stops[0] : "";
      if (departure !== departureCity) return false;
    }

    if (touchedCity) {
      const touchedCities = Array.isArray(route?.stops) ? route.stops.filter(Boolean) : [];
      if (!touchedCities.includes(touchedCity)) return false;
    }

    return true;
  }

  // Ez a memoizált lista csak az aktuális cél/útvonal/város-szűrőhöz tartozó hajótípusokat engedi választani.
  const shipOptions = useMemo(() => {
    const source = routesCatalog.filter((route) => matchesActiveFiltersWithoutShip(route));
    const relevantRoutes = source.length ? source : routesCatalog;
    const names = [...new Set(relevantRoutes.map((route) => route?.shipName || getShipNameForRoute(route)).filter(Boolean))];
    return names.map((name) => ({ value: name, label: name }));
  }, [routesCatalog, destination, routeName, departureCity, touchedCity]);

  // Ez az effekt törli a korábbi hajótípus-választást, ha az új szűrők mellett már nem elérhető opció.
  useEffect(() => {
    if (!shipType) return;

    const exists = shipOptions.some((option) => option.value === shipType);
    if (!exists) {
      setShipType("");
    }
  }, [shipOptions, shipType]);

  // 3) Keresés beküldése és találati oldalra navigálás.
  // Ez a beküldési kezelő backend keresést futtat, majd az eredményeket és a szűrőket átadja a találati oldalnak.
  async function handleSubmit(e) {
    e.preventDefault();
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

      const routes = await searchRoutesWithFallback({
        destination,
        routeName,
        departureCity,
        touchedCity,
        startDate: normalizedStartDate,
        endDate: normalizedEndDate,
        minPrice: priceBounds ? minPrice : undefined,
        maxPrice: priceBounds ? maxPrice : undefined,
        shipType: shipType || undefined,
      });

      const sourceRoutes = Array.isArray(routes) ? routes : [];
      if (!Array.isArray(sourceRoutes) || sourceRoutes.length === 0) {
        setLoading(false);
        alert("Nincs a megadott feltételekhez illő útvonal.");
        return;
      }

      setLoading(false);
      navigate("/routes", {
        state: {
          routes: sourceRoutes,
          filters: {
            destination,
            routeName,
            departureCity,
            touchedCity,
            startDate: normalizedStartDate,
            endDate: normalizedEndDate,
            minPrice: priceBounds ? minPrice : undefined,
            maxPrice: priceBounds ? maxPrice : undefined,
            shipType: shipType || undefined,
          },
        }
      });
    } catch (err) {
      setLoading(false);
      alert(err.message || "Sikertelen keresés.");
    }
  }

  // 4) Űrlapfelület kirajzolása dátum-, cél-, útvonal- és ármezőkkel.
  return (
    <div className={classes.wrapper}>
      <form className={classes.form} onSubmit={handleSubmit}>

        {/* DÁTUMOK */}
        <div className={classes.dateRow}>
          <div className={classes.field}>
            <label htmlFor="start">Indulás dátuma</label>
            <input
              id="start"
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
            <label htmlFor="end">Érkezés dátuma</label>
            <input
              id="end"
              type="date"
              value={endDate}
              min={minArrivalDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className={classes.centerRow}>
          {/* UTAZÁSI CÉL */}
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
                <option key={dest} value={dest}>{dest}</option>
              ))}
            </select>
          </div>

          {/* ÚTVONAL */}
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

        <div className={classes.priceSection}>
          <div className={classes.priceHeader}>
            <label>Árszűrés</label>
            <span>
              {priceBounds ? `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}` : "Nincs elérhető árkategória"}
            </span>
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
                onChange={(e) => {
                  const nextValue = Number(e.target.value);
                  setMinPrice(Math.min(nextValue, maxPrice));
                }}
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
                onChange={(e) => {
                  const nextValue = Number(e.target.value);
                  setMaxPrice(Math.max(nextValue, minPrice));
                }}
                className={classes.rangeInput}
              />
              <strong>{formatPrice(maxPrice)}</strong>
            </div>
          </div>
        </div>

        <button className={classes.button} type="submit" disabled={loading}>
          {loading ? "Keresés..." : "Szabad kabinok keresése"}
        </button>
      </form>
    </div>
  );
}
