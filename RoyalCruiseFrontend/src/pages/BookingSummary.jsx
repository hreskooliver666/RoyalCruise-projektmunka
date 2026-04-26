// Ez a fájl a foglalási összegző oldal nézetét és a kiválasztott út adatainak áttekintését kezeli.
import { Link, useLocation } from "react-router-dom";
import formatPrice from "../utils/formatPrice.js";
import classes from "./BookingSummary.module.css";
import { getShipNameForRoute } from "../utils/routeShipAssignment.js";
import { formatStopDate, getNextRouteOccurrence } from "../utils/routeStopSchedule.js";

// A BookingSummary oldal összefoglalja a kiválasztott út, dátum és kabin adatait a véglegesítés előtt.
export default function BookingSummary() {
  // 1) Navigációs state kiolvasása és hiányzó adatok kezelése.
  const { state } = useLocation();

  if (!state) {
    return (
      <section className={classes.wrapper}>
        <div className={classes.empty}>Nincs foglalási adat.</div>
      </section>
    );
  }

  const {
    route,
    selectedSegmentStops,
    selectedDepartureCity,
    selectedArrivalCity,
    selectedDepartureDate,
    selectedArrivalDate,
    occurrenceReferenceDate,
    cabin,
    guests,
    cabinPrice,
    extras,
    extrasPrice,
    totalPrice,
    bookingId,
  } = state;

  // 2) Foglalási alapadatok és menetrendi származtatott értékek előállítása.

  const departureCity = selectedDepartureCity || route.stops?.[0] || route.name;
  const arrivalCity = selectedArrivalCity || route.stops?.[route.stops.length - 1] || route.name;
  const departureDate = selectedDepartureDate || route.date;
  const arrivalDate = selectedArrivalDate || route.date;
  const now = new Date();
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const selectedOccurrence = getNextRouteOccurrence(route, occurrenceReferenceDate || departureDate || route.date);
  const statusOccurrenceToday = getNextRouteOccurrence(route, todayIso);
  const isCurrentOccurrenceSelected =
    String(selectedOccurrence.startDate || "") === String(statusOccurrenceToday.startDate || "");
// Ez a számítás megkeresi, hogy a mai nap a menetrend melyik megállószakaszába esik.
  const currentStopIndexToday = (() => {
    const schedule = Array.isArray(statusOccurrenceToday.stopSchedule) ? statusOccurrenceToday.stopSchedule : [];

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
  const currentStopToday =
    currentStopIndexToday >= 0
      ? statusOccurrenceToday.stopSchedule?.[currentStopIndexToday] || null
      : null;
  const currentStopKey = currentStopToday ? `${currentStopToday.city}|${currentStopToday.date}` : "";
  const currentOccurrence = selectedOccurrence;
  const shownSegmentStops = Array.isArray(selectedSegmentStops) && selectedSegmentStops.length
    ? selectedSegmentStops
    : currentOccurrence.stopSchedule;
  const shipName = route.shipName || getShipNameForRoute(route);

  // 3) Összegző oldal kirajzolása: szakaszadatok, menetrend, árak és visszanavigáló akciók.
  return (
    <section className={classes.wrapper}>
      <header className={classes.header}>
        <h1>Foglalás összegzése</h1>
        <p>Minden kiválasztott adat és költség egy helyen.</p>
        <div className={classes.dateBanner}>
          <div>
            <span>Indulás</span>
            <strong>{formatStopDate(departureDate)}</strong>
          </div>
          <div>
            <span>Érkezés</span>
            <strong>{formatStopDate(arrivalDate)}</strong>
          </div>
        </div>
      </header>

      <div className={classes.grid}>
        <article className={classes.card}>
          <h2>Foglalási szakasz adatai</h2>
          <div className={classes.row}>
            <span>Indulás</span>
            <strong>{departureCity}</strong>
          </div>
          <div className={classes.row}>
            <span>Érkezés</span>
            <strong>{arrivalCity}</strong>
          </div>
          <div className={classes.row}>
            <span>Úticél</span>
            <strong>{route.destination}</strong>
          </div>
          <div className={classes.row}>
            <span>Indulás dátuma</span>
            <strong>{formatStopDate(departureDate)}</strong>
          </div>
          <div className={classes.row}>
            <span>Érkezés dátuma</span>
            <strong>{formatStopDate(arrivalDate)}</strong>
          </div>
          <div className={classes.row}>
            <span>Hajó</span>
            <strong>{shipName}</strong>
          </div>
          <div className={classes.row}>
            <span>Utasok száma</span>
            <strong>{guests || 1} fő</strong>
          </div>
          <div className={classes.routeLine}>
            {shownSegmentStops.length
              ? shownSegmentStops.map((stop) => stop.city).join(" → ")
              : (route.stops?.length ? route.stops.join(" → ") : route.name)}
          </div>
          <div className={classes.stopScheduleBlock}>
            <p className={classes.stopScheduleTitle}>Állomások dátummal</p>
            <ul className={classes.stopScheduleList}>
              {shownSegmentStops.map((stop, index) => (
                <li
                  key={`${route.id}-${stop.city}-${stop.date}-${index}`}
                  className={
                    isCurrentOccurrenceSelected &&
                    !stop.isSeaDay &&
                    `${stop.city}|${stop.date}` === currentStopKey
                      ? classes.currentStopRow
                      : ""
                  }
                >
                  <span>{stop.city}</span>
                  <span>{formatStopDate(stop.date)}</span>
                </li>
              ))}
            </ul>
          </div>
        </article>

        <article className={classes.card}>
          <h2>Kabin és extrák</h2>
          <div className={classes.row}>
            <span>Kabin</span>
            <strong>{cabin}</strong>
          </div>
          <div className={classes.row}>
            <span>Kabin felár</span>
            <strong>{formatPrice(cabinPrice)}</strong>
          </div>

          <h3>Extra szolgáltatások</h3>
          {extras.length === 0 ? (
            <p className={classes.muted}>Nincs extra szolgáltatás kiválasztva.</p>
          ) : (
            <ul className={classes.extras}>
              {extras.map((ex) => (
                <li key={ex.id}>
                  <span>{ex.name}</span>
                  <strong>{formatPrice(ex.price)}</strong>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>

      <article className={`${classes.card} ${classes.pricesCard}`}>
        <h2>Árak összesítése</h2>
        <div className={classes.row}>
          <span>Alap ár</span>
          <strong>{formatPrice(route.price)}</strong>
        </div>
        <div className={classes.row}>
          <span>Kabin felár</span>
          <strong>{formatPrice(cabinPrice)}</strong>
        </div>
        <div className={classes.row}>
          <span>Extrák</span>
          <strong>{formatPrice(extrasPrice)}</strong>
        </div>
        <div className={`${classes.row} ${classes.totalRow}`}>
          <span>Végösszeg</span>
          <strong className={classes.total}>{formatPrice(totalPrice)}</strong>
        </div>

        {bookingId && (
          <p className={classes.bookingId}>
            Foglalás azonosító: <strong>#{bookingId}</strong>
          </p>
        )}
      </article>

      <Link to="/" className={classes.homeButton}>
        Vissza a főoldalra
      </Link>
    </section>
  );
}
