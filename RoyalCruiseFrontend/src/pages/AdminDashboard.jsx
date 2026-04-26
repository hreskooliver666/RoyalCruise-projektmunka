// Ez a fájl az admin összefoglaló oldal adatait, statisztikáit és gyors műveleteit szervezi.
import { useEffect, useState } from "react";
import useAuth from "../auth/useAuth.jsx";
import { deleteAdminUser, getAdminUsers, deleteAdminBooking, getAdminBookings } from "../api/adminApi.js";
import classes from "./AdminDashboard.module.css";
import formatPrice from "../utils/formatPrice.js";

// Ez a segédfüggvény a listákat azonosító szerint növekvő sorrendbe rendezi.
function sortByIdAsc(items) {
  return [...items].sort((a, b) => Number(a?.id ?? 0) - Number(b?.id ?? 0));
}

// Ez a segédfüggvény primitív értéket biztonságosan szöveggé alakít.
function toDisplayText(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value).trim();
  return "";
}

// Ez a segédfüggvény megpróbál JSON objektummá alakítani egy szöveges értéket.
function tryParseJsonObject(value) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text.startsWith("{") && !text.startsWith("[")) return null;

  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

// Ez a segédfüggvény kulcsszó-minta alapján megkeresi az első használható szövegértéket tetszőleges mélységben.
function findFirstStringByKeyPattern(source, keyPattern, maxDepth = 5) {
  const visited = new Set();

  function walk(node, depth) {
    if (!node || depth > maxDepth) return "";

    if (typeof node === "string") {
      const parsed = tryParseJsonObject(node);
      if (parsed) {
        return walk(parsed, depth + 1);
      }
      return "";
    }

    if (typeof node !== "object") return "";
    if (visited.has(node)) return "";
    visited.add(node);

    if (Array.isArray(node)) {
      for (const item of node) {
        const found = walk(item, depth + 1);
        if (found) return found;
      }
      return "";
    }

    for (const [key, rawValue] of Object.entries(node)) {
      const value = rawValue;
      if (keyPattern.test(key)) {
        const text = toDisplayText(value);
        if (text) return text;

        const nestedText = walk(value, depth + 1);
        if (nestedText) return nestedText;
      }
    }

    for (const value of Object.values(node)) {
      const found = walk(value, depth + 1);
      if (found) return found;
    }

    return "";
  }

  return walk(source, 0);
}

// Ez a segédfüggvény az első nem üres, kijelezhető szövegértéket adja vissza.
function pickFirstNonEmpty(...values) {
  for (const value of values) {
    const text = toDisplayText(value);
    if (text) return text;
  }
  return "";
}

// Ez a segédfüggvény eldönti, hogy egy címmező valószínűleg csak városnevet tartalmaz-e.
function looksLikeCityName(value) {
  const text = String(value ?? "").trim();
  if (!text) return false;
  if (/\d/.test(text)) return false;
  if (/[,./]/.test(text)) return false;
  return text.split(/\s+/).length <= 3;
}

// Ez a segédfüggvény feloldja a város mezőt különböző lehetséges backend kulcsokból.
function resolveUserCity(item) {
  const addressObj = item?.address && typeof item.address === "object" ? item.address : null;

  const explicitCity = pickFirstNonEmpty(
    item?.city,
    item?.userCity,
    item?.profileCity,
    item?.cityName,
    item?.varos,
    item?.["város"],
    item?.telepules,
    item?.["település"],
    addressObj?.city,
    addressObj?.cityName,
    addressObj?.varos,
    addressObj?.["város"],
    addressObj?.telepules,
    addressObj?.["település"],
    addressObj?.town,
    addressObj?.municipality,
    addressObj?.settlement,
    item?.town,
    item?.municipality,
    item?.settlement,
    item?.addressCity,
    item?.location?.city,
    item?.profile?.city
  );

  if (explicitCity) return explicitCity;

  const inferredFromAnyCityKey = findFirstStringByKeyPattern(
    item,
    /(city|cityname|varos|város|telepules|település|town|municipality|settlement)/i
  );
  if (inferredFromAnyCityKey) return inferredFromAnyCityKey;

  const rawAddress = pickFirstNonEmpty(
    item?.streetAddress,
    item?.addressLine,
    item?.profile?.address,
    item?.address,
    addressObj?.line1,
    addressObj?.street,
    addressObj?.address
  );
  const addressCityPrefix = String(rawAddress).split(",")[0]?.trim();
  if (looksLikeCityName(addressCityPrefix)) return addressCityPrefix;

  return looksLikeCityName(rawAddress) ? rawAddress : "";
}

// Ez a segédfüggvény feloldja a lakcím mezőt, és elkerüli, hogy a városnév duplikáltan lakcímként jelenjen meg.
function resolveUserAddress(item) {
  const addressObj = item?.address && typeof item.address === "object" ? item.address : null;
  const rawAddress = pickFirstNonEmpty(
    item?.streetAddress,
    item?.addressLine,
    item?.profile?.address,
    item?.address,
    addressObj?.line1,
    addressObj?.street,
    addressObj?.address
  );
  const resolvedCity = resolveUserCity(item);

  const inferredAddress = findFirstStringByKeyPattern(
    item,
    /(address|street|line1|line2|lakcim|lakcím|utca|hazszam|házszám)/i
  );
  const candidateAddress = rawAddress || inferredAddress;

  if (!candidateAddress) return "";
  if (!resolvedCity) return candidateAddress;

  const normalizedCity = resolvedCity.trim();
  const normalizedAddress = candidateAddress.trim();
  if (normalizedAddress.toLowerCase() === normalizedCity.toLowerCase()) return "";

  const cityPrefixPatterns = [
    new RegExp(`^${normalizedCity}\\s*,\\s*`, "i"),
    new RegExp(`^${normalizedCity}\\s+-\\s+`, "i"),
    new RegExp(`^${normalizedCity}\\s+`, "i"),
  ];

  for (const pattern of cityPrefixPatterns) {
    if (pattern.test(normalizedAddress)) {
      const stripped = normalizedAddress.replace(pattern, "").trim();
      return stripped || "";
    }
  }

  return normalizedAddress;
}

