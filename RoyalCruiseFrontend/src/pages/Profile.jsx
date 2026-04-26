// Ez a fájl a felhasználói profiloldalt, a saját foglalások listáját és a lemondási folyamat megjelenítését kezeli.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import useAuth from "../auth/useAuth.jsx";
import { cancelMyBooking, getMyBookings } from "../api/bookingApi.js";
import formatPrice from "../utils/formatPrice.js";
import { getAllRoutes } from "../api/routesApi.js";
import { getShipNameForRoute } from "../utils/routeShipAssignment.js";
import { getNextRouteOccurrence } from "../utils/routeStopSchedule.js";
import classes from "./Profile.module.css";

// Ez a segédfüggvény a foglalási adatokból kiolvassa az induló város nevét.
function getDepartureCity(booking) {
  if (booking.routeDepartureFrom) return booking.routeDepartureFrom;
  if (!booking.routeName) return "-";
  return booking.routeName.replace(/\s*[–-]\s*Variáció.*$/i, "").trim();
}

// Ez a segédfüggvény egységes ISO formátumra alakítja a dátumszöveget.
function normalizeIsoDate(value) {
  if (!value) return "";
  const raw = String(value).trim();
  return raw.includes("T") ? raw.split("T")[0] : raw;
}

// Ez a segédfüggvény kiszámolja a lemondás esetén visszajáró százalékos arányt.
function calculateRefundPercentage(departureDateIso, todayIso) {
  const departureDate = new Date(`${departureDateIso}T00:00:00`);
  const todayDate = new Date(`${todayIso}T00:00:00`);
  const diffDays = Math.ceil((departureDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays >= 60) return 90;
  if (diffDays >= 30) return 50;
  return 0;
}

// A Profile oldal betölti a bejelentkezett felhasználó foglalásait, és lemondáskor kiszámolja a visszatérítési arányt.
export default function Profile() {
  // 1) Hitelesítési kontextus és alapállapotok előkészítése.
  const { user, isAdmin } = useAuth();
  // Ezek az állapotok a felhasználó foglalásait, route-katalógusát és a nézet interakciós állapotait tárolják.
  const [bookings, setBookings] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingView, setBookingView] = useState("latest");
  const [expandedBookingKey, setExpandedBookingKey] = useState(null);
  const [cancelingBookingId, setCancelingBookingId] = useState(null);
  const [actionError, setActionError] = useState("");
  const todayIso = new Date().toISOString().split("T")[0];

  // 2) Kezdő adatok betöltése (saját foglalások + route-katalógus).
  // Ez az effekt token alapján betölti a saját foglalásokat és útvonalakat, admin felhasználónál pedig leállítja a foglalásnézetet.
  useEffect(() => {
    if (!user?.token) {
      setLoading(false);
      return;
    }

    // Admin users do not have bookings
    if (isAdmin) {
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all([getMyBookings(user.token), getAllRoutes()])
      .then(([bookingsData, routesData]) => {
        setBookings(Array.isArray(bookingsData) ? bookingsData : []);
        setRoutes(Array.isArray(routesData) ? routesData : []);
      })
      .catch(() => {
        setBookings([]);
        setRoutes([]);
      })
      .finally(() => setLoading(false));
  }, [user?.token, isAdmin]);

  // 3) Megjelenítéshez szükséges származtatott adatok (memoizált számítások).
  // Ez a memoizált map gyors route-keresést ad routeId alapján a foglalások részletezéséhez.
  const routesById = useMemo(() => {
    const map = new Map();
    routes.forEach((route) => {
      if (route?.id === undefined || route?.id === null) return;
      map.set(String(route.id), route);
    });
    return map;
  }, [routes]);

  // Ez a memoizált érték a felhasználó teljes eddigi költését számolja ki a foglalásokból.
  const totalSpent = useMemo(
    () => bookings.reduce((sum, booking) => sum + (booking.totalPrice || 0), 0),
    [bookings]
  );

  // Ez a memoizált számítás meghatározza a leggyakrabban választott kabintípust.
  const favoriteCabin = useMemo(() => {
    if (!bookings.length) return "-";

    const counts = bookings.reduce((acc, booking) => {
      const cabin = booking.cabin || "Ismeretlen";
      acc[cabin] = (acc[cabin] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }, [bookings]);

  // Ez a memoizált lista a kiválasztott nézetmód szerint szűri a megjelenített foglalásokat.
  const filteredBookings = useMemo(() => {
    if (bookingView === "latest") {
      return bookings.slice(0, 1);
    }

    return bookings;
  }, [bookings, bookingView]);

  const displayName = user?.username || user?.email?.split("@")[0] || "Utas";
  const avatarLetter = (displayName[0] || "U").toUpperCase();
  const adminAccessList = [
    "Felhasználók kezelése",
    "Foglalások áttekintése",
    "Foglalások törlése",
  ];

  // 4) Foglaláslemondás üzleti folyamata.
  // Ez a kezelő validáció és megerősítés után lemondja a foglalást, majd frissíti a lokális listát.
  async function handleCancelBooking(bookingId, bookingKey, departureDateIso) {
    const normalizedDeparture = normalizeIsoDate(departureDateIso);
    const canCancel = normalizedDeparture && todayIso < normalizedDeparture;

    if (!canCancel) {
      return;
    }

    const confirmed = window.confirm("Biztosan lemondod ezt a foglalást?");
    if (!confirmed) return;

    setActionError("");
    setCancelingBookingId(bookingId);

    try {
      await cancelMyBooking(bookingId, user.token, {
        cancellationReason: "USER_REQUESTED",
        refundPercentage: calculateRefundPercentage(normalizedDeparture, todayIso),
        cancellationDate: todayIso,
      });
      setBookings((prev) => prev.filter((item) => item.id !== bookingId));
      setExpandedBookingKey((prev) => (prev === bookingKey ? null : prev));
    } catch (err) {
      setActionError(err?.message || "A foglalás lemondása nem sikerült.");
    } finally {
      setCancelingBookingId(null);
    }
  }

  // 5) Felület kirajzolása (profilkártyák, statisztikák, foglaláslista, akciógombok).
  return (
    <section className={classes.wrapper}>
      <header className={classes.headerCard}>
        <div className={classes.avatar}>{avatarLetter}</div>
        <div>
          <h1>{displayName} profilja</h1>
          <p>{user?.email}</p>
        </div>
      </header>

      <div className={classes.grid}>
        <article className={classes.card}>
          <h2>Fiók adatok</h2>
          <div className={classes.row}>
            <span>Felhasználónév</span>
            <strong>{user?.username || "-"}</strong>
          </div>
          <div className={classes.row}>
            <span>Email</span>
            <strong>{user?.email || "-"}</strong>
          </div>
          <div className={classes.row}>
            <span>Szerepkör</span>
            <strong>{user?.role === "ADMIN" ? "Admin" : "Utas"}</strong>
          </div>
        </article>

        {isAdmin && (
          <article className={classes.card}>
            <h2>Admin információk</h2>
            <div className={classes.adminInfoRow}>
              <span>Admin státusz</span>
              <strong className={classes.adminBadge}>Aktív</strong>
            </div>
            <div className={classes.adminInfoRow}>
              <span>Admin azonosító</span>
              <strong>{user?.email || "-"}</strong>
            </div>
            <div className={classes.adminInfoRow}>
              <span>Telefonszám</span>
              <strong>{user?.phone || "-"}</strong>
            </div>
            <div className={classes.adminInfoRow}>
              <span>Lakcím</span>
              <strong>{user?.address || "-"}</strong>
            </div>
            <div className={classes.adminInfoRow}>
              <span>Ország</span>
              <strong>{user?.country || "-"}</strong>
            </div>
            <div className={classes.adminInfoRow}>
              <span>Irányítószám</span>
              <strong>{user?.postalCode || "-"}</strong>
            </div>
            <div className={classes.adminInfoRow}>
              <span>Nem</span>
              <strong>{user?.gender || "-"}</strong>
            </div>
            <div className={classes.adminInfoRow}>
              <span>Hozzáférési szint</span>
              <strong>Teljes admin jogosultság</strong>
            </div>
            <div className={classes.adminAccessBox}>
              <p>Elérhető admin modulok:</p>
              <ul>
                {adminAccessList.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </article>
        )}

        {!isAdmin && (
          <article className={classes.card}>
            <h2>Foglalási statisztika</h2>
            <div className={classes.row}>
              <span>Összes foglalás</span>
              <strong>{bookings.length} db</strong>
            </div>
            <div className={classes.row}>
              <span>Összes költés</span>
              <strong>{formatPrice(totalSpent)}</strong>
            </div>
            <div className={classes.row}>
              <span>Gyakori kabin</span>
              <strong>{favoriteCabin}</strong>
            </div>
          </article>
        )}
      </div>

      {!isAdmin && (
        <article className={classes.card}>
          <div className={classes.bookingHeaderRow}>
            <h2>Foglalásaim</h2>
            <select
              className={classes.bookingFilterSelect}
              value={bookingView}
              onChange={(event) => setBookingView(event.target.value)}
            >
              <option value="latest">Legutóbbi</option>
              <option value="all">Összes</option>
            </select>
          </div>
          {loading ? (
            <p className={classes.muted}>Betöltés...</p>
          ) : !filteredBookings.length ? (
            <p className={classes.muted}>Még nincs foglalásod.</p>
          ) : (
            <div className={classes.bookingList}>
              {actionError ? <p className={classes.actionError}>{actionError}</p> : null}
              {filteredBookings.map((booking, index) => (
              (() => {
                // 5.1) Az aktuális foglalási kártya azonosítói és kibontási állapotai.
                const bookingKey = booking.id || `${booking.routeDate}-${booking.cabin}-${index}`;
                const isExpanded = expandedBookingKey === bookingKey;
                const extras = Array.isArray(booking.extras) ? booking.extras : [];
                // 5.2) A foglaláshoz kapcsolt útvonaladatok feloldása (routeId alapján vagy fallback szerkezetből).
                const matchedRoute = routesById.get(String(booking.routeId || "")) || null;
                const fallbackRoute = {
                  ...booking,
                  stops: [booking.routeDepartureFrom, booking.routeArrivalTo].filter(Boolean),
                };
                const routeInfo = matchedRoute || fallbackRoute;
                const occurrenceForBooking = getNextRouteOccurrence(routeInfo, booking.routeDate || routeInfo?.date || "");
                const resolvedArrivalDate = booking.routeArrivalDate || occurrenceForBooking.endDate || "-";
                const resolvedShipName = routeInfo?.shipName || booking.shipName || getShipNameForRoute(routeInfo);
                const guestCount = Number.isFinite(Number(booking.guests)) ? Number(booking.guests) : 1;
                // 5.3) A teljes út állomáslistájának és a lemondhatóságnak a meghatározása.
                const routeCities = Array.isArray(routeInfo?.stops) ? routeInfo.stops.filter(Boolean) : [];
                const departureDateIso = normalizeIsoDate(booking.routeDate || occurrenceForBooking.startDate || "");
                const canCancelBooking = Boolean(departureDateIso) && todayIso < departureDateIso;
                const isCancelingThisBooking = cancelingBookingId === booking.id;

                return (
                  <div className={classes.bookingDetails} key={bookingKey}>
                    <div className={classes.bookingItemHeader}>
                      <strong>Foglalás #{booking.id || index + 1}</strong>
                      <span>{booking.routeDate || "-"}</span>
                    </div>

                    <div className={classes.row}>
                      <span>Induló város</span>
                      <strong>{getDepartureCity(booking)}</strong>
                    </div>
                    <div className={classes.row}>
                      <span>Indulás dátuma</span>
                      <strong>{booking.routeDate || "-"}</strong>
                    </div>
                    <div className={classes.row}>
                      <span>Érkezés dátuma</span>
                      <strong>{resolvedArrivalDate}</strong>
                    </div>
                    <div className={classes.row}>
                      <span>Kabin</span>
                      <strong>{booking.cabin || "-"}</strong>
                    </div>
                    <div className={classes.row}>
                      <span>Utasok száma</span>
                      <strong>{guestCount} fő</strong>
                    </div>
                    <div className={classes.row}>
                      <span>Végösszeg</span>
                      <strong>{formatPrice(booking.totalPrice || 0)}</strong>
                    </div>

                    <button
                      type="button"
                      className={classes.detailToggle}
                      onClick={() => setExpandedBookingKey(isExpanded ? null : bookingKey)}
                    >
                      {isExpanded ? "Részletek elrejtése" : "Részletek megtekintése"}
                    </button>

                    <button
                      type="button"
                      className={classes.cancelBookingButton}
                      onClick={() => handleCancelBooking(booking.id, bookingKey, departureDateIso)}
                      disabled={!canCancelBooking || isCancelingThisBooking}
                      title={
                        canCancelBooking
                          ? "Foglalás lemondása"
                          : "Az indulás napján vagy utána már nem mondható le"
                      }
                    >
                      {isCancelingThisBooking ? "Lemondás folyamatban..." : "Foglalás lemondása"}
                    </button>

                    {isExpanded ? (
                      <div className={classes.detailsPanel}>
                        <div className={classes.row}>
                          <span>Útvonal</span>
                          <strong>{routeInfo?.name || booking.routeName || "-"}</strong>
                        </div>
                        <div className={classes.row}>
                          <span>Úticél</span>
                          <strong>{routeInfo?.destination || booking.destination || "-"}</strong>
                        </div>
                        <div className={classes.row}>
                          <span>A teljes út</span>
                          <strong>{routeCities.length ? routeCities.join(" → ") : "-"}</strong>
                        </div>
                        <div className={classes.row}>
                          <span>Érkező város</span>
                          <strong>{booking.routeArrivalTo || routeCities[routeCities.length - 1] || "-"}</strong>
                        </div>
                        <div className={classes.row}>
                          <span>Indulás dátuma</span>
                          <strong>{booking.routeDate || "-"}</strong>
                        </div>
                        <div className={classes.row}>
                          <span>Érkezés dátuma</span>
                          <strong>{resolvedArrivalDate}</strong>
                        </div>
                        <div className={classes.row}>
                          <span>Hajó</span>
                          <strong>{resolvedShipName || "-"}</strong>
                        </div>
                        <div className={classes.row}>
                          <span>Utasok száma</span>
                          <strong>{guestCount} fő</strong>
                        </div>
                        <div className={classes.row}>
                          <span>Extrák</span>
                          <strong>
                            {extras.length
                              ? extras.map((item) => item?.name || "").filter(Boolean).join(", ")
                              : "Nincs kiválasztva"}
                          </strong>
                        </div>
                        <div className={classes.row}>
                          <span>Foglalás azonosító</span>
                          <strong>{booking.id || "-"}</strong>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })()
            ))}
            </div>
          )}
        </article>
      )}

      <div className={classes.actions}>
        <Link to="/" className={classes.actionButton}>Vissza a főoldalra</Link>
        {isAdmin ? (
          <Link to="/admin/bookings" className={classes.actionButton}>Foglalások megtekintése</Link>
        ) : (
          <Link to="/routes" className={classes.actionButton}>Hajóutak böngészése</Link>
        )}
      </div>
    </section>
  );
}
