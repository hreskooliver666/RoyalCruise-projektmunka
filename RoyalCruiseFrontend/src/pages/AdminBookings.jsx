// Ez a fájl az admin foglaláslista betöltését, rendezését és törlési műveleteit megvalósító oldalt tartalmazza.
import { useEffect, useState } from "react";
import { deleteAdminBooking, getAdminBookings } from "../api/adminApi.js";
import useAuth from "../auth/useAuth.jsx";
import formatPrice from "../utils/formatPrice.js";
import classes from "./AdminBookings.module.css";

// Ez a segédfüggvény az elemeket azonosító szerint növekvő sorrendbe rendezi.
function sortByIdAsc(items) {
  return [...items].sort((a, b) => Number(a?.id ?? 0) - Number(b?.id ?? 0));
}

// Az AdminBookings oldal listázza az összes foglalást, és lehetőséget ad admin oldali törlési műveletekre.
export default function AdminBookings() {
  // 1) Foglaláslista és felületi állapotok inicializálása.
  const { user } = useAuth();
  // Ez az állapot tartja az admin foglalástáblázat aktuálisan megjelenített elemeit.
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 2) Admin foglalások betöltése és hibaállapot kezelése.
  // Ez az effekt token jelenlétében lekéri az admin foglaláslistát, és kezeli a betöltési/hiba állapotot.
  useEffect(() => {
    if (!user?.token) return;

    setLoading(true);
    setError("");

    getAdminBookings(user.token)
      .then((data) => {
        setBookings(sortByIdAsc(Array.isArray(data) ? data : []));
      })
      .catch((err) => {
        setError(err.message || "Nem sikerült betölteni a foglalásokat.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user?.token]);

  // 3) Összesítő számítás és foglalástörlési művelet.
  // Ez a számított összeg a listában szereplő foglalások teljes bevételét adja össze.
  const totalRevenue = bookings.reduce((sum, item) => sum + (item.totalPrice || 0), 0);

  // Ez a törlési kezelő megerősítés után eltávolítja a foglalást a backendből és a helyi állapotból.
  async function handleDeleteBooking(bookingId) {
    const confirmed = window.confirm("Biztosan törlöd ezt a foglalást?");
    if (!confirmed) return;

    try {
      await deleteAdminBooking(bookingId, user.token);
      setBookings((prev) => prev.filter((item) => item.id !== bookingId));
    } catch (err) {
      setError(err.message || "Nem sikerült törölni a foglalást.");
    }
  }

  if (loading) {
    return <p className={classes.state}>Betöltés...</p>;
  }

  if (error) {
    return <p className={classes.stateError}>{error}</p>;
  }

  // 4) Statisztikai kártyák és admin foglalástábla kirajzolása.
  return (
    <section className={classes.wrapper}>
      <header className={classes.topBar}>
        <div>
          <h1>Admin foglalások</h1>
          <p className={classes.subTitle}>Minden foglalás áttekintése egy helyen.</p>
        </div>
      </header>

      <div className={classes.statsGrid}>
        <article className={classes.statCard}>
          <span>Foglalások száma</span>
          <strong>{bookings.length}</strong>
        </article>

        <article className={classes.statCard}>
          <span>Összbevétel</span>
          <strong>{formatPrice(totalRevenue)}</strong>
        </article>
      </div>

      <div className={classes.tableWrap}>
        <table className={classes.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Felhasználó</th>
              <th>Email</th>
              <th>Útvonal</th>
              <th>Indulás</th>
              <th>Dátum</th>
              <th>Kabin</th>
              <th>Végösszeg</th>
              <th className={classes.actionCell}>Művelet</th>
            </tr>
          </thead>

          <tbody>
            {bookings.length === 0 && (
              <tr>
                <td colSpan="9" className={classes.emptyState}>
                  Nincs foglalás.
                </td>
              </tr>
            )}

            {bookings.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.username || "-"}</td>
                <td>{item.userEmail || "-"}</td>
                <td>{item.routeName || "-"}</td>
                <td>{item.routeDepartureFrom || "-"}</td>
                <td>{item.routeDate || "-"}</td>
                <td>{item.cabin || "-"}</td>
                <td>{formatPrice(item.totalPrice || 0)}</td>
                <td className={classes.actionCell}>
                  <button
                    className={classes.deleteBtn}
                    onClick={() => handleDeleteBooking(item.id)}
                    title="Foglalás törlése"
                  >
                    Törlés
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