// Az AdminDashboard oldal egy helyen mutatja az adminisztrációhoz szükséges fő mutatókat és listákat.
export default function AdminDashboard() {
  // 1) Admin adatkészletekhez tartozó állapotok inicializálása.
  const { user } = useAuth();
  // Ez az állapot tárolja az admin által látható felhasználói listát.
  const [users, setUsers] = useState([]);
  // Ez az állapot tárolja az admin által látható foglalási listát.
  const [bookings, setBookings] = useState([]);
  const [bookingsError, setBookingsError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 2) Felhasználó- és foglaláslista betöltése admin tokennel.
  // Ez az effekt betölti az admin felhasználókat és foglalásokat, amikor hiteles token áll rendelkezésre.
  useEffect(() => {
    if (!user?.token) return;

    setLoading(true);
    setError("");
    setBookingsError("");

    getAdminUsers(user.token)
      .then((usersData) => {
        setUsers(sortByIdAsc(Array.isArray(usersData) ? usersData : []));
        return getAdminBookings(user.token)
          .then((bookingsData) => {
            setBookings(sortByIdAsc(Array.isArray(bookingsData) ? bookingsData : []));
          })
          .catch((err) => {
            setBookings([]);
            setBookingsError(err.message || "A foglalások jelenleg nem tölthetők be.");
          });
      })
      .catch((err) => {
        setError(err.message || "Nem sikerült betölteni az admin adatokat.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user?.token]);

  if (loading) return <p className={classes.state}>Betöltés...</p>;
  if (error) return <p className={classes.stateError}>{error}</p>;

  // 3) Admin műveletek: felhasználó- és foglalástörlés.
  // Ez a kezelő törli a kiválasztott nem-admin felhasználót, és eltávolítja a nézetből a kapcsolódó elemeket.
  async function handleDelete(userId, role) {
    if (role === "ADMIN") return;
    const confirmed = window.confirm("Biztosan törlöd ezt a felhasználót?");
    if (!confirmed) return;

    try {
      await deleteAdminUser(userId, user.token);
      setUsers((prev) => prev.filter((item) => item.id !== userId));
      setBookings((prev) => prev.filter((item) => item.userEmail !== users.find(u => u.id === userId)?.email));
    } catch (err) {
      setError(err.message || "Nem sikerült törölni a felhasználót.");
    }
  }

  // Ez a kezelő törli a kiválasztott foglalást, majd frissíti a helyi foglaláslistát.
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

// Ez a segédfüggvény a foglalás útvonaladatából kiolvassa az induló várost.
  function getDepartureCity(item) {
    if (item.routeDepartureFrom) return item.routeDepartureFrom;
    if (!item.routeName) return "-";
    return item.routeName.replace(/\s*[–-]\s*Variáció.*$/i, "").trim();
  }

  // 4) Dashboard táblák és statisztikák megjelenítése.
  return (
    <section className={classes.wrapper}>
      <h1>Admin felület</h1>

      <h2>Regisztrált felhasználók</h2>
      <div className={classes.tableWrap}>
        <table className={classes.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Felhasználónév</th>
              <th>Email</th>
              <th>Telefonszám</th>
              <th>Ország</th>
              <th>Város</th>
              <th>Irányítószám</th>
              <th>Lakcím</th>
              <th>Nem</th>
              <th>Szerep</th>
              <th>Művelet</th>
            </tr>
          </thead>
          <tbody>
            {users.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.username}</td>
                <td>{item.email}</td>
                <td>{pickFirstNonEmpty(item.phone, item.phoneNumber) || "-"}</td>
                <td>{pickFirstNonEmpty(item.country, item.nationality) || "-"}</td>
                <td>{resolveUserCity(item) || "-"}</td>
                <td>{pickFirstNonEmpty(item.postalCode, item.zipCode) || "-"}</td>
                <td>{resolveUserAddress(item) || "-"}</td>
                <td>{pickFirstNonEmpty(item.gender, item.sex) || "-"}</td>
                <td>{item.role}</td>
                <td>
                  <button
                    className={classes.deleteBtn}
                    onClick={() => handleDelete(item.id, item.role)}
                    disabled={item.role === "ADMIN"}
                    title={item.role === "ADMIN" ? "Admin nem törölhető" : "Törlés"}
                  >
                    Törlés
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Foglalások</h2>
      {bookingsError && <p className={classes.stateError}>{bookingsError}</p>}
      <div className={classes.tableWrap}>
        <table className={classes.table}>
          <thead>
            <tr>
              <th>Foglalás ID</th>
              <th>Felhasználó</th>
              <th>Induló város</th>
              <th>Dátum</th>
              <th>Kabin</th>
              <th>Végösszeg (HUF)</th>
              <th>Művelet</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.userEmail}</td>
                <td>{getDepartureCity(item)}</td>
                <td>{item.routeDate}</td>
                <td>{item.cabin}</td>
                <td>{formatPrice(item.totalPrice || 0)}</td>
                <td>
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
